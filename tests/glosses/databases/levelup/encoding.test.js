const { levelup } = adone.database;
const common = require("./common");
const refute = require("referee").refute;

describe("Encoding", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.readStreamSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("test safe decode in get()", (done) => {
        ctx.openTestDatabase({ createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" }, (db) => {
            db.put("foo", "this {} is [] not : json", (err) => {
                refute(err);
                db.close((err) => {
                    refute(err);
                    db = levelup(db.location, { createIfMissing: false, errorIfExists: false, valueEncoding: "json" });
                    db.get("foo", (err, value) => {
                        assert(err);
                        assert.equal("EncodingError", err.name);
                        refute(value);
                        db.close(done);
                    });
                });
            });
        });
    });

    it("test safe decode in readStream()", (done) => {
        ctx.openTestDatabase({ createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" }, (db) => {
            db.put("foo", "this {} is [] not : json", (err) => {
                refute(err);
                db.close((err) => {
                    refute(err);

                    const dataSpy = spy();
                    const errorSpy = spy();

                    db = levelup(db.location, { createIfMissing: false, errorIfExists: false, valueEncoding: "json" });
                    db.readStream()
                        .on("data", dataSpy)
                        .on("error", errorSpy)
                        .on("close", () => {
                            assert.equal(dataSpy.callCount, 0, "no data");
                            assert.equal(errorSpy.callCount, 1, "error emitted");
                            assert.equal("EncodingError", errorSpy.getCall(0).args[0].name);
                            db.close(done);
                        });
                });
            });
        });
    });

    it("test encoding = valueEncoding", (done) => {
        // write a value as JSON, read as utf8 and check
        // the fact that we can get with keyEncoding of utf8 should demonstrate that
        // the key is not encoded as JSON
        ctx.openTestDatabase({ createIfMissing: true, valueEncoding: "json" }, (db) => {
            db.put("foo:foo", { bar: "bar" }, (err) => {
                refute(err);
                db.get("foo:foo", { keyEncoding: "utf8", valueEncoding: "utf8" }, (err, value) => {
                    refute(err);
                    assert.equal(value, '{"bar":"bar"}');
                    db.close(done);
                });
            });
        });
    });

    it("test batch op encoding", (done) => {
        ctx.openTestDatabase({ createIfMissing: true, valueEncoding: "json" }, (db) => {
            db.batch([
                {
                    type: "put",
                    key: new Buffer([1, 2, 3]),
                    value: new Buffer([4, 5, 6]),
                    keyEncoding: "binary",
                    valueEncoding: "binary"
                }
                , {
                    type: "put",
                    key: "string",
                    value: "string"
                }
            ], { keyEncoding: "utf8", valueEncoding: "utf8" },
                (err) => {
                    refute(err);
                    db.get(new Buffer([1, 2, 3]), {
                        keyEncoding: "binary",
                        valueEncoding: "binary"
                    }, (err, val) => {
                        refute(err);
                        assert.equal(val.toString(), "\u0004\u0005\u0006");

                        db.get("string", { valueEncoding: "utf8" }, (err, val) => {
                            refute(err);
                            assert.equal(val, "string");
                            db.close(done);
                        });
                    });
                });
        });
    });
});
