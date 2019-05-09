const {
    is
} = adone;

const __ = adone.lazify({
    getChildPids: "./get_child_pids",
    getPidByPort: ["./get_pid", "getPidByPort"],
    getPidsByPorts: ["./get_pid", "getPidsByPorts"],
    getAllPidsByPorts: ["./get_pid", "getAllPidsByPorts"],
    exec: ["./exec", "exec"],
    execSync: ["./exec", "execSync"],
    execStdout: ["./exec", "execStdout"],
    execStderr: ["./exec", "execStderr"],
    shell: ["./exec", "shell"],
    shellSync: ["./exec", "shellSync"],
    spawn: ["./spawn", "spawn"],
    spawnAsync: ["./spawn", "spawnAsync"],
    spawnSync: ["./spawn", "spawnSync"],
    exists: "./exists",
    list: "./list",
    kill: "./kill",
    onExit: "./on_exit"
}, adone.asNamespace(exports), require);

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
