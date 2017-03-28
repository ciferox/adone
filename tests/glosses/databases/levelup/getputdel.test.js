const { levelup } = adone.database;
const errors = levelup.errors;
const async = require("async");
const common = require("./common");
const refute = require("referee").refute;

describe("get() / put() / del()", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });


    describe("Simple operations", () => {
        it("get() on empty database causes error", (done) => {
            ctx.openTestDatabase((db) => {
                db.get("undefkey", (err, value) => {
                    refute(value);
                    assert.instanceOf(err, Error);
                    assert.instanceOf(err, errors.LevelUPError);
                    assert.instanceOf(err, errors.NotFoundError);
                    assert(err.notFound === true, "err.notFound is `true`");
                    assert.equal(err.status, 404, "err.status is 404");
                    assert.match(err, /[undefkey]/);
                    done();
                });
            });
        });

        it("put() and get() simple string key/value pairs", (done) => {
            ctx.openTestDatabase((db) => {
                db.put("some key", "some value stored in the database", (err) => {
                    refute(err);
                    db.get("some key", (err, value) => {
                        refute(err);
                        assert.equal(value, "some value stored in the database");
                        done();
                    });
                });
            });
        });

        it("del() on empty database doesn't cause error", (done) => {
            ctx.openTestDatabase((db) => {
                db.del("undefkey", (err) => {
                    refute(err);
                    done();
                });
            });
        });

        it("del() works on real entries", (done) => {
            ctx.openTestDatabase((db) => {
                async.series(
                    [
                        function (callback) {
                            async.forEach(
                                ["foo", "bar", "baz"]
                                , (key, callback) => {
                                    db.put(key, 1 + Math.random(), callback);
                                }
                                , callback
                            );
                        }
                        , function (callback) {
                            db.del("bar", callback);
                        }
                        , function (callback) {
                            async.forEach(
                                ["foo", "bar", "baz"]
                                , (key, callback) => {
                                    db.get(key, (err, value) => {
                                        // we should get foo & baz but not bar
                                        if (key === "bar") {
                                            assert(err);
                                            refute(value);
                                        } else {
                                            refute(err);
                                            assert(value);
                                        }
                                        callback();
                                    });
                                }
                                , callback
                            );
                        }
                    ]
                    , done
                );
            });
        });
    });

    it("test get() throwables", (done) => {
        ctx.openTestDatabase((db) => {
            assert.throws(db.get.bind(db), errors.ReadError, "get() requires key and callback arguments", "no-arg get() throws");
            assert.throws(db.get.bind(db, "foo"), errors.ReadError, "get() requires key and callback arguments", "callback-less, 1-arg get() throws");
            assert.throws(db.get.bind(db, "foo", {}), errors.ReadError, "get() requires key and callback arguments", "callback-less, 2-arg get() throws");

            done();
        });
    });

    it("test put() throwables", (done) => {
        ctx.openTestDatabase((db) => {
            assert.throws(db.put.bind(db), errors.WriteError, "put() requires a key argument", "no-arg put() throws");
            done();
        });
    });

    it("test del() throwables", (done) => {
        ctx.openTestDatabase((db) => {
            assert.throws(db.del.bind(db), errors.WriteError, "del() requires a key argument", "no-arg del() throws");
            done();
        });
    });
});
