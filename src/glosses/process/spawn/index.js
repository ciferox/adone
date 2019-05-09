const {
    std: { childProcess }
} = adone;

export const parse = require("./parse");
export const enoent = require("./enoent");

export const spawn = function (command, args, options) {
    // Parse the arguments
    const parsed = parse(command, args, options);

    // Spawn the child process
    const spawned = childProcess.spawn(parsed.command, parsed.args, parsed.options);

    // Hook into child process "exit" event to emit an error if the command
    // does not exists, see: https://github.com/IndigoUnited/node-cross-spawn/issues/16
    enoent.hookChildProcess(spawned, parsed);

    return spawned;
};
spawn.parse = parse;
spawn.enoent = enoent;

export const spawnSync = function (command, args, options) {
    // Parse the arguments
    const parsed = parse(command, args, options);

    // Spawn the child process
    const result = childProcess.spawnSync(parsed.command, parsed.args, parsed.options);

    // Analyze if the command does not exist, see: https://github.com/IndigoUnited/node-cross-spawn/issues/16
    result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);

    return result;
};

export const spawnAsync = function (command, args, options) {
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

            stdout = stdout && stdout.toString();
            stderr = stderr && stderr.toString();

            if (code !== 0) {
                reject(Object.assign(new Error(`Command failed, exited with code #${code}`), {
                    exitCode: code,
                    stdout,
                    stderr
                }));
                return;
            }
            resolve({
                stdout,
                stderr
            });
        };

        cp
            .on("error", onError)
            .on("close", onClose);
    });

    promise.cp = cp;

    return promise;
};
