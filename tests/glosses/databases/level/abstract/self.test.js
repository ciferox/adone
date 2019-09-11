const {
    database: { level: { AbstractBackend, AbstractIterator, AbstractChainedBatch } }
} = adone;

const sinon = require("sinon");
const inherits = require("util").inherits;

const testCommon = require("./common")({
    clear: true,
    factory() {
        return new AbstractBackend();
    }
});

const rangeOptions = ["gt", "gte", "lt", "lte"];
const legacyRangeOptions = ["start", "end"];

// Test the suite itself as well as the default implementation,
// excluding noop operations that can't pass the test suite.

// require("./index")(testCommon);

// require("./open-test").all(test, testCommon);

// require("./open-create-if-missing-test").setUp(test, testCommon);
// require("./open-create-if-missing-test").tearDown(test, testCommon);

// require("./open-error-if-exists-test").setUp(test, testCommon);
// require("./open-error-if-exists-test").tearDown(test, testCommon);

// require("./del-test").setUp(test, testCommon);
// require("./del-test").args(test, testCommon);

// require("./get-test").setUp(test, testCommon);
// require("./get-test").args(test, testCommon);

// require("./put-test").setUp(test, testCommon);
// require("./put-test").args(test, testCommon);

// require("./put-get-del-test").setUp(test, testCommon);
// require("./put-get-del-test").errorKeys(test, testCommon);
// require("./put-get-del-test").tearDown(test, testCommon);

// require("./batch-test").setUp(test, testCommon);
// require("./batch-test").args(test, testCommon);

// require("./chained-batch-test").setUp(test, testCommon);
// require("./chained-batch-test").args(test, testCommon);
// require("./chained-batch-test").tearDown(test, testCommon);

// require("./close-test").all(test, testCommon);

// require("./iterator-test").setUp(test, testCommon);
// require("./iterator-test").args(test, testCommon);
// require("./iterator-test").sequence(test, testCommon);
// require("./iterator-test").tearDown(test, testCommon);

// require("./iterator-range-test").setUp(test, testCommon);
// require("./iterator-range-test").tearDown(test, testCommon);

// require("./iterator-snapshot-test").setUp(test, testCommon);
// require("./iterator-snapshot-test").tearDown(test, testCommon);

// require("./iterator-no-snapshot-test").setUp(test, testCommon);
// require("./iterator-no-snapshot-test").tearDown(test, testCommon);

// require("./iterator-seek-test").setUp(test, testCommon);
// require("./iterator-seek-test").sequence(test, testCommon);
// require("./iterator-seek-test").tearDown(test, testCommon);

// require("./clear-test").setUp(test, testCommon);
// require("./clear-test").args(test, testCommon);
// require("./clear-test").tearDown(test, testCommon);

// require("./clear-range-test").setUp(test, testCommon);
// require("./clear-range-test").tearDown(test, testCommon);

const implement = function (ctor, methods) {
    class Test extends ctor {
    }
    // function Test() {
    //     ctor.apply(this, arguments);
    // }

    // inherits(Test, ctor);

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
    const spy = sinon.spy();
    const expectedCb = function () { };
    const expectedOptions = { createIfMissing: true, errorIfExists: false };
    const Test = implement(AbstractBackend, { _open: spy });
    const test = new Test("foobar");

    test.open(expectedCb);

    assert.equal(spy.callCount, 1, "got _open() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _open() was correct");
    assert.equal(spy.getCall(0).args.length, 2, "got two arguments");
    assert.deepEqual(spy.getCall(0).args[0], expectedOptions, "got default options argument");

    test.open({ options: 1 }, expectedCb);

    expectedOptions.options = 1;

    assert.equal(spy.callCount, 2, "got _open() call");
    assert.equal(spy.getCall(1).thisValue, test, "`this` on _open() was correct");
    assert.equal(spy.getCall(1).args.length, 2, "got two arguments");
    assert.deepEqual(spy.getCall(1).args[0], expectedOptions, "got expected options argument");
});

it("test close() extensibility", () => {
    const spy = sinon.spy();
    const expectedCb = function () { };
    const Test = implement(AbstractBackend, { _close: spy });
    const test = new Test("foobar");

    test.close(expectedCb);

    assert.equal(spy.callCount, 1, "got _close() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _close() was correct");
    assert.equal(spy.getCall(0).args.length, 1, "got one arguments");
});

it("test get() extensibility", () => {
    const spy = sinon.spy();
    const expectedCb = function () { };
    const expectedOptions = { asBuffer: true };
    const expectedKey = "a key";
    const Test = implement(AbstractBackend, { _get: spy });
    const test = new Test("foobar");

    test.get(expectedKey, expectedCb);

    assert.equal(spy.callCount, 1, "got _get() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _get() was correct");
    assert.equal(spy.getCall(0).args.length, 3, "got three arguments");
    assert.equal(spy.getCall(0).args[0], expectedKey, "got expected key argument");
    assert.deepEqual(spy.getCall(0).args[1], expectedOptions, "got default options argument");
    assert.equal(spy.getCall(0).args[2], expectedCb, "got expected cb argument");

    test.get(expectedKey, { options: 1 }, expectedCb);

    expectedOptions.options = 1;

    assert.equal(spy.callCount, 2, "got _get() call");
    assert.equal(spy.getCall(1).thisValue, test, "`this` on _get() was correct");
    assert.equal(spy.getCall(1).args.length, 3, "got three arguments");
    assert.equal(spy.getCall(1).args[0], expectedKey, "got expected key argument");
    assert.deepEqual(spy.getCall(1).args[1], expectedOptions, "got expected options argument");
    assert.equal(spy.getCall(1).args[2], expectedCb, "got expected cb argument");
});

it("test del() extensibility", () => {
    const spy = sinon.spy();
    const expectedCb = function () { };
    const expectedOptions = { options: 1 };
    const expectedKey = "a key";
    const Test = implement(AbstractBackend, { _del: spy });
    const test = new Test("foobar");

    test.del(expectedKey, expectedCb);

    assert.equal(spy.callCount, 1, "got _del() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _del() was correct");
    assert.equal(spy.getCall(0).args.length, 3, "got three arguments");
    assert.equal(spy.getCall(0).args[0], expectedKey, "got expected key argument");
    assert.deepEqual(spy.getCall(0).args[1], {}, "got blank options argument");
    assert.equal(spy.getCall(0).args[2], expectedCb, "got expected cb argument");

    test.del(expectedKey, expectedOptions, expectedCb);

    assert.equal(spy.callCount, 2, "got _del() call");
    assert.equal(spy.getCall(1).thisValue, test, "`this` on _del() was correct");
    assert.equal(spy.getCall(1).args.length, 3, "got three arguments");
    assert.equal(spy.getCall(1).args[0], expectedKey, "got expected key argument");
    assert.deepEqual(spy.getCall(1).args[1], expectedOptions, "got expected options argument");
    assert.equal(spy.getCall(1).args[2], expectedCb, "got expected cb argument");
});

it("test put() extensibility", () => {
    const spy = sinon.spy();
    const expectedCb = function () { };
    const expectedOptions = { options: 1 };
    const expectedKey = "a key";
    const expectedValue = "a value";
    const Test = implement(AbstractBackend, { _put: spy });
    const test = new Test("foobar");

    test.put(expectedKey, expectedValue, expectedCb);

    assert.equal(spy.callCount, 1, "got _put() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _put() was correct");
    assert.equal(spy.getCall(0).args.length, 4, "got four arguments");
    assert.equal(spy.getCall(0).args[0], expectedKey, "got expected key argument");
    assert.equal(spy.getCall(0).args[1], expectedValue, "got expected value argument");
    assert.deepEqual(spy.getCall(0).args[2], {}, "got blank options argument");
    assert.equal(spy.getCall(0).args[3], expectedCb, "got expected cb argument");

    test.put(expectedKey, expectedValue, expectedOptions, expectedCb);

    assert.equal(spy.callCount, 2, "got _put() call");
    assert.equal(spy.getCall(1).thisValue, test, "`this` on _put() was correct");
    assert.equal(spy.getCall(1).args.length, 4, "got four arguments");
    assert.equal(spy.getCall(1).args[0], expectedKey, "got expected key argument");
    assert.equal(spy.getCall(1).args[1], expectedValue, "got expected value argument");
    assert.deepEqual(spy.getCall(1).args[2], expectedOptions, "got blank options argument");
    assert.equal(spy.getCall(1).args[3], expectedCb, "got expected cb argument");
});

it("test batch([]) (array-form) extensibility", () => {
    const spy = sinon.spy();
    const expectedCb = function () { };
    const expectedOptions = { options: 1 };
    const expectedArray = [
        { type: "put", key: "1", value: "1" },
        { type: "del", key: "2" }
    ];
    const Test = implement(AbstractBackend, { _batch: spy });
    const test = new Test("foobar");

    test.batch(expectedArray, expectedCb);

    assert.equal(spy.callCount, 1, "got _batch() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _batch() was correct");
    assert.equal(spy.getCall(0).args.length, 3, "got three arguments");
    assert.deepEqual(spy.getCall(0).args[0], expectedArray, "got expected array argument");
    assert.deepEqual(spy.getCall(0).args[1], {}, "got expected options argument");
    assert.equal(spy.getCall(0).args[2], expectedCb, "got expected callback argument");

    test.batch(expectedArray, expectedOptions, expectedCb);

    assert.equal(spy.callCount, 2, "got _batch() call");
    assert.equal(spy.getCall(1).thisValue, test, "`this` on _batch() was correct");
    assert.equal(spy.getCall(1).args.length, 3, "got three arguments");
    assert.deepEqual(spy.getCall(1).args[0], expectedArray, "got expected array argument");
    assert.deepEqual(spy.getCall(1).args[1], expectedOptions, "got expected options argument");
    assert.equal(spy.getCall(1).args[2], expectedCb, "got expected callback argument");

    test.batch(expectedArray, null, expectedCb);

    assert.equal(spy.callCount, 3, "got _batch() call");
    assert.equal(spy.getCall(2).thisValue, test, "`this` on _batch() was correct");
    assert.equal(spy.getCall(2).args.length, 3, "got three arguments");
    assert.deepEqual(spy.getCall(2).args[0], expectedArray, "got expected array argument");
    assert.ok(spy.getCall(2).args[1], "options should not be null");
    assert.equal(spy.getCall(2).args[2], expectedCb, "got expected callback argument");
});

it("test batch([]) (array-form) with empty array is asynchronous", (done) => {
    const spy = sinon.spy();
    const Test = implement(AbstractBackend, { _batch: spy });
    const test = new Test();
    let async = false;

    test.batch([], (err) => {
        assert.notExists(err, "no error");
        assert.ok(async, "callback is asynchronous");

        // Assert that asynchronicity is provided by batch() rather than _batch()
        assert.equal(spy.callCount, 0, "_batch() call was bypassed");
        done();
    });

    async = true;
});

it("test chained batch() extensibility", () => {
    const spy = sinon.spy();
    const expectedCb = function () { };
    const expectedOptions = { options: 1 };
    const Test = implement(AbstractBackend, { _batch: spy });
    const test = new Test("foobar");

    test.batch().put("foo", "bar").del("bang").write(expectedCb);

    assert.equal(spy.callCount, 1, "got _batch() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _batch() was correct");
    assert.equal(spy.getCall(0).args.length, 3, "got three arguments");
    assert.equal(spy.getCall(0).args[0].length, 2, "got expected array argument");
    assert.deepEqual(spy.getCall(0).args[0][0], { type: "put", key: "foo", value: "bar" }, "got expected array argument[0]");
    assert.deepEqual(spy.getCall(0).args[0][1], { type: "del", key: "bang" }, "got expected array argument[1]");
    assert.deepEqual(spy.getCall(0).args[1], {}, "got expected options argument");
    assert.equal(spy.getCall(0).args[2], expectedCb, "got expected callback argument");

    test.batch().put("foo", "bar").del("bang").write(expectedOptions, expectedCb);

    assert.equal(spy.callCount, 2, "got _batch() call");
    assert.equal(spy.getCall(1).thisValue, test, "`this` on _batch() was correct");
    assert.equal(spy.getCall(1).args.length, 3, "got three arguments");
    assert.equal(spy.getCall(1).args[0].length, 2, "got expected array argument");
    assert.deepEqual(spy.getCall(1).args[0][0], { type: "put", key: "foo", value: "bar" }, "got expected array argument[0]");
    assert.deepEqual(spy.getCall(1).args[0][1], { type: "del", key: "bang" }, "got expected array argument[1]");
    assert.deepEqual(spy.getCall(1).args[1], expectedOptions, "got expected options argument");
    assert.equal(spy.getCall(1).args[2], expectedCb, "got expected callback argument");
});

it("test chained batch() with no operations is asynchronous", (done) => {
    const Test = implement(AbstractBackend, {});
    const test = new Test();
    let async = false;

    test.batch().write((err) => {
        assert.notExists(err, "no error");
        assert.ok(async, "callback is asynchronous");
        done();
    });

    async = true;
});

it("test chained batch() (custom _chainedBatch) extensibility", () => {
    const spy = sinon.spy();
    const Test = implement(AbstractBackend, { _chainedBatch: spy });
    const test = new Test("foobar");

    test.batch();

    assert.equal(spy.callCount, 1, "got _chainedBatch() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _chainedBatch() was correct");

    test.batch();

    assert.equal(spy.callCount, 2, "got _chainedBatch() call");
    assert.equal(spy.getCall(1).thisValue, test, "`this` on _chainedBatch() was correct");
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
        done();
    }
});

it("test AbstractChainedBatch#write() extensibility", () => {
    const spy = sinon.spy();
    const spycb = sinon.spy();
    const Test = implement(AbstractChainedBatch, { _write: spy });
    const test = new Test({ test: true });

    test.write(spycb);

    assert.equal(spy.callCount, 1, "got _write() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _write() was correct");
    assert.equal(spy.getCall(0).args.length, 2, "got two arguments");
    assert.deepEqual(spy.getCall(0).args[0], {}, "got options");
    // awkward here cause of nextTick & an internal wrapped cb
    assert.equal(typeof spy.getCall(0).args[1], "function", "got a callback function");
    assert.equal(spycb.callCount, 0, "spycb not called");
    spy.getCall(0).args[1]();
    assert.equal(spycb.callCount, 1, "spycb called, i.e. was our cb argument");
});

it("test AbstractChainedBatch#write() extensibility with null options", () => {
    const spy = sinon.spy();
    const Test = implement(AbstractChainedBatch, { _write: spy });
    const test = new Test({ test: true });

    test.write(null, () => { });

    assert.equal(spy.callCount, 1, "got _write() call");
    assert.deepEqual(spy.getCall(0).args[0], {}, "got options");
});

it("test AbstractChainedBatch#write() extensibility with options", () => {
    const spy = sinon.spy();
    const Test = implement(AbstractChainedBatch, { _write: spy });
    const test = new Test({ test: true });

    test.write({ test: true }, () => { });

    assert.equal(spy.callCount, 1, "got _write() call");
    assert.deepEqual(spy.getCall(0).args[0], { test: true }, "got options");
});

it("test AbstractChainedBatch#put() extensibility", () => {
    const spy = sinon.spy();
    const expectedKey = "key";
    const expectedValue = "value";
    const Test = implement(AbstractChainedBatch, { _put: spy });
    const test = new Test(testCommon.factory());
    const returnValue = test.put(expectedKey, expectedValue);

    assert.equal(spy.callCount, 1, "got _put call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _put() was correct");
    assert.equal(spy.getCall(0).args.length, 2, "got two arguments");
    assert.equal(spy.getCall(0).args[0], expectedKey, "got expected key argument");
    assert.equal(spy.getCall(0).args[1], expectedValue, "got expected value argument");
    assert.equal(returnValue, test, "get expected return value");
});

it("test AbstractChainedBatch#del() extensibility", () => {
    const spy = sinon.spy();
    const expectedKey = "key";
    const Test = implement(AbstractChainedBatch, { _del: spy });
    const test = new Test(testCommon.factory());
    const returnValue = test.del(expectedKey);

    assert.equal(spy.callCount, 1, "got _del call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _del() was correct");
    assert.equal(spy.getCall(0).args.length, 1, "got one argument");
    assert.equal(spy.getCall(0).args[0], expectedKey, "got expected key argument");
    assert.equal(returnValue, test, "get expected return value");
});

it("test AbstractChainedBatch#clear() extensibility", () => {
    const spy = sinon.spy();
    const Test = implement(AbstractChainedBatch, { _clear: spy });
    const test = new Test(testCommon.factory());
    const returnValue = test.clear();

    assert.equal(spy.callCount, 1, "got _clear call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _clear() was correct");
    assert.equal(spy.getCall(0).args.length, 0, "got zero arguments");
    assert.equal(returnValue, test, "get expected return value");
});

it("test iterator() extensibility", () => {
    const spy = sinon.spy();
    const expectedOptions = {
        options: 1,
        reverse: false,
        keys: true,
        values: true,
        limit: -1,
        keyAsBuffer: true,
        valueAsBuffer: true
    };
    const Test = implement(AbstractBackend, { _iterator: spy });
    const test = new Test("foobar");

    test.iterator({ options: 1 });

    assert.equal(spy.callCount, 1, "got _iterator() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _iterator() was correct");
    assert.equal(spy.getCall(0).args.length, 1, "got one arguments");
    assert.deepEqual(spy.getCall(0).args[0], expectedOptions, "got expected options argument");
});

it("test AbstractIterator extensibility", () => {
    const Test = implement(AbstractIterator);
    const db = {};
    const test = new Test(db);
    assert.ok(test.db === db, "instance has db reference");
});

it("test AbstractIterator#next() extensibility", () => {
    const spy = sinon.spy();
    const spycb = sinon.spy();
    const Test = implement(AbstractIterator, { _next: spy });
    const test = new Test({});

    test.next(spycb);

    assert.equal(spy.callCount, 1, "got _next() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _next() was correct");
    assert.equal(spy.getCall(0).args.length, 1, "got one arguments");
    // awkward here cause of nextTick & an internal wrapped cb
    assert.equal(typeof spy.getCall(0).args[0], "function", "got a callback function");
    assert.equal(spycb.callCount, 0, "spycb not called");
    spy.getCall(0).args[0]();
    assert.equal(spycb.callCount, 1, "spycb called, i.e. was our cb argument");
});

it("test AbstractIterator#end() extensibility", () => {
    const spy = sinon.spy();
    const expectedCb = function () { };
    const Test = implement(AbstractIterator, { _end: spy });
    const test = new Test({});

    test.end(expectedCb);

    assert.equal(spy.callCount, 1, "got _end() call");
    assert.equal(spy.getCall(0).thisValue, test, "`this` on _end() was correct");
    assert.equal(spy.getCall(0).args.length, 1, "got one arguments");
    assert.equal(spy.getCall(0).args[0], expectedCb, "got expected cb argument");
});

it("test clear() extensibility", () => {
    const spy = sinon.spy();
    const Test = implement(AbstractBackend, { _clear: spy });
    const db = new Test();
    const callback = function () { };

    call([callback], { reverse: false, limit: -1 });
    call([null, callback], { reverse: false, limit: -1 });
    call([undefined, callback], { reverse: false, limit: -1 });
    call([{ custom: 1 }, callback], { custom: 1, reverse: false, limit: -1 });
    call([{ reverse: true, limit: 0 }, callback], { reverse: true, limit: 0 });
    call([{ reverse: 1 }, callback], { reverse: true, limit: -1 });
    call([{ reverse: null }, callback], { reverse: false, limit: -1 });

    function call(args, expectedOptions) {
        db.clear.apply(db, args);

        assert.equal(spy.callCount, 1, "got _clear() call");
        assert.equal(spy.getCall(0).thisValue, db, "`this` on _clear() was correct");
        assert.equal(spy.getCall(0).args.length, 2, "got two arguments");
        assert.deepEqual(spy.getCall(0).args[0], expectedOptions, "got expected options argument");
        assert.equal(spy.getCall(0).args[1], callback, "got expected callback argument");

        spy.resetHistory();
    }
});

it("test serialization extensibility (put)", () => {
    const spy = sinon.spy();
    const Test = implement(AbstractBackend, {
        _put: spy,
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

    assert.equal(spy.callCount, 1, "got _put() call");
    assert.equal(spy.getCall(0).args[0], "foo", "got expected key argument");
    assert.equal(spy.getCall(0).args[1], "bar", "got expected value argument");
});

// it("test serialization extensibility (del)", () => {
//     t.plan(3);

//     const spy = sinon.spy();
//     const Test = implement(AbstractBackend, {
//         _del: spy,
//         _serializeKey(key) {
//             assert.equal(key, "no");
//             return "foo";
//         },
//         _serializeValue(value) {
//             t.fail("should not be called");
//         }
//     });

//     const test = new Test("foobar");
//     test.del("no", () => { });

//     assert.equal(spy.callCount, 1, "got _del() call");
//     assert.equal(spy.getCall(0).args[0], "foo", "got expected key argument");

//     t.end();
// });

// it("test serialization extensibility (batch array put)", () => {
//     t.plan(5);

//     const spy = sinon.spy();
//     const Test = implement(AbstractBackend, {
//         _batch: spy,
//         _serializeKey(key) {
//             assert.equal(key, "no");
//             return "foo";
//         },
//         _serializeValue(value) {
//             assert.equal(value, "nope");
//             return "bar";
//         }
//     });

//     const test = new Test("foobar");
//     test.batch([{ type: "put", key: "no", value: "nope" }], () => { });

//     assert.equal(spy.callCount, 1, "got _batch() call");
//     assert.equal(spy.getCall(0).args[0][0].key, "foo", "got expected key");
//     assert.equal(spy.getCall(0).args[0][0].value, "bar", "got expected value");
// });

// it("test serialization extensibility (batch chain put)", () => {
//     t.plan(5);

//     const spy = sinon.spy();
//     const Test = implement(AbstractBackend, {
//         _batch: spy,
//         _serializeKey(key) {
//             assert.equal(key, "no");
//             return "foo";
//         },
//         _serializeValue(value) {
//             assert.equal(value, "nope");
//             return "bar";
//         }
//     });

//     const test = new Test("foobar");
//     test.batch().put("no", "nope").write(() => { });

//     assert.equal(spy.callCount, 1, "got _batch() call");
//     assert.equal(spy.getCall(0).args[0][0].key, "foo", "got expected key");
//     assert.equal(spy.getCall(0).args[0][0].value, "bar", "got expected value");
// });

// it("test serialization extensibility (batch array del)", () => {
//     t.plan(3);

//     const spy = sinon.spy();
//     const Test = implement(AbstractBackend, {
//         _batch: spy,
//         _serializeKey(key) {
//             assert.equal(key, "no");
//             return "foo";
//         },
//         _serializeValue(value) {
//             t.fail("should not be called");
//         }
//     });

//     const test = new Test("foobar");
//     test.batch([{ type: "del", key: "no" }], () => { });

//     assert.equal(spy.callCount, 1, "got _batch() call");
//     assert.equal(spy.getCall(0).args[0][0].key, "foo", "got expected key");
// });

// it("test serialization extensibility (batch chain del)", () => {
//     t.plan(3);

//     const spy = sinon.spy();
//     const Test = implement(AbstractBackend, {
//         _batch: spy,
//         _serializeKey(key) {
//             assert.equal(key, "no");
//             return "foo";
//         },
//         _serializeValue(value) {
//             t.fail("should not be called");
//         }
//     });

//     const test = new Test("foobar");
//     test.batch().del("no").write(() => { });

//     assert.equal(spy.callCount, 1, "got _batch() call");
//     assert.equal(spy.getCall(0).args[0][0].key, "foo", "got expected key");
// });

// it("test serialization extensibility (batch array is not mutated)", () => {
//     t.plan(7);

//     const spy = sinon.spy();
//     const Test = implement(AbstractBackend, {
//         _batch: spy,
//         _serializeKey(key) {
//             assert.equal(key, "no");
//             return "foo";
//         },
//         _serializeValue(value) {
//             assert.equal(value, "nope");
//             return "bar";
//         }
//     });

//     const test = new Test("foobar");
//     const op = { type: "put", key: "no", value: "nope" };

//     test.batch([op], () => { });

//     assert.equal(spy.callCount, 1, "got _batch() call");
//     assert.equal(spy.getCall(0).args[0][0].key, "foo", "got expected key");
//     assert.equal(spy.getCall(0).args[0][0].value, "bar", "got expected value");

//     assert.equal(op.key, "no", "did not mutate input key");
//     assert.equal(op.value, "nope", "did not mutate input value");
// });

// it("test serialization extensibility (iterator range options)", () => {
//     t.plan(2);

//     function Test() {
//         AbstractBackend.call(this);
//     }

//     inherits(Test, AbstractBackend);

//     Test.prototype._serializeKey = function (key) {
//         assert.equal(key, "input");
//         return "output";
//     };

//     Test.prototype._iterator = function (options) {
//         return new Iterator(this, options);
//     };

//     function Iterator(db, options) {
//         AbstractIterator.call(this, db);
//         assert.equal(options.gt, "output");
//     }

//     inherits(Iterator, AbstractIterator);

//     const test = new Test();
//     test.iterator({ gt: "input" });
// });

// it("test serialization extensibility (iterator seek)", () => {
//     t.plan(3);

//     const spy = sinon.spy();
//     const TestIterator = implement(AbstractIterator, { _seek: spy });

//     const Test = implement(AbstractBackend, {
//         _iterator() {
//             return new TestIterator(this);
//         },
//         _serializeKey(key) {
//             assert.equal(key, "target");
//             return "serialized";
//         }
//     });

//     const test = new Test("foobar");
//     const it = test.iterator();

//     it.seek("target");

//     assert.equal(spy.callCount, 1, "got _seek() call");
//     assert.equal(spy.getCall(0).args[0], "serialized", "got expected target argument");
// });

// it("test serialization extensibility (clear range options)", () => {
//     t.plan(rangeOptions.length * 2);

//     rangeOptions.forEach((key) => {
//         let Test = implement(AbstractBackend, {
//             _serializeKey (key) {
//                 assert.equal(key, 'input')
//                 return 'output'
//             },
//             _clear (options, callback) {
//                 assert.equal(options[key], 'output')
//             }
//         });

//         let db = new Test();
//         let options = {};

//         options[key] = "input";
//         db.clear(options, () => { });
//     });
// });

// it("clear() does not delete empty or nullish range options", () => {
//     const rangeValues = [Buffer.alloc(0), "", null, undefined];

//     t.plan(rangeOptions.length * rangeValues.length);

//     rangeValues.forEach((value) => {
//         let Test = implement(AbstractBackend, {
//             _clear (options, callback) {
//                 rangeOptions.forEach(function (key) {
//                     assert.ok(key in options, key + ' option should not be deleted')
//                 })
//             }
//         });

//         let db = new Test();
//         let options = {};

//         rangeOptions.forEach((key) => {
//             options[key] = value
//         });

//         db.clear(options, () => { });
//     });
// });

// it(".status", () => {
//     t.plan(5);

//     t.it("empty prototype", () => {
//         let Test = implement(AbstractBackend);
//         let test = new Test("foobar");

//         assert.equal(test.status, "new");

//         test.open((err) => {
//             t.error(err)
//             assert.equal(test.status, 'open')

//             test.close(function (err) {
//                 t.error(err)
//                 assert.equal(test.status, 'closed')
//                 t.end()
//             })
//         });
//     });

//     t.it("open error", () => {
//         let Test = implement(AbstractBackend, {
//             _open (options, cb) {
//                 cb(new Error())
//             }
//         });

//         let test = new Test("foobar");

//         test.open((err) => {
//             assert.ok(err)
//             assert.equal(test.status, 'new')
//             t.end()
//         });
//     });

//     t.it("close error", () => {
//         let Test = implement(AbstractBackend, {
//             _close (cb) {
//                 cb(new Error())
//             }
//         });

//         let test = new Test("foobar");
//         test.open(() => {
//             test.close(function (err) {
//                 assert.ok(err)
//                 assert.equal(test.status, 'open')
//                 t.end()
//             })
//         });
//     });

//     t.it("open", () => {
//         let Test = implement(AbstractBackend, {
//             _open (options, cb) {
//                 process.nextTick(cb)
//             }
//         });

//         let test = new Test("foobar");
//         test.open((err) => {
//             t.error(err)
//             assert.equal(test.status, 'open')
//             t.end()
//         });
//         assert.equal(test.status, "opening");
//     });

//     t.it("close", () => {
//         let Test = implement(AbstractBackend, {
//             _close (cb) {
//                 process.nextTick(cb)
//             }
//         });

//         let test = new Test("foobar");
//         test.open((err) => {
//             t.error(err)
//             test.close(function (err) {
//                 t.error(err)
//                 assert.equal(test.status, 'closed')
//                 t.end()
//             })
//             assert.equal(test.status, 'closing')
//         });
//     });
// });

// it("_setupIteratorOptions", () => {
//     const keys = legacyRangeOptions.concat(rangeOptions);
//     const db = new AbstractBackend();

//     function setupOptions(constrFn) {
//         const options = {};
//         keys.forEach((key) => {
//             options[key] = constrFn();
//         });
//         return options;
//     }

//     function verifyOptions(t, options) {
//         keys.forEach((key) => {
//             assert.ok(key in options, `${key  } option should not be deleted`);
//         });
//         t.end();
//     }

//     t.plan(6);

//     t.it("default options", () => {
//         assert.deepEqual(db._setupIteratorOptions(), {
//             reverse: false,
//             keys: true,
//             values: true,
//             limit: -1,
//             keyAsBuffer: true,
//             valueAsBuffer: true
//         }, "correct defaults");
//         t.end();
//     });

//     t.it("set options", () => {
//         assert.deepEqual(db._setupIteratorOptions({
//             reverse: false,
//             keys: false,
//             values: false,
//             limit: 20,
//             keyAsBuffer: false,
//             valueAsBuffer: false
//         }), {
//             reverse: false,
//             keys: false,
//             values: false,
//             limit: 20,
//             keyAsBuffer: false,
//             valueAsBuffer: false
//         }, "options set correctly");
//         t.end();
//     });

//     t.it("does not delete empty buffers", () => {
//         let options = setupOptions(() => { return Buffer.from('') });
//         keys.forEach((key) => {
//             assert.equal(Buffer.isBuffer(options[key]), true, 'should be buffer')
//             assert.equal(options[key].length, 0, 'should be empty')
//         });
//         verifyOptions(t, db._setupIteratorOptions(options));
//     });

//     t.it("does not delete empty strings", () => {
//         let options = setupOptions(() => { return '' });
//         keys.forEach((key) => {
//             assert.equal(typeof options[key], 'string', 'should be string')
//             assert.equal(options[key].length, 0, 'should be empty')
//         });
//         verifyOptions(t, db._setupIteratorOptions(options));
//     });

//     t.it("does not delete null", () => {
//         let options = setupOptions(() => { return null });
//         keys.forEach((key) => {
//             assert.equal(options[key], null, 'should be null')
//         });
//         verifyOptions(t, db._setupIteratorOptions(options));
//     });

//     t.it("does not delete undefined", () => {
//         let options = setupOptions(() => { return undefined });
//         keys.forEach((key) => {
//             assert.equal(options[key], undefined, 'should be undefined')
//         });
//         verifyOptions(t, db._setupIteratorOptions(options));
//     });
// });
