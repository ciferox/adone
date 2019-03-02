const {
    is,
    database: { level: { AbstractBackend, AbstractIterator, AbstractChainedBatch } }
} = adone;

const testCommon = require("./common")({
    factory() {
        return new AbstractBackend();
    }
});

describe("abstract", () => {
    describe("constructor", () => {
        require("./constructor")(testCommon);
    });

    describe("open", () => {
        require("./open").all(testCommon);
    });

    describe("open_create_if_missing", () => {
        require("./open_create_if_missing").setUp(testCommon);
        require("./open_create_if_missing").tearDown(testCommon);
    });

    describe("open_error_if_exists", () => {
        require("./open_error_if_exists").setUp(testCommon);
        require("./open_error_if_exists").tearDown(testCommon);
    });

    describe("del", () => {
        require("./del").setUp(testCommon);
        require("./del").args(testCommon);
    });

    describe("get", () => {
        require("./get").setUp(testCommon);
        require("./get").args(testCommon);
    });

    describe("put", () => {
        require("./put").setUp(testCommon);
        require("./put").args(testCommon);
    });

    describe("put_get_del", () => {
        require("./put_get_del").setUp(testCommon);
        require("./put_get_del").errorKeys(testCommon);
        require("./put_get_del").tearDown(testCommon);
    });

    describe("batch", () => {
        require("./batch").setUp(testCommon);
        require("./batch").args(testCommon);
    });

    describe("chained_batch", () => {
        require("./chained_batch").setUp(testCommon);
        require("./chained_batch").args(testCommon);
        require("./chained_batch").tearDown(testCommon);
    });

    describe("close", () => {
        require("./close").all(testCommon);
    });

    describe("iterator", () => {
        require("./iterator").setUp(testCommon);
        require("./iterator").args(testCommon);
        require("./iterator").sequence(testCommon);
        require("./iterator").tearDown(testCommon);
    });

    describe("iterator_range", () => {
        require("./iterator_range").setUp(testCommon);
        require("./iterator_range").tearDown(testCommon);
    });

    describe("iterator_snapshot", () => {
        require("./iterator_snapshot").setUp(testCommon);
        require("./iterator_snapshot").tearDown(testCommon);
    });

    describe("iterator_no_snapshot", () => {
        require("./iterator_no_snapshot").setUp(testCommon);
        require("./iterator_no_snapshot").tearDown(testCommon);
    });

    describe("iterator_seek", () => {
        require("./iterator_seek").setUp(testCommon);
        require("./iterator_seek").sequence(testCommon);
        require("./iterator_seek").tearDown(testCommon);
    });

    const implement = function (Cls, methods) {
        class Test extends Cls {
        }

        for (const k in methods) {
            Test.prototype[k] = methods[k];
        }

        return Test;
    };

    /**
     * Extensibility
     */

    it("test core extensibility", () => {
        const Test = implement(AbstractBackend);
        const test = new Test();
        assert.equal(test.status, "new", "status is new");
    });

    it("test key/value serialization", () => {
        const Test = implement(AbstractBackend);
        const test = new Test();
        ["", {}, null, undefined, Buffer.alloc(0)].forEach((v) => {
            assert.ok(test._serializeKey(v) === v, "_serializeKey is an identity function");
            assert.ok(test._serializeValue(v) === v, "_serializeValue is an identity function");
        });
    });

    it("test open() extensibility", () => {
        const s = spy();
        const expectedCb = function () { };
        const expectedOptions = { createIfMissing: true, errorIfExists: false };
        const Test = implement(AbstractBackend, { _open: s });
        const test = new Test("foobar");

        test.open(expectedCb);

        assert.equal(s.callCount, 1, "got _open() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _open() was correct");
        assert.equal(s.getCall(0).args.length, 2, "got two arguments");
        assert.deepEqual(s.getCall(0).args[0], expectedOptions, "got default options argument");

        test.open({ options: 1 }, expectedCb);

        expectedOptions.options = 1;

        assert.equal(s.callCount, 2, "got _open() call");
        assert.equal(s.getCall(1).thisValue, test, "`this` on _open() was correct");
        assert.equal(s.getCall(1).args.length, 2, "got two arguments");
        assert.deepEqual(s.getCall(1).args[0], expectedOptions, "got expected options argument");
    });

    it("test close() extensibility", () => {
        const s = spy();
        const expectedCb = function () { };
        const Test = implement(AbstractBackend, { _close: s });
        const test = new Test("foobar");

        test.close(expectedCb);

        assert.equal(s.callCount, 1, "got _close() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _close() was correct");
        assert.equal(s.getCall(0).args.length, 1, "got one arguments");
    });

    it("test get() extensibility", () => {
        const s = spy();
        const expectedCb = function () { };
        const expectedOptions = { asBuffer: true };
        const expectedKey = "a key";
        const Test = implement(AbstractBackend, { _get: s });
        const test = new Test("foobar");

        test.get(expectedKey, expectedCb);

        assert.equal(s.callCount, 1, "got _get() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _get() was correct");
        assert.equal(s.getCall(0).args.length, 3, "got three arguments");
        assert.equal(s.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.deepEqual(s.getCall(0).args[1], expectedOptions, "got default options argument");
        assert.equal(s.getCall(0).args[2], expectedCb, "got expected cb argument");

        test.get(expectedKey, { options: 1 }, expectedCb);

        expectedOptions.options = 1;

        assert.equal(s.callCount, 2, "got _get() call");
        assert.equal(s.getCall(1).thisValue, test, "`this` on _get() was correct");
        assert.equal(s.getCall(1).args.length, 3, "got three arguments");
        assert.equal(s.getCall(1).args[0], expectedKey, "got expected key argument");
        assert.deepEqual(s.getCall(1).args[1], expectedOptions, "got expected options argument");
        assert.equal(s.getCall(1).args[2], expectedCb, "got expected cb argument");
    });

    it("test del() extensibility", () => {
        const s = spy();
        const expectedCb = function () { };
        const expectedOptions = { options: 1 };
        const expectedKey = "a key";
        const Test = implement(AbstractBackend, { _del: s });
        const test = new Test("foobar");

        test.del(expectedKey, expectedCb);

        assert.equal(s.callCount, 1, "got _del() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _del() was correct");
        assert.equal(s.getCall(0).args.length, 3, "got three arguments");
        assert.equal(s.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.deepEqual(s.getCall(0).args[1], {}, "got blank options argument");
        assert.equal(s.getCall(0).args[2], expectedCb, "got expected cb argument");

        test.del(expectedKey, expectedOptions, expectedCb);

        assert.equal(s.callCount, 2, "got _del() call");
        assert.equal(s.getCall(1).thisValue, test, "`this` on _del() was correct");
        assert.equal(s.getCall(1).args.length, 3, "got three arguments");
        assert.equal(s.getCall(1).args[0], expectedKey, "got expected key argument");
        assert.deepEqual(s.getCall(1).args[1], expectedOptions, "got expected options argument");
        assert.equal(s.getCall(1).args[2], expectedCb, "got expected cb argument");
    });

    it("test put() extensibility", () => {
        const s = spy();
        const expectedCb = function () { };
        const expectedOptions = { options: 1 };
        const expectedKey = "a key";
        const expectedValue = "a value";
        const Test = implement(AbstractBackend, { _put: s });
        const test = new Test("foobar");

        test.put(expectedKey, expectedValue, expectedCb);

        assert.equal(s.callCount, 1, "got _put() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _put() was correct");
        assert.equal(s.getCall(0).args.length, 4, "got four arguments");
        assert.equal(s.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.equal(s.getCall(0).args[1], expectedValue, "got expected value argument");
        assert.deepEqual(s.getCall(0).args[2], {}, "got blank options argument");
        assert.equal(s.getCall(0).args[3], expectedCb, "got expected cb argument");

        test.put(expectedKey, expectedValue, expectedOptions, expectedCb);

        assert.equal(s.callCount, 2, "got _put() call");
        assert.equal(s.getCall(1).thisValue, test, "`this` on _put() was correct");
        assert.equal(s.getCall(1).args.length, 4, "got four arguments");
        assert.equal(s.getCall(1).args[0], expectedKey, "got expected key argument");
        assert.equal(s.getCall(1).args[1], expectedValue, "got expected value argument");
        assert.deepEqual(s.getCall(1).args[2], expectedOptions, "got blank options argument");
        assert.equal(s.getCall(1).args[3], expectedCb, "got expected cb argument");
    });

    it("test batch() extensibility", () => {
        const s = spy();
        const expectedCb = function () { };
        const expectedOptions = { options: 1 };
        const expectedArray = [
            { type: "put", key: "1", value: "1" },
            { type: "del", key: "2" }
        ];
        const Test = implement(AbstractBackend, { _batch: s });
        const test = new Test("foobar");

        test.batch(expectedArray, expectedCb);

        assert.equal(s.callCount, 1, "got _batch() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _batch() was correct");
        assert.equal(s.getCall(0).args.length, 3, "got three arguments");
        assert.deepEqual(s.getCall(0).args[0], expectedArray, "got expected array argument");
        assert.deepEqual(s.getCall(0).args[1], {}, "got expected options argument");
        assert.equal(s.getCall(0).args[2], expectedCb, "got expected callback argument");

        test.batch(expectedArray, expectedOptions, expectedCb);

        assert.equal(s.callCount, 2, "got _batch() call");
        assert.equal(s.getCall(1).thisValue, test, "`this` on _batch() was correct");
        assert.equal(s.getCall(1).args.length, 3, "got three arguments");
        assert.deepEqual(s.getCall(1).args[0], expectedArray, "got expected array argument");
        assert.deepEqual(s.getCall(1).args[1], expectedOptions, "got expected options argument");
        assert.equal(s.getCall(1).args[2], expectedCb, "got expected callback argument");

        test.batch(expectedArray, null, expectedCb);

        assert.equal(s.callCount, 3, "got _batch() call");
        assert.equal(s.getCall(2).thisValue, test, "`this` on _batch() was correct");
        assert.equal(s.getCall(2).args.length, 3, "got three arguments");
        assert.deepEqual(s.getCall(2).args[0], expectedArray, "got expected array argument");
        assert.ok(s.getCall(2).args[1], "options should not be null");
        assert.equal(s.getCall(2).args[2], expectedCb, "got expected callback argument");
    });

    it("test chained batch() (array) extensibility", () => {
        const s = spy();
        const expectedCb = function () { };
        const expectedOptions = { options: 1 };
        const Test = implement(AbstractBackend, { _batch: s });
        const test = new Test("foobar");

        test.batch().put("foo", "bar").del("bang").write(expectedCb);

        assert.equal(s.callCount, 1, "got _batch() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _batch() was correct");
        assert.equal(s.getCall(0).args.length, 3, "got three arguments");
        assert.equal(s.getCall(0).args[0].length, 2, "got expected array argument");
        assert.deepEqual(s.getCall(0).args[0][0], { type: "put", key: "foo", value: "bar" }, "got expected array argument[0]");
        assert.deepEqual(s.getCall(0).args[0][1], { type: "del", key: "bang" }, "got expected array argument[1]");
        assert.deepEqual(s.getCall(0).args[1], {}, "got expected options argument");
        assert.equal(s.getCall(0).args[2], expectedCb, "got expected callback argument");

        test.batch().put("foo", "bar").del("bang").write(expectedOptions, expectedCb);

        assert.equal(s.callCount, 2, "got _batch() call");
        assert.equal(s.getCall(1).thisValue, test, "`this` on _batch() was correct");
        assert.equal(s.getCall(1).args.length, 3, "got three arguments");
        assert.equal(s.getCall(1).args[0].length, 2, "got expected array argument");
        assert.deepEqual(s.getCall(1).args[0][0], { type: "put", key: "foo", value: "bar" }, "got expected array argument[0]");
        assert.deepEqual(s.getCall(1).args[0][1], { type: "del", key: "bang" }, "got expected array argument[1]");
        assert.deepEqual(s.getCall(1).args[1], expectedOptions, "got expected options argument");
        assert.equal(s.getCall(1).args[2], expectedCb, "got expected callback argument");
    });

    it("test chained batch() (custom _chainedBatch) extensibility", () => {
        const s = spy();
        const Test = implement(AbstractBackend, { _chainedBatch: s });
        const test = new Test("foobar");

        test.batch();

        assert.equal(s.callCount, 1, "got _chainedBatch() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _chainedBatch() was correct");

        test.batch();

        assert.equal(s.callCount, 2, "got _chainedBatch() call");
        assert.equal(s.getCall(1).thisValue, test, "`this` on _chainedBatch() was correct");
    });

    it("test AbstractChainedBatch extensibility", () => {
        const Test = implement(AbstractChainedBatch);
        const db = {};
        const test = new Test(db);
        assert.ok(test.db === db, "instance has db reference");
    });

    it("test AbstractChainedBatch expects a db", (done) => {
        const Test = implement(AbstractChainedBatch);

        try {
            new Test();
        } catch (err) {
            assert.equal(err.message, "First argument must be an abstract-leveldown compliant store");
            return done();
        }
        assert.fail("should be thrown");
    });

    it("test write() extensibility", () => {
        const s = spy();
        const scb = spy();
        const Test = implement(AbstractChainedBatch, { _write: s });
        const test = new Test({ test: true });

        test.write(scb);

        assert.equal(s.callCount, 1, "got _write() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _write() was correct");
        assert.equal(s.getCall(0).args.length, 2, "got two arguments");
        assert.deepEqual(s.getCall(0).args[0], {}, "got options");
        // awkward here cause of nextTick & an internal wrapped cb
        assert.equal(typeof s.getCall(0).args[1], "function", "got a callback function");
        assert.equal(scb.callCount, 0, "spycb not called");
        s.getCall(0).args[1]();
        assert.equal(scb.callCount, 1, "spycb called, i.e. was our cb argument");
    });

    it("test write() extensibility with null options", () => {
        const s = spy();
        const Test = implement(AbstractChainedBatch, { _write: s });
        const test = new Test({ test: true });

        test.write(null, () => { });

        assert.equal(s.callCount, 1, "got _write() call");
        assert.deepEqual(s.getCall(0).args[0], {}, "got options");
    });

    it("test write() extensibility with options", () => {
        const s = spy();
        const Test = implement(AbstractChainedBatch, { _write: s });
        const test = new Test({ test: true });

        test.write({ test: true }, () => { });

        assert.equal(s.callCount, 1, "got _write() call");
        assert.deepEqual(s.getCall(0).args[0], { test: true }, "got options");
    });

    it("test put() extensibility", () => {
        const s = spy();
        const expectedKey = "key";
        const expectedValue = "value";
        const Test = implement(AbstractChainedBatch, { _put: s });
        const test = new Test(testCommon.factory());
        const returnValue = test.put(expectedKey, expectedValue);

        assert.equal(s.callCount, 1, "got _put call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _put() was correct");
        assert.equal(s.getCall(0).args.length, 2, "got two arguments");
        assert.equal(s.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.equal(s.getCall(0).args[1], expectedValue, "got expected value argument");
        assert.equal(returnValue, test, "get expected return value");
    });

    it("test del() extensibility", () => {
        const s = spy();
        const expectedKey = "key";
        const Test = implement(AbstractChainedBatch, { _del: s });
        const test = new Test(testCommon.factory());
        const returnValue = test.del(expectedKey);

        assert.equal(s.callCount, 1, "got _del call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _del() was correct");
        assert.equal(s.getCall(0).args.length, 1, "got one argument");
        assert.equal(s.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.equal(returnValue, test, "get expected return value");
    });

    it("test clear() extensibility", () => {
        const s = spy();
        const Test = implement(AbstractChainedBatch, { _clear: s });
        const test = new Test(testCommon.factory());
        const returnValue = test.clear();

        assert.equal(s.callCount, 1, "got _clear call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _clear() was correct");
        assert.equal(s.getCall(0).args.length, 0, "got zero arguments");
        assert.equal(returnValue, test, "get expected return value");
    });

    it("test iterator() extensibility", () => {
        const s = spy();
        const expectedOptions = {
            options: 1,
            reverse: false,
            keys: true,
            values: true,
            limit: -1,
            keyAsBuffer: true,
            valueAsBuffer: true
        };
        const Test = implement(AbstractBackend, { _iterator: s });
        const test = new Test("foobar");

        test.iterator({ options: 1 });

        assert.equal(s.callCount, 1, "got _close() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _close() was correct");
        assert.equal(s.getCall(0).args.length, 1, "got one arguments");
        assert.deepEqual(s.getCall(0).args[0], expectedOptions, "got expected options argument");
    });

    it("test AbstractIterator extensibility", () => {
        const Test = implement(AbstractIterator);
        const db = {};
        const test = new Test(db);
        assert.ok(test.db === db, "instance has db reference");
    });

    it("test next() extensibility", () => {
        const s = spy();
        const scb = spy();
        const Test = implement(AbstractIterator, { _next: s });
        const test = new Test({});

        test.next(scb);

        assert.equal(s.callCount, 1, "got _next() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _next() was correct");
        assert.equal(s.getCall(0).args.length, 1, "got one arguments");
        // awkward here cause of nextTick & an internal wrapped cb
        assert.equal(typeof s.getCall(0).args[0], "function", "got a callback function");
        assert.equal(scb.callCount, 0, "spycb not called");
        s.getCall(0).args[0]();
        assert.equal(scb.callCount, 1, "spycb called, i.e. was our cb argument");
    });

    it("test end() extensibility", () => {
        const s = spy();
        const expectedCb = function () { };
        const Test = implement(AbstractIterator, { _end: s });
        const test = new Test({});

        test.end(expectedCb);

        assert.equal(s.callCount, 1, "got _end() call");
        assert.equal(s.getCall(0).thisValue, test, "`this` on _end() was correct");
        assert.equal(s.getCall(0).args.length, 1, "got one arguments");
        assert.equal(s.getCall(0).args[0], expectedCb, "got expected cb argument");
    });

    it("test serialization extensibility (put)", () => {
        const s = spy();
        const Test = implement(AbstractBackend, {
            _put: s,
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            },

            _serializeValue(value) {
                assert.equal(value, "nope");
                return "bar";
            }
        });

        const test = new Test("foobar");
        test.put("no", "nope", () => { });

        assert.equal(s.callCount, 1, "got _put() call");
        assert.equal(s.getCall(0).args[0], "foo", "got expected key argument");
        assert.equal(s.getCall(0).args[1], "bar", "got expected value argument");
    });

    it("test serialization extensibility (del)", () => {
        const s = spy();
        const Test = implement(AbstractBackend, {
            _del: s,
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            },
            _serializeValue(value) {
                t.fail("should not be called");
            }
        });

        const test = new Test("foobar");
        test.del("no", () => { });

        assert.equal(s.callCount, 1, "got _del() call");
        assert.equal(s.getCall(0).args[0], "foo", "got expected key argument");
    });

    it("test serialization extensibility (batch array put)", () => {
        const s = spy();
        const Test = implement(AbstractBackend, {
            _batch: s,
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            },
            _serializeValue(value) {
                assert.equal(value, "nope");
                return "bar";
            }
        });

        const test = new Test("foobar");
        test.batch([{ type: "put", key: "no", value: "nope" }], () => { });

        assert.equal(s.callCount, 1, "got _batch() call");
        assert.equal(s.getCall(0).args[0][0].key, "foo", "got expected key");
        assert.equal(s.getCall(0).args[0][0].value, "bar", "got expected value");
    });

    it("test serialization extensibility (batch chain put)", () => {
        const s = spy();
        const Test = implement(AbstractBackend, {
            _batch: s,
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            },
            _serializeValue(value) {
                assert.equal(value, "nope");
                return "bar";
            }
        });

        const test = new Test("foobar");
        test.batch().put("no", "nope").write(() => { });

        assert.equal(s.callCount, 1, "got _batch() call");
        assert.equal(s.getCall(0).args[0][0].key, "foo", "got expected key");
        assert.equal(s.getCall(0).args[0][0].value, "bar", "got expected value");
    });

    it("test serialization extensibility (batch array del)", () => {
        const s = spy();
        const Test = implement(AbstractBackend, {
            _batch: s,
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            },
            _serializeValue(value) {
                assert.fail("should not be called");
            }
        });

        const test = new Test("foobar");
        test.batch([{ type: "del", key: "no" }], () => { });

        assert.equal(s.callCount, 1, "got _batch() call");
        assert.equal(s.getCall(0).args[0][0].key, "foo", "got expected key");
    });

    it("test serialization extensibility (batch chain del)", () => {
        const s = spy();
        const Test = implement(AbstractBackend, {
            _batch: s,
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            },
            _serializeValue(value) {
                assert.fail("should not be called");
            }
        });

        const test = new Test("foobar");
        test.batch().del("no").write(() => { });

        assert.equal(s.callCount, 1, "got _batch() call");
        assert.equal(s.getCall(0).args[0][0].key, "foo", "got expected key");
    });

    it("test serialization extensibility (batch array is not mutated)", () => {
        const s = spy();
        const Test = implement(AbstractBackend, {
            _batch: s,
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            },
            _serializeValue(value) {
                assert.equal(value, "nope");
                return "bar";
            }
        });

        const test = new Test("foobar");
        const op = { type: "put", key: "no", value: "nope" };

        test.batch([op], () => { });

        assert.equal(s.callCount, 1, "got _batch() call");
        assert.equal(s.getCall(0).args[0][0].key, "foo", "got expected key");
        assert.equal(s.getCall(0).args[0][0].value, "bar", "got expected value");

        assert.equal(op.key, "no", "did not mutate input key");
        assert.equal(op.value, "nope", "did not mutate input value");
    });

    it("test serialization extensibility (iterator range options)", () => {
        class Test extends AbstractBackend {
        }

        class Iterator extends AbstractIterator {
            constructor(db, options) {
                super(db);
                assert.equal(options.gt, "output");
            }
        }

        Test.prototype._serializeKey = function (key) {
            assert.equal(key, "input");
            return "output";
        };

        Test.prototype._iterator = function (options) {
            return new Iterator(this, options);
        };

        const test = new Test();
        test.iterator({ gt: "input" });
    });

    it("test serialization extensibility (iterator seek)", () => {
        const s = spy();
        const TestIterator = implement(AbstractIterator, { _seek: s });

        const Test = implement(AbstractBackend, {
            _iterator() {
                return new TestIterator(this);
            },
            _serializeKey(key) {
                assert.equal(key, "target");
                return "serialized";
            }
        });

        const test = new Test("foobar");
        const it = test.iterator();

        it.seek("target");

        assert.equal(s.callCount, 1, "got _seek() call");
        assert.equal(s.getCall(0).args[0], "serialized", "got expected target argument");
    });

    describe(".status", () => {
        it("empty prototype", (done) => {
            const Test = implement(AbstractBackend);
            const test = new Test("foobar");

            assert.equal(test.status, "new");

            test.open((err) => {
                assert.notExists(err);
                assert.equal(test.status, "open");

                test.close((err) => {
                    assert.notExists(err);
                    assert.equal(test.status, "closed");
                    done();
                });
            });
        });

        it("open error", (done) => {
            const Test = implement(AbstractBackend, {
                _open(options, cb) {
                    cb(new Error());
                }
            });

            const test = new Test("foobar");

            test.open((err) => {
                assert.ok(err);
                assert.equal(test.status, "new");
                done();
            });
        });

        it("close error", (done) => {
            const Test = implement(AbstractBackend, {
                _close(cb) {
                    cb(new Error());
                }
            });

            const test = new Test("foobar");
            test.open(() => {
                test.close((err) => {
                    assert.ok(err);
                    assert.equal(test.status, "open");
                    done();
                });
            });
        });

        it("open", (done) => {
            const Test = implement(AbstractBackend, {
                _open(options, cb) {
                    process.nextTick(cb);
                }
            });

            const test = new Test("foobar");
            test.open((err) => {
                assert.notExists(err);
                assert.equal(test.status, "open");
                done();
            });
            assert.equal(test.status, "opening");
        });

        it("close", (done) => {
            const Test = implement(AbstractBackend, {
                _close(cb) {
                    process.nextTick(cb);
                }
            });

            const test = new Test("foobar");
            test.open((err) => {
                assert.notExists(err);
                test.close((err) => {
                    assert.notExists(err);
                    assert.equal(test.status, "closed");
                    done();
                });
                assert.equal(test.status, "closing");
            });
        });
    });

    describe("_setupIteratorOptions", () => {
        const keys = "start end gt gte lt lte".split(" ");
        const db = new AbstractBackend();

        const setupOptions = function (constrFn) {
            const options = {};
            keys.forEach((key) => {
                options[key] = constrFn();
            });
            return options;
        };

        const verifyOptions = function (done, options) {
            keys.forEach((key) => {
                assert.ok(key in options, "property should not be deleted");
            });
            done();
        };

        it("default options", () => {
            assert.deepEqual(db._setupIteratorOptions(), {
                reverse: false,
                keys: true,
                values: true,
                limit: -1,
                keyAsBuffer: true,
                valueAsBuffer: true
            }, "correct defaults");
        });

        it("set options", () => {
            assert.deepEqual(db._setupIteratorOptions({
                reverse: false,
                keys: false,
                values: false,
                limit: 20,
                keyAsBuffer: false,
                valueAsBuffer: false
            }), {
                reverse: false,
                keys: false,
                values: false,
                limit: 20,
                keyAsBuffer: false,
                valueAsBuffer: false
            }, "options set correctly");
        });

        it("does not delete empty buffers", (done) => {
            const options = setupOptions(() => {
                return Buffer.from("");
            });
            keys.forEach((key) => {
                assert.isTrue(is.buffer(options[key]), "should be buffer");
                assert.equal(options[key].length, 0, "should be empty");
            });
            verifyOptions(done, db._setupIteratorOptions(options));
        });

        it("does not delete empty strings", (done) => {
            const options = setupOptions(() => {
                return "";
            });
            keys.forEach((key) => {
                assert.isString(options[key], "should be string");
                assert.lengthOf(options[key], 0, "should be empty");
            });
            verifyOptions(done, db._setupIteratorOptions(options));
        });

        it("does not delete null", (done) => {
            const options = setupOptions(() => {
                return null;
            });
            keys.forEach((key) => {
                assert.isNull(options[key], "should be null");
            });
            verifyOptions(done, db._setupIteratorOptions(options));
        });

        it("does not delete undefined", (done) => {
            const options = setupOptions(() => {
                return undefined;
            });
            keys.forEach((key) => {
                assert.isUndefined(options[key], "should be undefined");
            });
            verifyOptions(done, db._setupIteratorOptions(options));
        });
    });
});
