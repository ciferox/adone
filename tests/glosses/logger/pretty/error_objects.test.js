const Writable = require("stream").Writable;
const os = require("os");
const serializers = adone.logger.stdSerializers;

// All dates are computed from 'Fri, 30 Mar 2018 17:35:28 GMT'
const epoch = 1522431328992;
const pid = process.pid;
const hostname = os.hostname();

describe("error like objects tests", () => {
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

    it("logger transform prettifies Error", (done) => {
        const pretty = adone.logger.pretty();
        const err = Error("hello world");
        const expected = err.stack.split("\n");
        expected.unshift(err.message);

        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expected.length + 1);
                assert.equal(lines[0], `[${epoch}] INFO  (${pid} on ${hostname}): hello world`);
                cb();
                process.nextTick(done);
            }
        }));

        log.info(err);
    });

    it("errorProps recognizes user specified properties", (done) => {
        const pretty = adone.logger.pretty({ errorProps: "statusCode,originalStack" });
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.match(formatted, /\s{4}error stack/);
                assert.match(formatted, /statusCode: 500/);
                assert.match(formatted, /originalStack: original stack/);
                cb();
                process.nextTick(done);
            }
        }));

        const error = Error("error message");
        error.stack = "error stack";
        error.statusCode = 500;
        error.originalStack = "original stack";

        log.error(error);
    });

    it("prettifies ignores undefined errorLikeObject", () => {
        const pretty = adone.logger.pretty();
        pretty({ err: undefined });
        pretty({ error: undefined });
    });

    it("prettifies Error in property within errorLikeObjectKeys", (done) => {
        const pretty = adone.logger.pretty({
            errorLikeObjectKeys: ["err"]
        });

        const err = Error("hello world");
        const expected = err.stack.split("\n");
        expected.unshift(err.message);

        const log = adone.logger({ serializers: { err: serializers.err } }, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expected.length + 6);
                assert.equal(lines[0], `[${epoch}] INFO  (${pid} on ${hostname}): `);
                assert.match(lines[1], /\s{4}err: {/);
                assert.match(lines[2], /\s{6}"type": "Error",/);
                assert.match(lines[3], /\s{6}"message": "hello world",/);
                assert.match(lines[4], /\s{6}"stack":/);
                assert.match(lines[5], /\s{6}Error: hello world/);
                cb();
                process.nextTick(done);
            }
        }));

        log.info({ err });
    });

    it("prettifies Error in property within errorLikeObjectKeys when stack has escaped characters", (done) => {
        const pretty = adone.logger.pretty({
            errorLikeObjectKeys: ["err"]
        });

        const err = Error("hello world");
        err.stack = "Error: hello world\n    at anonymous (C:\\project\\node_modules\\example\\index.js)";
        const expected = err.stack.split("\n");
        expected.unshift(err.message);

        const log = adone.logger({ serializers: { err: serializers.err } }, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expected.length + 6);
                assert.equal(lines[0], `[${epoch}] INFO  (${pid} on ${hostname}): `);
                assert.match(lines[1], /\s{4}err: {$/);
                assert.match(lines[2], /\s{6}"type": "Error",$/);
                assert.match(lines[3], /\s{6}"message": "hello world",$/);
                assert.match(lines[4], /\s{6}"stack":$/);
                assert.match(lines[5], /\s{10}Error: hello world$/);
                assert.match(lines[6], /\s{10}at anonymous \(C:\\project\\node_modules\\example\\index.js\)$/);
                cb();
                process.nextTick(done);
            }
        }));

        log.info({ err });
    });

    it("prettifies Error in property within errorLikeObjectKeys when stack is not the last property", (done) => {
        const pretty = adone.logger.pretty({
            errorLikeObjectKeys: ["err"]
        });

        const err = Error("hello world");
        err.anotherField = "dummy value";
        const expected = err.stack.split("\n");
        expected.unshift(err.message);

        const log = adone.logger({ serializers: { err: serializers.err } }, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expected.length + 7);
                assert.equal(lines[0], `[${epoch}] INFO  (${pid} on ${hostname}): `);
                assert.match(lines[1], /\s{4}err: {/);
                assert.match(lines[2], /\s{6}"type": "Error",/);
                assert.match(lines[3], /\s{6}"message": "hello world",/);
                assert.match(lines[4], /\s{6}"stack":/);
                assert.match(lines[5], /\s{6}Error: hello world/);
                // Node 6 starts stack with "at Error (native)"
                // assert.match(lines[6], /\s{10}(at Test.t.test|at Error \(native\))/);
                assert.match(lines[lines.length - 3], /\s{6}"anotherField": "dummy value"/);
                cb();
                process.nextTick(done);
            }
        }));

        log.info({ err });
    });

    it('errorProps flag with "*" (print all nested props)', (done) => {
        const pretty = adone.logger.pretty({ errorProps: "*" });
        const expectedLines = [
            "    error stack",
            "statusCode: 500",
            "originalStack: original stack",
            "dataBaseSpecificError: {",
            '    erroMessage: "some database error message"',
            "    evenMoreSpecificStuff: {",
            '      "someErrorRelatedObject": "error"',
            "    }",
            "}"
        ];
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const lines = formatted.split("\n");
                lines.shift(); lines.pop();
                for (let i = 0; i < lines.length; i += 1) {
                    assert.equal(lines[i], expectedLines[i]);
                }
                cb();
                process.nextTick(done);
            }
        }));

        const error = Error("error message");
        error.stack = "error stack";
        error.statusCode = 500;
        error.originalStack = "original stack";
        error.dataBaseSpecificError = {
            erroMessage: "some database error message",
            evenMoreSpecificStuff: {
                someErrorRelatedObject: "error"
            }
        };

        log.error(error);
    });

    it("handles errors with a null stack", (done) => {
        const pretty = adone.logger.pretty();
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                assert.match(formatted, /\s{4}message: "foo"/);
                assert.match(formatted, /\s{4}stack: null/);
                cb();
                process.nextTick(done);
            }
        }));

        const error = { message: "foo", stack: null };
        log.error(error);
    });

    it("handles errors with a null stack for Error object", (done) => {
        const pretty = adone.logger.pretty();
        const expectedLines = [
            '    some: "property"',
            "    stack: null",
            '    type: "Error"'
        ];
        const log = adone.logger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = pretty(chunk.toString());
                const lines = formatted.split("\n");
                lines.shift(); lines.pop();
                for (let i = 0; i < lines.length; i += 1) {
                    assert.equal(lines[i], expectedLines[i]);
                }
                cb();
                process.nextTick(done);
            }
        }));

        const error = Error("error message");
        error.stack = null;
        error.some = "property";

        log.error(error);
    });
});
