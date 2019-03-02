const Writable = require("stream").Writable;

const {
    app: { fastLogger },
    std: { os }
} = adone;

const {
    pretty,
    stdSerializers: serializers
} = fastLogger;

// All dates are computed from 'Fri, 30 Mar 2018 17:35:28 GMT'
const epoch = 1522431328992;
const pid = process.pid;
const hostname = os.hostname();

describe("app", "fastLogger", "pretty", "error like objects tests", () => {
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

    it("pino transform prettifies Error", () => {
        const p = pretty();
        const err = Error("hello world");
        const expected = err.stack.split("\n");
        expected.unshift(err.message);

        const log = fastLogger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = p(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expected.length + 1);
                assert.equal(lines[0], `[${epoch}] INFO  (${pid} on ${hostname}): hello world`);
                cb();
            }
        }));

        log.info(err);
    });

    it("errorProps recognizes user specified properties", () => {
        const p = pretty({ errorProps: "statusCode,originalStack" });
        const log = fastLogger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = p(chunk.toString());
                assert.isNotNull(formatted.match(/\s{4}error stack/));
                assert.isNotNull(formatted.match(/statusCode: 500/));
                assert.isNotNull(formatted.match(/originalStack: original stack/));
                cb();
            }
        }));

        const error = Error("error message");
        error.stack = "error stack";
        error.statusCode = 500;
        error.originalStack = "original stack";

        log.error(error);
    });

    it("prettifies ignores undefined errorLikeObject", () => {
        const p = pretty();
        p({ err: undefined });
        p({ error: undefined });
    });

    it("prettifies Error in property within errorLikeObjectKeys", () => {
        const p = pretty({
            errorLikeObjectKeys: ["err"]
        });

        const err = Error("hello world");
        const expected = err.stack.split("\n");
        expected.unshift(err.message);

        const log = fastLogger({ serializers: { err: serializers.err } }, new Writable({
            write(chunk, enc, cb) {
                const formatted = p(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expected.length + 6);
                assert.equal(lines[0], `[${epoch}] INFO  (${pid} on ${hostname}): `);
                assert.isNotNull(lines[1].match(/\s{4}err: {/));
                assert.isNotNull(lines[2].match(/\s{6}"type": "Error",/));
                assert.isNotNull(lines[3].match(/\s{6}"message": "hello world",/));
                assert.isNotNull(lines[4].match(/\s{6}"stack":/));
                assert.isNotNull(lines[5].match(/\s{6}Error: hello world/));
                // Node 6 starts stack with "at Error (native)"
                assert.isNotNull(lines[6].match(/\s{10}(at Object.it|at Error \(native\))/));
                cb();
            }
        }));

        log.info({ err });
    });

    it("prettifies Error in property within errorLikeObjectKeys when stack has escaped characters", () => {
        const p = pretty({
            errorLikeObjectKeys: ["err"]
        });

        const err = Error("hello world");
        err.stack = "Error: hello world\n    at anonymous (C:\\project\\node_modules\\example\\index.js)";
        const expected = err.stack.split("\n");
        expected.unshift(err.message);

        const log = fastLogger({ serializers: { err: serializers.err } }, new Writable({
            write(chunk, enc, cb) {
                const formatted = p(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expected.length + 6);
                assert.equal(lines[0], `[${epoch}] INFO  (${pid} on ${hostname}): `);
                assert.isNotNull(lines[1].match(/\s{4}err: {$/));
                assert.isNotNull(lines[2].match(/\s{6}"type": "Error",$/));
                assert.isNotNull(lines[3].match(/\s{6}"message": "hello world",$/));
                assert.isNotNull(lines[4].match(/\s{6}"stack":$/));
                assert.isNotNull(lines[5].match(/\s{10}Error: hello world$/));
                assert.isNotNull(lines[6].match(/\s{10}at anonymous \(C:\\project\\node_modules\\example\\index.js\)$/));
                cb();
            }
        }));

        log.info({ err });
    });

    it("prettifies Error in property within errorLikeObjectKeys when stack is not the last property", () => {
        const p = pretty({
            errorLikeObjectKeys: ["err"]
        });

        const err = Error("hello world");
        err.anotherField = "dummy value";
        const expected = err.stack.split("\n");
        expected.unshift(err.message);

        const log = fastLogger({ serializers: { err: serializers.err } }, new Writable({
            write(chunk, enc, cb) {
                const formatted = p(chunk.toString());
                const lines = formatted.split("\n");
                assert.equal(lines.length, expected.length + 7);
                assert.equal(lines[0], `[${epoch}] INFO  (${pid} on ${hostname}): `);
                assert.isNotNull(lines[1].match(/\s{4}err: {/));
                assert.isNotNull(lines[2].match(/\s{6}"type": "Error",/));
                assert.isNotNull(lines[3].match(/\s{6}"message": "hello world",/));
                assert.isNotNull(lines[4].match(/\s{6}"stack":/));
                assert.isNotNull(lines[5].match(/\s{6}Error: hello world/));
                // Node 6 starts stack with "at Error (native)"
                assert.isNotNull(lines[6].match(/\s{10}(at Object.it|at Error \(native\))/));
                assert.isNotNull(lines[lines.length - 3].match(/\s{6}"anotherField": "dummy value"/));
                cb();
            }
        }));

        log.info({ err });
    });

    it('errorProps flag with "*" (print all nested props)', () => {
        const p = pretty({ errorProps: "*" });
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
        const log = fastLogger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = p(chunk.toString());
                const lines = formatted.split("\n");
                lines.shift(); lines.pop();
                for (let i = 0; i < lines.length; i += 1) {
                    assert.equal(lines[i], expectedLines[i]);
                }
                cb();
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

    it("handles errors with a null stack", () => {
        const p = pretty();
        const log = fastLogger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = p(chunk.toString());
                assert.isNotNull(formatted.match(/\s{4}message: "foo"/));
                assert.isNotNull(formatted.match(/\s{4}stack: null/));
                cb();
            }
        }));

        const error = { message: "foo", stack: null };
        log.error(error);
    });

    it("handles errors with a null stack for Error object", () => {
        const p = pretty();
        const expectedLines = [
            '    type: "Error"',
            "    stack: null",
            '    some: "property"'
        ];
        const log = fastLogger({}, new Writable({
            write(chunk, enc, cb) {
                const formatted = p(chunk.toString());
                const lines = formatted.split("\n");
                lines.shift(); lines.pop();
                for (let i = 0; i < lines.length; i += 1) {
                    assert.equal(lines[i], expectedLines[i]);
                }
                cb();
            }
        }));

        const error = Error("error message");
        error.stack = null;
        error.some = "property";

        log.error(error);
    });
});
