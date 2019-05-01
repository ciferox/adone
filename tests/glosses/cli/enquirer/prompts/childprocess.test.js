const path = require("path");
const { fork } = require("child_process");

describe("child_process", () => {
    it("should works in child_process", (cb) => {
        const cmd = fork(path.resolve(__dirname, "../support/child_process.js"), [], {
            silent: true
        });

        let stdout = "";
        let stderr = "";
        cmd.stdout.on("data", (buf) => {
            const data = buf.toString();
            stdout += data;
            if (data.includes("color")) {
                cmd.stdin.write("orange\n"); 
            }
        });

        cmd.stderr.on("data", (buf) => {
            stderr += buf.toString();
        });

        cmd.on("close", () => {
            assert(!stderr);
            assert(stdout.includes("color: 'orange'"));
            cb();
        });
    });
});
