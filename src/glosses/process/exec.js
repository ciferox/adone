const {
    is,
    process: { errname, spawn, onExit },
    std: { path, os, childProcess },
    text: { stripLastNewline }
} = adone;

const alias = ["stdin", "stdout", "stderr"];
const hasAlias = (opts) => alias.some((x) => Boolean(opts[x]));

const stdio = (opts) => {
    if (!opts) {
        return;
    }

    if (opts.stdio && hasAlias(opts)) {
        throw new Error(`It's not possible to provide \`stdio\` in combination with one of ${alias.map((x) => `\`${x}\``).join(", ")}`);
    }

    if (is.string(opts.stdio)) {
        return opts.stdio;
    }

    const stdio = opts.stdio || [];

    if (!is.array(stdio)) {
        throw new TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof stdio}\``);
    }

    const result = [];
    const len = Math.max(stdio.length, alias.length);

    for (let i = 0; i < len; i++) {
        let value;

        if (!is.undefined(stdio[i])) {
            value = stdio[i];
        } else if (!is.undefined(opts[alias[i]])) {
            value = opts[alias[i]];
        }

        result[i] = value;
    }

    return result;
};

const TEN_MEGABYTES = 1000 * 1000 * 10;

const handleArgs = (command, args, options) => {
    const parsed = spawn.parse(command, args, options);
    command = parsed.command;
    args = parsed.args;
    options = parsed.options;

    options = {
        maxBuffer: TEN_MEGABYTES,
        buffer: true,
        stripFinalNewline: true,
        preferLocal: true,
        localDir: options.cwd || process.cwd(),
        encoding: "utf8",
        reject: true,
        cleanup: true,
        ...options,
        windowsHide: true
    };

    if (options.extendEnv !== false) {
        options.env = {
            ...process.env,
            ...options.env
        };
    }

    if (options.preferLocal) {
        options.env = adone.system.env.all({
            ...options,
            cwd: options.localDir
        });
    }

    // TODO: Remove in the next major release
    if (options.stripEof === false) {
        options.stripFinalNewline = false;
    }

    options.stdio = stdio(options);

    if (options.detached) {
        // #115
        options.cleanup = false;
    }

    if (process.platform === "win32" && path.basename(command) === "cmd.exe") {
        // #116
        args.unshift("/q");
    }

    return { command, args, options, parsed };
};

const handleInput = (spawned, input) => {
    if (is.nil(input)) {
        return;
    }

    if (is.stream(input)) {
        input.pipe(spawned.stdin);
    } else {
        spawned.stdin.end(input);
    }
};

const handleOutput = (options, value) => {
    if (value && options.stripFinalNewline) {
        value = stripLastNewline(value);
    }

    return value;
};

const handleShell = (fn, command, options) => fn(command, { ...options, shell: true });

const makeAllStream = (spawned) => {
    if (!spawned.stdout && !spawned.stderr) {
        return;
    }

    const mixed = adone.stream.merge();

    if (spawned.stdout) {
        mixed.add(spawned.stdout);
    }

    if (spawned.stderr) {
        mixed.add(spawned.stderr);
    }

    return mixed;
};

const getStream = (process, stream, { encoding, buffer, maxBuffer }) => {
    if (!process[stream]) {
        return;
    }

    let ret;

    if (!buffer) {
        // TODO: Use `ret = util.promisify(stream.finished)(process[stream]);` when targeting Node.js 10
        ret = new Promise((resolve, reject) => {
            process[stream]
                .once("end", resolve)
                .once("error", reject);
        });
    } else if (encoding) {
        ret = adone.stream.as.string(process[stream], {
            encoding,
            maxBuffer
        });
    } else {
        ret = adone.stream.as.buffer(process[stream], { maxBuffer });
    }

    return ret.catch((error) => {
        error.stream = stream;
        error.message = `${stream} ${error.message}`;
        throw error;
    });
};

const getCode = ({ error = {} }, code) => {
    if (error.code) {
        return [error.code, os.constants.errno[error.code]];
    }

    if (is.integer(code)) {
        return [errname(-Math.abs(code)), Math.abs(code)];
    }

    return [];
};

const getErrorPrefix = ({ timedOut, timeout, signal, exitCodeName, exitCode, isCanceled }) => {
    if (timedOut) {
        return `timed out after ${timeout} milliseconds`;
    }

    if (isCanceled) {
        return "was canceled";
    }

    if (signal) {
        return `was killed with ${signal}`;
    }

    if (!is.undefined(exitCodeName) && !is.undefined(exitCode)) {
        return `failed with exit code ${exitCode} (${exitCodeName})`;
    }

    if (!is.undefined(exitCodeName)) {
        return `failed with exit code ${exitCodeName}`;
    }

    if (!is.undefined(exitCode)) {
        return `failed with exit code ${exitCode}`;
    }

    return "failed";
};

const makeError = (result, options) => {
    const { stdout, stderr, code, signal } = result;
    let { error } = result;
    const { joinedCommand, timedOut, isCanceled, parsed: { options: { timeout } } } = options;

    const [exitCodeName, exitCode] = getCode(result, code);

    if (!(error instanceof Error)) {
        const message = [joinedCommand, stderr, stdout].filter(Boolean).join("\n");
        error = new Error(message);
    }

    const prefix = getErrorPrefix({ timedOut, timeout, signal, exitCodeName, exitCode, isCanceled });
    error.message = `Command ${prefix}: ${error.message}`;

    error.code = exitCode || exitCodeName;
    error.exitCode = exitCode;
    error.exitCodeName = exitCodeName;
    error.stdout = stdout;
    error.stderr = stderr;
    error.failed = true;
    // `signal` emitted on `spawned.on('exit')` event can be `null`. We normalize
    // it to `undefined`
    error.signal = signal || undefined;
    error.command = joinedCommand;
    error.timedOut = Boolean(timedOut);
    error.isCanceled = isCanceled;

    if ("all" in result) {
        error.all = result.all;
    }

    return error;
};

const joinCommand = (command, args) => {
    let joinedCommand = command;

    if (is.array(args) && args.length > 0) {
        joinedCommand += ` ${args.join(" ")}`;
    }

    return joinedCommand;
};

export const exec = (command, args, options) => {
    const parsed = handleArgs(command, args, options);
    const { encoding, buffer, maxBuffer } = parsed.options;
    const joinedCommand = joinCommand(command, args);

    let spawned;
    try {
        spawned = childProcess.spawn(parsed.command, parsed.args, parsed.options);
    } catch (error) {
        return Promise.reject(error);
    }

    let removeExitHandler;
    if (parsed.options.cleanup) {
        removeExitHandler = onExit(() => {
            spawned.kill();
        });
    }

    let timeoutId;
    let timedOut = false;
    let isCanceled = false;

    const cleanup = () => {
        if (!is.undefined(timeoutId)) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
        }

        if (removeExitHandler) {
            removeExitHandler();
        }
    };

    if (parsed.options.timeout > 0) {
        timeoutId = setTimeout(() => {
            timeoutId = undefined;
            timedOut = true;
            spawned.kill(parsed.options.killSignal);
        }, parsed.options.timeout);
    }

    const processDone = new Promise((resolve) => {
        spawned.on("exit", (code, signal) => {
            cleanup();
            resolve({ code, signal });
        });

        spawned.on("error", (error) => {
            cleanup();
            resolve({ error });
        });

        if (spawned.stdin) {
            spawned.stdin.on("error", (error) => {
                cleanup();
                resolve({ error });
            });
        }
    });

    const destroy = () => {
        if (spawned.stdout) {
            spawned.stdout.destroy();
        }

        if (spawned.stderr) {
            spawned.stderr.destroy();
        }

        if (spawned.all) {
            spawned.all.destroy();
        }
    };

    // TODO: Use native "finally" syntax when targeting Node.js 10
    const handlePromise = () => adone.promise.finally(Promise.all([
        processDone,
        getStream(spawned, "stdout", { encoding, buffer, maxBuffer }),
        getStream(spawned, "stderr", { encoding, buffer, maxBuffer }),
        getStream(spawned, "all", { encoding, buffer, maxBuffer: maxBuffer * 2 })
    ]).then((results) => { // eslint-disable-line promise/prefer-await-to-then
        const result = results[0];
        result.stdout = results[1];
        result.stderr = results[2];
        result.all = results[3];

        if (result.error || result.code !== 0 || !is.null(result.signal) || isCanceled) {
            const error = makeError(result, {
                joinedCommand,
                parsed,
                timedOut,
                isCanceled
            });

            // TODO: missing some timeout logic for killed
            // https://github.com/nodejs/node/blob/master/lib/child_process.js#L203
            // error.killed = spawned.killed || killed;
            error.killed = error.killed || spawned.killed;

            if (!parsed.options.reject) {
                return error;
            }

            throw error;
        }

        return {
            stdout: handleOutput(parsed.options, result.stdout),
            stderr: handleOutput(parsed.options, result.stderr),
            all: handleOutput(parsed.options, result.all),
            code: 0,
            exitCode: 0,
            exitCodeName: "SUCCESS",
            failed: false,
            killed: false,
            command: joinedCommand,
            timedOut: false,
            isCanceled: false
        };
    }), destroy);

    spawn.enoent.hookChildProcess(spawned, parsed.parsed);

    handleInput(spawned, parsed.options.input);

    spawned.all = makeAllStream(spawned);

    // eslint-disable-next-line promise/prefer-await-to-then
    spawned.then = (onFulfilled, onRejected) => handlePromise().then(onFulfilled, onRejected);
    spawned.catch = (onRejected) => handlePromise().catch(onRejected);
    spawned.cancel = () => {
        if (spawned.killed) {
            return;
        }

        if (spawned.kill()) {
            isCanceled = true;
        }
    };

    // TOOD: Remove the `if`-guard when targeting Node.js 10
    if (Promise.prototype.finally) {
        spawned.finally = (onFinally) => handlePromise().finally(onFinally);
    }

    return spawned;
};
exec.errname = errname;
exec.stdio = stdio;

// TODO: set `stderr: 'ignore'` when that option is implemented
export const execStdout = async (...args) => {
    const { stdout } = await exec(...args);
    return stdout;
};

// TODO: set `stdout: 'ignore'` when that option is implemented
export const execStderr = async (...args) => {
    const { stderr } = await exec(...args);
    return stderr;
};

export const shell = (command, options) => handleShell(exec, command, options);

export const execSync = (command, args, options) => {
    const parsed = handleArgs(command, args, options);
    const joinedCommand = joinCommand(command, args);

    if (is.stream(parsed.options.input)) {
        throw new TypeError("The `input` option cannot be a stream in sync mode");
    }

    const result = childProcess.spawnSync(parsed.command, parsed.args, parsed.options);
    result.code = result.status;

    if (result.error || result.status !== 0 || !is.null(result.signal)) {
        const error = makeError(result, {
            joinedCommand,
            parsed
        });

        if (!parsed.options.reject) {
            return error;
        }

        throw error;
    }

    return {
        stdout: handleOutput(parsed.options, result.stdout),
        stderr: handleOutput(parsed.options, result.stderr),
        code: 0,
        exitCode: 0,
        exitCodeName: "SUCCESS",
        failed: false,
        command: joinedCommand,
        timedOut: false
    };
};

export const shellSync = (command, options) => handleShell(execSync, command, options);
