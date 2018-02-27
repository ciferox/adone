const {
    is
} = adone;

let db;

const collectBatchOps = (batch) => {
    const _put = batch._put;
    const _del = batch._del;
    const _operations = [];

    if (!is.function(_put) || !is.function(_del)) {
        return batch._operations;
    }

    batch._put = function (key, value) {
        _operations.push({ type: "put", key, value });
        return _put.apply(batch, arguments);
    };

    batch._del = function (key) {
        _operations.push({ type: "del", key });
        return _del.apply(batch, arguments);
    };

    return _operations;
};

export const setUp = function (leveldown, testCommon) {
    describe("chained batch", () => {
        it("setUp common", testCommon.setUp);
        it("setUp db", async () => {
            db = leveldown(testCommon.location());
            await db.open();
        });
    });
};

export const args = function () {
    describe("chained batch", () => {
        it("batch#put() with missing `value`", () => {
            db.batch().put("foo1");
        });

        it("batch#put() with null `value`", () => {
            db.batch().put("foo1", null);
        });

        it("batch#put() with missing `key`", () => {
            const err = assert.throws(() => db.batch().put(undefined, "foo1"));
            assert.instanceOf(err, Error);
        });

        it("batch#put() with null `key`", () => {
            const err = assert.throws(() => db.batch().put(null, "foo1"));
            assert.instanceOf(err, Error);
        });

        it("batch#put() with missing `key` and `value`", () => {
            const err = assert.throws(() => db.batch().put());
            assert.instanceOf(err, Error);
        });

        it("batch#del() with missing `key`", () => {
            const err = assert.throws(() => db.batch().del());
            assert.instanceOf(err, Error);
        });

        it("batch#del() with null `key`", () => {
            const err = assert.throws(() => db.batch().del(null));
            assert.instanceOf(err, Error);
        });

        it("batch#clear() doesn't throw", () => {
            db.batch().clear();
        });

        it("batch#put() after write()", async () => {
            const batch = db.batch().put("foo", "bar");
            await batch.write();
            const err = assert.throws(() => batch.put("boom", "bang"));
            assert.instanceOf(err, Error);
        });

        it("batch#del() after write()", async () => {
            const batch = db.batch().put("foo", "bar");
            await batch.write();
            const err = assert.throws(() => batch.del("foo"));
            assert.instanceOf(err, Error);
        });

        it("batch#clear() after write()", async () => {
            const batch = db.batch().put("foo", "bar");
            await batch.write();
            const err = assert.throws(() => batch.clear());
            assert.instanceOf(err, Error);
        });

        it("batch#write() after write()", async () => {
            const batch = db.batch().put("foo", "bar");
            await batch.write();
            const err = await assert.throws(async () => batch.write());
            assert.instanceOf(err, Error);
        });

        it("serialize object", () => {
            const batch = db.batch();
            const ops = collectBatchOps(batch);

            batch
                .put({ foo: "bar" }, { beep: "boop" })
                .del({ bar: "baz" });
            ops.forEach((op) => {
                assert.ok(op.key, ".key is set for .put and .del operations");
                if (op.type === "put") {
                    assert.ok(op.value, ".value is set for .put operation");
                }
            });
        });

        it("custom _serialize*", () => {
            const _db = Object.create(db);
            _db._serializeKey = _db._serializeValue = function (data) {
                return data;
            };

            const batch = _db.batch();
            const ops = collectBatchOps(batch);

            batch
                .put({ foo: "bar" }, { beep: "boop" })
                .del({ bar: "baz" });

            assert.deepEqual(ops, [
                { type: "put", key: { foo: "bar" }, value: { beep: "boop" } },
                { type: "del", key: { bar: "baz" } }
            ]);
        });
    });
};

export const batch = function (testCommon) {
    describe("chained batch", () => {
        it("basic batch", async () => {
            await db.batch([
                { type: "put", key: "one", value: "1" },
                { type: "put", key: "two", value: "2" },
                { type: "put", key: "three", value: "3" }
            ]);

            await db.batch()
                .put("1", "one")
                .del("2", "two")
                .put("3", "three")
                .clear()
                .put("one", "I")
                .put("two", "II")
                .del("three")
                .put("foo", "bar")
                .write();

            const data = await testCommon.collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false }));
            assert.equal(data.length, 3, "correct number of entries");
            const expected = [
                { key: "foo", value: "bar" },
                { key: "one", value: "I" },
                { key: "two", value: "II" }
            ];
            assert.deepEqual(data, expected);
        });
    });
};

export const tearDown = function (testCommon) {
    describe("chained batch", () => {
        it("tearDown", async () => {
            await db.close();
            await testCommon.tearDown();
        });
    });
};

export const all = function (leveldown, testCommon) {
    setUp(leveldown, testCommon);
    args();
    batch(testCommon);
    tearDown(testCommon);
};
