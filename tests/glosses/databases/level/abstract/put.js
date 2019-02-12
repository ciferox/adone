let db;
const isTypedArray = require("./util").isTypedArray;

export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
    it("setUp db", (done) => {
        db = testCommon.factory();
        db.open(() => done());
    });
};

export const args = function (testCommon) {
    it("test argument-less put() throws", () => {
        assert.throws(() => {
            db.put();
        }, /put\(\) requires a callback argument/, "no-arg put() throws");
    });

    it("test callback-less, 1-arg, put() throws", () => {
        assert.throws(() => {
            db.put("foo");
        }, /put\(\) requires a callback argument/, "callback-less, 1-arg put() throws");
    });

    it("test callback-less, 2-arg, put() throws", () => {
        assert.throws(() => {
            db.put("foo", "bar");
        }, /put\(\) requires a callback argument/, "callback-less, 2-arg put() throws");
    });

    it("test callback-less, 3-arg, put() throws", () => {
        assert.throws(() => {
            db.put("foo", "bar", {});
        }, /put\(\) requires a callback argument/, "callback-less, 3-arg put() throws");
    });

    it("test _serialize object", (done) => {
        const db = testCommon.factory();
        db._put = function (key, value, opts, callback) {
            assert.ok(key);
            assert.ok(value);
            process.nextTick(callback);
        };
        db.put({}, {}, (err, val) => {
            assert.notExists(err);
            done();
        });
    });

    it("test custom _serialize*", (done) => {
        const db = testCommon.factory();
        db._serializeKey = db._serializeValue = function (data) {
            return data; 
        };
        db._put = function (key, value, options, callback) {
            assert.deepEqual(key, { foo: "bar" });
            assert.deepEqual(value, { beep: "boop" });
            process.nextTick(callback);
        };
        db.open(() => {
            db.put({ foo: "bar" }, { beep: "boop" }, (err) => {
                assert.notExists(err);
                db.close((err) => {
                    assert.notExists(err);
                    done();
                });
            });
        });
    });
};

export const put = function (testCommon) {
    it("test simple put()", (done) => {
        db.put("foo", "bar", (err) => {
            assert.notExists(err);
            db.get("foo", (err, value) => {
                assert.notExists(err);
                let result = value.toString();
                if (isTypedArray(value)) {
                    result = String.fromCharCode.apply(null, new Uint16Array(value));
                }
                assert.equal(result, "bar");
                done();
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
    put(testCommon);
    tearDown(testCommon);
};
