const {
    database: { level: { concatIterator } }
} = adone;

let db;

exports.setUp = function (testCommon) {
    it("setUp common", testCommon.setUp);
    it("setUp db", (done) => {
        db = testCommon.factory();
        db.open(done);
    });
};

exports.args = function (testCommon) {
    it("test argument-less clear() throws", (done) => {
        assert.throws(
            db.clear.bind(db),
            /clear\(\) requires a callback argument/,
            "no-arg clear() throws"
        );
        done();
    });
};

exports.clear = function (testCommon) {
    const makeTest = (type, keys) => {
        it(`test simple clear() on ${type} keys`, (done) => {
            const db = testCommon.factory();
            const ops = keys.map((key) => {
                return { type: "put", key, value: "foo" };
            });

            db.open((err) => {
                assert.notExists(err, "no open error");

                db.batch(ops, (err) => {
                    assert.notExists(err, "no batch error");

                    concatIterator(db.iterator(), (err, entries) => {
                        assert.notExists(err, "no concatIterator error");
                        assert.equal(entries.length, keys.length, "has entries");

                        db.clear((err) => {
                            assert.notExists(err, "no clear error");

                            concatIterator(db.iterator(), (err, entries) => {
                                assert.notExists(err, "no concatIterator error");
                                assert.equal(entries.length, 0, "has no entries");

                                db.close((err) => {
                                    assert.notExists(err, "no close error");
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    };

    makeTest("string", ["a", "b"]);

    if (testCommon.bufferKeys) {
        makeTest("buffer", [Buffer.from("a"), Buffer.from("b")]);
        makeTest("mixed", [Buffer.from("a"), "b"]);

        // These keys would be equal when compared as utf8 strings
        makeTest("non-utf8 buffer", [Buffer.from("80", "hex"), Buffer.from("c0", "hex")]);
    }
};

exports.tearDown = function (testCommon) {
    it("tearDown", (done) => {
        db.close(testCommon.tearDown.bind(null, done));
    });
};

exports.all = function (test, testCommon) {
    exports.setUp(test, testCommon);
    exports.args(test, testCommon);
    exports.clear(test, testCommon);
    exports.tearDown(test, testCommon);
};
