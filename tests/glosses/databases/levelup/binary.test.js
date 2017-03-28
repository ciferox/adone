const async = require("async");
const common = require("./common");
const refute = require("referee").refute;

describe("Binary API", () => {
    let testData;
    let ctx;

    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, () => {
            common.loadBinaryTestData((err, data) => {
                refute(err);
                testData = data;
                done();
            });
        });
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("sanity check on test data", (done) => {
        assert.isOk(Buffer.isBuffer(testData));
        common.checkBinaryTestData(testData, done);
    });

    it("test put() and get() with binary value {valueEncoding:binary}", (done) => {
        ctx.openTestDatabase((db) => {
            db.put("binarydata", testData, { valueEncoding: "binary" }, (err) => {
                refute(err);
                db.get("binarydata", { valueEncoding: "binary" }, (err, value) => {
                    refute(err);
                    assert(value);
                    common.checkBinaryTestData(value, done);
                });
            });
        });
    });

    it("test put() and get() with binary value {valueEncoding:binary} on createDatabase()", (done) => {
        ctx.openTestDatabase({ createIfMissing: true, errorIfExists: true, valueEncoding: "binary" }, (db) => {
            db.put("binarydata", testData, (err) => {
                refute(err);
                db.get("binarydata", (err, value) => {
                    refute(err);
                    assert(value);
                    common.checkBinaryTestData(value, done);
                });
            });
        });
    });

    it("test put() and get() with binary key {valueEncoding:binary}", (done) => {
        ctx.openTestDatabase((db) => {
            db.put(testData, "binarydata", { valueEncoding: "binary" }, (err) => {
                refute(err);
                db.get(testData, { valueEncoding: "binary" }, (err, value) => {
                    refute(err);
                    assert(value instanceof Buffer, "value is buffer");
                    assert.equal(value.toString(), "binarydata");
                    done();
                });
            });
        });
    });

    it("test put() and get() with binary value {keyEncoding:utf8,valueEncoding:binary}", (done) => {
        ctx.openTestDatabase((db) => {
            db.put("binarydata", testData, { keyEncoding: "utf8", valueEncoding: "binary" }, (err) => {
                refute(err);
                db.get("binarydata", { keyEncoding: "utf8", valueEncoding: "binary" }, (err, value) => {
                    refute(err);
                    assert(value);
                    common.checkBinaryTestData(value, done);
                });
            });
        });
    });

    it("test put() and get() with binary value {keyEncoding:utf8,valueEncoding:binary} on createDatabase()", (done) => {
        ctx.openTestDatabase({ createIfMissing: true, errorIfExists: true, keyEncoding: "utf8", valueEncoding: "binary" }, (db) => {
            db.put("binarydata", testData, (err) => {
                refute(err);
                db.get("binarydata", (err, value) => {
                    refute(err);
                    assert(value);
                    common.checkBinaryTestData(value, done);
                });
            });
        });
    });

    it("test put() and get() with binary key {keyEncoding:binary,valueEncoding:utf8}", (done) => {
        ctx.openTestDatabase((db) => {
            db.put(testData, "binarydata", { keyEncoding: "binary", valueEncoding: "utf8" }, (err) => {
                refute(err);
                db.get(testData, { keyEncoding: "binary", valueEncoding: "utf8" }, (err, value) => {
                    refute(err);
                    assert.equal(value, "binarydata");
                    done();
                });
            });
        });
    });

    it("test put() and get() with binary key & value {valueEncoding:binary}", (done) => {
        ctx.openTestDatabase((db) => {
            db.put(testData, testData, { valueEncoding: "binary" }, (err) => {
                refute(err);
                db.get(testData, { valueEncoding: "binary" }, (err, value) => {
                    refute(err);
                    common.checkBinaryTestData(value, done);
                });
            });
        });
    });


    it("test put() and del() and get() with binary key {valueEncoding:binary}", (done) => {
        ctx.openTestDatabase((db) => {
            db.put(testData, "binarydata", { valueEncoding: "binary" }, (err) => {
                refute(err);
                db.del(testData, { valueEncoding: "binary" }, (err) => {
                    refute(err);
                    db.get(testData, { valueEncoding: "binary" }, (err, value) => {
                        assert(err);
                        refute(value);
                        done();
                    });
                });
            });
        });
    });

    it("batch() with multiple puts", (done) => {
        ctx.openTestDatabase((db) => {
            db.batch(
                [
                    { type: "put", key: "foo", value: testData }
                    , { type: "put", key: "bar", value: testData }
                    , { type: "put", key: "baz", value: "abazvalue" }
                ]
                , { keyEncoding: "utf8", valueEncoding: "binary" }
                , (err) => {
                    refute(err);
                    async.forEach(
                        ["foo", "bar", "baz"]
                        , (key, callback) => {
                            db.get(key, { valueEncoding: "binary" }, (err, value) => {
                                refute(err);
                                if (key === "baz") {
                                    assert(value instanceof Buffer, "value is buffer");
                                    assert.equal(value.toString(), `a${key}value`);
                                    callback();
                                } else {
                                    common.checkBinaryTestData(value, callback);
                                }
                            });
                        }
                        , done
                    );
                }
            );
        });
    });
});
