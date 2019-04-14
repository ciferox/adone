// require("adone");

const {
    std: { childProcess: { spawn }, path: { join } }
} = adone;

const node = process.execPath;
const f = __filename;

describe("process", "onExit", "many handlers", () => {
    it("parent", (done) => {
        const child = spawn(node, [join(__dirname, "child.js")]);
        let err = "";
        let out = "";
        const expectOut = new Array(16).join("ok\n");
        child.stderr.on("data", (c) => {
            err += c;
        });
        child.stdout.on("data", (c) => {
            out += c;
        });
        child.on("close", (code, signal) => {
            assert.equal(code, 0);
            assert.equal(signal, null);
            assert.equal(err, "");
            assert.equal(out, expectOut);
            done();
        });
    });
});
