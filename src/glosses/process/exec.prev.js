const {
    is,
    process: { spawn, errname },
    std
} = adone;

const alias = ["stdin", "stdout", "stderr"];

const hasAlias = (opts) => alias.some((x) => Boolean(opts[x]));

export const stdio = (options) => {
    if (!options) {
        return null;
    }

    if (options.stdio && hasAlias(options)) {
        throw new Error(`It's not possible to provide \`stdio\` in combination with one of ${alias.map((x) => `\`${x}\``).join(", ")}`);
    }

    if (is.string(options.stdio)) {
        return options.stdio;
    }

    const stdio_ = options.stdio || [];

    if (!is.array(stdio_)) {
        throw new TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof stdio_}\``);
    }

    const result = [];
    const len = Math.max(stdio_.length, alias.length);

    for (let i = 0; i < len; i++) {
        let value = null;

        if (!is.undefined(stdio_[i])) {
            value = stdio_[i];
        } else if (!is.undefined(options[alias[i]])) {
            value = options[alias[i]];
        }

        result[i] = value;
    }

    return result;
};

const pathKey = (opts) => {
    opts = opts || {};

    const env = opts.env || process.env;
    const platform = opts.platform || process.platform;

    if (platform !== "win32") {
        return "PATH";
    }

    return Object.keys(env).find((x) => x.toUpperCase() === "PATH") || "Path";
};

const env = (opts) => {
    opts = Object.assign({
        env: process.env
    }, opts);

    const env = Object.assign({}, opts.env);
    const path = pathKey({ env });
    opts = Object.assign({
        cwd: process.cwd(),
        path: env[path]
    }, opts);

    let prev;
    let pth = std.path.resolve(opts.cwd);
    const ret = [];

    while (prev !== pth) {
        ret.push(std.path.join(pth, "node_modules/.bin"));
        prev = pth;
        pth = std.path.resolve(pth, "..");
    }

    // ensure the running `node` binary is used
    ret.push(std.path.dirname(process.execPath));


    env[path] = ret.concat(opts.path).join(std.path.delimiter);

    return env;
};


const TEN_MEGABYTES = 1000 * 1000 * 10;

const handleArgs = (command, args, options) => {
    options = Object.assign({
        extendEnv: true,
        env: {}
    }, options);

    if (options.extendEnv) {
        options.env = Object.assign({}, process.env, options.env);
    }

    const parsed = spawn.parse(command, args, options);

    options = Object.assign({
        maxBuffer: TEN_MEGABYTES,
        buffer: true,
        stripLastNewline: true,
        preferLocal: true,
        localDir: parsed.options.cwd || process.cwd(),
        encoding: "utf8",
        reject: true,
        cleanup: true
    }, parsed.options, { windowsHide: true });

    options.stdio = stdio(options);

    if (options.preferLocal) {
        options.env = env(Object.assign({}, options, { cwd: options.localDir }));
    }

    if (options.detached) {
        // #115
        options.cleanup = false;
    }

    if (is.windows && std.path.basename(parsed.command) === "cmd.exe") {
        // #116
        parsed.args.unshift("/q");
    }

    return {
        command: parsed.command,
        args: parsed.args,
        options,
        parsed
    };
};

const handleInput = (spawned, opts) => {
    const input = opts.input;

    if (is.nil(input)) {
        return;
    }

    if (is.stream(input)) {
        input.pipe(spawned.stdin);
    } else {
        spawned.stdin.end(input);
    }
};

const handleOutput = (opts, val) => {
    if (val && opts.stripLastNewline) {
        val = adone.text.stripLastNewline(val);
    }

    return val;
};

const handleShell = (fn, command, options) => {
    return fn(command, Object.assign({}, options, { shell: true }));
};

const getStream = (process, stream, { encoding, buffer, maxBuffer }) => {
    if (!process[stream]) {
        return null;
    }

    let ret;

    if (!buffer) {
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

    return ret.catch((err) => {
        err.stream = stream;
        err.message = `${stream} ${err.message}`;
        throw err;
    });
};

const notFoundError = (command, syscall) => {
    const err = new Error(`${syscall} ${command} ENOENT`);
    err.code = err.errno = "ENOENT";
    err.syscall = `${syscall} ${command}`;

    return err;
};

const verifyENOENT = (status, parsed) => {
    if (is.windows && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawn");
    }

    return null;
};

const hookChildProcess = (cp, parsed) => {
    if (!is.windows) {
        return;
    }

    const originalEmit = cp.emit;
    cp.emit = function (name, arg1) {
        let err;

        // If emitting "exit" event and exit code is 1, we need to check if
        // the command exists and emit an "error" instead
        // See: https://github.com/IndigoUnited/node-cross-spawn/issues/16
        if (name === "  exit") {
            err = verifyENOENT(arg1, parsed, "spawn");

            if (err) {
                return originalEmit.call(cp, "error", err);
            }
        }

        return originalEmit.apply(cp, arguments);
    };
};

const getCode = ({ error = {} }, code) => {
    if (error.code) {
        return [error.code, std.os.constants.errno[error.code]];
    }

    if (is.integer(code)) {
        return [errname(-Math.abs(code)), Math.abs(code)];
    }

    return [];
};

const getErrorPrefix = ({ timedOut, timeout, signal, codeString, codeNumber }) => {
    if (timedOut) {
        return `timed out after ${timeout} milliseconds`;
    }

    if (signal) {
        return `was killed with ${signal}`;
    }

    if (!is.undefined(codeString) && !is.undefined(codeNumber)) {
        return `failed with exit code ${codeNumber} (${codeString})`;
    }

    if (!is.undefined(codeString)) {
        return `failed with exit code ${codeString}`;
    }

    if (!is.undefined(codeNumber)) {
        return `failed with exit code ${codeNumber}`;
    }

    return "failed";
};

const makeError = (result, options) => {
    const { stdout, stderr, code, signal } = result;

    let { error } = result;
    const { joinedCommand, timedOut, parsed: { options: { timeout } } } = options;

    const [codeString, codeNumber] = getCode(result, code);

    if (!(error instanceof Error)) {
        const message = [joinedCommand, stderr, stdout].filter(Boolean).join("\n");
        error = new Error(message);
    }

    const prefix = getErrorPrefix({ timedOut, timeout, signal, codeString, codeNumber });
    error.message = `Command ${prefix}: ${error.message}`;

    error.code = codeNumber || codeString;
    error.stdout = stdout;
    error.stderr = stderr;
    error.failed = true;
    error.signal = signal || null;
    error.cmd = joinedCommand;
    error.timedOut = Boolean(timedOut);

    return error;
};

export const exec = (cmd, args, opts) => {
    let joinedCommand = cmd;

    if (is.array(args) && args.length > 0) {
        joinedCommand += ` ${args.join(" ")}`;
    }

    const parsed = handleArgs(cmd, args, opts);
    const { encoding, buffer, maxBuffer } = parsed.options;

    let spawned;
    try {
        spawned = std.childProcess.spawn(parsed.command, parsed.args, parsed.options);
    } catch (err) {
        return Promise.reject(err);
    }

    let removeExitHandler;
    if (parsed.options.cleanup) {
        if (is.application(adone.app.runtime.app)) {
            removeExitHandler = adone.app.runtime.app.subscribe("exit", () => {
                spawned.kill();
            });
        } else {
            process.on("exit", () => {
                spawned.kill();
            });
        }
    }

    let timeoutId = null;
    let timedOut = false;

    const cleanup = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        if (removeExitHandler) {
            removeExitHandler();
        }
    };

    if (parsed.options.timeout > 0) {
        timeoutId = setTimeout(() => {
            timeoutId = null;
            timedOut = true;
            spawned.kill(parsed.options.killSignal);
        }, parsed.options.timeout);
    }

    const processDone = new Promise((resolve) => {
        spawned.on("exit", (code, signal) => {
            cleanup();
            resolve({ code, signal });
        });

        spawned.on("error", (err) => {
            cleanup();
            resolve({ error: err });
        });

        if (spawned.stdin) {
            spawned.stdin.on("error", (err) => {
                cleanup();
                resolve({ error: err });
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
    };

    const handlePromise = () => adone.promise.finally(Promise.all([
        processDone,
        getStream(spawned, "stdout", { encoding, buffer, maxBuffer }),
        getStream(spawned, "stderr", { encoding, buffer, maxBuffer })
    ]).then((arr) => {
        const result = arr[0];
        result.stdout = arr[1];
        result.stderr = arr[2];

        if (result.error || result.code !== 0 || !is.null(result.signal)) {
            const err = makeError(result, {
                joinedCommand,
                parsed,
                timedOut
            });

            // TODO: missing some timeout logic for killed
            // https://github.com/nodejs/node/blob/master/lib/child_process.js#L203
            // err.killed = spawned.killed || killed;
            err.killed = err.killed || spawned.killed;

            if (!parsed.options.reject) {
                return err;
            }

            throw err;
        }

        return {
            stdout: handleOutput(parsed.options, result.stdout),
            stderr: handleOutput(parsed.options, result.stderr),
            code: 0,
            failed: false,
            killed: false,
            signal: null,
            cmd: joinedCommand,
            timedOut: false
        };
    }), destroy);

    hookChildProcess(spawned, parsed.parsed);

    handleInput(spawned, parsed.options);

    spawned.then = (onfulfilled, onrejected) => handlePromise().then(onfulfilled, onrejected);
    spawned.catch = (onrejected) => handlePromise().catch(onrejected);
    spawned.finally = (onfinally) => handlePromise().finally(onfinally);

    return spawned;
};

export const execStdout = (...args) => {
    // TODO: set `stderr: 'ignore'` when that option is implemented
    return exec.apply(null, args).then((x) => x.stdout);
};

export const execStderr = (...args) => {
    // TODO: set `stdout: 'ignore'` when that option is implemented
    return exec.apply(null, args).then((x) => x.stderr);
};

export const shell = (cmd, opts) => handleShell(exec, cmd, opts);

export const execSync = (cmd, args, opts) => {
    const parsed = handleArgs(cmd, args, opts);

    if (is.stream(parsed.options.input)) {
        throw new TypeError("The `input` option cannot be a stream in sync mode");
    }

    const result = std.childProcess.spawnSync(parsed.command, parsed.args, parsed.options);

    if (result.error || result.status !== 0) {
        throw (result.error || new Error(result.stderr === "" ? result.stdout : result.stderr));
    }

    result.stdout = handleOutput(parsed.options, result.stdout);
    result.stderr = handleOutput(parsed.options, result.stderr);

    return result;
};

export const shellSync = (cmd, opts) => handleShell(execSync, cmd, opts);
