const {
    is
} = adone;

const __ = adone.lazify({
    getChildPids: "./get_child_pids",
    getPidByPort: ["./get_pid", "getPidByPort"],
    getPidsByPorts: ["./get_pid", "getPidsByPorts"],
    getAllPidsByPorts: ["./get_pid", "getAllPidsByPorts"],
    command: ["execa", "command"],
    commandSync: ["execa", "commandSync"],
    exec: "execa",
    execSync: ["execa", "sync"],
    node: ["execa", "node"],
    spawn: ["cross-spawn", "spawn"],
    spawnSync: ["cross-spawn", "sync"],
    exists: "./exists",
    list: "./list",
    kill: "./kill",
    onExit: "./on_exit"
}, adone.asNamespace(exports), require);

export const spawnAsync = function (command, args, options) {
    const cp = __.spawn(command, args, options);

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

export const errname = (code) => adone.std.util.getSystemErrorName(code);

adone.lazifyp({
    platformGetList: () => {
        return is.darwin
            ? () => __.execStdout("netstat", ["-anv", "-p", "tcp"])
                .then((data) => Promise.all([data, __.execStdout("netstat", ["-anv", "-p", "udp"])]))
                .then((data) => data.join("\n"))
            : is.linux
                ? () => __.execStdout("ss", ["-tunlp"])
                : () => __.execStdout("netstat", ["-ano"]);
    },
    checkProc: () => (proc, x) => {
        if (is.string(proc)) {
            return x.name === proc;
        }

        return x.pid === proc;
    }
}, exports);
