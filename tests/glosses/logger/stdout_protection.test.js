const { join } = require("path");
const { fork } = require("child_process");
const { once } = require("./helper");
const writer = require("flush-write-stream");

describe("stdout protection", () => {
    it("do not use SonicBoom is someone tampered with process.stdout.write", async () => {
        let actual = "";
        const child = fork(join(__dirname, "fixtures", "stdout_hack_protection.js"), { silent: true });
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/^hack/), null);
    });    
});
