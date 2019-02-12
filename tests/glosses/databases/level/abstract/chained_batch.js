const {
    database: { level: { concatIterator } },
    is
} = adone;

let db;

const collectBatchOps = function (batch) {
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

export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
    it("setUp db", (done) => {
        db = testCommon.factory();
        db.open(() => done());
    });
};

export const args = function (testCommon) {
    it("test batch has db reference", () => {
        assert.ok(db.batch().db === db);
    });

    it("test batch#put() with missing `value`", (done) => {
        try {
            db.batch().put("foo1");
        } catch (err) {
            assert.equal(err.message, "value cannot be `null` or `undefined`", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test batch#put() with missing `key`", (done) => {
        try {
            db.batch().put(undefined, "foo1");
        } catch (err) {
            assert.equal(err.message, "key cannot be `null` or `undefined`", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test batch#put() with null `key`", (done) => {
        try {
            db.batch().put(null, "foo1");
        } catch (err) {
            assert.equal(err.message, "key cannot be `null` or `undefined`", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test batch#put() with missing `key` and `value`", (done) => {
        try {
            db.batch().put();
        } catch (err) {
            assert.equal(err.message, "key cannot be `null` or `undefined`", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test batch#put() with null or undefined `value`", (done) => {
        const illegalValues = [null, undefined];
        let counter = 0;

        illegalValues.forEach((value) => {
            try {
                db.batch().put("key", value);
            } catch (err) {
                assert.equal(err.message, "value cannot be `null` or `undefined`", "correct error message");
            }

            if (++counter >= illegalValues.length) {
                done();
            }
        });
    });

    it("test batch#del() with missing `key`", (done) => {
        try {
            db.batch().del();
        } catch (err) {
            assert.equal(err.message, "key cannot be `null` or `undefined`", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test batch#del() with null or undefined `key`", (done) => {
        const illegalKeys = [null, undefined];
        let counter = 0;

        illegalKeys.forEach((key) => {
            try {
                db.batch().del(key);
            } catch (err) {
                assert.equal(err.message, "key cannot be `null` or `undefined`", "correct error message");
            }

            if (++counter >= illegalKeys.length) {
                done();
            }
        });
    });

    it("test batch#clear() doesn't throw", () => {
        db.batch().clear();
    });

    it("test batch#write() with no callback", (done) => {
        try {
            db.batch().write();
        } catch (err) {
            assert.equal(err.message, "write() requires a callback argument", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test batch#put() after write()", (done) => {
        const batch = db.batch().put("foo", "bar");
        batch.write(() => { });
        try {
            batch.put("boom", "bang");
        } catch (err) {
            assert.equal(err.message, "write() already called on this batch", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test batch#del() after write()", (done) => {
        const batch = db.batch().put("foo", "bar");
        batch.write(() => { });
        try {
            batch.del("foo");
        } catch (err) {
            assert.equal(err.message, "write() already called on this batch", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test batch#clear() after write()", (done) => {
        const batch = db.batch().put("foo", "bar");
        batch.write(() => { });
        try {
            batch.clear();
        } catch (err) {
            assert.equal(err.message, "write() already called on this batch", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test batch#write() after write()", (done) => {
        const batch = db.batch().put("foo", "bar");
        batch.write(() => { });
        try {
            batch.write(() => { });
        } catch (err) {
            assert.equal(err.message, "write() already called on this batch", "correct error message");
            return done();
        }
        assert.fail("should have thrown");
    });

    it("test serialize object", () => {
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

    it("test custom _serialize*", () => {
        const _db = Object.create(db);
        const batch = _db.batch();
        const ops = collectBatchOps(batch);

        _db._serializeKey = function (key) {
            assert.deepEqual(key, { foo: "bar" });
            return "key1";
        };

        _db._serializeValue = function (value) {
            assert.deepEqual(value, { beep: "boop" });
            return "value1";
        };

        batch.put({ foo: "bar" }, { beep: "boop" });

        _db._serializeKey = function (key) {
            assert.deepEqual(key, { bar: "baz" });
            return "key2";
        };

        batch.del({ bar: "baz" });

        assert.deepEqual(ops, [
            { type: "put", key: "key1", value: "value1" },
            { type: "del", key: "key2" }
        ]);
    });
};

export const batch = function (testCommon) {
    it("test basic batch", (done) => {
        db.batch([
            { type: "put", key: "one", value: "1" },
            { type: "put", key: "two", value: "2" },
            { type: "put", key: "three", value: "3" }
        ], (err) => {
            assert.notExists(err);
            db.batch()
                .put("1", "one")
                .del("2", "two")
                .put("3", "three")
                .clear()
                .put("one", "I")
                .put("two", "II")
                .del("three")
                .put("foo", "bar")
                .write((err) => {
                    assert.notExists(err);
                    concatIterator(
                        db.iterator({ keyAsBuffer: false, valueAsBuffer: false }), (err, data) => {
                            assert.notExists(err);
                            assert.equal(data.length, 3, "correct number of entries");
                            const expected = [
                                { key: "foo", value: "bar" },
                                { key: "one", value: "I" },
                                { key: "two", value: "II" }
                            ];
                            assert.deepEqual(data, expected);
                            done();
                        }
                    );
                });
        });
    });
};

export const tearDown = function (testCommon) {
    it("tearDown", (done) => {
        db.close(testCommon.tearDown.bind(null, done));
    });
};

export const all = function (testCommon) {
    setUp(testCommon);
    args(testCommon);
    batch(testCommon);
    tearDown(testCommon);
};
