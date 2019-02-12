let db;
const verifyNotFoundError = require("./util").verifyNotFoundError;

export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
    it("setUp db", (done) => {
        db = testCommon.factory();
        db.open(() => done());
    });
};

export const args = function (testCommon) {
    it("test argument-less del() throws", () => {
        assert.throws(() => {
            db.del();
        }, /del\(\) requires a callback argument/, "no-arg del() throws");
    });

    it("test callback-less, 1-arg, del() throws", () => {
        assert.throws(() => {
            db.del("foo");
        }, /del\(\) requires a callback argument/, "callback-less, 1-arg del() throws");
    });

    it("test callback-less, 3-arg, del() throws", () => {
        assert.throws(() => {
            db.del("foo", {});
        }, /del\(\) requires a callback argument/, "callback-less, 2-arg del() throws");
    });

    it("test custom _serialize*", (done) => {
        const db = testCommon.factory();
        db._serializeKey = function (data) {
            return data;
        };
        db._del = function (key, options, callback) {
            assert.deepEqual(key, { foo: "bar" });
            process.nextTick(callback);
        };
        db.open(() => {
            db.del({ foo: "bar" }, (err) => {
                assert.notExists(err);
                db.close((err) => {
                    assert.notExists(err);
                    done();
                });
            });
        });
    });
};

export const del = function (testCommon) {
    it("test simple del()", (done) => {
        db.put("foo", "bar", (err) => {
            assert.notExists(err);
            db.del("foo", (err) => {
                assert.notExists(err);
                db.get("foo", (err, value) => {
                    assert.exists(err, "entry properly deleted");
                    assert.undefined(value, "value is undefined");
                    assert.ok(verifyNotFoundError(err), "NotFound error");
                    done();
                });
            });
        });
    });

    it("test del on non-existent key", (done) => {
        db.del("blargh", (err) => {
            assert.notExists(err);
            done();
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
    del(testCommon);
    tearDown(testCommon);
};
