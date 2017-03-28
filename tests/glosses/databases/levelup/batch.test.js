const { levelup } = adone.database;
const errors = levelup.errors;
const async = require("async");
const common = require("./common");
const refute = require("referee").refute;

describe("batch()", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("batch() with multiple puts", (done) => {
        ctx.openTestDatabase((db) => {
            db.batch(
                [
                    { type: "put", key: "foo", value: "afoovalue" }
                    , { type: "put", key: "bar", value: "abarvalue" }
                    , { type: "put", key: "baz", value: "abazvalue" }
                ], (err) => {
                    refute(err);
                    async.forEach(
                        ["foo", "bar", "baz"]
                        , (key, callback) => {
                            db.get(key, (err, value) => {
                                refute(err);
                                assert.equal(value, `a${key}value`);
                                callback();
                            });
                        }
                        , done
                    );
                }
            );
        });
    });

    it("batch() no type set defaults to put", (done) => {
        ctx.openTestDatabase((db) => {
            db.batch(
                [
                    { key: "foo", value: "afoovalue" }
                    , { key: "bar", value: "abarvalue" }
                    , { key: "baz", value: "abazvalue" }
                ]
                , (err) => {
                    refute(err);
                    async.forEach(
                        ["foo", "bar", "baz"]
                        , (key, callback) => {
                            db.get(key, (err, value) => {
                                refute(err);
                                assert.equal(value, `a${key}value`);
                                callback();
                            });
                        }
                        , done
                    );
                }
            );
        });
    });

    it("batch() with multiple puts and deletes", (done) => {
        ctx.openTestDatabase((db) => {
            async.series(
                [
                    function (callback) {
                        db.batch(
                            [
                                { type: "put", key: "1", value: "one" }
                                , { type: "put", key: "2", value: "two" }
                                , { type: "put", key: "3", value: "three" }
                            ]
                            , callback
                        );
                    }
                    , function (callback) {
                        db.batch(
                            [
                                { type: "put", key: "foo", value: "afoovalue" }
                                , { type: "del", key: "1" }
                                , { type: "put", key: "bar", value: "abarvalue" }
                                , { type: "del", key: "foo" }
                                , { type: "put", key: "baz", value: "abazvalue" }
                            ]
                            , callback
                        );
                    }
                    , function (callback) {
                        // these should exist
                        async.forEach(
                            ["2", "3", "bar", "baz"]
                            , (key, callback) => {
                                db.get(key, (err, value) => {
                                    refute(err);
                                    refute.isNull(value);
                                    callback();
                                });
                            }
                            , callback
                        );
                    }
                    , function (callback) {
                        // these shouldn't exist
                        async.forEach(
                            ["1", "foo"]
                            , (key, callback) => {
                                db.get(key, (err, value) => {
                                    assert.instanceOf(err, errors.NotFoundError);
                                    refute(value);
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

    it("batch() with chained interface", (done) => {
        ctx.openTestDatabase((db) => {
            db.put("1", "one", (err) => {
                refute(err);

                db.batch()
                    .put("one", "1")
                    .del("two")
                    .put("three", "3")
                    .clear()
                    .del("1")
                    .put("2", "two")
                    .put("3", "three")
                    .del("3")
                    .write((err) => {
                        refute(err);

                        async.forEach(
                            ["one", "three", "1", "2", "3"]
                            , (key, callback) => {
                                db.get(key, (err) => {
                                    if (["one", "three", "1", "3"].indexOf(key) > -1) {
                                        assert(err);
                                    } else {
                                        refute(err);
                                    }
                                    callback();
                                });
                            }
                            , done
                        );
                    });
            });
        });
    });

    it("batch() exposes ops queue length", (done) => {
        ctx.openTestDatabase((db) => {
            const batch = db.batch()
                .put("one", "1")
                .del("two")
                .put("three", "3");
            assert.equal(batch.length, 3);
            batch.clear();
            assert.equal(batch.length, 0);
            batch
                .del("1")
                .put("2", "two")
                .put("3", "three")
                .del("3");
            assert.equal(batch.length, 4);
            done();
        });
    });

    it("batch() with can manipulate data from put()", (done) => {
        // checks encoding and whatnot
        ctx.openTestDatabase((db) => {
            async.series(
                [
                    db.put.bind(db, "1", "one")
                    , db.put.bind(db, "2", "two")
                    , db.put.bind(db, "3", "three")
                    , function (callback) {
                        db.batch(
                            [
                                { type: "put", key: "foo", value: "afoovalue" }
                                , { type: "del", key: "1" }
                                , { type: "put", key: "bar", value: "abarvalue" }
                                , { type: "del", key: "foo" }
                                , { type: "put", key: "baz", value: "abazvalue" }
                            ]
                            , callback
                        );
                    }
                    , function (callback) {
                        // these should exist
                        async.forEach(
                            ["2", "3", "bar", "baz"]
                            , (key, callback) => {
                                db.get(key, (err, value) => {
                                    refute(err);
                                    refute.isNull(value);
                                    callback();
                                });
                            }
                            , callback
                        );
                    }
                    , function (callback) {
                        // these shouldn't exist
                        async.forEach(
                            ["1", "foo"]
                            , (key, callback) => {
                                db.get(key, (err, value) => {
                                    assert.instanceOf(err, errors.NotFoundError);
                                    refute(value);
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

    it("batch() data can be read with get() and del()", (done) => {
        ctx.openTestDatabase((db) => {
            async.series(
                [
                    function (callback) {
                        db.batch(
                            [
                                { type: "put", key: "1", value: "one" }
                                , { type: "put", key: "2", value: "two" }
                                , { type: "put", key: "3", value: "three" }
                            ]
                            , callback
                        );
                    }
                    , db.del.bind(db, "1", "one")
                    , function (callback) {
                        // these should exist
                        async.forEach(
                            ["2", "3"]
                            , (key, callback) => {
                                db.get(key, (err, value) => {
                                    refute(err);
                                    refute.isNull(value);
                                    callback();
                                });
                            }
                            , callback
                        );
                    }
                    , function (callback) {
                        // this shouldn't exist
                        db.get("1", (err, value) => {
                            assert.instanceOf(err, errors.NotFoundError);
                            refute(value);
                            callback();
                        });
                    }
                ]
                , done
            );
        });
    });

    describe.only("chained batch() arguments", () => {
        let _db;
        let _batch;
        beforeEach((done) => {
            ctx.openTestDatabase((db) => {
                _db = db;
                _batch = db.batch();
                done();
            });
        });

        it("test batch#put() with missing `value`", () => {
            // value = undefined
            _batch.put("foo1");

            _batch.put("foo1", null);
        });

        it("test batch#put() with missing `key`", () => {
            // key = undefined
            assert.throws(_batch.put.bind(_batch, undefined, "foo1"), errors.WriteError, "key cannot be `null` or `undefined`");

            // key = null
            assert.throws(_batch.put.bind(_batch, null, "foo1"), errors.WriteError, "key cannot be `null` or `undefined`");
        });

        it("test batch#put() with missing `key` and `value`", () => {
            // undefined
            assert.throws(_batch.put.bind(_batch), errors.WriteError, "key cannot be `null` or `undefined`");

            // null
            assert.throws(_batch.put.bind(_batch, null, null), errors.WriteError, "key cannot be `null` or `undefined`");
        });

        it("test batch#del() with missing `key`", () => {
            // key = undefined
            assert.throws(_batch.del.bind(_batch, undefined, "foo1"), errors.WriteError, "key cannot be `null` or `undefined`");

            // key = null
            assert.throws(_batch.del.bind(_batch, null, "foo1"), errors.WriteError, "key cannot be `null` or `undefined`");
        });

        it("test batch#write() with no callback", () => {
            _batch.write(); // should not cause an error with no cb
        });

        describe("test batch operations after write()", () => {
            beforeEach((done) => {
                _batch.put("foo", "bar").put("boom", "bang").del("foo").write(done);
                ctx.verify = function (cb) {
                    assert.throws(cb, errors.WriteError, "write() already called on this batch");
                };
            });

            it("test put()", () => {
                ctx.verify(() => {
                    _batch.put("whoa", "dude");
                });
            });

            it("test del()", () => {
                ctx.verify(() => {
                    _batch.del("foo");
                });
            });

            it("test clear()", () => {
                ctx.verify(() => {
                    _batch.clear();
                });
            });

            it("test write()", () => {
                ctx.verify(() => {
                    _batch.write();
                });
            });
        });
    });
});
