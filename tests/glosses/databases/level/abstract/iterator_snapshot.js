export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
};

export const snapshot = function (testCommon) {
    const make = function (run) {
        return function (done) {
            const db = testCommon.factory();

            db.open((err) => {
                assert.notExists(err, "no open error");

                db.put("z", "from snapshot", (err) => {
                    assert.notExists(err, "no put error");

                    // For this test it is important that we don't read eagerly.
                    // NOTE: highWaterMark is not an abstract option atm, but
                    // it is supported by leveldown, rocksdb and others.
                    const it = db.iterator({ highWaterMark: 0 });

                    run(db, it, function end(err) {
                        assert.notExists(err, "no run error");

                        it.end((err) => {
                            assert.notExists(err, "no iterator end error");
                            db.close(() => done());
                        });
                    });
                });
            });
        };
    };

    it("delete key after snapshotting", make((db, it, end) => {
        db.del("z", (err) => {
            assert.notExists(err, "no del error");

            it.next((err, key, value) => {
                assert.notExists(err, "no next error");
                assert.ok(key, "got a key");
                assert.equal(key.toString(), "z", "correct key");
                assert.equal(value.toString(), "from snapshot", "correct value");

                end();
            });
        });
    }));

    it("overwrite key after snapshotting", make((db, it, end) => {
        db.put("z", "not from snapshot", (err) => {
            assert.notExists(err, "no put error");

            it.next((err, key, value) => {
                assert.notExists(err, "no next error");
                assert.ok(key, "got a key");
                assert.equal(key.toString(), "z", "correct key");
                assert.equal(value.toString(), "from snapshot", "correct value");

                end();
            });
        });
    }));

    it("add key after snapshotting that sorts first", make((db, it, end) => {
        db.put("a", "not from snapshot", (err) => {
            assert.notExists(err, "no put error");

            it.next((err, key, value) => {
                assert.notExists(err, "no next error");

                assert.ok(key, "got a key");
                assert.equal(key.toString(), "z", "correct key");
                assert.equal(value.toString(), "from snapshot", "correct value");

                end();
            });
        });
    }));
};

export const tearDown = function (testCommon) {
    it("tearDown", testCommon.tearDown);
};

export const all = function (testCommon) {
    setUp(testCommon);
    snapshot(testCommon);
    tearDown(testCommon);
};
