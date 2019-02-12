const ltgt = require("ltgt");

const {
    noop,
    database: { level: { concatIterator, backend: { Memory } } }
} = adone;

const testCommon = require("../abstract/common")({
    factory() {
        return new Memory();
    }
});


describe("Memory backend", () => {
    /**
     *  compatibility with basic LevelDOWN API *
     */

    // Skip this test because memdown doesn't have a location or constructor options
    // require('abstract-leveldown/abstract/leveldown-test').args(MemDOWN, test)

    describe("open", () => {
        require("../abstract/open").args(testCommon);
        require("../abstract/open").open(testCommon);
    });

    describe("del", () => {
        require("../abstract/del").all(testCommon);
    });

    describe("get", () => {
        require("../abstract/get").all(testCommon);
    });

    describe("put", () => {
        require("../abstract/put").all(testCommon);
    });

    describe("put_get_del", () => {
        require("../abstract/put_get_del").all(testCommon);
    });

    describe("batch", () => {
        require("../abstract/batch").all(testCommon);
    });

    describe("chained_batch", () => {
        require("../abstract/chained_batch").all(testCommon);
    });

    describe("close", () => {
        require("../abstract/close").all(testCommon);
    });

    describe("iterator", () => {
        require("../abstract/iterator").all(testCommon);
    });

    describe("iterator_range", () => {
        require("../abstract/iterator_range").all(testCommon);
    });


    const stringBuffer = function (value) {
        return Buffer.from(String(value));
    };

    const putKey = function (key) {
        return { type: "put", key, value: "value" };
    };

    const getKey = function (entry) {
        return entry.key;
    };

    it("unsorted entry, sorted iterator", (done) => {
        const db = new Memory();

        db.open(noop);

        db.put("f", "F", noop);
        db.put("a", "A", noop);
        db.put("c", "C", noop);
        db.put("e", "E", noop);

        db.batch(
            [
                { type: "put", key: "d", value: "D" },
                { type: "put", key: "b", value: "B" },
                { type: "put", key: "g", value: "G" }
            ],
            noop
        );

        concatIterator(
            db.iterator({ keyAsBuffer: false, valueAsBuffer: false }),
            (err, data) => {
                assert.notOk(err, "no error");
                assert.equal(data.length, 7, "correct number of entries");

                const expected = [
                    { key: "a", value: "A" },
                    { key: "b", value: "B" },
                    { key: "c", value: "C" },
                    { key: "d", value: "D" },
                    { key: "e", value: "E" },
                    { key: "f", value: "F" },
                    { key: "g", value: "G" }
                ];

                assert.deepEqual(data, expected);
                done();
            }
        );
    });

    it("reading while putting", (done) => {
        const db = new Memory();

        db.open(noop);

        db.put("f", "F", noop);
        db.put("c", "C", noop);
        db.put("e", "E", noop);

        const iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });

        iterator.next((err, key, value) => {
            assert.notExists(err, "no next error");
            assert.equal(key, "c");
            assert.equal(value, "C");

            db.put("a", "A", noop);

            iterator.next((err, key, value) => {
                assert.notExists(err, "no next error");
                assert.equal(key, "e");
                assert.equal(value, "E");
                done();
            });
        });
    });

    it("reading while deleting", (done) => {
        const db = new Memory();

        db.open(noop);

        db.put("f", "F", noop);
        db.put("a", "A", noop);
        db.put("c", "C", noop);
        db.put("e", "E", noop);

        const iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });

        iterator.next((err, key, value) => {
            assert.notExists(err, "no next error");
            assert.equal(key, "a");
            assert.equal(value, "A");

            db.del("a", noop);

            iterator.next((err, key, value) => {
                assert.notExists(err, "no next error");
                assert.equal(key, "c");
                assert.equal(value, "C");
                done();
            });
        });
    });

    it("reverse ranges", (done) => {
        const db = new Memory();

        db.open(noop);

        db.put("a", "A", noop);
        db.put("c", "C", noop);

        const iterator = db.iterator({
            keyAsBuffer: false,
            valueAsBuffer: false,
            lte: "b",
            reverse: true
        });

        iterator.next((err, key, value) => {
            assert.notExists(err, "no next error");
            assert.equal(key, "a");
            assert.equal(value, "A");
            done();
        });
    });

    it("delete while iterating", (done) => {
        const db = new Memory();

        db.open((err) => {
            assert.notExists(err, "opens correctly");
        });

        db.put("a", "A", noop);
        db.put("b", "B", noop);
        db.put("c", "C", noop);

        const iterator = db.iterator({
            keyAsBuffer: false,
            valueAsBuffer: false,
            gte: "a"
        });

        iterator.next((err, key, value) => {
            assert.notExists(err, "no next error");
            assert.equal(key, "a");
            assert.equal(value, "A");

            db.del("b", (err) => {
                assert.notOk(err, "no error");

                iterator.next((err, key, value) => {
                    assert.notOk(err, "no error");
                    assert.equal(key, "b");
                    assert.equal(value, "B");
                    done();
                });
            });
        });
    });

    it("iterator with byte range", (done) => {
        const db = new Memory();

        db.open((err) => {
            assert.notExists(err, "opens correctly");
        });

        db.put(Buffer.from("a0", "hex"), "A", noop);

        const iterator = db.iterator({ valueAsBuffer: false, lt: Buffer.from("ff", "hex") });

        iterator.next((err, key, value) => {
            assert.notOk(err, "no error");
            assert.equal(key.toString("hex"), "a0");
            assert.equal(value, "A");
            done();
        });
    });

    it("iterator does not clone buffers", (done) => {
        const db = new Memory();
        const buf = Buffer.from("a");

        db.open(noop);
        db.put(buf, buf, noop);

        concatIterator(db.iterator(), (err, entries) => {
            assert.notExists(err, "no iterator error");
            assert.ok(entries[0].key === buf, "key is same buffer");
            assert.ok(entries[0].value === buf, "value is same buffer");
            done();
        });
    });

    it("iterator stringifies buffer input", (done) => {
        const db = new Memory();

        db.open(noop);
        db.put(1, 2, noop);

        concatIterator(db.iterator(), (err, entries) => {
            assert.notExists(err, "no iterator error");
            assert.deepEqual(entries[0].key, Buffer.from("1"), "key is stringified");
            assert.deepEqual(entries[0].value, Buffer.from("2"), "value is stringified");
            done();
        });
    });

    it("backing rbtree is buffer-aware", (done) => {
        const db = new Memory();

        db.open((err) => {
            assert.notExists(err, "opens correctly");
        });

        const one = Buffer.from("80", "hex");
        const two = Buffer.from("c0", "hex");

        assert.ok(two.toString() === one.toString(), "would be equal when not buffer-aware");
        assert.ok(ltgt.compare(two, one) > 0, "but greater when buffer-aware");

        db.put(one, "one", (err) => {
            assert.notOk(err, "no error");

            db.get(one, { asBuffer: false }, (err, value) => {
                assert.notOk(err, "no error");
                assert.equal(value, "one", "value one ok");

                db.put(two, "two", (err) => {
                    assert.notOk(err, "no error");

                    db.get(one, { asBuffer: false }, (err, value) => {
                        assert.notOk(err, "no error");
                        assert.equal(value, "one", "value one is the same");
                        done();
                    });
                });
            });
        });
    });

    it("empty value in batch", (dn) => {
        const db = new Memory();

        let counter = 0;
        const done = () => {
            if (++counter === 2) {
                dn();
            }
        };

        db.open((err) => {
            assert.notExists(err, "opens correctly");
        });

        db.batch([
            {
                type: "put",
                key: "empty-string",
                value: ""
            },
            {
                type: "put",
                key: "empty-buffer",
                value: Buffer.alloc(0)
            }
        ], (err) => {
            assert.notExists(err, "no error");

            db.get("empty-string", (err, val) => {
                assert.notExists(err, "no error");
                assert.deepEqual(val, Buffer.alloc(0), "empty string");
                done();
            });

            db.get("empty-buffer", (err, val) => {
                assert.notExists(err, "no error");
                assert.deepEqual(val, Buffer.alloc(0), "empty buffer");
                done();
            });
        });
    });

    it("empty buffer key in batch", (done) => {
        const db = new Memory();

        db.open((err) => {
            assert.notExists(err, "opens correctly");
        });

        db.batch([{
            type: "put",
            key: Buffer.alloc(0),
            value: ""
        }], (err) => {
            assert.ok(err, "got an error");
            done();
        });
    });

    it("buffer key in batch", (done) => {
        const db = new Memory();

        db.open((err) => {
            assert.notExists(err, "opens correctly");
        });

        db.batch([{
            type: "put",
            key: Buffer.from("foo", "utf8"),
            value: "val1"
        }], (err) => {
            assert.notExists(err, "no error");

            db.get(Buffer.from("foo", "utf8"), { asBuffer: false }, (err, val) => {
                assert.notExists(err, "no error");
                assert.equal(val, "val1");
                done();
            });
        });
    });

    it("put multiple times", (done) => {
        const db = new Memory();

        db.open((err) => {
            assert.notExists(err, "opens correctly");
        });

        db.put("key", "val", (err) => {
            assert.notExists(err, "no error");

            db.put("key", "val2", (err) => {
                assert.notExists(err, "no error");

                db.get("key", { asBuffer: false }, (err, val) => {
                    assert.notExists(err, "no error");
                    assert.equal(val, "val2");
                    done();
                });
            });
        });
    });

    it("number keys", (dn) => {
        const db = new Memory();
        const numbers = [2, 12];
        const buffers = numbers.map(stringBuffer);

        let counter = 0;
        const done = () => {
            if (++counter === 2) {
                dn();
            }
        };

        db.open(noop);
        db.batch(numbers.map(putKey), noop);

        const iterator1 = db.iterator({ keyAsBuffer: false });
        const iterator2 = db.iterator({ keyAsBuffer: true });

        concatIterator(iterator1, (err, entries) => {
            assert.notExists(err, "no iterator error");
            assert.sameDeepMembers(entries.map(getKey), numbers, "sorts naturally");
            done();
        });

        concatIterator(iterator2, (err, entries) => {
            assert.notExists(err, "no iterator error");
            assert.sameDeepMembers(entries.map(getKey), buffers, "buffer input is stringified");
            done();
        });
    });

    it("date keys", (dn) => {
        const db = new Memory();
        const dates = [new Date(0), new Date(1)];
        const buffers = dates.map(stringBuffer);
        let counter = 0;
        const done = () => {
            if (++counter === 2) {
                dn();
            }
        };

        db.open(noop);
        db.batch(dates.map(putKey), noop);

        const iterator = db.iterator({ keyAsBuffer: false });
        const iterator2 = db.iterator({ keyAsBuffer: true });

        concatIterator(iterator, (err, entries) => {
            assert.notExists(err, "no iterator error");
            assert.sameDeepMembers(entries.map(getKey), dates, "sorts naturally");
            done();
        });

        concatIterator(iterator2, (err, entries) => {
            assert.notExists(err, "no iterator error");
            assert.sameDeepMembers(entries.map(getKey), buffers, "buffer input is stringified");
            done();
        });
    });

    it("object value", (done) => {
        const db = new Memory();
        const obj = {};

        db.open(noop);
        db.put("key", obj, noop);

        db.get("key", { asBuffer: false }, (err, value) => {
            assert.notExists(err, "no get error");
            assert.ok(value === obj, "same object");
            done();
        });
    });
});
