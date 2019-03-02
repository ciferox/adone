const {
    is
} = adone;

export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
};

export const sequence = function (testCommon) {
    const make = function (name, testFn) {
        it(name, (dn) => {
            const db = testCommon.factory();
            const done = function (err) {
                assert.notExists(err, "no error from done()");

                db.close((err) => {
                    assert.notExists(err, "no error from close()");
                    dn();
                });
            };

            db.open((err) => {
                assert.notExists(err, "no error from open()");
                testFn(db, done);
            });
        });
    };

    make("iterator#seek() throws if next() has not completed", (db, done) => {
        const ite = db.iterator();
        let error;
        let async = false;

        ite.next((err, key, value) => {
            assert.notExists(err, "no error from next()");
            assert.ok(async, "next is asynchronous");
            ite.end(done);
        });

        async = true;

        try {
            ite.seek("two");
        } catch (err) {
            error = err.message;
        }

        assert.equal(error, "cannot call seek() before next() has completed", "got error");
    });

    make("iterator#seek() throws after end()", (db, done) => {
        const ite = db.iterator();

        // TODO: why call next? Can't we end immediately?
        ite.next((err, key, value) => {
            assert.notExists(err, "no error from next()");

            ite.end((err) => {
                assert.notExists(err, "no error from end()");
                let error;

                try {
                    ite.seek("two");
                } catch (err) {
                    error = err.message;
                }

                assert.equal(error, "cannot call seek() after end()", "got error");
                done();
            });
        });
    });
};

export const seek = function (testCommon) {
    const make = function (name, testFn) {
        it(name, (dn) => {
            const db = testCommon.factory();
            const done = function (err) {
                assert.notExists(err, "no error from done()");

                db.close((err) => {
                    assert.notExists(err, "no error from close()");
                    dn();
                });
            };

            db.open((err) => {
                assert.notExists(err, "no error from open()");

                db.batch([
                    { type: "put", key: "one", value: "1" },
                    { type: "put", key: "two", value: "2" },
                    { type: "put", key: "three", value: "3" }
                ], (err) => {
                    assert.notExists(err, "no error from batch()");
                    testFn(db, done);
                });
            });
        });
    };

    make("iterator#seek() to string target", (db, done) => {
        const ite = db.iterator();
        ite.seek("two");
        ite.next((err, key, value) => {
            assert.notExists(err, "no error");
            assert.equal(key.toString(), "two", "key matches");
            assert.equal(value.toString(), "2", "value matches");
            ite.next((err, key, value) => {
                assert.notExists(err, "no error");
                assert.isUndefined(key, "end of iterator");
                assert.isUndefined(value, "end of iterator");
                ite.end(done);
            });
        });
    });

    if (testCommon.bufferKeys) {
        make("iterator#seek() to buffer target", (db, done) => {
            const ite = db.iterator();
            ite.seek(Buffer.from("two"));
            ite.next((err, key, value) => {
                assert.notExists(err, "no error from next()");
                assert.equal(key.toString(), "two", "key matches");
                assert.equal(value.toString(), "2", "value matches");
                ite.next((err, key, value) => {
                    assert.notExists(err, "no error from next()");
                    assert.equal(key, undefined, "end of iterator");
                    assert.equal(value, undefined, "end of iterator");
                    ite.end(done);
                });
            });
        });
    }

    make("iterator#seek() on reverse iterator", (db, done) => {
        const ite = db.iterator({ reverse: true, limit: 1 });
        ite.seek("three!");
        ite.next((err, key, value) => {
            assert.notExists(err, "no error");
            assert.equal(key.toString(), "three", "key matches");
            assert.equal(value.toString(), "3", "value matches");
            ite.end(done);
        });
    });

    make("iterator#seek() to out of range target", (db, done) => {
        const ite = db.iterator();
        ite.seek("zzz");
        ite.next((err, key, value) => {
            assert.notExists(err, "no error");
            assert.equal(key, undefined, "end of iterator");
            assert.equal(value, undefined, "end of iterator");
            ite.end(done);
        });
    });

    make("iterator#seek() on reverse iterator to out of range target", (db, done) => {
        const ite = db.iterator({ reverse: true });
        ite.seek("zzz");
        ite.next((err, key, value) => {
            assert.notExists(err, "no error");
            assert.equal(key.toString(), "two");
            assert.equal(value.toString(), "2");
            ite.end(done);
        });
    });

    it("iterator#seek() respects range", (dn) => {
        const db = testCommon.factory();

        db.open((err) => {
            assert.notExists(err, "no error from open()");

            // Can't use Array.fill() because IE
            const ops = [];

            for (let i = 0; i < 10; i++) {
                ops.push({ type: "put", key: String(i), value: String(i) });
            }

            db.batch(ops, (err) => {
                assert.notExists(err, "no error from batch()");

                let pending = 0;

                const done = function () {
                    db.close((err) => {
                        assert.notExists(err, "no error from close()");
                        dn();
                    });
                };

                const expect = function (range, target, expected) {
                    pending++;
                    const ite = db.iterator(range);

                    ite.seek(target);
                    ite.next((err, key, value) => {
                        assert.notExists(err, "no error from next()");

                        const json = JSON.stringify(range);
                        const msg = `seek(${target}) on ${json} yields ${expected}`;

                        if (is.undefined(expected)) {
                            assert.equal(value, undefined, msg);
                        } else {
                            assert.equal(value.toString(), expected, msg);
                        }

                        ite.end((err) => {
                            assert.notExists(err, "no error from end()");
                            if (!--pending) {
                                done();
                            }
                        });
                    });
                };

                expect({ gt: "5" }, "4", undefined);
                expect({ gt: "5" }, "5", undefined);
                expect({ gt: "5" }, "6", "6");

                expect({ gte: "5" }, "4", undefined);
                expect({ gte: "5" }, "5", "5");
                expect({ gte: "5" }, "6", "6");

                expect({ start: "5" }, "4", undefined);
                expect({ start: "5" }, "5", "5");
                expect({ start: "5" }, "6", "6");

                expect({ lt: "5" }, "4", "4");
                expect({ lt: "5" }, "5", undefined);
                expect({ lt: "5" }, "6", undefined);

                expect({ lte: "5" }, "4", "4");
                expect({ lte: "5" }, "5", "5");
                expect({ lte: "5" }, "6", undefined);

                expect({ end: "5" }, "4", "4");
                expect({ end: "5" }, "5", "5");
                expect({ end: "5" }, "6", undefined);

                expect({ lt: "5", reverse: true }, "4", "4");
                expect({ lt: "5", reverse: true }, "5", undefined);
                expect({ lt: "5", reverse: true }, "6", undefined);

                expect({ lte: "5", reverse: true }, "4", "4");
                expect({ lte: "5", reverse: true }, "5", "5");
                expect({ lte: "5", reverse: true }, "6", undefined);

                expect({ start: "5", reverse: true }, "4", "4");
                expect({ start: "5", reverse: true }, "5", "5");
                expect({ start: "5", reverse: true }, "6", undefined);

                expect({ gt: "5", reverse: true }, "4", undefined);
                expect({ gt: "5", reverse: true }, "5", undefined);
                expect({ gt: "5", reverse: true }, "6", "6");

                expect({ gte: "5", reverse: true }, "4", undefined);
                expect({ gte: "5", reverse: true }, "5", "5");
                expect({ gte: "5", reverse: true }, "6", "6");

                expect({ end: "5", reverse: true }, "4", undefined);
                expect({ end: "5", reverse: true }, "5", "5");
                expect({ end: "5", reverse: true }, "6", "6");

                expect({ gt: "7", lt: "8" }, "7", undefined);
                expect({ gte: "7", lt: "8" }, "7", "7");
                expect({ gte: "7", lt: "8" }, "8", undefined);
                expect({ gt: "7", lte: "8" }, "8", "8");
            });
        });
    });
};

export const tearDown = function (testCommon) {
    it("tearDown", testCommon.tearDown);
};

export const all = function (testCommon) {
    setUp(testCommon);
    sequence(testCommon);
    seek(testCommon);
    tearDown(testCommon);
};
