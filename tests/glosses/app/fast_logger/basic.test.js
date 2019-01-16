const { sink, check, once } = require("./helper");

const {
    app: { fastLogger },
    std: { os, path: { join }, fs: { readFileSync } }
} = adone;

const { pid } = process;
const hostname = os.hostname();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("app", "fast logger", "basic", () => {
    const levelTest = function (name, level) {
        it(`${name} logs as ${level}`, async () => {
            const stream = sink();
            const instance = fastLogger(stream);
            instance.level = name;
            instance[name]("hello world");
            check(await once(stream, "data"), level, "hello world");
        });

        it(`passing objects at level ${name}`, async () => {
            const stream = sink();
            const instance = fastLogger(stream);
            instance.level = name;
            instance[name]({ hello: "world" });

            const result = await once(stream, "data");
            assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
            assert.equal(result.pid, pid);
            assert.equal(result.hostname, hostname);
            assert.equal(result.level, level);
            assert.equal(result.hello, "world");
            assert.equal(result.v, 1);
        });

        it(`passing an object and a string at level ${name}`, async () => {
            const stream = sink();
            const instance = fastLogger(stream);
            instance.level = name;
            instance[name]({ hello: "world" }, "a string");
            const result = await once(stream, "data");
            assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
            delete result.time;
            assert.deepEqual(result, {
                pid,
                hostname,
                level,
                msg: "a string",
                hello: "world",
                v: 1
            });
        });

        it(`formatting logs as ${name}`, async () => {
            const stream = sink();
            const instance = fastLogger(stream);
            instance.level = name;
            instance[name]("hello %d", 42);
            const result = await once(stream, "data");
            check(result, level, "hello 42");
        });

        it(`passing error with a serializer at level ${name}`, async () => {
            const stream = sink();
            const err = new Error("myerror");
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
                    stack: err.stack
                },
                v: 1
            });
        });

        it(`child logger for level ${name}`, async () => {
            const stream = sink();
            const instance = fastLogger(stream);
            instance.level = name;
            const child = instance.child({ hello: "world" });
            child[name]("hello world");
            const result = await once(stream, "data");
            assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
            delete result.time;
            assert.deepEqual(result, {
                pid,
                hostname,
                level,
                msg: "hello world",
                hello: "world",
                v: 1
            });
        });
    };

    levelTest("fatal", 60);
    levelTest("error", 50);
    levelTest("warn", 40);
    levelTest("info", 30);
    levelTest("debug", 20);
    levelTest("trace", 10);

    it("serializers can return undefined to strip field", async () => {
        const stream = sink();
        const instance = fastLogger({
            serializers: {
                it() {
                    return undefined;
                }
            }
        }, stream);

        instance.info({ test: "sensitive info" });
        const result = await once(stream, "data");
        assert.true("test" in result);
    });

    it("does not explode with a circular ref", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        const b = {};
        const a = {
            hello: b
        };
        b.a = a; // circular ref
        assert.doesNotThrow(() => instance.info(a));
    });

    it("set the name", async () => {
        const stream = sink();
        const instance = fastLogger({
            name: "hello"
        }, stream);
        instance.fatal("this is fatal");
        const result = await once(stream, "data");
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 60,
            name: "hello",
            msg: "this is fatal",
            v: 1
        });
    });

    it("set the messageKey", async () => {
        const stream = sink();
        const message = "hello world";
        const messageKey = "fooMessage";
        const instance = fastLogger({
            messageKey
        }, stream);
        instance.info(message);
        const result = await once(stream, "data");
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            fooMessage: message,
            v: 1
        });
    });

    it("set undefined properties", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        instance.info({ hello: "world", property: undefined });
        const result = await once(stream, "data");
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            hello: "world",
            v: 1
        });
    });

    it("prototype properties are not logged", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        instance.info(Object.create({ hello: "world" }));
        const { hello } = await once(stream, "data");
        assert.undefined(hello);
    });

    it("set the base", async () => {
        const stream = sink();
        const instance = fastLogger({
            base: {
                a: "b"
            }
        }, stream);

        instance.fatal("this is fatal");
        const result = await once(stream, "data");
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            a: "b",
            level: 60,
            msg: "this is fatal",
            v: 1
        });
    });

    it("set the base to null", async () => {
        const stream = sink();
        const instance = fastLogger({
            base: null
        }, stream);
        instance.fatal("this is fatal");
        const result = await once(stream, "data");
        assert.true(new Date(result.time) <= new Date(), "time is greater than Date.now()");
        delete result.time;
        assert.deepEqual(result, {
            level: 60,
            msg: "this is fatal",
            v: 1
        });
    });

    it("throw if creating child without bindings", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        assert.throws(() => instance.child());
    });

    it("correctly escapes msg strings with stray double quote at end", async () => {
        const stream = sink();
        const instance = fastLogger({
            name: "hello"
        }, stream);

        instance.fatal('this contains "');
        const result = await once(stream, "data");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 60,
            name: "hello",
            msg: 'this contains "',
            v: 1
        });
    });

    it("correctly escape msg strings with unclosed double quote", async () => {
        const stream = sink();
        const instance = fastLogger({
            name: "hello"
        }, stream);
        instance.fatal('" this contains');
        const result = await once(stream, "data");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 60,
            name: "hello",
            msg: '" this contains',
            v: 1
        });
    });

    // https://github.com/pinojs/pino/issues/139
    it("object and format string", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        instance.info({}, "foo %s", "bar");

        const result = await once(stream, "data");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            msg: "foo bar",
            v: 1
        });
    });

    it("object and format string property", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        instance.info({ answer: 42 }, "foo %s", "bar");
        const result = await once(stream, "data");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            msg: "foo bar",
            answer: 42,
            v: 1
        });
    });

    it("correctly strip undefined when returned from toJSON", async () => {
        const stream = sink();
        const instance = fastLogger({
            test: "this"
        }, stream);
        instance.fatal({
            test: {
                toJSON() {
                    return undefined;
                }
            }
        });
        const result = await once(stream, "data");
        assert.false("test" in result);
    });

    it("correctly supports stderr", async () => {
        // stderr inherits from Stream, rather than Writable
        const dest = {
            writable: true,
            write(result) {
                result = JSON.parse(result);
                delete result.time;
                assert.deepEqual(result, {
                    pid,
                    hostname,
                    level: 60,
                    msg: "a message",
                    v: 1
                });
            }
        };
        const instance = fastLogger(dest);
        instance.fatal("a message");
    });

    it("normalize number to string", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        instance.info(1);
        const result = await once(stream, "data");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            msg: "1",
            v: 1
        });
    });

    it("normalize number to string with an object", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        instance.info({ answer: 42 }, 1);
        const result = await once(stream, "data");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            msg: "1",
            answer: 42,
            v: 1
        });
    });

    it("handles objects with null prototype", async () => {
        const stream = sink();
        const instance = fastLogger(stream);
        const o = Object.create(null);
        o.test = "test";
        instance.info(o);
        const result = await once(stream, "data");
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            test: "test",
            v: 1
        });
    });

    it("pino.destination", async () => {
        const tmp = join(
            os.tmpdir(),
            `_${Math.random().toString(36).substr(2, 9)}`
        );
        const instance = fastLogger(fastLogger.destination(tmp));
        instance.info("hello");
        await sleep(250);
        const result = JSON.parse(readFileSync(tmp).toString());
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            msg: "hello",
            v: 1
        });
    });

    it("auto pino.destination with a string", async () => {
        const tmp = join(
            os.tmpdir(),
            `_${Math.random().toString(36).substr(2, 9)}`
        );
        const instance = fastLogger(tmp);
        instance.info("hello");
        await sleep(250);
        const result = JSON.parse(readFileSync(tmp).toString());
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            msg: "hello",
            v: 1
        });
    });

    it("auto pino.destination with a string as second argument", async () => {
        const tmp = join(
            os.tmpdir(),
            `_${Math.random().toString(36).substr(2, 9)}`
        );
        const instance = fastLogger(null, tmp);
        instance.info("hello");
        await sleep(250);
        const result = JSON.parse(readFileSync(tmp).toString());
        delete result.time;
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            msg: "hello",
            v: 1
        });
    });

    it("does not override opts with a string as second argument", async () => {
        const tmp = join(
            os.tmpdir(),
            `_${Math.random().toString(36).substr(2, 9)}`
        );
        const instance = fastLogger({
            timestamp: () => ',"time":"none"'
        }, tmp);
        instance.info("hello");
        await sleep(250);
        const result = JSON.parse(readFileSync(tmp).toString());
        assert.deepEqual(result, {
            pid,
            hostname,
            level: 30,
            time: "none",
            msg: "hello",
            v: 1
        });
    });

    // https://github.com/pinojs/pino/issues/222
    it("children with same names render in correct order", async () => {
        const stream = sink();
        const root = fastLogger(stream);
        root.child({ a: 1 }).child({ a: 2 }).info({ a: 3 });
        const { a } = await once(stream, "data");
        assert.equal(a, 3, "last logged object takes precedence");
    });

    // https://github.com/pinojs/pino/pull/251 - use this.stringify
    it("use `fast-safe-stringify` to avoid circular dependencies", async () => {
        const stream = sink();
        const root = fastLogger(stream);
        // circular depth
        const obj = {};
        obj.a = obj;
        root.info(obj);
        const { a } = await once(stream, "data");
        assert.deepEqual(a, { a: "[Circular]" });
    });

    it("fast-safe-stringify must be used when interpolating", async () => {
        const stream = sink();
        const instance = fastLogger(stream);

        const o = { a: { b: {} } };
        o.a.b.c = o.a.b;
        instance.info("test", o);

        const { msg } = await once(stream, "data");
        assert.equal(msg, 'test {"a":{"b":{"c":"[Circular]"}}}');
    });

    it("throws when setting useOnlyCustomLevels without customLevels", async () => {
        assert.throws(() => {
            fastLogger({
                useOnlyCustomLevels: true
            });
        });
        try {
            fastLogger({
                useOnlyCustomLevels: true
            });
        } catch ({ message }) {
            assert.equal(message, "customLevels is required if useOnlyCustomLevels is set true");
        }
    });

    it("correctly log Infinity", async () => {
        const stream = sink();
        const instance = fastLogger(stream);

        const o = { num: Infinity };
        instance.info(o);

        const { num } = await once(stream, "data");
        assert.null(num);
    });

    it("correctly log -Infinity", async () => {
        const stream = sink();
        const instance = fastLogger(stream);

        const o = { num: -Infinity };
        instance.info(o);

        const { num } = await once(stream, "data");
        assert.null(num);
    });

    it("correctly log NaN", async () => {
        const stream = sink();
        const instance = fastLogger(stream);

        const o = { num: NaN };
        instance.info(o);

        const { num } = await once(stream, "data");
        assert.null(num);
    });
});
