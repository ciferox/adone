const testCommon = require("./testCommon");
const { database: { level: { AbstractBackend, AbstractIterator, AbstractChainedBatch } } } = adone;

const factory = (location, options) => new AbstractBackend(location, options);

/*** compatibility with basic LevelDOWN API ***/
describe("databases", "level", "abstract", () => {
    require("./common/backend").args(factory, testCommon);

    require("./common/del").setUp(factory, testCommon);
    require("./common/del").args();

    require("./common/get").setUp(factory, testCommon);
    require("./common/get").args();

    require("./common/put").setUp(factory, testCommon);
    require("./common/put").args();

    require("./common/put_get_del").setUp(factory, testCommon);
    require("./common/put_get_del").errorKeys();
    //require('./common/put_get_del').nonErrorKeys(test, testCommon)
    require("./common/put_get_del").errorValues();
    //require('./abstract/test/put-get-del-test').nonErrorKeys(test, testCommon)
    require("./common/put_get_del").tearDown(testCommon);

    require("./common/batch").setUp(factory, testCommon);
    require("./common/batch").args();

    require("./common/chained_batch").setUp(factory, testCommon);
    require("./common/chained_batch").args();

    require("./common/iterator").setUp(factory, testCommon);
    require("./common/iterator").sequence();

    it("test core extensibility", () => {
        class Test extends AbstractBackend {
            constructor(location) {
                super(location);
                assert.equal(this.location, location);
            }
        }

        new Test("foobar");
    });

    it("test open() extensibility", async () => {
        const expectedOptions = { createIfMissing: true, errorIfExists: false };

        class Test extends AbstractBackend { }
        const _open = stub().yields(null);
        Test.prototype._open = _open;

        const test = new Test("foobar");
        await test.open();

        assert.equal(_open.callCount, 1);
        assert.equal(_open.getCall(0).thisValue, test);
        assert.equal(_open.getCall(0).args.length, 2);
        assert.deepEqual(_open.getCall(0).args[0], expectedOptions);

        await test.open({ options: 1 });

        expectedOptions.options = 1;

        assert.equal(_open.callCount, 2);
        assert.equal(_open.getCall(1).thisValue, test);
        assert.equal(_open.getCall(1).args.length, 2);
        assert.deepEqual(_open.getCall(1).args[0], expectedOptions);
    });

    it("test close() extensibility", async () => {
        class Test extends AbstractBackend {}
        const _close = stub().yields(null);
        Test.prototype._close = _close;

        const test = new Test("foobar");
        await test.close();

        assert.equal(_close.callCount, 1);
        assert.equal(_close.getCall(0).thisValue, test);
        assert.equal(_close.getCall(0).args.length, 1);
    });

    it("test get() extensibility", async () => {
        const _get = stub().yields(null);
        const expectedOptions = { asBuffer: true };
        const expectedKey = "a key";

        class Test extends AbstractBackend {}
        Test.prototype._get = _get;

        const test = new Test("foobar");
        await test.get(expectedKey);

        assert.equal(_get.callCount, 1);
        assert.equal(_get.getCall(0).thisValue, test);
        assert.equal(_get.getCall(0).args.length, 3);
        assert.equal(_get.getCall(0).args[0], expectedKey);
        assert.deepEqual(_get.getCall(0).args[1], expectedOptions);

        await test.get(expectedKey, { options: 1 });

        expectedOptions.options = 1;

        assert.equal(_get.callCount, 2);
        assert.equal(_get.getCall(1).thisValue, test);
        assert.equal(_get.getCall(1).args.length, 3);
        assert.equal(_get.getCall(1).args[0], expectedKey);
        assert.deepEqual(_get.getCall(1).args[1], expectedOptions);
    });

    it("test del() extensibility", async () => {
        const _del = stub().yields(null);
        const expectedOptions = { options: 1 };
        const expectedKey = "a key";

        class Test extends AbstractBackend {
        }

        Test.prototype._del = _del;

        const test = new Test("foobar");
        await test.del(expectedKey);

        assert.equal(_del.callCount, 1);
        assert.equal(_del.getCall(0).thisValue, test);
        assert.equal(_del.getCall(0).args.length, 3);
        assert.equal(_del.getCall(0).args[0], expectedKey);
        assert.deepEqual(_del.getCall(0).args[1], {});

        await test.del(expectedKey, expectedOptions);

        assert.equal(_del.callCount, 2);
        assert.equal(_del.getCall(1).thisValue, test);
        assert.equal(_del.getCall(1).args.length, 3);
        assert.equal(_del.getCall(1).args[0], expectedKey);
        assert.deepEqual(_del.getCall(1).args[1], expectedOptions);
    });

    it("test put() extensibility", async () => {
        const _put = stub().yields(null);
        const expectedOptions = { options: 1 };
        const expectedKey = "a key";
        const expectedValue = "a value";

        class Test extends AbstractBackend {}
        Test.prototype._put = _put;

        const test = new Test("foobar");
        await test.put(expectedKey, expectedValue);

        assert.equal(_put.callCount, 1);
        assert.equal(_put.getCall(0).thisValue, test);
        assert.equal(_put.getCall(0).args.length, 4);
        assert.equal(_put.getCall(0).args[0], expectedKey);
        assert.equal(_put.getCall(0).args[1], expectedValue);
        assert.deepEqual(_put.getCall(0).args[2], {});

        await test.put(expectedKey, expectedValue, expectedOptions);

        assert.equal(_put.callCount, 2);
        assert.equal(_put.getCall(1).thisValue, test);
        assert.equal(_put.getCall(1).args.length, 4);
        assert.equal(_put.getCall(1).args[0], expectedKey);
        assert.equal(_put.getCall(1).args[1], expectedValue);
        assert.deepEqual(_put.getCall(1).args[2], expectedOptions);
    });

    it("test batch() extensibility", async () => {
        const _batch = stub().yields(null);
        const expectedOptions = { options: 1 };
        const expectedArray = [1, 2];

        class Test extends AbstractBackend {
        }
        Test.prototype._batch = _batch;

        const test = new Test("foobar");

        await test.batch(expectedArray);

        assert.equal(_batch.callCount, 1);
        assert.equal(_batch.getCall(0).thisValue, test);
        assert.equal(_batch.getCall(0).args.length, 3);
        assert.equal(_batch.getCall(0).args[0], expectedArray);
        assert.deepEqual(_batch.getCall(0).args[1], {});

        await test.batch(expectedArray, expectedOptions);

        assert.equal(_batch.callCount, 2);
        assert.equal(_batch.getCall(1).thisValue, test);
        assert.equal(_batch.getCall(1).args.length, 3);
        assert.equal(_batch.getCall(1).args[0], expectedArray);
        assert.deepEqual(_batch.getCall(1).args[1], expectedOptions);

        await test.batch(expectedArray, null);

        assert.equal(_batch.callCount, 3);
        assert.equal(_batch.getCall(2).thisValue, test);
        assert.equal(_batch.getCall(2).args.length, 3);
        assert.equal(_batch.getCall(2).args[0], expectedArray);
        assert.ok(_batch.getCall(2).args[1]);
    });

    it("test chained batch() (array) extensibility", async () => {
        const _batch = stub().yields();
        const expectedOptions = { options: 1 };

        class Test extends AbstractBackend {
        }
        Test.prototype._batch = _batch;

        const test = new Test("foobar");
        await test.chainedBatch().put("foo", "bar").del("bang").write();

        assert.equal(_batch.callCount, 1);
        assert.equal(_batch.getCall(0).thisValue, test);
        assert.equal(_batch.getCall(0).args.length, 3);
        assert.equal(_batch.getCall(0).args[0].length, 2);
        assert.deepEqual(_batch.getCall(0).args[0][0], { type: "put", key: "foo", value: "bar" });
        assert.deepEqual(_batch.getCall(0).args[0][1], { type: "del", key: "bang" });
        assert.deepEqual(_batch.getCall(0).args[1], {});

        await test.chainedBatch().put("foo", "bar").del("bang").write(expectedOptions);

        assert.equal(_batch.callCount, 2);
        assert.equal(_batch.getCall(1).thisValue, test);
        assert.equal(_batch.getCall(1).args.length, 3);
        assert.equal(_batch.getCall(1).args[0].length, 2);
        assert.deepEqual(_batch.getCall(1).args[0][0], { type: "put", key: "foo", value: "bar" });
        assert.deepEqual(_batch.getCall(1).args[0][1], { type: "del", key: "bang" });
        assert.deepEqual(_batch.getCall(1).args[1], expectedOptions);
    });

    it("test AbstractChainedBatch extensibility", () => {
        class Test extends AbstractChainedBatch {
            constructor(db) {
                super(db);
                assert.equal(this._db, db);
            }
        }
        new Test("foobar");
    });

    it("test write() extensibility", async () => {
        const _write = stub().yields(null);

        class Test extends AbstractChainedBatch {}
        Test.prototype._write = _write;

        const test = new Test("foobar");
        await test.write();

        assert.equal(_write.callCount, 1);
        assert.equal(_write.getCall(0).thisValue, test);
        assert.equal(_write.getCall(0).args.length, 1);
        // awkward here cause of nextTick & an internal wrapped cb
        assert.equal(typeof _write.getCall(0).args[0], "function");
        _write.getCall(0).args[0]();
    });

    it("test put() extensibility", () => {
        const _put = spy();
        const expectedKey = "key";
        const expectedValue = "value";

        class Test extends AbstractChainedBatch {}
        Test.prototype._put = _put;

        const test = new Test(factory("foobar"));
        const returnValue = test.put(expectedKey, expectedValue);
        assert.equal(_put.callCount, 1);
        assert.equal(_put.getCall(0).thisValue, test);
        assert.equal(_put.getCall(0).args.length, 2);
        assert.equal(_put.getCall(0).args[0], expectedKey);
        assert.equal(_put.getCall(0).args[1], expectedValue);
        assert.equal(returnValue, test);
    });

    it("test del() extensibility", () => {
        const _del = spy();
        const expectedKey = "key";

        class Test extends AbstractChainedBatch {}
        Test.prototype._del = _del;

        const test = new Test(factory("foobar"));
        const returnValue = test.del(expectedKey);
        assert.equal(_del.callCount, 1);
        assert.equal(_del.getCall(0).thisValue, test);
        assert.equal(_del.getCall(0).args.length, 1);
        assert.equal(_del.getCall(0).args[0], expectedKey);
        assert.equal(returnValue, test);
    });

    it("test clear() extensibility", () => {
        const _clear = spy();

        class Test extends AbstractChainedBatch {}
        Test.prototype._clear = _clear;

        const test = new Test(factory("foobar"));
        const returnValue = test.clear();
        assert.equal(_clear.callCount, 1);
        assert.equal(_clear.getCall(0).thisValue, test);
        assert.equal(_clear.getCall(0).args.length, 0);
        assert.equal(returnValue, test);
    });

    it("test iterator() extensibility", () => {
        const _iterator = spy();
        const expectedOptions = { options: 1, reverse: false, keys: true, values: true, limit: -1, keyAsBuffer: true, valueAsBuffer: true };

        class Test extends AbstractBackend {
        }
        Test.prototype._iterator = _iterator;

        const test = new Test("foobar");
        test.iterator({ options: 1 });

        assert.equal(_iterator.callCount, 1);
        assert.equal(_iterator.getCall(0).thisValue, test);
        assert.equal(_iterator.getCall(0).args.length, 1);
        assert.deepEqual(_iterator.getCall(0).args[0], expectedOptions);
    });

    it("test AbstractIterator extensibility", () => {
        class Test extends AbstractIterator {
            constructor(db) {
                super(db);
                assert.equal(this.db, db);
            }
        }

        new Test("foobar");
    });

    it("test next() extensibility", async () => {
        const _next = stub().yields(null);

        class Test extends AbstractIterator {}
        Test.prototype._next = _next;

        const test = new Test("foobar");
        await test.next();

        assert.equal(_next.callCount, 1);
        assert.equal(_next.getCall(0).thisValue, test);
        assert.equal(_next.getCall(0).args.length, 1);
        assert.equal(typeof _next.getCall(0).args[0], "function");
        _next.getCall(0).args[0]();
    });

    it("test end() extensibility", async () => {
        const _end = stub().yields(null);

        class Test extends AbstractIterator {}
        Test.prototype._end = _end;

        const test = new Test("foobar");
        await test.end();

        assert.equal(_end.callCount, 1);
        assert.equal(_end.getCall(0).thisValue, test);
        assert.equal(_end.getCall(0).args.length, 1);
    });

    it("test serialization extensibility", async () => {
        class Test extends AbstractBackend {}
        Test.prototype._serializeKey = function (key) {
            assert.equal(key, "no");
            return "foo";
        };

        Test.prototype._serializeValue = function (value) {
            assert.equal(value, "nope");
            return "bar";
        };

        const _put = stub().yields(null);
        Test.prototype._put = _put;

        const test = new Test("foobar");
        await test.put("no", "nope");

        assert.equal(_put.callCount, 1);
        assert.equal(_put.getCall(0).args[0], "foo");
        assert.equal(_put.getCall(0).args[1], "bar");
    });

    describe(".status", () => {
        it("empty prototype", async () => {
            class Test extends AbstractBackend {}
            const test = new Test("foobar");
            assert.equal(test.status, "new");

            await test.open();
            assert.equal(test.status, "open");

            await test.close();
            assert.equal(test.status, "closed");
        });

        it("open error", async () => {
            class Test extends AbstractBackend {}
            Test.prototype._open = function (options, cb) {
                cb(new Error());
            };

            const test = new Test("foobar");
            try {
                await test.open();
            } catch (err) {
                assert.instanceOf(err, Error);
                assert.equal(test.status, "new");
                return;
            }
            assert.fail("SHould throw error");
        });

        it("close error", async () => {
            class Test extends AbstractBackend {}
            Test.prototype._close = function (cb) {
                cb(new Error());
            };

            const test = new Test("foobar");
            await test.open();
            try {
                await test.close();
            } catch (err) {
                assert.instanceOf(err, Error);
                assert.equal(test.status, "open");
                return;
            }
            assert.fail("SHould throw error");
        });

        it("open", async () => {
            class Test extends AbstractBackend {}
            Test.prototype._open = function (options, cb) {
                process.nextTick(cb);
            };

            const test = new Test("foobar");
            const p = test.open();
            assert.equal(test.status, "opening");
            await p;
            assert.equal(test.status, "open");
        });

        it("close", async () => {
            class Test extends AbstractBackend {}
            Test.prototype._close = function (cb) {
                process.nextTick(cb);
            };

            const test = new Test("foobar");
            await test.open();
            const p = test.close();
            assert.equal(test.status, "closing");
            await p;
            assert.equal(test.status, "closed");
        });
    });
});
