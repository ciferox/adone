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
    it("test callback-less, 2-arg, batch() throws", () => {
        assert.throws(() => {
            db.batch("foo", {});
        }, /batch\(array\) requires a callback argument/, "callback-less, 2-arg batch() throws");
    });

    it("test batch() with missing `value`", (done) => {
        db.batch([{ type: "put", key: "foo1" }], (err) => {
            assert.equal(err.message, "value cannot be `null` or `undefined`", "correct error message");
            done();
        });
    });

    it("test batch() with null or undefined `value`", (done) => {
        const illegalValues = [null, undefined];
        let counter = 0;

        illegalValues.forEach((value) => {
            db.batch([{ type: "put", key: "foo1", value }], (err) => {
                assert.equal(err.message, "value cannot be `null` or `undefined`", "correct error message");
                if (++counter >= illegalValues.length) {
                    done();
                }
            });
        });
    });

    it("test batch() with missing `key`", (done) => {
        let async = false;

        db.batch([{ type: "put", value: "foo1" }], (err) => {
            assert.ok(err, "got error");
            assert.equal(err.message, "key cannot be `null` or `undefined`", "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });

    it("test batch() with null or undefined `key`", (done) => {
        let counter = 0;
        const illegalKeys = [null, undefined];

        illegalKeys.forEach((key) => {
            let async = false;

            db.batch([{ type: "put", key, value: "foo1" }], (err) => {
                assert.ok(err, "got error");
                assert.equal(err.message, "key cannot be `null` or `undefined`", "correct error message");
                assert.ok(async, "callback is asynchronous");

                if (++counter >= illegalKeys.length) {
                    done();
                }
            });

            async = true;
        });
    });

    it("test batch() with empty `key`", (done) => {
        const illegalKeys = [
            { type: "String", key: "" },
            { type: "Buffer", key: Buffer.alloc(0) },
            { type: "Array", key: [] }
        ];
        let counter = 0;

        illegalKeys.forEach((item) => {
            let async = false;

            db.batch([{ type: "put", key: item.key, value: "foo1" }], (err) => {
                assert.ok(err, "got error");
                assert.equal(err.message, `key cannot be an empty ${item.type}`, "correct error message");
                assert.ok(async, "callback is asynchronous");
                if (++counter >= illegalKeys.length) {
                    done();
                }
            });

            async = true;
        });
    });

    it("test batch() with missing `key` and `value`", (done) => {
        let async = false;

        db.batch([{ type: "put" }], (err) => {
            assert.ok(err, "got error");
            assert.equal(err.message, "key cannot be `null` or `undefined`", "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });

    it("test batch() with missing `type`", (done) => {
        let async = false;

        db.batch([{ key: "key", value: "value" }], (err) => {
            assert.ok(err, "got error");
            assert.equal(err.message, "`type` must be 'put' or 'del'", "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });

    it("test batch() with wrong `type`", (done) => {
        let async = false;

        db.batch([{ key: "key", value: "value", type: "foo" }], (err) => {
            assert.ok(err, "got error");
            assert.equal(err.message, "`type` must be 'put' or 'del'", "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });

    it("test batch() with missing array", (done) => {
        let async = false;

        db.batch((err) => {
            assert.ok(err, "got error");
            assert.equal(err.message, "batch(array) requires an array argument", "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });

    it("test batch() with undefined array", (done) => {
        let async = false;

        db.batch(void 0, (err) => {
            assert.ok(err, "got error");
            assert.equal(err.message, "batch(array) requires an array argument", "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });

    it("test batch() with null array", (done) => {
        let async = false;

        db.batch(null, (err) => {
            assert.ok(err, "got error");
            assert.equal(err.message, "batch(array) requires an array argument", "correct error message");
            assert.ok(async, "callback is asynchronous");
            done();
        });

        async = true;
    });

    it("test batch() with null options", (done) => {
        db.batch([], null, (err) => {
            assert.notExists(err);
            done();
        });
    });
    [null, undefined, 1, true].forEach((element) => {
        const type = is.null(element) ? "null" : typeof element;

        it(`test batch() with ${type} element`, (done) => {
            let async = false;

            db.batch([element], (err) => {
                assert.ok(err, "got error");
                assert.equal(err.message, "batch(array) element must be an object and not `null`", "correct error message");
                assert.ok(async, "callback is asynchronous");
                done();
            });

            async = true;
        });
    });
};

export const batch = function (testCommon) {
    it("test batch() with empty array", (done) => {
        db.batch([], (err) => {
            assert.notExists(err);
            done();
        });
    });

    it("test simple batch()", (done) => {
        db.batch([{ type: "put", key: "foo", value: "bar" }], (err) => {
            assert.notExists(err);

            db.get("foo", (err, value) => {
                assert.notExists(err);
                let result;
                if (isTypedArray(value)) {
                    result = String.fromCharCode.apply(null, new Uint16Array(value));
                } else {
                    assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                    result = value.toString();
                }
                assert.equal(result, "bar");
                done();
            });
        });
    });

    it("test multiple batch()", (dn) => {
        db.batch([
            { type: "put", key: "foobatch1", value: "bar1" },
            { type: "put", key: "foobatch2", value: "bar2" },
            { type: "put", key: "foobatch3", value: "bar3" },
            { type: "del", key: "foobatch2" }
        ], (err) => {
            assert.notExists(err);

            let r = 0;
            const done = function () {
                if (++r === 3) {
                    dn(); 
                }
            };

            db.get("foobatch1", (err, value) => {
                assert.notExists(err);
                let result;
                if (isTypedArray(value)) {
                    result = String.fromCharCode.apply(null, new Uint16Array(value));
                } else {
                    assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                    result = value.toString();
                }
                assert.equal(result, "bar1");
                done();
            });

            db.get("foobatch2", (err, value) => {
                assert.ok(err, "entry not found");
                assert.ok(is.undefined(value), "value is undefined");
                assert.ok(verifyNotFoundError(err), "NotFound error");
                done();
            });

            db.get("foobatch3", (err, value) => {
                assert.notExists(err);
                let result;
                if (isTypedArray(value)) {
                    result = String.fromCharCode.apply(null, new Uint16Array(value));
                } else {
                    assert.ok(!is.undefined(Buffer) && value instanceof Buffer);
                    result = value.toString();
                }
                assert.equal(result, "bar3");
                done();
            });
        });
    });
};

export const atomic = function (testCommon) {
    it("test multiple batch()", (done) => {
        let async = false;

        db.batch([
            { type: "put", key: "foobah1", value: "bar1" },
            { type: "put", value: "bar2" },
            { type: "put", key: "foobah3", value: "bar3" }
        ], (err) => {
            assert.ok(err, "should error");
            assert.ok(async, "callback is asynchronous");

            db.get("foobah1", (err) => {
                assert.ok(err, "should not be found");
            });
            db.get("foobah3", (err) => {
                assert.ok(err, "should not be found");
            });

            done();
        });

        async = true;
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
    atomic(testCommon);
    tearDown(testCommon);
};
