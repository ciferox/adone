const {
    path: { join },
    process: { exec }
} = adone;

const writer = require("flush-write-stream");
const { once } = require("./helper");

describe("exit", () => {

    // https://github.com/pinojs/pino/issues/542
    it("logger.destination log everything when calling process.exit(0)", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "destination_exit.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));

        await once(child, "close");

        assert.notEqual(actual.match(/hello/), null);
        assert.notEqual(actual.match(/world/), null);
    });

    it("logger.extreme does not log everything when calling process.exit(0)", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "extreme_exit.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));

        await once(child, "close");

        assert.equal(actual.match(/hello/), null);
        assert.equal(actual.match(/world/), null);
    });

    it("logger.extreme logs everything when calling flushSync", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "extreme_flush_exit.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));

        await once(child, "close");

        assert.notEqual(actual.match(/hello/), null);
        assert.notEqual(actual.match(/world/), null);
    });
});
