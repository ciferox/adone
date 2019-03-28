const { once } = require("./helper");
const writer = require("flush-write-stream");

const {
    std: { path: { join } }
} = adone;

describe("fastLogger", "stdout protection", () => {
    it("do not use SonicBoom is someone tampered with process.stdout.write", async () => {
        let actual = "";
        const child = forkProcess(join(__dirname, "fixtures", "stdout_hack_protection.js"), [], { silent: true });
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.isNotNull(actual.match(/^hack/));
    });
    
});
