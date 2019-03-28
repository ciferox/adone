const writer = require("flush-write-stream");
const { once } = require("./helper");

const {
    std: { path: { join } }
} = adone;

describe("fast logger", "exit", () => {
// https://github.com/pinojs/pino/issues/542
    it("pino.destination log everything when calling process.exit(0)", async () => {
        let actual = "";
        const child = forkProcess(join(__dirname, "fixtures", "destination_exit.js"));

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));

        await once(child, "close");

        assert.notEqual(actual.match(/hello/), null);
        assert.notEqual(actual.match(/world/), null);
    });

    it("pino.extreme does not log everything when calling process.exit(0)", async () => {
        let actual = "";
        const child = forkProcess(join(__dirname, "fixtures", "extreme_exit.js"));

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));

        await once(child, "close");

        assert.isNull(actual.match(/hello/));
        assert.isNull(actual.match(/world/));
    });

    it("pino.extreme logs everything when calling flushSync", async () => {
        let actual = "";
        const child = forkProcess(join(__dirname, "fixtures", "extreme_flush_exit.js"));

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));

        await once(child, "close");

        assert.notEqual(actual.match(/hello/), null);
        assert.notEqual(actual.match(/world/), null);
    });
});
