const {
    assertion,
    database: { level: { concatIterator, backend: { Memory } } },
    util: { ltgt },
    noop
} = adone;
assertion.use(assertion.extension.checkmark);

const suite = require("../abstract");

const testCommon = suite.common({
    factory() {
        return new Memory();
    },

    // Opt-in to new clear() tests
    clear: true,

    // Opt-out of unsupported features
    createIfMissing: false,
    errorIfExists: false
});

// Test abstract-leveldown compliance
suite(testCommon);

const stringBuffer = (value) => Buffer.from(String(value));
const putKey = (key) => ({ type: "put", key, value: "value" });
const getKey = (entry) => entry.key;

// Additional tests for this implementation
it("unsorted entry, sorted iterator", (done) => {
    const db = testCommon.factory();

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
    const db = testCommon.factory();

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
    const db = testCommon.factory();

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
    const db = testCommon.factory();

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
    const db = testCommon.factory();

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
    const db = testCommon.factory();

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
    const db = testCommon.factory();
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
    const db = testCommon.factory();

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
    const db = testCommon.factory();

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

it("empty value in batch", (done) => {
    expect(3).checks(done);

    const db = testCommon.factory();

    db.open((err) => {
        assert.notExists(err, "opens correctly");
        expect(true).to.be.true.mark();
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
            expect(true).to.be.true.mark();
        });

        db.get("empty-buffer", (err, val) => {
            assert.notExists(err, "no error");
            assert.deepEqual(val, Buffer.alloc(0), "empty buffer");
            expect(true).to.be.true.mark();
        });
    });
});

it("empty buffer key in batch", (done) => {
    const db = testCommon.factory();

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
    const db = testCommon.factory();

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
            assert.deepEqual(val, "val1");
            done();
        });
    });
});

it("put multiple times", (done) => {
    expect(2).checks(done);

    const db = testCommon.factory();

    db.open((err) => {
        assert.notExists(err, "opens correctly");
        expect(true).to.be.true.mark();
    });

    db.put("key", "val", (err) => {
        assert.notExists(err, "no error");

        db.put("key", "val2", (err) => {
            assert.notExists(err, "no error");

            db.get("key", { asBuffer: false }, (err, val) => {
                assert.notExists(err, "no error");
                assert.deepEqual(val, "val2");
                expect(true).to.be.true.mark();
            });
        });
    });
});

it("put as string, get as buffer and vice versa", (done) => {
    expect(2).checks(done);

    const db = testCommon.factory();

    db.open((err) => {
        assert.notExists(err, "no error from open");

        db.put("a", "a", (err) => {
            assert.notExists(err, "no put error");

            db.get(Buffer.from("a"), { asBuffer: true }, (err, value) => {
                assert.notExists(err, "no get error");
                assert.deepEqual(value, Buffer.from("a"), "got value");
                expect(true).to.be.true.mark();
            });
        });

        db.put(Buffer.from("b"), Buffer.from("b"), (err) => {
            assert.notExists(err, "no put error");

            db.get("b", { asBuffer: false }, (err, value) => {
                assert.notExists(err, "no get error");
                assert.equal(value, "b", "got value");
                expect(true).to.be.true.mark();
            });
        });
    });
});

it("put as string, iterate as buffer", (done) => {
    const db = testCommon.factory();

    db.open((err) => {
        assert.notExists(err, "no error from open");

        db.put("a", "a", (err) => {
            assert.notExists(err, "no put error");

            concatIterator(db.iterator({ keyAsBuffer: true, valueAsBuffer: true }), (err, entries) => {
                assert.notExists(err, "no concatIterator error");
                assert.deepEqual(entries, [{ key: Buffer.from("a"), value: Buffer.from("a") }]);
                done();
            });
        });
    });
});

it("put as buffer, iterate as string", (done) => {
    const db = testCommon.factory();

    db.open((err) => {
        assert.notExists(err, "no error from open");

        db.put(Buffer.from("a"), Buffer.from("a"), (err) => {
            assert.notExists(err, "no put error");

            concatIterator(db.iterator({ keyAsBuffer: false, valueAsBuffer: false }), (err, entries) => {
                assert.notExists(err, "no concatIterator error");
                assert.deepEqual(entries, [{ key: "a", value: "a" }]);
                done();
            });
        });
    });
});

it("number keys", (done) => {
    expect(2).checks(done);
    const db = testCommon.factory();
    const numbers = [-Infinity, 0, 12, 2, Number(Infinity)];
    const strings = numbers.map(String);
    const buffers = numbers.map(stringBuffer);

    db.open(noop);
    db.batch(numbers.map(putKey), noop);

    const iterator1 = db.iterator({ keyAsBuffer: false });
    const iterator2 = db.iterator({ keyAsBuffer: true });

    concatIterator(iterator1, (err, entries) => {
        assert.notExists(err, "no iterator error");
        assert.deepEqual(entries.map(getKey), strings, "sorts lexicographically");
        expect(true).to.be.true.mark();
    });

    concatIterator(iterator2, (err, entries) => {
        assert.notExists(err, "no iterator error");
        assert.deepEqual(entries.map(getKey), buffers, "buffer input is stringified");
        expect(true).to.be.true.mark();
    });
});
