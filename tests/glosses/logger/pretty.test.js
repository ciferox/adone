const {
    process: { exec }
} = adone;

const { Writable } = require("stream");
const { join } = require("path");
const writer = require("flush-write-stream");
const { once } = require("./helper");

const isWin = process.platform === "win32";

describe("pretty", { skip: isWin }, () => {
    it("can be enabled via exported pino function", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "basic.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): h/), null);
    });

    it("can be enabled via exported pino function with pretty configuration", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "level_first.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/^INFO.*h/), null);
    });

    it("can be enabled via exported pino function with prettifier", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "pretty_factory.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));

        await once(child, "close");
        assert.notEqual(actual.match(/^INFO.*h/), null);
    });

    it("does not throw error when enabled with stream specified", async () => {
        adone.logger({ prettyPrint: true }, process.stdout);
    });

    it("can send pretty print to custom stream", async () => {
        const dest = new Writable({
            objectMode: true,
            write(formatted, enc) {
                assert.equal(/^INFO.*foo\n$/.test(formatted), true);
            }
        });

        const log = adone.logger({
            prettifier: adone.logger.pretty,
            prettyPrint: {
                levelFirst: true,
                colorize: false
            }
        }, dest);
        log.info("foo");
    });

    it("ignores `undefined` from prettifier", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "skipped_output.js")]);

        child.stdout.pipe(writer((s, enc) => {
            actual += s;
        }));

        await once(child, "close");
        assert.equal(actual, "");
    });

    it("parses and outputs chindings", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "child.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): h/), null);
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): h2/), null);
        assert.notEqual(actual.match(/a: 1/), null);
        assert.notEqual(actual.match(/b: 2/), null);
        assert.equal(actual.match(/a: 1/g).length, 3);
    });

    it("applies serializers", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "serializers.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): h/), null);
        assert.notEqual(actual.match(/foo: "bar"/), null);
    });

    it("applies redaction rules", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "redact.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): h/), null);
        assert.notEqual(actual.match(/\[Redacted\]/), null);
        assert.equal(actual.match(/object/), null);
    });

    it("dateformat", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "dateformat.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): h/), null);
    });

    it("without timestamp", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "no_time.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.slice(2), "[]");
    });

    it("with custom timestamp", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "custom_time.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.equal(actual.slice(0, 8), '["test"]');
    });

    it("errors", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "error.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): kaboom/), null);
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): with a message/), null);
        assert.notEqual(actual.match(/.*error\.js.*/), null);
    });

    it("errors with props", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "error_props.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): kaboom/), null);
        assert.notEqual(actual.match(/code: ENOENT/), null);
        assert.notEqual(actual.match(/errno: 1/), null);
        assert.notEqual(actual.match(/.*error_props\.js.*/), null);
    });

    it("final works with pretty", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "final.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/WARN\s+\(123456 on abcdefghijklmnopqr\): adone.logger.final with prettyPrint does not support flushing/), null);
        assert.notEqual(actual.match(/INFO\s+\(123456 on abcdefghijklmnopqr\): beforeExit/), null);
    });

    it("final works when returning a logger", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "final_return.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/WARN\s+\(123456 on abcdefghijklmnopqr\): adone.logger.final with prettyPrint does not support flushing/), null);
        assert.notEqual(actual.match(/INFO\s+\(123456 on abcdefghijklmnopqr\): after/), null);
    });

    it("final works without prior logging", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "final_no_log_before.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/WARN\s+: adone.logger.final with prettyPrint does not support flushing/), null);
        assert.notEqual(actual.match(/INFO\s+\(123456 on abcdefghijklmnopqr\): beforeExit/), null);
    });

    it("works as expected with an object with the msg prop", async () => {
        let actual = "";
        const child = exec(process.argv[0], [join(__dirname, "fixtures", "pretty", "obj_msg_prop.js")]);

        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.match(/\(123456 on abcdefghijklmnopqr\): hello/), null);
    });
});
