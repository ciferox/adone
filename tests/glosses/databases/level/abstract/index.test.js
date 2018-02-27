const testCommon = require("../testCommon");
const {
    is,
    database: { level: { AbstractBackend, AbstractIterator, AbstractChainedBatch } }
} = adone;

const factory = (location, options) => new AbstractBackend(location, options);

/**
 * * compatibility with basic LevelDOWN API **
 */
describe("database", "level", "abstract", () => {
    require("./common/backend").args(factory, testCommon);

    require("./common/del").setUp(factory, testCommon);
    require("./common/del").args();

    require("./common/get").setUp(factory, testCommon);
    require("./common/get").args();

    require("./common/put").setUp(factory, testCommon);
    require("./common/put").args();

    require("./common/put_get_del").setUp(factory, testCommon);
    require("./common/put_get_del").errorKeys();
    // require('./common/put_get_del').nonErrorKeys(test, testCommon)
    require("./common/put_get_del").errorValues();
    require("./common/put_get_del").tearDown(testCommon);

    require("./common/batch").setUp(factory, testCommon);
    require("./common/batch").args();

    require("./common/chained_batch").setUp(factory, testCommon);
    require("./common/chained_batch").args();

    require("./common/close").close(factory, testCommon);

    require("./common/iterator").setUp(factory, testCommon);
    require("./common/iterator").sequence();


    it("test core extensibility", () => {
        class Test extends AbstractBackend { }
        const test = new Test("foobar");
        assert.equal(test.location, "foobar", "location set on instance");
    });

    it("test key/value serialization", () => {
        class Test extends AbstractBackend { }

        const buffer = Buffer.alloc(0);
        const test = new Test("foobar");

        assert.equal(test._serializeKey(1), "1", "_serializeKey converts to string");
        assert.ok(test._serializeKey(buffer) === buffer, "_serializeKey returns Buffer as is");

        assert.equal(test._serializeValue(null), "", "_serializeValue converts null to empty string");
        assert.equal(test._serializeValue(undefined), "", "_serializeValue converts undefined to empty string");

        const browser = Boolean(process.browser);
        process.browser = false;

        assert.equal(test._serializeValue(1), "1", "_serializeValue converts to string");
        assert.ok(test._serializeValue(buffer) === buffer, "_serializeValue returns Buffer as is");

        process.browser = true;
        assert.equal(test._serializeValue(1), 1, "_serializeValue returns value as is when process.browser");

        process.browser = browser;
    });

    it("test open() extensibility", async () => {
        const expectedOptions = { createIfMissing: true, errorIfExists: false };

        class Test extends AbstractBackend { }
        const _open = stub().yields(null);
        Test.prototype._open = _open;

        const test = new Test("foobar");
        await test.open();

        assert.equal(_open.callCount, 1, "got _open() call");
        assert.equal(_open.getCall(0).thisValue, test, "`this` on _open() was correct");
        assert.equal(_open.getCall(0).args.length, 2, "got two arguments");
        assert.deepEqual(_open.getCall(0).args[0], expectedOptions, "got default options argument");

        await test.open({ options: 1 });

        expectedOptions.options = 1;

        assert.equal(_open.callCount, 2, "got _open() call");
        assert.equal(_open.getCall(1).thisValue, test, "`this` on _open() was correct");
        assert.equal(_open.getCall(1).args.length, 2, "got two arguments");
        assert.deepEqual(_open.getCall(1).args[0], expectedOptions, "got expected options argument");
    });

    it("test close() extensibility", async () => {
        class Test extends AbstractBackend { }
        const _close = stub().yields(null);
        Test.prototype._close = _close;

        const test = new Test("foobar");
        await test.close();

        assert.equal(_close.callCount, 1, "got _close() call");
        assert.equal(_close.getCall(0).thisValue, test, "`this` on _close() was correct");
        assert.equal(_close.getCall(0).args.length, 1, "got one arguments");
    });

    it("test get() extensibility", async () => {
        const expectedOptions = { asBuffer: true };
        const expectedKey = "a key";

        class Test extends AbstractBackend { }
        const _get = stub().yields(null);
        Test.prototype._get = _get;

        const test = new Test("foobar");
        await test.get(expectedKey);

        assert.equal(_get.callCount, 1, "got _get() call");
        assert.equal(_get.getCall(0).thisValue, test, "`this` on _get() was correct");
        assert.equal(_get.getCall(0).args.length, 3, "got three arguments");
        assert.equal(_get.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.deepEqual(_get.getCall(0).args[1], expectedOptions, "got default options argument");

        await test.get(expectedKey, { options: 1 });

        expectedOptions.options = 1;

        assert.equal(_get.callCount, 2, "got _get() call");
        assert.equal(_get.getCall(1).thisValue, test, "`this` on _get() was correct");
        assert.equal(_get.getCall(1).args.length, 3, "got three arguments");
        assert.equal(_get.getCall(1).args[0], expectedKey, "got expected key argument");
        assert.deepEqual(_get.getCall(1).args[1], expectedOptions, "got expected options argument");
    });

    it("test del() extensibility", async () => {
        const expectedOptions = { options: 1 };
        const expectedKey = "a key";

        class Test extends AbstractBackend { }
        const _del = stub().yields(null);
        Test.prototype._del = _del;

        const test = new Test("foobar");
        await test.del(expectedKey);

        assert.equal(_del.callCount, 1, "got _del() call");
        assert.equal(_del.getCall(0).thisValue, test, "`this` on _del() was correct");
        assert.equal(_del.getCall(0).args.length, 3, "got three arguments");
        assert.equal(_del.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.deepEqual(_del.getCall(0).args[1], {}, "got blank options argument");

        await test.del(expectedKey, expectedOptions);

        assert.equal(_del.callCount, 2, "got _del() call");
        assert.equal(_del.getCall(1).thisValue, test, "`this` on _del() was correct");
        assert.equal(_del.getCall(1).args.length, 3, "got three arguments");
        assert.equal(_del.getCall(1).args[0], expectedKey, "got expected key argument");
        assert.deepEqual(_del.getCall(1).args[1], expectedOptions, "got expected options argument");
    });

    it("test put() extensibility", async () => {
        const expectedOptions = { options: 1 };
        const expectedKey = "a key";
        const expectedValue = "a value";

        class Test extends AbstractBackend { }
        const _put = stub().yields(null);
        Test.prototype._put = _put;

        const test = new Test("foobar");
        await test.put(expectedKey, expectedValue);

        assert.equal(_put.callCount, 1, "got _put() call");
        assert.equal(_put.getCall(0).thisValue, test, "`this` on _put() was correct");
        assert.equal(_put.getCall(0).args.length, 4, "got four arguments");
        assert.equal(_put.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.equal(_put.getCall(0).args[1], expectedValue, "got expected value argument");
        assert.deepEqual(_put.getCall(0).args[2], {}, "got blank options argument");

        await test.put(expectedKey, expectedValue, expectedOptions);

        assert.equal(_put.callCount, 2, "got _put() call");
        assert.equal(_put.getCall(1).thisValue, test, "`this` on _put() was correct");
        assert.equal(_put.getCall(1).args.length, 4, "got four arguments");
        assert.equal(_put.getCall(1).args[0], expectedKey, "got expected key argument");
        assert.equal(_put.getCall(1).args[1], expectedValue, "got expected value argument");
        assert.deepEqual(_put.getCall(1).args[2], expectedOptions, "got blank options argument");
    });

    it("test batch() extensibility", async () => {
        const expectedOptions = { options: 1 };
        /**
         *  @type {Array<{ type: 'put', key, value } | { type: 'del', key }>}
         */
        const expectedArray = [
            { type: "put", key: "1", value: "1" },
            { type: "del", key: "2" }
        ];

        class Test extends AbstractBackend { }
        const _batch = stub().yields(null);
        Test.prototype._batch = _batch;

        const test = new Test("foobar");

        await test.batch(expectedArray);

        assert.equal(_batch.callCount, 1, "got _batch() call");
        assert.equal(_batch.getCall(0).thisValue, test, "`this` on _batch() was correct");
        assert.equal(_batch.getCall(0).args.length, 3, "got three arguments");
        assert.deepEqual(_batch.getCall(0).args[0], expectedArray, "got expected array argument");
        assert.deepEqual(_batch.getCall(0).args[1], {}, "got expected options argument");

        await test.batch(expectedArray, expectedOptions);

        assert.equal(_batch.callCount, 2, "got _batch() call");
        assert.equal(_batch.getCall(1).thisValue, test, "`this` on _batch() was correct");
        assert.equal(_batch.getCall(1).args.length, 3, "got three arguments");
        assert.deepEqual(_batch.getCall(1).args[0], expectedArray, "got expected array argument");
        assert.deepEqual(_batch.getCall(1).args[1], expectedOptions, "got expected options argument");

        await test.batch(expectedArray, null);

        assert.equal(_batch.callCount, 3, "got _batch() call");
        assert.equal(_batch.getCall(2).thisValue, test, "`this` on _batch() was correct");
        assert.equal(_batch.getCall(2).args.length, 3, "got three arguments");
        assert.deepEqual(_batch.getCall(2).args[0], expectedArray, "got expected array argument");
        assert.ok(_batch.getCall(2).args[1], "options should not be null");
    });

    it("test chained batch() (array) extensibility", async () => {
        const expectedOptions = { options: 1 };

        class Test extends AbstractBackend { }
        const _batch = stub().yields(null);
        Test.prototype._batch = _batch;

        const test = new Test("foobar");

        await test.batch().put("foo", "bar").del("bang").write();

        assert.equal(_batch.callCount, 1, "got _batch() call");
        assert.equal(_batch.getCall(0).thisValue, test, "`this` on _batch() was correct");
        assert.equal(_batch.getCall(0).args.length, 3, "got three arguments");
        assert.equal(_batch.getCall(0).args[0].length, 2, "got expected array argument");
        assert.deepEqual(_batch.getCall(0).args[0][0], { type: "put", key: "foo", value: "bar" }, "got expected array argument[0]");
        assert.deepEqual(_batch.getCall(0).args[0][1], { type: "del", key: "bang" }, "got expected array argument[1]");
        assert.deepEqual(_batch.getCall(0).args[1], {}, "got expected options argument");

        await test.batch().put("foo", "bar").del("bang").write(expectedOptions);

        assert.equal(_batch.callCount, 2, "got _batch() call");
        assert.equal(_batch.getCall(1).thisValue, test, "`this` on _batch() was correct");
        assert.equal(_batch.getCall(1).args.length, 3, "got three arguments");
        assert.equal(_batch.getCall(1).args[0].length, 2, "got expected array argument");
        assert.deepEqual(_batch.getCall(1).args[0][0], { type: "put", key: "foo", value: "bar" }, "got expected array argument[0]");
        assert.deepEqual(_batch.getCall(1).args[0][1], { type: "del", key: "bang" }, "got expected array argument[1]");
        assert.deepEqual(_batch.getCall(1).args[1], expectedOptions, "got expected options argument");
    });

    it("test chained batch() (custom _chainedBatch) extensibility", async () => {
        class Test extends AbstractBackend { }
        const _chainedBatch = stub();
        Test.prototype._chainedBatch = _chainedBatch;

        const test = new Test("foobar");

        await test.batch();

        assert.equal(_chainedBatch.callCount, 1, "got _chainedBatch() call");
        assert.equal(_chainedBatch.getCall(0).thisValue, test, "`this` on _chainedBatch() was correct");

        await test.batch();

        assert.equal(_chainedBatch.callCount, 2, "got _chainedBatch() call");
        assert.equal(_chainedBatch.getCall(1).thisValue, test, "`this` on _chainedBatch() was correct");
    });

    it("test AbstractChainedBatch extensibility", () => {
        class Test extends AbstractChainedBatch { }

        const test = new Test("foobar");
        assert.equal(test._db, "foobar", "db set on instance");
    });

    it("test write() extensibility", async () => {
        class Test extends AbstractChainedBatch { }
        const _write = stub().yields(null);
        Test.prototype._write = _write;

        const test = new Test("foobar");
        await test.write();

        assert.equal(_write.callCount, 1, "got _write() call");
        assert.equal(_write.getCall(0).thisValue, test, "`this` on _write() was correct");
        assert.equal(_write.getCall(0).args.length, 1, "got one argument");
        // awkward here cause of nextTick & an internal wrapped cb
        assert.equal(typeof _write.getCall(0).args[0], "function", "got a callback function");
        _write.getCall(0).args[0]();
    });

    it("test put() extensibility", () => {
        const expectedKey = "key";
        const expectedValue = "value";

        class Test extends AbstractChainedBatch { }
        const _put = spy();
        Test.prototype._put = _put;

        const test = new Test(factory("foobar"));
        const returnValue = test.put(expectedKey, expectedValue);
        assert.equal(_put.callCount, 1, "got _put call");
        assert.equal(_put.getCall(0).thisValue, test, "`this` on _put() was correct");
        assert.equal(_put.getCall(0).args.length, 2, "got two arguments");
        assert.equal(_put.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.equal(_put.getCall(0).args[1], expectedValue, "got expected value argument");
        assert.equal(returnValue, test, "get expected return value");
    });

    it("test del() extensibility", () => {
        const expectedKey = "key";

        class Test extends AbstractChainedBatch { }
        const _del = spy();
        Test.prototype._del = _del;

        const test = new Test(factory("foobar"));
        const returnValue = test.del(expectedKey);
        assert.equal(_del.callCount, 1, "got _del call");
        assert.equal(_del.getCall(0).thisValue, test, "`this` on _del() was correct");
        assert.equal(_del.getCall(0).args.length, 1, "got one argument");
        assert.equal(_del.getCall(0).args[0], expectedKey, "got expected key argument");
        assert.equal(returnValue, test, "get expected return value");
    });

    it("test clear() extensibility", () => {
        class Test extends AbstractChainedBatch { }
        const _clear = spy();
        Test.prototype._clear = _clear;

        const test = new Test(factory("foobar"));
        const returnValue = test.clear();
        assert.equal(_clear.callCount, 1, "got _clear call");
        assert.equal(_clear.getCall(0).thisValue, test, "`this` on _clear() was correct");
        assert.equal(_clear.getCall(0).args.length, 0, "got zero arguments");
        assert.equal(returnValue, test, "get expected return value");
    });

    it("test iterator() extensibility", () => {
        const expectedOptions = {
            options: 1,
            reverse: false,
            keys: true,
            values: true,
            limit: -1,
            keyAsBuffer: true,
            valueAsBuffer: true
        };

        class Test extends AbstractBackend { }
        const _iterator = spy();
        Test.prototype._iterator = _iterator;

        const test = new Test("foobar");
        test.iterator({ options: 1 });

        assert.equal(_iterator.callCount, 1, "got _close() call");
        assert.equal(_iterator.getCall(0).thisValue, test, "`this` on _close() was correct");
        assert.equal(_iterator.getCall(0).args.length, 1, "got one arguments");
        assert.deepEqual(_iterator.getCall(0).args[0], expectedOptions, "got expected options argument");
    });

    it("test AbstractIterator extensibility", () => {
        class Test extends AbstractIterator { }
        const test = new Test("foobar");
        assert.equal(test.db, "foobar", "db set on instance");
    });

    it("test next() extensibility", async () => {
        class Test extends AbstractIterator { }
        const _next = stub().yields(null);
        Test.prototype._next = _next;

        const test = new Test("foobar");
        await test.next();

        assert.equal(_next.callCount, 1, "got _next() call");
        assert.equal(_next.getCall(0).thisValue, test, "`this` on _next() was correct");
        assert.equal(_next.getCall(0).args.length, 1, "got one arguments");
        // awkward here cause of nextTick & an internal wrapped cb
        assert.equal(typeof _next.getCall(0).args[0], "function", "got a callback function");
        _next.getCall(0).args[0]();
    });

    it("test end() extensibility", async () => {
        class Test extends AbstractIterator { }
        const _end = stub().yields(null);
        Test.prototype._end = _end;

        const test = new Test("foobar");
        await test.end();

        assert.equal(_end.callCount, 1, "got _end() call");
        assert.equal(_end.getCall(0).thisValue, test, "`this` on _end() was correct");
        assert.equal(_end.getCall(0).args.length, 1, "got one arguments");
    });

    it("test serialization extensibility (put)", async () => {
        class Test extends AbstractBackend {
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            }

            _serializeValue(value) {
                assert.equal(value, "nope");
                return "bar";
            }
        }

        const _put = stub().yields(null);
        Test.prototype._put = _put;

        const test = new Test("foobar");
        await test.put("no", "nope");

        assert.equal(_put.callCount, 1, "got _put() call");
        assert.equal(_put.getCall(0).args[0], "foo", "got expected key argument");
        assert.equal(_put.getCall(0).args[1], "bar", "got expected value argument");
    });

    it("test serialization extensibility (del)", async () => {
        class Test extends AbstractBackend {
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            }

            _serializeValue(value) {
                assert.fail("should not be called");
            }
        }

        const _del = stub().yields();
        Test.prototype._del = _del;

        const test = new Test("foobar");
        await test.del("no");

        assert.equal(_del.callCount, 1, "got _del() call");
        assert.equal(_del.getCall(0).args[0], "foo", "got expected key argument");
    });

    it("test serialization extensibility (batch array put)", async () => {
        class Test extends AbstractBackend {
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            }

            _serializeValue(value) {
                assert.equal(value, "nope");
                return "bar";
            }
        }

        const _batch = stub().yields(null);
        Test.prototype._batch = _batch;

        const test = new Test("foobar");
        await test.batch([{ type: "put", key: "no", value: "nope" }]);

        assert.equal(_batch.callCount, 1, "got _batch() call");
        assert.equal(_batch.getCall(0).args[0][0].key, "foo", "got expected key");
        assert.equal(_batch.getCall(0).args[0][0].value, "bar", "got expected value");
    });

    it("test serialization extensibility (batch chain put)", async () => {
        class Test extends AbstractBackend {
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            }

            _serializeValue(value) {
                assert.equal(value, "nope");
                return "bar";
            }
        }

        const _batch = stub().yields(null);
        Test.prototype._batch = _batch;

        const test = new Test("foobar");
        await test.batch().put("no", "nope").write();

        assert.equal(_batch.callCount, 1, "got _batch() call");
        assert.equal(_batch.getCall(0).args[0][0].key, "foo", "got expected key");
        assert.equal(_batch.getCall(0).args[0][0].value, "bar", "got expected value");
    });

    it("test serialization extensibility (batch array del)", async () => {
        class Test extends AbstractBackend {
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            }

            _serializeValue(value) {
                assert.fail("should not be called");
            }
        }

        const _batch = stub().yields(null);
        Test.prototype._batch = _batch;

        const test = new Test("foobar");
        await test.batch([{ type: "del", key: "no" }]);

        assert.equal(_batch.callCount, 1, "got _batch() call");
        assert.equal(_batch.getCall(0).args[0][0].key, "foo", "got expected key");
    });

    it("test serialization extensibility (batch chain del)", async () => {
        class Test extends AbstractBackend {
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            }

            _serializeValue(value) {
                assert.fail("should not be called");
            }
        }

        const _batch = stub().yields(null);
        Test.prototype._batch = _batch;

        const test = new Test("foobar");
        await test.batch().del("no").write();

        assert.equal(_batch.callCount, 1, "got _batch() call");
        assert.equal(_batch.getCall(0).args[0][0].key, "foo", "got expected key");
    });

    it("test serialization extensibility (batch array is not mutated)", async () => {
        class Test extends AbstractBackend {
            _serializeKey(key) {
                assert.equal(key, "no");
                return "foo";
            }

            _serializeValue(value) {
                assert.equal(value, "nope");
                return "bar";
            }
        }

        const _batch = stub().yields(null);
        Test.prototype._batch = _batch;

        const test = new Test("foobar");

        /**
         *  @type { { type: 'put', key, value } }
         */
        const op = { type: "put", key: "no", value: "nope" };
        await test.batch([op]);

        assert.equal(_batch.callCount, 1, "got _batch() call");
        assert.equal(_batch.getCall(0).args[0][0].key, "foo", "got expected key");
        assert.equal(_batch.getCall(0).args[0][0].value, "bar", "got expected value");

        assert.equal(op.key, "no", "did not mutate input key");
        assert.equal(op.value, "nope", "did not mutate input value");
    });

    describe(".status", () => {
        it("empty prototype", async () => {
            class Test extends AbstractBackend { }

            const test = new Test("foobar");
            assert.equal(test.status, "new");

            await test.open();
            assert.equal(test.status, "open");

            await test.close();
            assert.equal(test.status, "closed");
        });

        it("open error", async () => {
            class Test extends AbstractBackend {
                _open(options, cb) {
                    cb(new Error());
                }
            }

            const test = new Test("foobar");
            await assert.throws(async () => test.open());
            assert.equal(test.status, "new");
        });

        it("close error", async () => {
            class Test extends AbstractBackend {
                _close(cb) {
                    cb(new Error());
                }
            }

            const test = new Test("foobar");
            await test.open();
            await assert.throws(async () => test.close());
            assert.equal(test.status, "open");
        });

        it("open", async () => {
            class Test extends AbstractBackend {
                _open(options, cb) {
                    process.nextTick(cb);
                }
            }

            const test = new Test("foobar");
            const p = test.open();
            assert.equal(test.status, "opening");
            await p;
            assert.equal(test.status, "open");
        });

        it("close", async () => {
            class Test extends AbstractBackend {
                _close(cb) {
                    process.nextTick(cb);
                }
            }

            const test = new Test("foobar");
            await test.open();
            const p = test.close();
            assert.equal(test.status, "closing");
            await p;
            assert.equal(test.status, "closed");
        });
    });

    it("_setupIteratorOptions", () => {
        const keys = "start end gt gte lt lte".split(" ");
        const db = new AbstractBackend("foolocation");

        const setupOptions = (constrFn) => {
            const options = {};
            keys.forEach((key) => {
                options[key] = constrFn();
            });
            return options;
        };

        const verifyUndefinedOptions = (options) => {
            keys.forEach((key) => {
                assert.notOk(key in options, "property should be deleted");
            });
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

        it("deletes empty buffers", () => {
            const options = setupOptions(() => {
                return Buffer.from("");
            });
            keys.forEach((key) => {
                assert.strictEqual(is.buffer(options[key]), true, "should be buffer");
                assert.strictEqual(options[key].length, 0, "should be empty");
            });
            verifyUndefinedOptions(db._setupIteratorOptions(options));
        });

        it("deletes empty strings", () => {
            const options = setupOptions(() => {
                return "";
            });
            keys.forEach((key) => {
                assert.strictEqual(typeof options[key], "string", "should be string");
                assert.strictEqual(options[key].length, 0, "should be empty");
            });
            verifyUndefinedOptions(db._setupIteratorOptions(options));
        });

        it("deletes null options", () => {
            const options = setupOptions(() => {
                return null;
            });
            keys.forEach((key) => {
                assert.deepEqual(options[key], null, "should be null");
            });
            verifyUndefinedOptions(db._setupIteratorOptions(options));
        });
    });
});
