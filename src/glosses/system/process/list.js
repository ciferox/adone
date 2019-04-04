const {
    is,
    std
} = adone;

const timeToSeconds = (str) => {
    const parts = str.split(":");
    let sec = 0;
    let min = 1;

    while (parts.length > 0) {
        sec += min * parseInt(parts.pop(), 10);
        min *= 60;
    }

    return sec;
};

const TEN_MEGABYTE = 1000 * 1000 * 10;

const listWindows = async ({ system, username, password, filter, verbose = false } = {}) => {
    const args = ["/v", "/nh", "/fo", "csv"];

    if (system && username && password) {
        args.push(
            "/s", system,
            "/u", username,
            "/p", password
        );
    }

    if (is.array(filter)) {
        for (const filter of filter) {
            args.push("/fi", filter);
        }
    }

    const defaultHeaders = [
        "imageName",
        "pid",
        "sessionName",
        "sessionNumber",
        "memUsage"
    ];

    const verboseHeaders = defaultHeaders.concat([
        "status",
        "username",
        "cpuTime",
        "windowTitle"
    ]);

    const headers = verbose ? verboseHeaders : defaultHeaders;

    const stdout = await new Promise((resolve, reject) => {
        std.childProcess.execFile("tasklist", args, (err, stdout) => {
            if (err) {
                return reject(err);
            }
            resolve(stdout);
        });
    });

    return (await (stdout.startsWith("INFO:") ? [] : adone.util.csv.parse(stdout, { headers }))).map((task) => {
        // Normalize task props
        task.pid = Number(task.pid);
        task.sessionNumber = Number(task.sessionNumber);
        task.memUsage = Number(task.memUsage.replace(/[^\d]/g, "")) * 1024;

        if (verbose) {
            task.cpuTime = timeToSeconds(task.cpuTime);
        }

        return {
            pid: task.pid,
            name: task.imageName,
            cmd: task.imageName
        };
    });
};

const listDefault = ({ all } = {}) => {
    const ret = {};
    const flags = `${all === false ? "" : "a"}wwxo`;

    return Promise.all(["comm", "args", "%cpu"].map((cmd) => {
        return new Promise((resolve, reject) => {
            std.childProcess.execFile("ps", [flags, `pid,${cmd}`], {
                maxBuffer: TEN_MEGABYTE
            }, (err, stdout) => (err) ? reject(err) : resolve(stdout));
        }).then((stdout) => {
            for (let line of stdout.trim().split("\n").slice(1)) {
                line = line.trim();
                const pid = line.split(" ", 1)[0];
                const val = line.slice(pid.length + 1).trim();

                if (is.undefined(ret[pid])) {
                    ret[pid] = {};
                }

                ret[pid][cmd] = val;
            }
        });
    })).then(() => {
        // Filter out inconsistencies as there might be race
        // issues due to differences in `ps` between the spawns
        return Object.keys(ret).filter((x) => ret[x].comm && ret[x].args).map((x) => {
            return {
                pid: parseInt(x, 10),
                name: std.path.basename(ret[x].comm),
                cmd: ret[x].args,
                cpu: ret[x]["%cpu"]
            };
        });
    });
};

const list = is.windows ? listWindows : listDefault;
export default list;
