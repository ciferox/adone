const {
    database: { level: { concatIterator } }
} = adone;

export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
};

export const noSnapshot = function (testCommon) {

    const verify = function (done, it, db) {
        concatIterator(it, (err, entries) => {
            assert.notExists(err, "no iterator error");

            const kv = entries.map((entry) => {
                return entry.key.toString() + entry.value.toString();
            });

            if (kv.length === 3) {
                assert.sameMembers(kv, ["aa", "bb", "cc"], "maybe supports snapshots");
            } else {
                assert.sameMembers(kv, ["aa", "cc"], "ignores keys that have been deleted in the mean time");
            }

            db.close(() => done());
        });
    };

    const make = function (run) {
        return function (done) {
            const db = testCommon.factory();
            const operations = [
                { type: "put", key: "a", value: "a" },
                { type: "put", key: "b", value: "b" },
                { type: "put", key: "c", value: "c" }
            ];

            db.open((err) => {
                assert.notExists(err, "no open error");

                db.batch(operations, (err) => {
                    assert.notExists(err, "no batch error");

                    // For this test it is important that we don't read eagerly.
                    // NOTE: highWaterMark is not an abstract option atm, but
                    // it is supported by leveldown, rocksdb and others.
                    const it = db.iterator({ highWaterMark: 0 });

                    run(db, (err) => {
                        assert.notExists(err, "no run error");
                        verify(done, it, db);
                    });
                });
            });
        };
    };

    it("delete key after creating iterator", make((db, done) => {
        db.del("b", done);
    }));

    it("batch delete key after creating iterator", make((db, done) => {
        db.batch([{ type: "del", key: "b" }], done);
    }));
};

export const tearDown = function (testCommon) {
    it("tearDown", testCommon.tearDown);
};

export const all = function (testCommon) {
    setUp(testCommon);
    noSnapshot(testCommon);
    tearDown(testCommon);
};
