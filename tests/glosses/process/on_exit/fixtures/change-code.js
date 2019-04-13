require("a");

const {
    std: { path: { join }, childProcess: { exec } }
} = adone;

const results = {};
const opts = [];


const listener = function (code, signal) {
    signal = signal || null;
    console.log("%j", { code, signal, exitCode: process.exitCode || 0 });
};

const run = function (opt) {
    console.error(opt);
    const shell = process.platform === "win32" ? null : { shell: "/bin/bash" };
    exec(join(process.execPath, " ", __filename, ` ${opt}`), shell, (err, stdout, stderr) => {
        const res = JSON.parse(stdout);
        if (err) {
            res.actualCode = err.code;
            res.actualSignal = err.signal;
        } else {
            res.actualCode = 0;
            res.actualSignal = null;
        }
        res.stderr = stderr.trim().split("\n");
        results[opt] = res;
        if (opts.length) {
            run(opts.shift());
        } else {
            console.log(JSON.stringify(results, null, 2));
        }
    });
};

if (process.argv.length === 2) {
    const types = ["explicit", "code", "normal"];
    const codes = [0, 2, "null"];
    const changes = ["nochange", "change", "code", "twice", "twicecode"];
    const handlers = ["sigexit", "nosigexit"];
    types.forEach((type) => {
        const testCodes = type === "normal" ? [0] : codes;
        testCodes.forEach((code) => {
            changes.forEach((change) => {
                handlers.forEach((handler) => {
                    opts.push([type, code, change, handler].join(" "));
                });
            });
        });
    });


    run(opts.shift());
} else {
    const type = process.argv[2];
    const code = Number(process.argv[3]);
    const change = process.argv[4];
    const sigexit = process.argv[5] !== "nosigexit";

    if (sigexit) {
        adone.process.onExit(listener);
    } else {
        process.on("exit", listener);
    }

    process.on("exit", (code) => {
        console.error("first code=%j", code);
    });

    if (change !== "nochange") {
        process.once("exit", (code) => {
            console.error("set code from %j to %j", code, 5);
            if (change === "code" || change === "twicecode") {
                process.exitCode = 5;
            } else {
                process.exit(5);
            }
        });
        if (change === "twicecode" || change === "twice") {
            process.once("exit", (code) => {
                code = process.exitCode || code;
                console.error("set code from %j to %j", code, code + 1);
                process.exit(code + 1);
            });
        }
    }

    process.on("exit", (code) => {
        console.error("second code=%j", code);
    });

    if (type === "explicit") {
        if (code || code === 0) {
            process.exit(code);
        } else {
            process.exit();
        }
    } else if (type === "code") {
        process.exitCode = Number(code) || 0;
    }
}
