const { sink, once } = require("./helper");

const {
    app: { fastLogger },
    std: { os }
} = adone;

const { pid } = process;
const hostname = os.hostname();
const level = 50;
const name = "error";

describe("fast loggers", "error", () => {
    it("err is serialized with additional properties set on the Error object", async () => {
        const stream = sink();
        const err = Object.assign(new Error("myerror"), { foo: "bar" });
        const instance = fastLogger(stream);
        instance.level = name;
        instance[name](err);
        const result = await once(stream, "data");
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level,
            type: "Error",
            msg: err.message,
            stack: err.stack,
            foo: err.foo,
            v: 1
        });
    });
    
    it("type should be retained, even if type is a property", async () => {
        const stream = sink();
        const err = Object.assign(new Error("myerror"), { type: "bar" });
        const instance = fastLogger(stream);
        instance.level = name;
        instance[name](err);
        const result = await once(stream, "data");
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level,
            type: "bar",
            msg: err.message,
            stack: err.stack,
            v: 1
        });
    });
    
    it("type, message and stack should be first level properties", async () => {
        const stream = sink();
        const err = Object.assign(new Error("foo"), { foo: "bar" });
        const instance = fastLogger(stream);
        instance.level = name;
        instance[name](err);
    
        const result = await once(stream, "data");
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level,
            type: "Error",
            msg: err.message,
            stack: err.stack,
            foo: err.foo,
            v: 1
        });
    });
    
    it("err serializer", async () => {
        const stream = sink();
        const err = Object.assign(new Error("myerror"), { foo: "bar" });
        const instance = fastLogger({
            serializers: {
                err: fastLogger.stdSerializers.err
            }
        }, stream);
    
        instance.level = name;
        instance[name]({ err });
        const result = await once(stream, "data");
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level,
            err: {
                type: "Error",
                message: err.message,
                stack: err.stack,
                foo: err.foo
            },
            v: 1
        });
    });
    
    it("an error with statusCode property is not confused for a http response", async () => {
        const stream = sink();
        const err = Object.assign(new Error("StatusCodeErr"), { statusCode: 500 });
        const instance = fastLogger(stream);
    
        instance.level = name;
        instance[name](err);
        const result = await once(stream, "data");
    
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level,
            type: "Error",
            msg: err.message,
            stack: err.stack,
            statusCode: err.statusCode,
            v: 1
        });
    });
    
    it("stack is omitted if it is not set on err", () => {
        const err = new Error("myerror");
        delete err.stack;
        const instance = fastLogger(sink((chunk, enc, cb) => {
            assert.true(new Date(chunk.time) <= new Date(), "time is greater than Date.now()");
            delete chunk.time;
            assert.equal(chunk.hasOwnProperty("stack"), false);
            cb();
        }));
    
        instance.level = name;
        instance[name](err);
    });
    
    it("stack is rendered as any other property if it's not a string", () => {
        const err = new Error("myerror");
        err.stack = null;
        const instance = fastLogger(sink((chunk, enc, cb) => {
            assert.true(new Date(chunk.time) <= new Date(), "time is greater than Date.now()");
            delete chunk.time;
            assert.equal(chunk.hasOwnProperty("stack"), true);
            assert.equal(chunk.stack, null);
            cb();
        }));
    
        instance.level = name;
        instance[name](err);
    });
    
    it("correctly ignores toString on errors", async () => {
        const err = new Error("myerror");
        err.toString = () => undefined;
        const stream = sink();
        const instance = fastLogger({
            test: "this"
        }, stream);
        instance.fatal(err);
        const result = await once(stream, "data");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 60,
            type: "Error",
            msg: err.message,
            stack: err.stack,
            v: 1
        });
    });    
});
