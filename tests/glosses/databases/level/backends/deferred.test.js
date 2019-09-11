const {
    assertion,
    noop,
    database: { level: { backend: { Deferred: DeferredBackend } } }
} = adone;
assertion.use(assertion.extension.checkmark);

describe("Deferred backend", () => {
    it("deferred open gets correct options", (done) => {
        const OPTIONS = { foo: "BAR" };
        const db = {
            open(options, callback) {
                assert.deepEqual(options, OPTIONS, "options passed on to open");
                process.nextTick(callback);
            }
        };

        const ld = new DeferredBackend(db);
        ld.open(OPTIONS, (err) => {
            assert.notExists(err, "no error");
            done();
        });
    });

    it("single operation", (done) => {
        let called = false;
        const db = {
            put(key, value, options, callback) {
                assert.equal(key, "foo", "correct key");
                assert.equal(value, "bar", "correct value");
                assert.deepEqual({}, options, "empty options");
                callback(null, "called");
            },
            open(options, callback) {
                process.nextTick(callback);
            }
        };

        const ld = new DeferredBackend(db);
        ld.put("foo", "bar", (err, v) => {
            assert.notExists(err, "no error");
            called = v;
        });

        assert.ok(called === false, "not called");

        ld.open((err) => {
            assert.notExists(err, "no error");
            assert.ok(called === "called", "function called");
            done();
        });
    });

    it("many operations", (done) => {
        let puts = 0;
        let gets = 0;
        let batches = 0;
        let clears = 0;

        const calls = [];
        const db = {
            put(key, value, options, callback) {
                if (puts++ === 0) {
                    assert.equal(key, "foo1", "correct key");
                    assert.equal(value, "bar1", "correct value");
                    assert.deepEqual(options, {}, "empty options");
                } else {
                    assert.equal(key, "foo2", "correct key");
                    assert.equal(value, "bar2", "correct value");
                    assert.deepEqual(options, {}, "empty options");
                }
                callback(null, `put${puts}`);
            },
            get(key, options, callback) {
                if (gets++ === 0) {
                    assert.equal("woo1", key, "correct key");
                    assert.deepEqual(options, { asBuffer: true }, "empty options");
                } else {
                    assert.equal("woo2", key, "correct key");
                    assert.deepEqual(options, { asBuffer: true }, "empty options");
                }
                callback(null, `gets${gets}`);
            },
            del(key, options, callback) {
                assert.equal("blergh", key, "correct key");
                assert.deepEqual(options, {}, "empty options");
                callback(null, "del");
            },
            batch(arr, options, callback) {
                if (batches++ === 0) {
                    assert.deepEqual(arr, [
                        { type: "put", key: "k1", value: "v1" },
                        { type: "put", key: "k2", value: "v2" }
                    ], "correct batch");
                } else {
                    assert.deepEqual(arr, [
                        { type: "put", key: "k3", value: "v3" },
                        { type: "put", key: "k4", value: "v4" }
                    ], "correct batch");
                }
                callback();
            },
            clear(options, callback) {
                if (clears++ === 0) {
                    assert.deepEqual(options, { reverse: false, limit: -1 }, "default options");
                } else {
                    assert.deepEqual(options, { gt: "k5", reverse: false, limit: -1 }, "range option");
                }

                callback();
            },
            open(options, callback) {
                process.nextTick(callback);
            }
        };

        const ld = new DeferredBackend(db);

        ld.put("foo1", "bar1", (err, v) => {
            assert.notExists(err, "no error");
            calls.push({ type: "put", key: "foo1", v });
        });
        ld.get("woo1", (err, v) => {
            assert.notExists(err, "no error");
            calls.push({ type: "get", key: "woo1", v });
        });
        ld.clear(() => {
            calls.push({ type: "clear" });
        });
        ld.put("foo2", "bar2", (err, v) => {
            assert.notExists(err, "no error");
            calls.push({ type: "put", key: "foo2", v });
        });
        ld.get("woo2", (err, v) => {
            assert.notExists(err, "no error");
            calls.push({ type: "get", key: "woo2", v });
        });
        ld.del("blergh", (err, v) => {
            assert.notExists(err, "no error");
            calls.push({ type: "del", key: "blergh", v });
        });
        ld.batch([
            { type: "put", key: "k1", value: "v1" },
            { type: "put", key: "k2", value: "v2" }
        ], () => {
            calls.push({ type: "batch", keys: "k1,k2" });
        });
        ld
            .batch()
            .put("k3", "v3")
            .put("k4", "v4")
            .write(() => {
                calls.push({ type: "batch", keys: "k3,k4" });
            });
        ld.clear({ gt: "k5" }, () => {
            calls.push({ type: "clear", gt: "k5" });
        });

        assert.ok(calls.length === 0, "not called");

        ld.open((err) => {
            assert.notExists(err, "no error");

            assert.equal(calls.length, 9, "all functions called");
            assert.deepEqual(calls, [
                { type: "put", key: "foo1", v: "put1" },
                { type: "get", key: "woo1", v: "gets1" },
                { type: "clear" },
                { type: "put", key: "foo2", v: "put2" },
                { type: "get", key: "woo2", v: "gets2" },
                { type: "del", key: "blergh", v: "del" },
                { type: "batch", keys: "k1,k2" },
                { type: "batch", keys: "k3,k4" },
                { type: "clear", gt: "k5" }
            ], "calls correctly behaved");

            done();
        });
    });

    describe("keys and values should not be serialized", () => {
        const DATA = [];
        const ITEMS = [
            123,
            "a string",
            Buffer.from("w00t"),
            { an: "object" }
        ];
        ITEMS.forEach((k) => {
            ITEMS.forEach((v) => {
                DATA.push({ key: k, value: v });
            });
        });

        function Db(m, fn) {
            const db = {
                open(options, cb) {
                    process.nextTick(cb);
                }
            };
            const wrapper = function () {
                fn.apply(null, arguments);
            };
            db[m] = wrapper;
            return new DeferredBackend(db);
        }

        it("put", (done) => {
            const calls = [];
            const ld = Db("put", (key, value, cb) => {
                calls.push({ key, value });
            });
            DATA.forEach((d) => {
                ld.put(d.key, d.value, noop);
            });
            ld.open((err) => {
                assert.notExists(err, "no error");
                assert.deepEqual(calls, DATA, "value ok");
                done();
            });
        });

        it("get", (done) => {
            const calls = [];
            const ld = Db("get", (key, cb) => {
                calls.push(key);
            });
            ITEMS.forEach((key) => {
                ld.get(key, noop);
            });
            ld.open((err) => {
                assert.notExists(err, "no error");
                assert.deepEqual(calls, ITEMS, "value ok");
                done();
            });
        });

        it("del", (done) => {
            const calls = [];
            const ld = Db("del", (key, cb) => {
                calls.push(key);
            });
            ITEMS.forEach((key) => {
                ld.del(key, noop);
            });
            ld.open((err) => {
                assert.notExists(err, "no error");
                assert.deepEqual(calls, ITEMS, "value ok");
                done();
            });
        });

        it("clear", (done) => {
            const calls = [];
            const ld = Db("clear", (opts, cb) => {
                calls.push(opts);
            });
            ITEMS.forEach((key) => {
                ld.clear({ gt: key }, noop);
            });
            ld.open((err) => {
                assert.notExists(err, "no error");
                assert.deepEqual(calls, ITEMS.map((key) => {
                    return { gt: key, reverse: false, limit: -1 }
                }), "value ok");
                done();
            });
        });

        it("approximateSize", (done) => {
            const calls = [];
            const ld = Db("approximateSize", (start, end, cb) => {
                calls.push({ start, end });
            });
            ITEMS.forEach((key) => {
                ld.approximateSize(key, key, noop);
            });
            ld.open((err) => {
                assert.notExists(err, "no error");
                assert.deepEqual(calls, ITEMS.map((i) => {
                    return { start: i, end: i }
                }), "value ok");
                done();
            });
        });

        it("store not supporting approximateSize", (done) => {
            const ld = Db("FOO", () => { });
            assert.throws(() => {
                ld.approximateSize("key", "key", noop);
            }, /approximateSize is not a function/);
            done();
        });

        it("compactRange", (done) => {
            const calls = [];
            const ld = Db("compactRange", (start, end, cb) => {
                calls.push({ start, end });
            });
            ITEMS.forEach((key) => {
                ld.compactRange(key, key, noop);
            });
            ld.open((err) => {
                assert.notExists(err, "no error");
                assert.deepEqual(calls, ITEMS.map((i) => {
                    return { start: i, end: i }
                }), "value ok");
                done();
            });
        });

        it("store not supporting compactRange", (done) => {
            const ld = Db("FOO", () => { });
            assert.throws(() => {
                ld.compactRange("key", "key", noop);
            }, /compactRange is not a function/);
            done();
        });
    });

    it("_close calls close for underlying store", (done) => {
        expect(2).checks(done);

        const db = {
            close(callback) {
                expect(true).to.be.true.mark();
                // t.pass("close for underlying store is called");
                process.nextTick(callback);
            }
        };
        const ld = new DeferredBackend(db);

        ld.close((err) => {
            assert.notExists(err, "no error");
            expect(true).to.be.true.mark();
        });
    });

    it("open error on underlying store calls back with error", (done) => {
        expect(2).checks(done);
        const db = {
            open(options, callback) {
                expect(true).to.be.true.mark();
                // t.pass("db.open called");
                process.nextTick(callback, new Error("foo"));
            }
        };
        const ld = new DeferredBackend(db);

        ld.open((err) => {
            assert.equal(err.message, "foo");
            expect(true).to.be.true.mark();
        });
    });

    it("close error on underlying store calls back with error", (done) => {
        expect(2).checks(done);

        const db = {
            close(callback) {
                expect(true).to.be.true.mark();
                // t.pass("db.close called");
                process.nextTick(callback, new Error("foo"));
            }
        };
        const ld = new DeferredBackend(db);

        ld.close((err) => {
            assert.equal(err.message, "foo");
            expect(true).to.be.true.mark();
        });
    });

    it("non-deferred approximateSize", (done) => {
        expect(2).checks(done);
        const db = {
            open(options, cb) {
                process.nextTick(cb);
            },
            approximateSize(start, end, callback) {
                assert.equal(start, "bar");
                assert.equal(end, "foo");
                process.nextTick(callback);
                expect(true).to.be.true.mark();
            }
        };
        const ld = new DeferredBackend(db);

        ld.open((err) => {
            assert.notExists(err);
            ld.approximateSize("bar", "foo", (err) => {
                assert.notExists(err);
                expect(true).to.be.true.mark();
            });
        });
    });

    it("non-deferred compactRange", (done) => {
        expect(2).checks(done);

        const db = {
            open(options, cb) {
                process.nextTick(cb);
            },
            compactRange(start, end, callback) {
                assert.equal(start, "bar");
                assert.equal(end, "foo");
                process.nextTick(callback);
                expect(true).to.be.true.mark();
            }
        };
        const ld = new DeferredBackend(db);

        ld.open((err) => {
            assert.notExists(err);
            ld.compactRange("bar", "foo", (err) => {
                assert.notExists(err);
                expect(true).to.be.true.mark();
            });
        });
    });

    it("iterator - deferred operations", (done) => {
        expect(3).checks(done);

        let seekTarget = false;

        const db = {
            iterator(options) {
                return {
                    seek(target) {
                        seekTarget = target;
                    },
                    next(cb) {
                        cb(null, "key", "value");
                    },
                    end(cb) {
                        process.nextTick(cb);
                    }
                };
            },
            open(options, callback) {
                process.nextTick(callback);
            }
        };
        const ld = new DeferredBackend(db);
        const it = ld.iterator();
        let nextFirst = false;

        it.seek("foo");

        it.next((err, key, value) => {
            assert.equal(seekTarget, "foo", "seek was called with correct target");
            nextFirst = true;
            assert.notExists(err, "no error");
            assert.equal(key, "key");
            assert.equal(value, "value");
            expect(true).to.be.true.mark();
        });

        it.end((err) => {
            assert.notExists(err, "no error");
            assert.ok(nextFirst);
            expect(true).to.be.true.mark();
        });

        ld.open((err) => {
            assert.notExists(err, "no error");
            const it2 = ld.iterator();
            it2.end((err) => {
                assert.notExists(err);
                expect(true).to.be.true.mark();
            });
        });

        assert.ok(require(adone.getPath("src", "glosses", "databases", "level", "backends", "deferred")).default.Iterator);
    });

    it("iterator - non deferred operation", (done) => {
        let seekTarget = false;

        const db = {
            iterator(options) {
                return {
                    next(cb) {
                        cb(null, "key", "value");
                    },
                    seek(target) {
                        seekTarget = target;
                    },
                    end(cb) {
                        process.nextTick(cb);
                    }
                };
            },
            open(options, callback) {
                process.nextTick(callback);
            }
        };
        const ld = new DeferredBackend(db);
        const it = ld.iterator();

        ld.open((err) => {
            assert.notExists(err, "no error");

            it.seek("foo");

            assert.equal(seekTarget, "foo", "seek was called with correct target");

            it.next((err, key, value) => {
                assert.notExists(err, "no error");
                assert.equal(key, "key");
                assert.equal(value, "value");
                done();
            });
        });
    });
});
