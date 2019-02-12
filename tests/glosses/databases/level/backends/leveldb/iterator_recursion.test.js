const testCommon = require("./common");

const {
    std: { path }
} = adone;

let db;

const sourceData = (function () {
    const d = [];
    let i = 0;
    let k;
    for (; i < 100000; i++) {
        k = (i < 10 ? "0" : "") + i;
        d.push({
            type: "put",
            key: k,
            value: Math.random()
        });
    }
    return d;
}());

it("setUp common", testCommon.setUp);

it.todo("try to create an iterator with a blown stack", async (done) => {
    // Reducing the stack size down from the default 984 for the child node
    // process makes it easier to trigger the bug condition. But making it too low
    // causes the child process to die for other reasons.
    const opts = {
        execArgv: ["--stack-size=128"]
    };
    const child = forkProcess(path.join(__dirname, "stack_blower.js"), ["run"], opts);

    child.on("message", (m) => {
        assert.ok(true, m);
        child.disconnect();
        done();
    });

    child.on("exit", (code, sig) => {
        assert.equal(code, 0, "child exited normally");
    });
});

it("setUp db", (done) => {
    db = testCommon.factory();
    db.open((err) => {
        assert.notExists(err);
        db.batch(sourceData, () => done());
    });
});

it("iterate over a large iterator with a large watermark", (done) => {
    const iterator = db.iterator({
        highWaterMark: 10000000
    });
    const read = function () {
        iterator.next(function () {
            if (!arguments.length) {
                done();
            } else {
                read();
            }
        });
    };

    read();
});

it("tearDown", (done) => {
    db.close(testCommon.tearDown.bind(null, done));
});
