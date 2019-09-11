const each = require("async-each");
const common = require("./common");

const {
    is
} = adone;

const loadData = () => Buffer.from("0080c0ff", "hex");

const checkData = function (buf) {
    assert.equal(buf.equals(loadData()), true);
};

describe("Binary API", () => {
    let testData;

    before((done) => {
        common.commonSetUp(() => {
            testData = loadData();
            done();
        });
    });

    after((done) => {
        common.commonTearDown(done);
    });

    it("sanity check on test data", (done) => {
        assert(is.buffer(testData));
        checkData(testData);
        done();
    });

    it("test put() and get() with binary value {valueEncoding:binary}", (done) => {
        common.openTestDatabase((db) => {
            db.put("binarydata", testData, { valueEncoding: "binary" }, (err) => {
                assert.notExists(err);
                db.get("binarydata", { valueEncoding: "binary" }, (err, value) => {
                    assert.notExists(err);
                    assert(value);
                    checkData(value);
                    done();
                });
            });
        });
    });

    it("test put() and get() with binary value {valueEncoding:binary} on createDatabase()", (done) => {
        common.openTestDatabase({ valueEncoding: "binary" }, (db) => {
            db.put("binarydata", testData, (err) => {
                assert.notExists(err);
                db.get("binarydata", (err, value) => {
                    assert.notExists(err);
                    assert(value);
                    checkData(value);
                    done();
                });
            });
        });
    });

    it("test put() and get() with binary key {valueEncoding:binary}", (done) => {
        common.openTestDatabase((db) => {
            db.put(testData, "binarydata", { valueEncoding: "binary" }, (err) => {
                assert.notExists(err);
                db.get(testData, { valueEncoding: "binary" }, (err, value) => {
                    assert.notExists(err);
                    assert(value instanceof Buffer, "value is buffer");
                    assert.equal(value.toString(), "binarydata");
                    done();
                });
            });
        });
    });

    it("test put() and get() with binary value {keyEncoding:utf8,valueEncoding:binary}", (done) => {
        common.openTestDatabase((db) => {
            db.put("binarydata", testData, { keyEncoding: "utf8", valueEncoding: "binary" }, (err) => {
                assert.notExists(err);
                db.get("binarydata", { keyEncoding: "utf8", valueEncoding: "binary" }, (err, value) => {
                    assert.notExists(err);
                    assert(value);
                    checkData(value);
                    done();
                });
            });
        });
    });

    it("test put() and get() with binary value {keyEncoding:utf8,valueEncoding:binary} on createDatabase()", (done) => {
        common.openTestDatabase({ keyEncoding: "utf8", valueEncoding: "binary" }, (db) => {
            db.put("binarydata", testData, (err) => {
                assert.notExists(err);
                db.get("binarydata", (err, value) => {
                    assert.notExists(err);
                    assert(value);
                    checkData(value);
                    done();
                });
            });
        });
    });

    it("test put() and get() with binary key {keyEncoding:binary,valueEncoding:utf8}", (done) => {
        common.openTestDatabase((db) => {
            db.put(testData, "binarydata", { keyEncoding: "binary", valueEncoding: "utf8" }, (err) => {
                assert.notExists(err);
                db.get(testData, { keyEncoding: "binary", valueEncoding: "utf8" }, (err, value) => {
                    assert.notExists(err);
                    assert.equal(value, "binarydata");
                    done();
                });
            });
        });
    });

    it("test put() and get() with binary key & value {valueEncoding:binary}", (done) => {
        common.openTestDatabase((db) => {
            db.put(testData, testData, { valueEncoding: "binary" }, (err) => {
                assert.notExists(err);
                db.get(testData, { valueEncoding: "binary" }, (err, value) => {
                    assert.notExists(err);
                    checkData(value);
                    done();
                });
            });
        });
    });

    it("test put() and del() and get() with binary key {valueEncoding:binary}", (done) => {
        common.openTestDatabase((db) => {
            db.put(testData, "binarydata", { valueEncoding: "binary" }, (err) => {
                assert.notExists(err);
                db.del(testData, { valueEncoding: "binary" }, (err) => {
                    assert.notExists(err);
                    db.get(testData, { valueEncoding: "binary" }, (err, value) => {
                        assert(err);
                        assert.notExists(value);
                        done();
                    });
                });
            });
        });
    });

    it("batch() with multiple puts", (done) => {
        common.openTestDatabase((db) => {
            db.batch([
                { type: "put", key: "foo", value: testData },
                { type: "put", key: "bar", value: testData },
                { type: "put", key: "baz", value: "abazvalue" }
            ], { keyEncoding: "utf8", valueEncoding: "binary" }, (err) => {
                assert.notExists(err);
                each(["foo", "bar", "baz"], (key, callback) => {
                    db.get(key, { valueEncoding: "binary" }, (err, value) => {
                        assert.notExists(err);
                        if (key === "baz") {
                            assert(value instanceof Buffer, "value is buffer");
                            assert.equal(value.toString(), `a${key}value`);
                            callback();
                        } else {
                            checkData(value);
                            callback();
                        }
                    });
                }, done);
            });
        });
    });
});
