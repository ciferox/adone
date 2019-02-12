const {
    noop,
    database: { level: { backend: { Memory, Encoding } } }
} = adone;

describe("Encoding backend", () => {
    it("opens and closes the underlying db", (done) => {
        const _db = {
            open(opts, cb) {
                setImmediate(cb);
            },
            close(cb) {
                setImmediate(cb);
            }
        };
        const db = new Encoding(_db);
        db.open((err) => {
            assert.notExists(err, "no error");
            db.close((err) => {
                assert.notExists(err, "no error");
                done();
            });
        });
    });

    it("encodings default to utf8", () => {
        const db = new Encoding(new Memory());
        assert.ok(db.db, ".db should be set");
        assert.ok(db.codec, ".codec should be set");
        assert.deepEqual(db.codec.opts, {
            keyEncoding: "utf8",
            valueEncoding: "utf8"
        }, "correct defaults");
    });

    it("default utf8 encoding stringifies numbers", (dn) => {
        let counter = 0;
        const done = () => {
            if (++counter === 2) {
                dn();
            }
        };

        const db = new Encoding({
            put(key, value, callback) {
                assert.equal(key, "1");
                assert.equal(value, "2");
                done();
            },
            batch(ops, options, callback) {
                assert.sameDeepMembers(ops, [{ type: "put", key: "3", value: "4" }]);
                done();
            }
        });

        db.put(1, 2, noop);
        db.batch([{ type: "put", key: 3, value: 4 }], noop);
    });

    it("test safe decode in get", (done) => {
        const memdb = new Memory();
        const db = new Encoding(memdb, { valueEncoding: "utf8" });
        db.put("foo", "this {} is [] not : json", (err) => {
            assert.notExists(err, "no error");
            const db2 = new Encoding(memdb, { valueEncoding: "json" });
            db2.get("foo", (err, value) => {
                assert.equal("EncodingException", err.name);
                memdb.close(() => done());
            });
        });
    });

    it("can decode from string to json", (done) => {
        const memdb = new Memory();
        const db = new Encoding(memdb, { valueEncoding: "utf8" });
        const data = { thisis: "json" };
        db.put("foo", JSON.stringify(data), (err) => {
            assert.notExists(err, "no error");
            const db2 = new Encoding(memdb, { valueEncoding: "json" });
            db2.get("foo", (err, value) => {
                assert.notExists(err, "no error");
                assert.deepEqual(value, data, "JSON.parse");
                memdb.close(() => done());
            });
        });
    });

    it("can decode from json to string", (done) => {
        const memdb = new Memory();
        const db = new Encoding(memdb, { valueEncoding: "json" });
        const data = { thisis: "json" };
        db.put("foo", data, (err) => {
            assert.notExists(err, "no error");
            const db2 = new Encoding(memdb, { valueEncoding: "utf8" });
            db2.get("foo", (err, value) => {
                assert.notExists(err, "no error");
                assert.deepEqual(value, JSON.stringify(data), "JSON.stringify");
                memdb.close(() => done());
            });
        });
    });

    it("binary encoding, using batch", (done) => {
        const data = [
            {
                type: "put",
                key: Buffer.from([1, 2, 3]),
                value: Buffer.from([4, 5, 6])
            },
            {
                type: "put",
                key: Buffer.from([7, 8, 9]),
                value: Buffer.from([10, 11, 12])
            }
        ];
        const db = new Encoding(new Memory(), {
            keyEncoding: "binary",
            valueEncoding: "binary"
        });
        db.batch(data, (err) => {
            assert.notExists(err, "no error");
            db.get(data[0].key, (err, value) => {
                assert.notExists(err, "no error");
                assert.deepEqual(value, data[0].value);
                db.get(data[1].key, (err, value) => {
                    assert.notExists(err, "no error");
                    assert.deepEqual(value, data[1].value);
                    db.close(() => done());
                });
            });
        });
    });

    it("default encoding retrieves a string from underlying store", () => {
        const down = {
            get(key, options, cb) {
                assert.equal(options.asBuffer, false, ".asBuffer is false");
            }
        };

        const db = new Encoding(down);

        db.get("key", noop);
    });

    it("custom value encoding that retrieves a string from underlying store", () => {
        const down = {
            get(key, options, cb) {
                assert.equal(options.asBuffer, false, ".asBuffer is false");
            }
        };

        const db = new Encoding(down, {
            valueEncoding: {
                buffer: false
            }
        });

        db.get("key", noop);
    });

    it("get() forwards error from underlying store", (done) => {
        const down = {
            get(key, options, cb) {
                process.nextTick(cb, new Error("error from store"));
            }
        };

        new Encoding(down).get("key", (err) => {
            assert.equal(err.message, "error from store");
            done();
        });
    });

    it("_del() encodes key", (done) => {
        const down = {
            del(key, options, cb) {
                assert.equal(key, "2");
                done();
            }
        };

        new Encoding(down).del(2, noop);
    });

    it("chainedBatch.put() encodes key and value", (done) => {
        const down = {
            batch() {
                return {
                    put(key, value) {
                        assert.equal(key, "1");
                        assert.equal(value, "2");
                        done();
                    }
                };
            }
        };

        new Encoding(down).batch().put(1, 2);
    });

    it("chainedBatch.del() encodes key", (done) => {
        const down = {
            batch() {
                return {
                    del(key) {
                        assert.equal(key, "1");
                        done();
                    }
                };
            }
        };

        new Encoding(down).batch().del(1);
    });

    it("chainedBatch.clear() is forwarded to underlying store", (done) => {
        const down = {
            batch() {
                return {
                    clear() {
                        done();
                    }
                };
            }
        };

        new Encoding(down).batch().clear();
    });

    it("chainedBatch.write() is forwarded to underlying store", (done) => {
        const down = {
            batch() {
                return {
                    write() {
                        done();
                    }
                };
            }
        };

        new Encoding(down).batch().write(noop);
    });

    it("custom value encoding that retrieves a buffer from underlying store", (done) => {
        const down = {
            get(key, options, cb) {
                assert.equal(options.asBuffer, true, ".asBuffer is true");
                done();
            }
        };

        const db = new Encoding(down, {
            valueEncoding: {
                buffer: true
            }
        });

        db.get("key", noop);
    });

    it(".keyAsBuffer and .valueAsBuffer defaults to false", (done) => {
        const down = {
            iterator(options) {
                assert.equal(options.keyAsBuffer, false);
                assert.equal(options.valueAsBuffer, false);
                done();
            }
        };

        new Encoding(down).iterator();
    });

    it(".keyAsBuffer and .valueAsBuffer as buffers if encoding says so", (done) => {
        const down = {
            iterator(options) {
                assert.equal(options.keyAsBuffer, true);
                assert.equal(options.valueAsBuffer, true);
                done();
            }
        };

        const db = new Encoding(down, {
            keyEncoding: {
                buffer: true
            },
            valueEncoding: {
                buffer: true
            }
        });

        db.iterator();
    });

    it(".keyAsBuffer and .valueAsBuffer as strings if encoding says so", (done) => {
        const down = {
            iterator(options) {
                assert.equal(options.keyAsBuffer, false);
                assert.equal(options.valueAsBuffer, false);
                done();
            }
        };

        const db = new Encoding(down, {
            keyEncoding: {
                buffer: false
            },
            valueEncoding: {
                buffer: false
            }
        });

        db.iterator();
    });

    it("iterator options.keys and options.values default to true", (done) => {
        const down = {
            iterator(options) {
                assert.equal(options.keys, true);
                assert.equal(options.values, true);
                done();
            }
        };

        new Encoding(down).iterator();
    });

    it("iterator skips keys if options.keys is false", (done) => {
        const down = {
            iterator(options) {
                assert.equal(options.keys, false);

                return {
                    next(callback) {
                        callback(null, "", "value");
                    }
                };
            }
        };

        const keyEncoding = {
            decode(key) {
                assert.fail("should not be called");
            }
        };

        const db = new Encoding(down, { keyEncoding });
        const itr = db.iterator({ keys: false });

        itr.next((err, key, value) => {
            assert.notExists(err, "no next error");
            assert.equal(key, undefined, "normalized key to undefined");
            assert.equal(value, "value", "got value");
            done();
        });
    });

    it("iterator skips values if options.values is false", (done) => {
        const down = {
            iterator(options) {
                assert.equal(options.values, false);

                return {
                    next(callback) {
                        callback(null, "key", "");
                    }
                };
            }
        };

        const valueEncoding = {
            decode(value) {
                t.fail("should not be called");
            }
        };

        const db = new Encoding(down, { valueEncoding });
        const itr = db.iterator({ values: false });

        itr.next((err, key, value) => {
            assert.notExists(err, "no next error");
            assert.equal(key, "key", "got key");
            assert.equal(value, undefined, "normalized value to undefined");
            done();
        });
    });

    it("iterator does not strip nullish range options", (dn) => {
        let counter = 0;
        const done = () => {
            if (++counter === 2) {
                dn();
            }
        };
        new Encoding({
            iterator(options) {
                assert.equal(options.gt, null);
                assert.equal(options.gte, null);
                assert.equal(options.lt, null);
                assert.equal(options.lte, null);
                done();
            }
        }).iterator({
            gt: null,
            gte: null,
            lt: null,
            lte: null
        });

        new Encoding({
            iterator(options) {
                assert.ok(options.hasOwnProperty("gt"));
                assert.ok(options.hasOwnProperty("gte"));
                assert.ok(options.hasOwnProperty("lt"));
                assert.ok(options.hasOwnProperty("lte"));

                assert.equal(options.gt, undefined);
                assert.equal(options.gte, undefined);
                assert.equal(options.lt, undefined);
                assert.equal(options.lte, undefined);
                done();
            }
        }).iterator({
            gt: undefined,
            gte: undefined,
            lt: undefined,
            lte: undefined
        });
    });

    it("iterator does not add nullish range options", (done) => {
        new Encoding({
            iterator(options) {
                assert.notOk(options.hasOwnProperty("gt"));
                assert.notOk(options.hasOwnProperty("gte"));
                assert.notOk(options.hasOwnProperty("lt"));
                assert.notOk(options.hasOwnProperty("lte"));
                done();
            }
        }).iterator({});
    });

    it("iterator forwards next() error from underlying iterator", (done) => {
        const down = {
            iterator() {
                return {
                    next(callback) {
                        process.nextTick(callback, new Error("from underlying iterator"));
                    }
                };
            }
        };

        const db = new Encoding(down);
        const itr = db.iterator();

        itr.next((err, key, value) => {
            assert.equal(err.message, "from underlying iterator");
            done();
        });
    });

    it("iterator forwards end() to underlying iterator", (dn) => {
        let counter = 0;
        const done = () => {
            if (++counter === 2) {
                dn();
            }
        };
        const down = {
            iterator() {
                return {
                    end(callback) {
                        done();
                        process.nextTick(callback);
                    }
                };
            }
        };

        const db = new Encoding(down);
        const itr = db.iterator();

        itr.end(() => {
            done();
        });
    });

    it("iterator catches decoding error from keyEncoding", (done) => {
        const down = {
            iterator() {
                return {
                    next(callback) {
                        process.nextTick(callback, null, "key", "value");
                    }
                };
            }
        };

        const db = new Encoding(down, {
            keyEncoding: {
                decode(key) {
                    assert.equal(key, "key");
                    throw new Error("from codec");
                }
            }
        });

        db.iterator().next((err, key, value) => {
            assert.equal(err.message, "from codec");
            assert.equal(err.name, "EncodingException");
            assert.equal(key, undefined);
            assert.equal(value, undefined);
            done();
        });
    });

    it("iterator catches decoding error from valueEncoding", (done) => {
        const down = {
            iterator() {
                return {
                    next(callback) {
                        process.nextTick(callback, null, "key", "value");
                    }
                };
            }
        };

        const db = new Encoding(down, {
            valueEncoding: {
                decode(value) {
                    assert.equal(value, "value");
                    throw new Error("from codec");
                }
            }
        });

        db.iterator().next((err, key, value) => {
            assert.equal(err.message, "from codec");
            assert.equal(err.name, "EncodingException");
            assert.equal(key, undefined);
            assert.equal(value, undefined);
            done();
        });
    });

    it("approximateSize() encodes start and end", (done) => {
        const down = {
            approximateSize(start, end) {
                assert.equal(start, "1");
                assert.equal(end, "2");
                done();
            }
        };

        new Encoding(down).approximateSize(1, 2, noop);
    });    
});
