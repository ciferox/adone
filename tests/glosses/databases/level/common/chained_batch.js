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
        return _put.apply(this, arguments);
    };

    batch._del = function (key) {
        _operations.push({ type: "del", key });
        return _del.apply(this, arguments);
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
        it("test batch#put() with missing `value`", () => {
            db.chainedBatch().put("foo1");
        });

        it("test batch#put() with null `value`", () => {
            db.chainedBatch().put("foo1", null);
        });

        it("test batch#put() with missing `key`", () => {
            try {
                db.chainedBatch().put(undefined, "foo1");
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("Should have thrown");
        });

        it("test batch#put() with null `key`", () => {
            try {
                db.chainedBatch().put(null, "foo1");
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test batch#put() with missing `key` and `value`", () => {
            try {
                db.chainedBatch().put();
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test batch#del() with missing `key`", () => {
            try {
                db.chainedBatch().del();
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test batch#del() with null `key`", () => {
            try {
                db.chainedBatch().del(null);
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test batch#del() with null `key`", () => {
            try {
                db.chainedBatch().del(null);
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test batch#clear() doesn't throw", () => {
            db.chainedBatch().clear();
        });

        it("test batch#put() after write()", async () => {
            const batch = db.chainedBatch().put("foo", "bar");
            await batch.write();
            try {
                batch.put("boom", "bang");
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test batch#del() after write()", async () => {
            const batch = db.chainedBatch().put("foo", "bar");
            await batch.write();
            try {
                batch.del("foo");
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test batch#clear() after write()", async () => {
            const batch = db.chainedBatch().put("foo", "bar");
            await batch.write();
            try {
                batch.clear();
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test batch#write() after write()", async () => {
            const batch = db.chainedBatch().put("foo", "bar");
            await batch.write();
            try {
                await batch.write();
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test serialize object", () => {
            const batch = db.chainedBatch();
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

        it("test serialize buffer", () => {
            const batch = db.chainedBatch();
            const ops = collectBatchOps(batch);

            batch
                .put(Buffer.from("foo"), Buffer.from("bar"))
                .del(Buffer.from("baz"));
            assert.equal(ops[0].key.toString(), "foo");
            assert.equal(ops[0].value.toString(), "bar");
            assert.equal(ops[1].key.toString(), "baz");
        });

        it("test custom _serialize*", () => {
            const _db = Object.create(db);
            _db._serializeKey = _db._serializeValue = function (data) {
                return data;
            };

            const batch = _db.chainedBatch();
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
        it("test basic batch", async () => {
            await db.batch([
                { type: "put", key: "one", value: "1" },
                { type: "put", key: "two", value: "2" },
                { type: "put", key: "three", value: "3" }
            ]);

            await db.chainedBatch()
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
