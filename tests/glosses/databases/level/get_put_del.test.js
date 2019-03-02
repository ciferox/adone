const async = require("async");
const common = require("./common");

const {
    error: { Exception, NotFoundException }
} = adone;

describe("get() / put() / del()", () => {
    before((done) => {
        common.commonSetUp(done);
    });

    after((done) => {
        common.commonTearDown(done);
    });

    describe("Simple operations", () => {
        it("get() on empty database causes error", (done) => {
            common.openTestDatabase((db) => {
                db.get("undefkey", (err, value) => {
                    assert.notExists(value);
                    assert.instanceOf(err, Error);
                    assert.instanceOf(err, Exception);
                    assert.instanceOf(err, NotFoundException);
                    // assert(err.notFound === true, "err.notFound is `true`");
                    // assert.equal(err.status, 404, "err.status is 404");
                    assert.isTrue(err.message.includes("[undefkey]"));
                    done();
                });
            });
        });

        it("get() on empty database raises promise error", (done) => {
            common.openTestDatabase((db) => {
                db.get("undefkey").catch((err) => {
                    assert.instanceOf(err, Error);
                    assert.instanceOf(err, Exception);
                    assert.instanceOf(err, NotFoundException);
                    // assert(err.notFound === true, "err.notFound is `true`");
                    // assert.equal(err.status, 404, "err.status is 404");
                    assert.isTrue(err.message.includes("[undefkey]"));
                    done();
                });
            });
        });

        it("put() and get() simple string key/value pairs", (done) => {
            common.openTestDatabase((db) => {
                db.put("some key", "some value stored in the database", (err) => {
                    assert.notExists(err);
                    db.get("some key", (err, value) => {
                        assert.notExists(err);
                        assert.equal(value, "some value stored in the database");
                        done();
                    });
                });
            });
        });

        it("put() and get() promise interface", (done) => {
            common.openTestDatabase((db) => {
                db.put("some key", "some value stored in the database")
                    .then(() => {
                        return db.get("some key");
                    })
                    .then((value) => {
                        assert.equal(value, "some value stored in the database");
                        done();
                    })
                    .catch(done);
            });
        });

        it("del() on empty database doesn't cause error", (done) => {
            common.openTestDatabase((db) => {
                db.del("undefkey", (err) => {
                    assert.notExists(err);
                    done();
                });
            });
        });

        it("del() promise interface", (done) => {
            common.openTestDatabase((db) => {
                db.del("undefkey")
                    .then(done)
                    .catch(done);
            });
        });

        it("del() works on real entries", (done) => {
            common.openTestDatabase((db) => {
                async.series([
                    function (callback) {
                        async.forEach(["foo", "bar", "baz"], (key, callback) => {
                            db.put(key, 1 + Math.random(), callback);
                        }, callback);
                    },
                    function (callback) {
                        db.del("bar", callback);
                    },
                    function (callback) {
                        async.forEach(["foo", "bar", "baz"], (key, callback) => {
                            db.get(key, (err, value) => {
                                // we should get foo & baz but not bar
                                if (key === "bar") {
                                    assert(err);
                                    assert.notExists(value);
                                } else {
                                    assert.notExists(err);
                                    assert(value);
                                }
                                callback();
                            });
                        }, callback);
                    }
                ], done);
            });
        });
    });

    it("test get() throwables", (done) => {
        common.openTestDatabase((db) => {
            assert.throws(() => {
                db.get();
            }, "get() requires a key argument", "no-arg get() throws");
            done();
        });
    });

    it("test put() throwables", (done) => {
        common.openTestDatabase((db) => {
            assert.throws(() => {
                db.put();
            }, "put() requires a key argument", "no-arg put() throws");

            done();
        });
    });

    it("test del() throwables", (done) => {
        common.openTestDatabase((db) => {
            assert.throws(() => {
                db.del();
            }, "del() requires a key argument", "no-arg del() throws");

            done();
        });
    });

});
