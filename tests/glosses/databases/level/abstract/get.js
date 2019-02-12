const {
    is
} = adone;

let db;
const verifyNotFoundError = require("./util").verifyNotFoundError;
const isTypedArray = require("./util").isTypedArray;

export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
    it("setUp db", (done) => {
        db = testCommon.factory();
        db.open(() => done());
    });
};

export const args = function (testCommon) {
    it("test argument-less get() throws", () => {
        assert.throws(() => {
            db.get();
        }, /get\(\) requires a callback argument/, "no-arg get() throws");
    });

    it("test callback-less, 1-arg, get() throws", () => {
        assert.throws(() => {
            db.get("foo");
        }, /get\(\) requires a callback argument/, "callback-less, 1-arg get() throws");
    });

    it("test callback-less, 3-arg, get() throws", () => {
        assert.throws(() => {
            db.get("foo", {});
        }, /get\(\) requires a callback argument/, "callback-less, 2-arg get() throws");
    });

    it("test custom _serialize*", (done) => {
        const db = testCommon.factory();
        db._serializeKey = function (data) {
            return data; 
        };
        db._get = function (key, options, callback) {
            assert.deepEqual(key, { foo: "bar" });
            process.nextTick(callback);
        };
        db.open(() => {
            db.get({ foo: "bar" }, (err) => {
                assert.notExists(err);
                db.close((err) => {
                    assert.notExists(err);
                    done();
                });
            });
        });
    });
};

export const get = function (testCommon) {
    it("test simple get()", (done) => {
        db.put("foo", "bar", (err) => {
            assert.notExists(err);
            db.get("foo", (err, value) => {
                assert.notExists(err);
                assert.ok(!is.string(value), "should not be string by default");

                let result;
                if (isTypedArray(value)) {
                    result = String.fromCharCode.apply(null, new Uint16Array(value));
                } else {
                    assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                    try {
                        result = value.toString();
                    } catch (e) {
                        assert.notExists(e, "should not throw when converting value to a string");
                    }
                }

                assert.equal(result, "bar");

                db.get("foo", {}, (err, value) => { // same but with {}
                    assert.notExists(err);
                    assert.ok(!is.string(value), "should not be string by default");

                    let result;
                    if (isTypedArray(value)) {
                        result = String.fromCharCode.apply(null, new Uint16Array(value));
                    } else {
                        assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                        try {
                            result = value.toString();
                        } catch (e) {
                            assert.notExists(e, "should not throw when converting value to a string");
                        }
                    }

                    assert.equal(result, "bar");

                    db.get("foo", { asBuffer: false }, (err, value) => {
                        assert.notExists(err);
                        assert.ok(is.string(value), "should be string if not buffer");
                        assert.equal(value, "bar");
                        done();
                    });
                });
            });
        });
    });

    it("test simultaniously get()", (dn) => {
        db.put("hello", "world", (err) => {
            assert.notExists(err);
            let r = 0;
            const done = function () {
                if (++r === 20) {
                    dn(); 
                }
            };
            let i = 0;
            let j = 0;

            for (; i < 10; ++i) {
                db.get("hello", (err, value) => {
                    assert.notExists(err);
                    assert.equal(value.toString(), "world");
                    done();
                });
            }

            for (; j < 10; ++j) {
                db.get("not found", (err, value) => {
                    assert.ok(err, "should error");
                    assert.ok(verifyNotFoundError(err), "should have correct error message");
                    assert.ok(is.undefined(value), "value is undefined");
                    done();
                });
            }
        });
    });

    it("test get() not found error is asynchronous", (done) => {
        db.put("hello", "world", (err) => {
            assert.notExists(err);

            let async = false;

            db.get("not found", (err, value) => {
                assert.ok(err, "should error");
                assert.ok(verifyNotFoundError(err), "should have correct error message");
                assert.ok(is.undefined(value), "value is undefined");
                assert.ok(async, "callback is asynchronous");
                done();
            });

            async = true;
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
    get(testCommon);
    tearDown(testCommon);
};
