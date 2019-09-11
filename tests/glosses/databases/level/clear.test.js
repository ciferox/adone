const {
    database: { level: { concatIterator, DB, backend: { Encoding, Memory } } }
} = adone;

describe("clear()", () => {
    const makeTest = function (name, fn) {
        it(name, (done) => {
            const mem = new Memory();

            mem.open((err) => {
                assert.notExists(err, "no open error");

                mem.batch([
                    { type: "put", key: '"a"', value: "a" },
                    { type: "put", key: '"b"', value: "b" }
                ], (err) => {
                    assert.notExists(err, "no batch error");

                    mem.close((err) => {
                        assert.notExists(err, "no close error");
                        fn(done, mem);
                    });
                });
            });
        });
    };

    const verify = function (done, db, expectedKey) {
        concatIterator(db.iterator({ keyAsBuffer: false }), (err, entries) => {
            assert.notExists(err, "no concat error");
            assert.deepEqual(entries.map((e) => {
                return e.key;
            }), [expectedKey], "got expected keys");
            db.close(done);
        });
    };

    makeTest("clear() without encoding, without deferred-open", (done, mem) => {
        const db = new DB(mem);

        db.open((err) => {
            assert.notExists(err);

            db.clear({ gte: '"b"' }, (err) => {
                assert.notExists(err, "no clear error");
                verify(done, db, '"a"');
            });
        });
    });

    makeTest("clear() without encoding, with deferred-open", (done, mem) => {
        const db = new DB(mem);

        db.clear({ gte: '"b"' }, (err) => {
            assert.notExists(err, "no clear error");
            verify(done, db, '"a"');
        });
    });

    makeTest("clear() with encoding, with deferred-open", (done, mem) => {
        const db = new DB(new Encoding(mem, { keyEncoding: "json" }));

        db.clear({ gte: "b" }, (err) => {
            assert.notExists(err, "no clear error");
            verify(done, db, "a");
        });
    });

    makeTest("clear() with encoding, without deferred-open", (done, mem) => {
        const db = new DB(new Encoding(mem, { keyEncoding: "json" }));

        db.open((err) => {
            assert.notExists(err);

            db.clear({ gte: "b" }, (err) => {
                assert.notExists(err, "no clear error");
                verify(done, db, "a");
            });
        });
    });
});
