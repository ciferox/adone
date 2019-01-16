const writer = require("flush-write-stream");
const { once } = require("../helper");

const {
    app: { fastLogger },
    std: { path: { join }, stream: { Writable } }
} = adone;

const fixture = (name) => join(__dirname, "..", "fixtures", "pretty", name);

describe("app", "fastLogger", "pretty", () => {
    it("can be enabled via exported pino function", async () => {
        let actual = "";
        const child = forkProcess(fixture("basic.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/\(123456 on abcdefghijklmnopqr\): h/));
    });
    
    it("can be enabled via exported pino function with pretty configuration", async () => {
        let actual = "";
        const child = forkProcess(fixture("level_first.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/^INFO.*h/));
    });
    
    it("can be enabled via exported pino function with prettifier", async () => {
        let actual = "";
        const child = forkProcess(fixture("pretty_factory.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
    
        await once(child, "close");
        assert.notNull(actual.match(/^INFO.*h/));
    });
    
    it("does not throw error when enabled with stream specified", async () => {
        assert.doesNotThrow(() => fastLogger({ prettyPrint: true }, process.stdout));
    });
        
    it("can send pretty print to custom stream", async () => {
        const dest = new Writable({
            objectMode: true,
            write(formatted, enc) {
                assert.true(/^INFO.*foo\n$/.test(formatted));
            }
        });
    
        const log = fastLogger({
            prettifier: adone.app.fastLogger.pretty,
            prettyPrint: {
                levelFirst: true,
                colorize: false
            }
        }, dest);
        log.info("foo");
    });
    
    it("ignores `undefined` from prettifier", async () => {
        let actual = "";
        const child = forkProcess(fixture("skipped_output.js"));
    
        child.stdout.pipe(writer((s, enc) => {
            actual += s;
        }));
    
        await once(child, "close");
        assert.equal(actual, "");
    });
    
    it("parses and outputs chindings", async () => {
        let actual = "";
        const child = forkProcess(fixture("child.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/\(123456 on abcdefghijklmnopqr\): h/));
        assert.notNull(actual.match(/\(123456 on abcdefghijklmnopqr\): h2/));
        assert.notNull(actual.match(/a: 1/));
        assert.notNull(actual.match(/b: 2/));
        assert.equal(actual.match(/a: 1/g).length, 3);
    });
    
    it("applies serializers", async () => {
        let actual = "";
        const child = forkProcess(fixture("serializers.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/\(123456 on abcdefghijklmnopqr\): h/));
        assert.notNull(actual.match(/foo: "bar"/));
    });
    
    it("applies redaction rules", async () => {
        let actual = "";
        const child = forkProcess(fixture("redact.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/\(123456 on abcdefghijklmnopqr\): h/));
        assert.notNull(actual.match(/\[Redacted\]/));
        assert.null(actual.match(/object/));
    });
    
    it("dateformat", async () => {
        let actual = "";
        const child = forkProcess(fixture("dateformat.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/\(123456 on abcdefghijklmnopqr\): h/));
    });
    
    it("without timestamp", async () => {
        let actual = "";
        const child = forkProcess(fixture("no_time.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notEqual(actual.slice(2), "[]");
    });
    
    it("with custom timestamp", async () => {
        let actual = "";
        const child = forkProcess(fixture("custom_time.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.equal(actual.slice(0, 8), '["test"]');
    });
    
    it("errors", async () => {
        let actual = "";
        const child = forkProcess(fixture("error.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/\(123456 on abcdefghijklmnopqr\): kaboom/));
        assert.notNull(actual.match(/\(123456 on abcdefghijklmnopqr\): with a message/));
        assert.notNull(actual.match(/.*error\.js.*/));
    });
    
    it("errors with props", async () => {
        let actual = "";
        const child = forkProcess(fixture("error_props.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/\(123456 on abcdefghijklmnopqr\): kaboom/));
        assert.notNull(actual.match(/code: ENOENT/));
        assert.notNull(actual.match(/errno: 1/));
        assert.notNull(actual.match(/.*error_props\.js.*/));
    });
    
    it("final works with pretty", async () => {
        let actual = "";
        const child = forkProcess(fixture("final.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/WARN\s+\(123456 on abcdefghijklmnopqr\): pino.final with prettyPrint does not support flushing/));
        assert.notNull(actual.match(/INFO\s+\(123456 on abcdefghijklmnopqr\): beforeExit/));
    });
    
    it("final works when returning a logger", async () => {
        let actual = "";
        const child = forkProcess(fixture("final_return.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/WARN\s+\(123456 on abcdefghijklmnopqr\): pino.final with prettyPrint does not support flushing/));
        assert.notNull(actual.match(/INFO\s+\(123456 on abcdefghijklmnopqr\): after/));
    });
    
    it("final works without prior logging", async () => {
        let actual = "";
        const child = forkProcess(fixture("final_no_log_before.js"));
    
        child.stdout.pipe(writer((s, enc, cb) => {
            actual += s;
            cb();
        }));
        await once(child, "close");
        assert.notNull(actual.match(/WARN\s+: pino.final with prettyPrint does not support flushing/));
        assert.notNull(actual.match(/INFO\s+\(123456 on abcdefghijklmnopqr\): beforeExit/));
    });    
});
