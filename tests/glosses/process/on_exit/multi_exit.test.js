const {
    std: { childProcess: { exec } }
} = adone;

const isWindows = process.platform === "win32";
const shell = isWindows ? null : { shell: "/bin/bash" };
const node = isWindows ? `"${process.execPath}"` : process.execPath;

const fixture = require.resolve("./fixtures/change-code.js");
const expect = require("./fixtures/change-code-expect.json");

// process.exit(code), process.exitCode = code, normal exit
const types = ["explicit", "normal", "code"];

// initial code that is set.  Note, for 'normal' exit, there's no
// point doing these, because we just exit without modifying code
const codes = [0, 2, "null"];

// do not change, change to 5 with exit(), change to 5 with exitCode,
// change to 5 and then to 2 with exit(), change twice with exitcode
const changes = ["nochange", "change", "twice", "code", "twicecode"];

// use signal-exit, use process.on('exit')
const handlers = ["sigexit", "nosigexit"];

const opts = [];
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

describe("process", "onExit", "multi exit", () => {
    opts.forEach((opt) => {
        it(opt, (done) => {
            const cmd = `${node} ${fixture} ${opt}`;
            exec(cmd, shell, (err, stdout, stderr) => {
                const res = JSON.parse(stdout);
                if (err) {
                    res.actualCode = err.code;
                    res.actualSignal = err.signal;
                } else {
                    res.actualCode = 0;
                    res.actualSignal = null;
                }
                res.stderr = stderr.trim().split("\n");
                assert.deepEqual(res, expect[opt]);
                done();
            });
        });
    });
});
