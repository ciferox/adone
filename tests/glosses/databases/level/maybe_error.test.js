const common = require("./common");

describe("maybeError() should be called async", () => {
    beforeEach((done) => {
        common.commonSetUp(done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("put()", (done) => {
        common.openTestDatabase((db) => {
            db.close(() => {
                assert.isTrue(db.isClosed(), "db is closed");
                let sync = false;
                db.put("key", "value", {}, (err) => {
                    sync = true;
                    assert(err);
                    assert.equal(err.message, "Database is not open");
                });
                assert.isFalse(sync, ".put cb called synchronously");
                done();
            });
        });
    });

    it("get()", (done) => {
        common.openTestDatabase((db) => {
            db.put("key", "value", {}, (err) => {
                assert.notExists(err);
                db.close(() => {
                    assert.isTrue(db.isClosed(), "db is closed");
                    let sync = false;
                    db.get("key", {}, (err, value) => {
                        sync = true;
                        assert(err);
                        assert.equal(err.message, "Database is not open");
                    });
                    assert.isFalse(sync, ".get cb called synchronously");
                    done();
                });
            });
        });
    });

    it("del()", (done) => {
        common.openTestDatabase((db) => {
            db.put("key", "value", {}, (err) => {
                assert.notExists(err);
                db.close(() => {
                    assert.isTrue(db.isClosed(), "db is closed");
                    let sync = false;
                    db.del("key", {}, (err) => {
                        sync = true;
                        assert(err);
                        assert.equal(err.message, "Database is not open");
                    });
                    assert.isFalse(sync, ".del cb called synchronously");
                    done();
                });
            });
        });
    });

    it("batch()", (done) => {
        common.openTestDatabase((db) => {
            db.close(() => {
                assert.isTrue(db.isClosed(), "db is closed");
                let sync = false;
                db.batch([{ type: "put", key: "key" }], {}, (err) => {
                    sync = true;
                    assert(err);
                    assert.equal(err.message, "Database is not open");
                });
                assert.isFalse(sync, ".batch cb called synchronously");
                done();
            });
        });
    });
});
