const { Writable } = require("readable-stream");
const os = require("os");
const dateformat = require("dateformat");

const prettyFactory = (opts) => {
    if (!opts) {
        opts = { colorize: false };
    } else if (!opts.hasOwnProperty("colorize")) {
        opts.colorize = false;
    }
    return adone.logger.pretty(opts);
};

// All dates are computed from 'Fri, 30 Mar 2018 17:35:28 GMT'
const epoch = 1522431328992;
const pid = process.pid;
const hostname = os.hostname();

describe("pretty", "basic", () => {
    beforeEach((done) => {
        Date.originalNow = Date.now;
        Date.now = () => epoch;

        done();
    });
    afterEach((done) => {
        Date.now = Date.originalNow;
        delete Date.originalNow;
        done();
    });

    it("preserves output if not valid JSON", () => {
        const pretty = prettyFactory();
        const formatted = pretty("this is not json\nit's just regular output\n");
        assert.equal(formatted, "this is not json\nit's just regular output\n\n");
    });

    it("formats a line without any extra options", (done) => {
        const pretty = prettyFactory();
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.equal(
                    formatted,
                    `[${epoch}] INFO  (${pid} on ${hostname}): foo\n`
                );
                cb();
                process.nextTick(done);
            }
        }));
        log.info("foo");
    });

    it("will add color codes", (done) => {
        const pretty = prettyFactory({ colorize: true });
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.equal(
                    formatted,
                    `[${epoch}] \u001B[32mINFO \u001B[39m (${pid} on ${hostname}): \u001B[36mfoo\u001B[39m\n`
                );
                cb();
                process.nextTick(done);
            }
        }));
        log.info("foo");
    });

    it("can swap date and level position", (done) => {
        const pretty = prettyFactory({ levelFirst: true });
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.equal(
                    formatted,
                    `INFO  [${epoch}] (${pid} on ${hostname}): foo\n`
                );
                cb();
                process.nextTick(done);
            }
        }));
        log.info("foo");
    });

    it("can use different message keys", (done) => {
        const pretty = prettyFactory({ messageKey: "bar" });
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.equal(
                    formatted,
                    `[${epoch}] INFO  (${pid} on ${hostname}): baz\n`
                );
                cb();
                process.nextTick(done);
            }
        }));
        log.info({ bar: "baz" });
    });

    it("will format time to UTC", (done) => {
        const pretty = prettyFactory({ translateTime: true });
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.equal(
                    formatted,
                    `[2018-03-30 17:35:28.992 +0000] INFO  (${pid} on ${hostname}): foo\n`
                );
                cb();
                process.nextTick(done);
            }
        }));
        log.info("foo");
    });

    it("will format time to UTC in custom format", (done) => {
        const pretty = prettyFactory({ translateTime: "HH:MM:ss o" });
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const utcHour = dateformat(epoch, "UTC:" + "HH");
                const offset = dateformat(epoch, "UTC:" + "o");
                assert.equal(
                    formatted,
                    `[${utcHour}:35:28 ${offset}] INFO  (${pid} on ${hostname}): foo\n`
                );
                cb();
                process.nextTick(done);
            }
        }));
        log.info("foo");
    });

    it("will format time to local systemzone in ISO 8601 format", (done) => {
        const pretty = prettyFactory({ translateTime: "sys:standard" });
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const localHour = dateformat(epoch, "HH");
                const localDate = dateformat(epoch, "yyyy-mm-dd");
                const offset = dateformat(epoch, "o");
                assert.equal(
                    formatted,
                    `[${localDate} ${localHour}:35:28.992 ${offset}] INFO  (${pid} on ${hostname}): foo\n`
                );
                cb();
                process.nextTick(done);
            }
        }));
        log.info("foo");
    });

    it("will format time to local systemzone in custom format", (done) => {
        const pretty = prettyFactory({
            translateTime: "SYS:yyyy/mm/dd HH:MM:ss o"
        });
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const localHour = dateformat(epoch, "HH");
                const localDate = dateformat(epoch, "yyyy/mm/dd");
                const offset = dateformat(epoch, "o");
                assert.equal(
                    formatted,
                    `[${localDate} ${localHour}:35:28 ${offset}] INFO  (${pid} on ${hostname}): foo\n`
                );
                cb();
                process.nextTick(done);
            }
        }));
        log.info("foo");
    });

    it("handles missing time", () => {
        const pretty = prettyFactory();
        const formatted = pretty('{"hello":"world"}');
        assert.equal(formatted, '{"hello":"world"}\n');
    });

    it("handles missing pid, hostname and name", (done) => {
        const pretty = prettyFactory();
        const log = adone.logger({ base: null }, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.match(formatted, /\[.*\] INFO : hello world/);
                cb();
                process.nextTick(done);
            }
        }));
        log.info("hello world");
    });

    it("handles missing pid", (done) => {
        const pretty = prettyFactory();
        const name = "test";
        const msg = "hello world";
        const regex = new RegExp(`\\[.*\\] INFO  \\(${name} on ${hostname}\\): ${msg}`);

        const opts = {
            base: {
                name,
                hostname
            }
        };
        const log = adone.logger(opts, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.match(formatted, regex);
                cb();
                process.nextTick(done);
            }
        }));

        log.info(msg);
    });

    it("handles missing hostname", (done) => {
        const pretty = prettyFactory();
        const name = "test";
        const msg = "hello world";
        const regex = new RegExp(`\\[.*\\] INFO  \\(${name}/${pid}\\): ${msg}`);

        const opts = {
            base: {
                name,
                pid: process.pid
            }
        };
        const log = adone.logger(opts, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.match(formatted, regex);
                cb();
                process.nextTick(done);
            }
        }));

        log.info(msg);
    });

    it("handles missing name", (done) => {
        const pretty = prettyFactory();
        const msg = "hello world";
        const regex = new RegExp(`\\[.*\\] INFO  \\(${process.pid} on ${hostname}\\): ${msg}`);

        const opts = {
            base: {
                hostname,
                pid: process.pid
            }
        };
        const log = adone.logger(opts, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.match(formatted, regex);
                cb();
                process.nextTick(done);
            }
        }));

        log.info(msg);
    });

    it("works without time", (done) => {
        const pretty = prettyFactory();
        const log = adone.logger({ timestamp: null }, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.equal(formatted, `INFO  (${pid} on ${hostname}): hello world\n`);
                cb();
                process.nextTick(done);
            }
        }));
        log.info("hello world");
    });

    it("prettifies properties", (done) => {
        const pretty = prettyFactory();
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.match(formatted, /    a: "b"/);
                cb();
                process.nextTick(done);
            }
        }));
        log.info({ a: "b" }, "hello world");
    });

    it("prettifies nested properties", (done) => {
        const expectedLines = [
            "    a: {",
            '      "b": {',
            '        "c": "d"',
            "      }",
            "    }"
        ];
        const pretty = prettyFactory();
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expectedLines.length + 2);
                lines.shift(); lines.pop();
                for (let i = 0; i < lines.length; i += 1) {
                    assert.equal(lines[i], expectedLines[i]);
                }
                cb();
                process.nextTick(done);
            }
        }));
        log.info({ a: { b: { c: "d" } } }, "hello world");
    });

    it("treats the name with care", (done) => {

        const pretty = prettyFactory();
        const log = adone.logger({ name: "matteo" }, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.equal(formatted, `[${epoch}] INFO  (matteo/${pid} on ${hostname}): hello world\n`);
                cb();
                process.nextTick(done);
            }
        }));
        log.info("hello world");
    });

    it("handles `null` input", () => {
        const pretty = prettyFactory();
        const formatted = pretty(null);
        assert.equal(formatted, "null\n");
    });

    it("handles `undefined` input", () => {
        const pretty = prettyFactory();
        const formatted = pretty(undefined);
        assert.equal(formatted, "undefined\n");
    });

    it("handles `true` input", () => {
        const pretty = prettyFactory();
        const formatted = pretty(true);
        assert.equal(formatted, "true\n");
    });

    it("handles customLogLevel", (done) => {
        const pretty = prettyFactory();
        const log = adone.logger({ customLevels: { testCustom: 35 } }, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.match(formatted, /USERLVL/);
                cb();
                process.nextTick(done);
            }
        }));
        log.testCustom("test message");
    });

    it("supports pino metadata API", (done) => {
        const dest = new Writable({
            write(chunk, enc, cb) {
                assert.equal(
                    chunk.toString(),
                    `[${epoch}] INFO  (${pid} on ${hostname}): foo\n`
                );
                cb();
                process.nextTick(done);
            }
        });
        const log = adone.logger({
            prettifier: prettyFactory,
            prettyPrint: true
        }, dest);
        log.info("foo");
    });

    it("can swap date and level position through meta stream", (done) => {
        const dest = new Writable({
            objectMode: true,
            write(formatted, enc, cb) {
                assert.equal(
                    formatted,
                    `INFO  [${epoch}] (${pid} on ${hostname}): foo\n`
                );
                cb();
                process.nextTick(done);
            }
        });
        const log = adone.logger({
            prettifier: prettyFactory,
            prettyPrint: {
                levelFirst: true
            }
        }, dest);
        log.info("foo");
    });

    it("filter some lines based on jmespath", (done) => {
        expect(3).checks(done);
        const pretty = prettyFactory({ search: "foo.bar" });
        const expected = [
            undefined,
            undefined,
            `[${epoch}] INFO  (${pid} on ${hostname}): foo\n    foo: {\n      "bar": true\n    }\n`
        ];
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                expect(formatted).to.be.equal(expected.shift()).mark();
                cb();
            }
        }));
        log.info("foo");
        log.info({ something: "else" }, "foo");
        // only this line will be formatted
        log.info({ foo: { bar: true } }, "foo");
    });

    it("handles `undefined` return values", () => {
        const pretty = prettyFactory({ search: "msg == 'hello world'" });
        let formatted = pretty(`{"msg":"nope", "time":${epoch}, "level":30, "v":1}`);
        assert.equal(formatted, undefined);
        formatted = pretty(`{"msg":"hello world", "time":${epoch}, "level":30, "v":1}`);
        assert.equal(formatted, `[${epoch}] INFO : hello world\n`);
    });

    it("formats a line with an undefined field", (done) => {
        const pretty = prettyFactory();
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const obj = JSON.parse(chunk.toString());
                // weird hack, but we should not crash
                obj.a = undefined;
                const formatted = pretty(obj);
                assert.equal(
                    formatted,
                    `[${epoch}] INFO  (${pid} on ${hostname}): foo\n`
                );
                cb();
                process.nextTick(done);
            }
        }));
        log.info("foo");
    });

    it("prettifies msg object", (done) => {
        const expectedLines = [
            "    msg: {",
            '      "b": {',
            '        "c": "d"',
            "      }",
            "    }"
        ];
        const pretty = prettyFactory();
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expectedLines.length + 2);
                lines.shift();
                lines.pop();
                for (let i = 0; i < lines.length; i += 1) {
                    assert.equal(lines[i], expectedLines[i]);
                }
                cb();
                process.nextTick(done);
            }
        }));
        log.info({ msg: { b: { c: "d" } } });
    });

    it("prettifies msg object with circular references", (done) => {
        const expectedLines = [
            "    msg: {",
            '      "b": {',
            '        "c": "d"',
            "      },",
            '      "a": "[Circular]"',
            "    }"
        ];
        const pretty = prettyFactory();
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expectedLines.length + 2);
                lines.shift(); lines.pop();
                for (let i = 0; i < lines.length; i += 1) {
                    assert.equal(lines[i], expectedLines[i]);
                }
                cb();
                process.nextTick(done);
            }
        }));

        const msg = { b: { c: "d" } };
        msg.a = msg;
        log.info({ msg });
    });

    it("prettifies object with some undefined values", (done) => {
        const dest = new Writable({
            write(chunk, _, cb) {
                assert.equal(
                    `${chunk}`,
                    `[${epoch}] INFO  (${pid} on ${hostname}): \n    a: {\n      "b": "c"\n    }\n    n: null\n`
                );
                cb();
                process.nextTick(done);
            }
        });
        const log = adone.logger({
            prettifier: prettyFactory,
            prettyPrint: true
        }, dest);
        log.info({
            a: { b: "c" },
            s: Symbol.for("s"),
            f: (f) => f,
            c: class C { },
            n: null,
            err: { toJSON() { } }
        });
    });

    it("ignores multiple keys", () => {
        const pretty = prettyFactory({ ignore: "pid,hostname" });
        const arst = pretty(`{"msg":"hello world", "pid":"${pid}", "hostname":"${hostname}", "time":${epoch}, "level":30, "v":1}`);
        assert.equal(arst, `[${epoch}] INFO : hello world\n`);
    });

    it("ignores a single key", () => {
        const pretty = prettyFactory({ ignore: "pid" });
        const arst = pretty(`{"msg":"hello world", "pid":"${pid}", "hostname":"${hostname}", "time":${epoch}, "level":30, "v":1}`);
        assert.equal(arst, `[${epoch}] INFO  (on ${hostname}): hello world\n`);
    });
});
