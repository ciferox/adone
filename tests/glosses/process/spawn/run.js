const {
    is,
    process: { spawn, spawnSync }
} = adone;

export const isForceShell = (method) => /-force-shell$/.test(method);

export const isMethodSync = (method) => /^sync(-|$)/.test(method);

const resolveRun = function (exitCode, stdout, stderr) {
    stdout = stdout && stdout.toString();
    stderr = stderr && stderr.toString();

    if (exitCode !== 0) {
        return Object.assign(new Error(`Command failed, exited with code #${exitCode}`), {
            exitCode,
            stdout,
            stderr
        });
    }

    return {
        stdout,
        stderr
    };
};

const runSync = function (command, args, options) {
    const { error, status, stdout, stderr } = spawnSync(command, args, options);

    if (error) {
        throw error;
    }

    const resolved = resolveRun(status, stdout, stderr);

    if (resolved instanceof Error) {
        throw resolved;
    }

    return resolved;
};

const runAsync = function (command, args, options) {
    const cp = spawn(command, args, options);

    const promise = new Promise((resolve, reject) => {
        let stdout = null;
        let stderr = null;

        cp.stdout && cp.stdout.on("data", (data) => {
            stdout = stdout || Buffer.from("");
            stdout = Buffer.concat([stdout, data]);
        });

        cp.stderr && cp.stderr.on("data", (data) => {
            stderr = stderr || Buffer.from("");
            stderr = Buffer.concat([stderr, data]);
        });

        const cleanupListeners = () => {
            cp.removeListener("error", onError);
            cp.removeListener("close", onClose);
        };

        const onError = (err) => {
            cleanupListeners();
            reject(err);
        };

        const onClose = (code) => {
            cleanupListeners();

            const resolved = resolveRun(code, stdout, stderr);

            if (resolved instanceof Error) {
                reject(resolved);
            } else {
                resolve(resolved);
            }
        };

        cp
            .on("error", onError)
            .on("close", onClose);
    });

    promise.cp = cp;

    return promise;
};

export const run = function (method, command, args, options) {
    // Are we forcing the shell?
    if (isForceShell(method)) {
        if (args && !is.array(args)) {
            options = args;
            args = null;
        }

        method = method.replace(/-force-shell$/, "");
        options = { forceShell: true, ...options };
    }

    // Run sync version
    return method === "sync" ?
        runSync(command, args, options) :
        runAsync(command, args, options);
};

export const methods = ["spawn-force-shell", "spawn", "sync-force-shell", "sync"];
