const {
    is
} = adone;

const __ = adone.lazify({
    getChildPids: "./get_child_pids",
    getPidByPort: ["./get_pid", (mod) => mod.getPidByPort],
    getPidsByPorts: ["./get_pid", (mod) => mod.getPidsByPorts],
    getAllPidsByPorts: ["./get_pid", (mod) => mod.getAllPidsByPorts],
    exec: ["./exec", (mod) => mod.exec],
    execSync: ["./exec", (mod) => mod.execSync],
    execStdout: ["./exec", (mod) => mod.execStdout],
    execStderr: ["./exec", (mod) => mod.execStderr],
    shell: ["./exec", (mod) => mod.shell],
    shellSync: ["./exec", (mod) => mod.shellSync],
    spawn: ["./spawn", (mod) => mod.spawn],
    spawnSync: ["./spawn", (mod) => mod.spawnSync],
    exists: "./exists",
    list: "./list",
    kill: "./kill"
}, adone.asNamespace(exports), require);

export const errname = (code) => adone.std.util.getSystemErrorName(code);

adone.lazifyPrivate({
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
