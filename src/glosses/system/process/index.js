const {
    is
} = adone;

// The Node team wants to deprecate `process.bind(...)`.
//   https://github.com/nodejs/node/pull/2768
//
// However, we need the 'uv' binding for errname support.
// This is a defensive wrapper around it so `execa` will not fail entirely if it stops working someday.
//
// If this ever stops working. See: https://github.com/sindresorhus/execa/issues/31#issuecomment-215939939 for another possible solution.
let uv;

try {
    uv = process.binding("uv");

    if (!is.function(uv.errname)) {
        throw new TypeError("uv.errname is not a function");
    }
} catch (err) {
    adone.error("execa/lib/errname: unable to establish process.binding('uv')", err);
    uv = null;
}

const uvErrname = (uv, code) => {
    if (uv) {
        return uv.errname(code);
    }

    if (!(code < 0)) {
        throw new Error("err >= 0");
    }

    return `Unknown system error ${code}`;
};

export const errname = (code) => uvErrname(uv, code);
// Used for testing the fallback behavior
export const errnameFallback = uvErrname;

const alias = ["stdin", "stdout", "stderr"];

const hasAlias = (opts) => alias.some((x) => Boolean(opts[x]));

export const stdio = (opts) => {
    if (!opts) {
        return null;
    }

    if (opts.stdio && hasAlias(opts)) {
        throw new Error(`It's not possible to provide \`stdio\` in combination with one of ${alias.map((x) => `\`${x}\``).join(", ")}`);
    }

    if (is.string(opts.stdio)) {
        return opts.stdio;
    }

    const stdio_ = opts.stdio || [];

    if (!is.array(stdio_)) {
        throw new TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof stdio_}\``);
    }

    const result = [];
    const len = Math.max(stdio_.length, alias.length);

    for (let i = 0; i < len; i++) {
        let value = null;

        if (!is.undefined(stdio_[i])) {
            value = stdio_[i];
        } else if (!is.undefined(opts[alias[i]])) {
            value = opts[alias[i]];
        }

        result[i] = value;
    }

    return result;
};

const commandCache = new adone.collection.LRU({ max: 50, maxAge: 30 * 1000 }); // Cache just for 30sec

const resolveCommand = (command, noExtension) => {
    let resolved;

    noExtension = Boolean(noExtension);
    resolved = commandCache.get(`${command}!${noExtension}`);

    // Check if its resolved in the cache
    if (commandCache.has(command)) {
        return commandCache.get(command);
    }

    try {
        resolved = !noExtension ? adone.fs.whichSync(command) : adone.fs.whichSync(command, { pathExt: adone.std.path.delimiter + (process.env.PATHEXT || "") });
    } catch (e) { /* empty */ }

    commandCache.set(`${command}!${noExtension}`, resolved);

    return resolved;
};

// See: https://github.com/IndigoUnited/node-cross-spawn/pull/34#issuecomment-221623455
const hasEmptyArgumentBug = () => {
    if (!is.windows) {
        return false;
    }

    const nodeVer = process.version.substr(1).split(".").map((num) => {
        return parseInt(num, 10);
    });

    return (nodeVer[0] === 0 && nodeVer[1] < 12);
};

const escapeArgument = (arg, quote) => {
    // Convert to string
    arg = String(arg);

    // If we are not going to quote the argument,
    // escape shell metacharacters, including double and single quotes:
    if (!quote) {
        arg = arg.replace(/([()%!^<>&|;,"'\s])/g, "^$1");
    } else {
        // Sequence of backslashes followed by a double quote:
        // double up all the backslashes and escape the double quote
        arg = arg.replace(/(\\*)"/g, '$1$1\\"');

        // Sequence of backslashes followed by the end of the string
        // (which will become a double quote later):
        // double up all the backslashes
        arg = arg.replace(/(\\*)$/, "$1$1");

        // All other backslashes occur literally

        // Quote the whole thing:
        arg = `"${arg}"`;
    }

    return arg;
};

const escapeCommand = (command) => {
    // Do not escape if this command is not dangerous..
    // We do this so that commands like "echo" or "ifconfig" work
    // Quoting them, will make them unaccessible
    return /^[a-z0-9_-]+$/i.test(command) ? command : escapeArgument(command, true);
};



const shebangCache = new adone.collection.LRU({ max: 50, maxAge: 30 * 1000 }); // Cache just for 30sec

const readShebang = (command) => {
    let fd;

    // Check if it is in the cache first
    if (shebangCache.has(command)) {
        return shebangCache.get(command);
    }

    // Read the first 150 bytes from the file
    const buffer = Buffer.allocUnsafe(150);

    try {
        fd = adone.std.fs.openSync(command, "r");
        adone.std.fs.readSync(fd, buffer, 0, 150, 0);
        adone.std.fs.closeSync(fd);
    } catch (e) { /* empty */ }

    // Attempt to extract shebang (null is returned if not a shebang)
    const shebang = adone.util.shebang.command(buffer.toString());

    // Store the shebang in the cache
    shebangCache.set(command, shebang);

    return shebang;
};

const skipShellRegExp = /\.(?:com|exe)$/i;

// Supported in Node >= 6 and >= 4.8
const supportsShellOption = parseInt(process.version.substr(1).split(".")[0], 10) >= 6 ||
    parseInt(process.version.substr(1).split(".")[0], 10) === 4 && parseInt(process.version.substr(1).split(".")[1], 10) >= 8;

const parseNonShell = (parsed) => {
    let needsShell;
    let applyQuotes;

    if (!is.windows) {
        return parsed;
    }

    // Detect & add support for shebangs
    parsed.file = resolveCommand(parsed.command);
    parsed.file = parsed.file || resolveCommand(parsed.command, true);
    const shebang = parsed.file && readShebang(parsed.file);

    if (shebang) {
        parsed.args.unshift(parsed.file);
        parsed.command = shebang;
        needsShell = hasEmptyArgumentBug || !skipShellRegExp.test(resolveCommand(shebang) || resolveCommand(shebang, true));
    } else {
        needsShell = hasEmptyArgumentBug || !skipShellRegExp.test(parsed.file);
    }

    // If a shell is required, use cmd.exe and take care of escaping everything correctly
    if (needsShell) {
        // Escape command & arguments
        applyQuotes = (parsed.command !== "echo"); // Do not quote arguments for the special "echo" command
        parsed.command = escapeCommand(parsed.command);
        parsed.args = parsed.args.map((arg) => {
            return escapeArgument(arg, applyQuotes);
        });

        // Make use of cmd.exe
        parsed.args = ["/d", "/s", "/c", `"${parsed.command}${parsed.args.length ? ` ${parsed.args.join(" ")}` : ""}"`];
        parsed.command = process.env.comspec || "cmd.exe";
        parsed.options.windowsVerbatimArguments = true; // Tell node's spawn that the arguments are already escaped
    }

    return parsed;
};

const parseShell = (parsed) => {
    // If node supports the shell option, there's no need to mimic its behavior
    if (supportsShellOption) {
        return parsed;
    }

    // Mimic node shell option, see: https://github.com/nodejs/node/blob/b9f6a2dc059a1062776133f3d4fd848c4da7d150/lib/child_process.js#L335
    const shellCommand = [parsed.command].concat(parsed.args).join(" ");

    if (is.windows) {
        parsed.command = is.string(parsed.options.shell) ? parsed.options.shell : process.env.comspec || "cmd.exe";
        parsed.args = ["/d", "/s", "/c", `"${shellCommand}"`];
        parsed.options.windowsVerbatimArguments = true; // Tell node's spawn that the arguments are already escaped
    } else {
        if (is.string(parsed.options.shell)) {
            parsed.command = parsed.options.shell;
        } else if (process.platform === "android") {
            parsed.command = "/system/bin/sh";
        } else {
            parsed.command = "/bin/sh";
        }

        parsed.args = ["-c", shellCommand];
    }

    return parsed;
};

const parse = (command, args, options) => {
    // Normalize arguments, similar to nodejs
    if (args && !is.array(args)) {
        options = args;
        args = null;
    }

    args = args ? args.slice(0) : []; // Clone array to avoid changing the original
    options = options || {};

    // Build our parsed object
    const parsed = {
        command,
        args,
        options,
        file: undefined,
        original: command
    };

    // Delegate further parsing to shell or non-shell
    return options.shell ? parseShell(parsed) : parseNonShell(parsed);
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
    let pth = adone.std.path.resolve(opts.cwd);
    const ret = [];

    while (prev !== pth) {
        ret.push(adone.std.path.join(pth, "node_modules/.bin"));
        prev = pth;
        pth = adone.std.path.resolve(pth, "..");
    }

    // ensure the running `node` binary is used
    ret.push(adone.std.path.dirname(process.execPath));


    env[path] = ret.concat(opts.path).join(adone.std.path.delimiter);

    return env;
};


const TEN_MEGABYTES = 1000 * 1000 * 10;

const handleArgs = (cmd, args, opts) => {
    let parsed;

    opts = Object.assign({
        extendEnv: true,
        env: {}
    }, opts);

    if (opts.extendEnv) {
        opts.env = Object.assign({}, process.env, opts.env);
    }

    if (opts.__winShell === true) {
        delete opts.__winShell;
        parsed = {
            command: cmd,
            args,
            options: opts,
            file: cmd,
            original: cmd
        };
    } else {
        parsed = parse(cmd, args, opts);
    }

    opts = Object.assign({
        maxBuffer: TEN_MEGABYTES,
        stripEof: true,
        preferLocal: true,
        localDir: parsed.options.cwd || process.cwd(),
        encoding: "utf8",
        reject: true,
        cleanup: true
    }, parsed.options);

    opts.stdio = stdio(opts);

    if (opts.preferLocal) {
        opts.env = env(Object.assign({}, opts, { cwd: opts.localDir }));
    }

    return {
        cmd: parsed.command,
        args: parsed.args,
        opts,
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
    if (val && opts.stripEof) {
        val = adone.text.stripEof(val);
    }

    return val;
};

const handleShell = (fn, cmd, opts) => {
    let file = "/bin/sh";
    let args = ["-c", cmd];

    opts = Object.assign({}, opts);

    if (is.windows) {
        opts.__winShell = true;
        file = process.env.comspec || "cmd.exe";
        args = ["/s", "/c", `"${cmd}"`];
        opts.windowsVerbatimArguments = true;
    }

    if (opts.shell) {
        file = opts.shell;
        delete opts.shell;
    }

    return fn(file, args, opts);
};

const getStream = (process, stream, encoding, maxBuffer) => {
    if (!process[stream]) {
        return null;
    }

    let ret;

    if (encoding) {
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
        if (name === "exit") {
            err = verifyENOENT(arg1, parsed, "spawn");

            if (err) {
                return originalEmit.call(cp, "error", err);
            }
        }

        return originalEmit.apply(cp, arguments);
    };
};

const makeError = (result, options) => {
    const stdout = result.stdout;
    const stderr = result.stderr;

    let err = result.error;
    const code = result.code;
    const signal = result.signal;

    const parsed = options.parsed;
    const joinedCmd = options.joinedCmd;
    const timedOut = options.timedOut || false;

    if (!err) {
        let output = "";

        if (is.array(parsed.opts.stdio)) {
            if (parsed.opts.stdio[2] !== "inherit") {
                output += output.length > 0 ? stderr : `\n${stderr}`;
            }

            if (parsed.opts.stdio[1] !== "inherit") {
                output += `\n${stdout}`;
            }
        } else if (parsed.opts.stdio !== "inherit") {
            output = `\n${stderr}${stdout}`;
        }

        err = new Error(`Command failed: ${joinedCmd}${output}`);
        err.code = code < 0 ? errname(code) : code;
    }

    err.stdout = stdout;
    err.stderr = stderr;
    err.failed = true;
    err.signal = signal || null;
    err.cmd = joinedCmd;
    err.timedOut = timedOut;

    return err;
};

export const exec = (cmd, args, opts) => {
    let joinedCmd = cmd;

    if (is.array(args) && args.length > 0) {
        joinedCmd += ` ${args.join(" ")}`;
    }

    const parsed = handleArgs(cmd, args, opts);
    const encoding = parsed.opts.encoding;
    const maxBuffer = parsed.opts.maxBuffer;

    let spawned;
    try {
        spawned = adone.std.child_process.spawn(parsed.cmd, parsed.args, parsed.opts);
    } catch (err) {
        return Promise.reject(err);
    }

    let removeExitHandler;
    if (parsed.opts.cleanup) {
        removeExitHandler = adone.runtime.app.subscribe("exit", () => {
            spawned.kill();
        });
    }

    let timeoutId = null;
    let timedOut = false;

    const cleanupTimeout = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    if (parsed.opts.timeout > 0) {
        timeoutId = setTimeout(() => {
            timeoutId = null;
            timedOut = true;
            spawned.kill(parsed.opts.killSignal);
        }, parsed.opts.timeout);
    }

    const processDone = new Promise((resolve) => {
        spawned.on("exit", (code, signal) => {
            cleanupTimeout();
            resolve({ code, signal });
        });

        spawned.on("error", (err) => {
            cleanupTimeout();
            resolve({ error: err });
        });

        if (spawned.stdin) {
            spawned.stdin.on("error", (err) => {
                cleanupTimeout();
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
        getStream(spawned, "stdout", encoding, maxBuffer),
        getStream(spawned, "stderr", encoding, maxBuffer)
    ]).then((arr) => {
        const result = arr[0];
        result.stdout = arr[1];
        result.stderr = arr[2];

        if (removeExitHandler) {
            removeExitHandler();
        }

        if (result.error || result.code !== 0 || !is.null(result.signal)) {
            const err = makeError(result, {
                joinedCmd,
                parsed,
                timedOut
            });

            // TODO: missing some timeout logic for killed
            // https://github.com/nodejs/node/blob/master/lib/child_process.js#L203
            // err.killed = spawned.killed || killed;
            err.killed = err.killed || spawned.killed;

            if (!parsed.opts.reject) {
                return err;
            }

            throw err;
        }

        return {
            stdout: handleOutput(parsed.opts, result.stdout),
            stderr: handleOutput(parsed.opts, result.stderr),
            code: 0,
            failed: false,
            killed: false,
            signal: null,
            cmd: joinedCmd,
            timedOut: false
        };
    }), destroy);

    hookChildProcess(spawned, parsed.parsed);

    handleInput(spawned, parsed.opts);

    spawned.then = (onfulfilled, onrejected) => handlePromise().then(onfulfilled, onrejected);
    spawned.catch = (onrejected) => handlePromise().catch(onrejected);

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

    if (is.stream(parsed.opts.input)) {
        throw new TypeError("The `input` option cannot be a stream in sync mode");
    }

    const result = adone.std.child_process.spawnSync(parsed.cmd, parsed.args, parsed.opts);

    if (result.error || result.status !== 0) {
        throw (result.error || new Error(result.stderr === "" ? result.stdout : result.stderr));
    }

    result.stdout = handleOutput(parsed.opts, result.stdout);
    result.stderr = handleOutput(parsed.opts, result.stderr);

    return result;
};

export const shellSync = (cmd, opts) => handleShell(execSync, cmd, opts);

export const exists = (pid) => {
    try {
        return process.kill(pid, 0);
    } catch (e) {
        return e.code === "EPERM";
    }
};

export const getChildPids = async (pid) => {
    let headers = null;

    if (is.number(pid)) {
        pid = pid.toString();
    }

    //
    // The `ps-tree` module behaves differently on *nix vs. Windows
    // by spawning different programs and parsing their output.
    //
    // Linux:
    // 1. " <defunct> " need to be striped
    // ```bash
    // $ ps -A -o comm,ppid,pid,stat
    // COMMAND          PPID   PID STAT
    // bbsd             2899 16958 Ss
    // watch <defunct>  1914 16964 Z
    // ps              20688 16965 R+
    // ```
    //
    // Win32:
    // 1. wmic PROCESS WHERE ParentProcessId=4604 GET Name,ParentProcessId,ProcessId,Status)
    // 2. The order of head columns is fixed
    // ```shell
    // > wmic PROCESS GET Name,ProcessId,ParentProcessId,Status
    // Name                          ParentProcessId  ProcessId   Status
    // System Idle Process           0                0
    // System                        0                4
    // smss.exe                      4                228
    // ```

    const normalizeHeader = (str) => {
        if (!is.win32) {
            return str;
        }

        switch (str) {
            case "Name":
                return "command";
            case "ParentProcessId":
                return "ppid";
            case "ProcessId":
                return "pid";
            case "Status":
                return "stat";
            default:
                throw new Error(`Unknown process listing header: ${str}`);
        }
    };

    let stdout;
    if (is.win32) {
        // See also: https://github.com/nodejs/node-v0.x-archive/issues/2318
        stdout = await execStdout("wmic.exe", ["PROCESS", "GET", "Name,ProcessId,ParentProcessId,Status"]);
    } else {
        stdout = await execStdout("ps", ["-A", "-o", "ppid,pid,stat,comm"]);
    }

    const lines = stdout.split(/\r?\n/);
    const childPids = [];
    const parents = [pid];

    for (const line of lines) {
        const columns = line.trim().split(/\s+/);
        if (!headers) {
            headers = columns;

            // Rename Win32 header name, to as same as the linux, for compatible.
            headers = headers.map(normalizeHeader);
            continue;
        }

        const proc = {};
        const h = headers.slice();
        while (h.length) {
            proc[h.shift()] = h.length ? columns.shift() : columns.join(" ");
        }

        if (parents.includes(proc.PPID)) {
            parents.push(proc.PID);
            childPids.push(proc);
        }
    }

    return childPids;
};

export const kill = (input, { force = false, tree = true, windows } = {}) => {
    const fn = is.win32 ? (input) => {
        const args = [];

        if (is.plainObject(windows) && windows.system && windows.username && windows.password) {
            args.push("/s", windows.system, "/u", windows.username, "/p", windows.password);
        }

        if (windows.filter) {
            args.push("/fi", windows.filter);
        }

        if (force) {
            args.push("/f");
        }

        if (tree) {
            args.push("/t");
        }

        input.forEach((x) => args.push(is.numeral(x) ? "/pid" : "/im", x));

        return exec("taskkill", args);
    } : (input) => {
        const cmd = is.numeral(input) ? "kill" : "killall";

        if (tree && is.numeral(input)) {
            return getChildPids(input).then((children) => {
                const pids = children.map((child) => child.PID);
                pids.push(input);
                if (force) {
                    pids.unshift("-9");
                }
                return exec(cmd, pids);
            });
        }

        if (force) {
            return exec(cmd, ["-9", input]);
        }
        return exec(cmd, [input]);
    };
    const errors = [];

    // Don't kill ourselves
    input = adone.util.arrify(input).filter((x) => x !== process.pid);

    return Promise.all(input.map((input) => {
        return fn(input).catch((err) => {
            errors.push(`Killing process ${input} failed: ${err.message.replace(/.*\n/, "").replace(/kill: \d+: /, "").trim()}`);
        });
    })).then(() => {
        if (errors.length > 0) {
            throw new adone.x.AggregateException(errors);
        }
    });
};
