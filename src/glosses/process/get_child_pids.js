const {
    is,
    process: { exec }
} = adone;

export default async (pid) => {
    let headers = null;

    if (is.number(pid)) {
        pid = pid.toString();
    }

    if (!is.string(pid)) {
        pid = process.pid.toString();
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
        if (!is.windows) {
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

    let child;
    if (is.windows) {
        // See also: https://github.com/nodejs/node-v0.x-archive/issues/2318
        child = exec("wmic.exe", ["PROCESS", "GET", "Name,ProcessId,ParentProcessId,Status"], {
            __winShell: true
        });
    } else {
        child = exec("ps", ["-A", "-o", "ppid,pid,stat,comm"]);
    }
    const techPid = child.pid.toString();
    const stdout = (await child).stdout;

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
            proc[h.shift().toLowerCase()] = h.length ? columns.shift() : columns.join(" ");
        }

        if (parents.includes(proc.ppid)) {
            parents.push(proc.pid);
            childPids.push(proc);
        }
    }

    // If we objain childs of current process then we need exclude ps/wmic.exe
    if (pid === process.pid.toString()) {
        return childPids.filter((x) => x.pid !== techPid);
    }

    return childPids;
};
