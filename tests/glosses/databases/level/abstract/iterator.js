const {
    is
} = adone;

let db;

export const setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
    it("setUp db", (done) => {
        db = testCommon.factory();
        db.open(() => done());
    });
};

export const args = function (testCommon) {
    it("test iterator has db reference", (done) => {
        const iterator = db.iterator();
        assert.ok(iterator.db === db);
        iterator.end(() => done());
    });

    it("test argument-less iterator#next() throws", (done) => {
        const iterator = db.iterator();
        assert.throws(() => {
            iterator.next();
        }, /next\(\) requires a callback argument/, "no-arg iterator#next() throws");
        iterator.end(() => done());
    });

    it("test argument-less iterator#end() after next() throws", (done) => {
        const iterator = db.iterator();
        iterator.next(() => {
            assert.throws(() => {
                iterator.end();
            }, /end\(\) requires a callback argument/, "no-arg iterator#end() throws");
            iterator.end(() => done());
        });
    });

    it("test argument-less iterator#end() throws", (done) => {
        const iterator = db.iterator();
        assert.throws(() => {
            iterator.end();
        }, /end\(\) requires a callback argument/, "no-arg iterator#end() throws");
        iterator.end(() => done());
    });

    it("test iterator#next returns this", (done) => {
        const iterator = db.iterator();
        const self = iterator.next(() => {});
        assert.ok(iterator === self);
        iterator.end(() => done());
    });
};

export const sequence = function (testCommon) {
    it("test twice iterator#end() callback with error", (done) => {
        const iterator = db.iterator();
        iterator.end((err) => {
            assert.notExists(err);

            let async = false;

            iterator.end((err2) => {
                assert.ok(err2, "returned error");
                assert.equal(err2.name, "Error", "correct error");
                assert.equal(err2.message, "end() already called on iterator");
                assert.ok(async, "callback is asynchronous");
                done();
            });

            async = true;
        });
    });

    it("test iterator#next after iterator#end() callback with error", (done) => {
        const iterator = db.iterator();
        iterator.end((err) => {
            assert.notExists(err);

            let async = false;

            iterator.next((err2) => {
                assert.ok(err2, "returned error");
                assert.equal(err2.name, "Error", "correct error");
                assert.equal(err2.message, "cannot call next() after end()", "correct message");
                assert.ok(async, "callback is asynchronous");
                done();
            });

            async = true;
        });
    });

    it("test twice iterator#next() throws", (done) => {
        const iterator = db.iterator();
        iterator.next((err) => {
            assert.notExists(err);
            iterator.end((err) => {
                assert.notExists(err);
                done();
            });
        });

        let async = false;

        iterator.next((err) => {
            assert.ok(err, "returned error");
            assert.equal(err.name, "Error", "correct error");
            assert.equal(err.message, "cannot call next() before previous next() has completed");
            assert.ok(async, "callback is asynchronous");
        });

        async = true;
    });
};

export const iterator = function (testCommon) {
    it("test simple iterator()", (done) => {
        const data = [
            { type: "put", key: "foobatch1", value: "bar1" },
            { type: "put", key: "foobatch2", value: "bar2" },
            { type: "put", key: "foobatch3", value: "bar3" }
        ];
        let idx = 0;

        db.batch(data, (err) => {
            assert.notExists(err);
            const iterator = db.iterator();

            const next = function () {
                iterator.next(fn);
            };

            const fn = function (err, key, value) {
                assert.notExists(err);
                if (key && value) {
                    assert.ok(is.buffer(key), "key argument is a Buffer");
                    assert.ok(is.buffer(value), "value argument is a Buffer");
                    assert.equal(key.toString(), data[idx].key, "correct key");
                    assert.equal(value.toString(), data[idx].value, "correct value");
                    process.nextTick(next);
                    idx++;
                } else { // end
                    assert.ok(is.undefined(err), "err argument is undefined");
                    assert.ok(is.undefined(key), "key argument is undefined");
                    assert.ok(is.undefined(value), "value argument is undefined");
                    assert.equal(idx, data.length, "correct number of entries");
                    iterator.end(() => {
                        done();
                    });
                }
            };

            next();
        });
    });
};

export const tearDown = function (testCommon) {
    it("tearDown", (done) => {
        db.close(testCommon.tearDown.bind(null, done));
    });
};

export const all = function (testCommon) {
    setUp(testCommon);
    args(testCommon);
    sequence(testCommon);
    iterator(testCommon);
    tearDown(testCommon);
};
