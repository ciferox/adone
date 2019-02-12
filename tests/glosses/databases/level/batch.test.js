const async = require("async");
const common = require("./common");

describe("batch()", () => {
    beforeEach((done) => {
        common.commonSetUp(done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("batch() with multiple puts", (done) => {
        common.openTestDatabase((db) => {
            db.batch([
                { type: "put", key: "foo", value: "afoovalue" },
                { type: "put", key: "bar", value: "abarvalue" },
                { type: "put", key: "baz", value: "abazvalue" }
            ], (err) => {
                assert.notExists(err);
                async.forEach(["foo", "bar", "baz"], (key, callback) => {
                    db.get(key, (err, value) => {
                        assert.notExists(err);
                        assert.equal(value, `a${key}value`);
                        callback();
                    });
                }, done);
            });
        });
    });

    it("batch() with promise interface", (done) => {
        common.openTestDatabase((db) => {
            db.batch([
                { type: "put", key: "foo", value: "afoovalue" },
                { type: "put", key: "bar", value: "abarvalue" },
                { type: "put", key: "baz", value: "abazvalue" }
            ])
                .then(() => {
                    async.forEach(["foo", "bar", "baz"], (key, callback) => {
                        db.get(key, (err, value) => {
                            assert.notExists(err);
                            assert.equal(value, `a${key}value`);
                            callback();
                        });
                    }, done);
                })
                .catch(done);
        });
    });

    it("batch() with multiple puts and deletes", (done) => {
        common.openTestDatabase((db) => {
            async.series([
                function (callback) {
                    db.batch([
                        { type: "put", key: "1", value: "one" },
                        { type: "put", key: "2", value: "two" },
                        { type: "put", key: "3", value: "three" }
                    ], callback);
                },
                function (callback) {
                    db.batch([
                        { type: "put", key: "foo", value: "afoovalue" },
                        { type: "del", key: "1" },
                        { type: "put", key: "bar", value: "abarvalue" },
                        { type: "del", key: "foo" },
                        { type: "put", key: "baz", value: "abazvalue" }
                    ], callback);
                },
                function (callback) {
                    // these should exist
                    async.forEach(["2", "3", "bar", "baz"], (key, callback) => {
                        db.get(key, (err, value) => {
                            assert.notExists(err);
                            assert.notNull(value);
                            callback();
                        });
                    }, callback);
                },
                function (callback) {
                    // these shouldn't exist
                    async.forEach(["1", "foo"], (key, callback) => {
                        db.get(key, (err, value) => {
                            assert(err);
                            assert.instanceOf(err, adone.error.NotFoundException);
                            assert.notExists(value);
                            callback();
                        });
                    }, callback);
                }
            ], done);
        });
    });

    it("batch() with chained interface", (done) => {
        common.openTestDatabase((db) => {
            db.put("1", "one", (err) => {
                assert.notExists(err);

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
                        assert.notExists(err);

                        async.forEach(["one", "three", "1", "2", "3"], (key, callback) => {
                            db.get(key, (err) => {
                                if (["one", "three", "1", "3"].indexOf(key) > -1) {
                                    assert(err);
                                } else {
                                    assert.notExists(err);
                                }
                                callback();
                            });
                        }, done);
                    });
            });
        });
    });

    it("batch() with chained interface - options", (done) => {
        common.openTestDatabase((db) => {
            const batch = db.batch();

            const write = batch.batch.write.bind(batch.batch);
            batch.batch.write = function (options, cb) {
                assert.deepEqual(options, { foo: "bar" });
                write(options, cb);
            };

            batch.put("one", "1")
                .write({ foo: "bar" }, (err) => {
                    assert.notExists(err);
                    done();
                });
        });
    });

    it("batch() with chained promise interface - options", (done) => {
        common.openTestDatabase((db) => {
            const batch = db.batch();

            const write = batch.batch.write.bind(batch.batch);
            batch.batch.write = function (options, cb) {
                assert.deepEqual(options, { foo: "bar" });
                write(options, cb);
            };

            batch.put("one", "1")
                .write({ foo: "bar" })
                .then(done)
                .catch(done);
        });
    });

    it("batch() with chained promise interface", (done) => {
        common.openTestDatabase((db) => {
            db.put("1", "one", (err) => {
                assert.notExists(err);

                db.batch()
                    .put("one", "1")
                    .del("two")
                    .put("three", "3")
                    .clear()
                    .del("1")
                    .put("2", "two")
                    .put("3", "three")
                    .del("3")
                    .write()
                    .then(() => {
                        async.forEach(["one", "three", "1", "2", "3"], (key, callback) => {
                            db.get(key, (err) => {
                                if (["one", "three", "1", "3"].indexOf(key) > -1) {
                                    assert(err);
                                } else {
                                    assert.notExists(err);
                                }
                                callback();
                            });
                        }, done);
                    })
                    .catch(done);
            });
        });
    });

    it("batch() exposes ops queue length", (done) => {
        common.openTestDatabase((db) => {
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
        common.openTestDatabase((db) => {
            async.series(
                [
                    db.put.bind(db, "1", "one"),
                    db.put.bind(db, "2", "two"),
                    db.put.bind(db, "3", "three"),
                    function (callback) {
                        db.batch([
                            { type: "put", key: "foo", value: "afoovalue" },
                            { type: "del", key: "1" },
                            { type: "put", key: "bar", value: "abarvalue" },
                            { type: "del", key: "foo" },
                            { type: "put", key: "baz", value: "abazvalue" }
                        ], callback);
                    },
                    function (callback) {
                        // these should exist
                        async.forEach(["2", "3", "bar", "baz"], (key, callback) => {
                            db.get(key, (err, value) => {
                                assert.notExists(err);
                                assert.notNull(value);
                                callback();
                            });
                        }, callback);
                    },
                    function (callback) {
                        // these shouldn't exist
                        async.forEach(["1", "foo"], (key, callback) => {
                            db.get(key, (err, value) => {
                                assert(err);
                                assert.instanceOf(err, adone.error.NotFoundException);
                                assert.notExists(value);
                                callback();
                            });
                        }, callback);
                    }
                ], done);
        });
    });

    it("batch() data can be read with get() and del()", (done) => {
        common.openTestDatabase((db) => {
            async.series([
                function (callback) {
                    db.batch([
                        { type: "put", key: "1", value: "one" },
                        { type: "put", key: "2", value: "two" },
                        { type: "put", key: "3", value: "three" }
                    ], callback);
                },
                db.del.bind(db, "1", "one"),
                function (callback) {
                    // these should exist
                    async.forEach(["2", "3"], (key, callback) => {
                        db.get(key, (err, value) => {
                            assert.notExists(err);
                            assert.notNull(value);
                            callback();
                        });
                    }, callback);
                },
                function (callback) {
                    // this shouldn't exist
                    db.get("1", (err, value) => {
                        assert(err);
                        assert.instanceOf(err, adone.error.NotFoundException);
                        assert.notExists(value);
                        callback();
                    });
                }
            ], done);
        });
    });

    describe("chained batch() arguments", () => {
        let dbInst;
        let batch;

        before((done) => {
            common.openTestDatabase((db) => {
                dbInst = db;
                batch = db.batch();
                done();
            });
        });

        it("test batch#put() with missing `value`", () => {
            // value = undefined
            assert.throws(() => {
                batch.put("foo1");
            }, "value cannot be `null` or `undefined`");

            assert.throws(() => {
                batch.put("foo1", null);
            }, "value cannot be `null` or `undefined`");
        });

        it("test batch#put() with missing `key`", () => {
            // key = undefined
            assert.throws(() => {
                batch.put(undefined, "foo1");
            }, "key cannot be `null` or `undefined`");

            // key = null
            assert.throws(() => {
                batch.put(null, "foo1");
            }, "key cannot be `null` or `undefined`");
        });

        it("test batch#put() with missing `key` and `value`", () => {
            // undefined
            assert.throws(() => {
                batch.put();
            }, "key cannot be `null` or `undefined`");

            // null
            assert.throws(() => {
                batch.put(null, null);
            }, "key cannot be `null` or `undefined`");
        });

        it("test batch#del() with missing `key`", () => {
            // key = undefined
            assert.throws(() => {
                batch.del(undefined, "foo1");
            }, "key cannot be `null` or `undefined`");

            // key = null
            assert.throws(() => {
                batch.del(null, "foo1");
            }, "key cannot be `null` or `undefined`");
        });

        it("test batch#write() with no callback", async () => {
            await batch.write(); // should not cause an error with no cb
        });

        describe("test batch operations after write()", () => {
            let verify;

            before((done) => {
                batch = dbInst.batch();
                batch.put("foo", "bar").put("boom", "bang").del("foo").write(done);
                verify = function (cb) {
                    assert.throws(cb, "write() already called on this batch");
                };
            });

            it("test put()", () => {
                verify(() => {
                    batch.put("whoa", "dude");
                });
            });

            it("test del()", () => {
                verify(() => {
                    batch.del("foo");
                });
            });

            it("test clear()", () => {
                verify(() => {
                    batch.clear();
                });
            });
        });
    });
});
