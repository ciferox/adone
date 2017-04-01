import LevelManager from "./common";
// const msgpack = require("msgpack-js");

describe.skip("JSON API", () => {
    let manager;
    let runTest;

    beforeEach((done) => {
        manager = new LevelManager();
        manager.setUp(() => {
            runTest = function (testData, assertType, done) {
                const location = manager.nextLocation();
                manager.cleanupDirs.push(location);
                levelup(location, {
                    createIfMissing: true,
                    errorIfExists: true,
                    valueEncoding: {
                        encode: msgpack.encode,
                        decode: msgpack.decode,
                        buffer: true,
                        type: "msgpack"
                    }
                }, (err, db) => {
                    assert(!err);
                    if (err) {
                        return;
                    }

                    manager.closeableDatabases.push(db);

                    async.parallel(testData.map((d) => {
                        return db.put.bind(db, d.key, d.value);
                    }), (err) => {
                        assert(!err);

                        async.forEach(testData, (d, callback) => {
                            db.get(d.key, (err, value) => {
                                if (err) {
                                    console.error(err.stack)
                                        ;
                                }
                                assert(!err);
                                assert[assertType](d.value, value);
                                callback();
                            });
                        }, done);
                    });
                });
            };
            done();
        });
    });

    afterEach((done) => {
        manager.shutdown(done);
    });

    it('simple-object values in "json" encoding', (done) => {
        runTest([
            { key: "0", value: 0 },
            { key: "1", value: 1 },
            { key: "string", value: "a string" },
            { key: "true", value: true },
            { key: "false", value: false }
        ], "equal", done);
    });

    it('simple-object keys in "json" encoding', (done) => {
        runTest([
            { value: "0", key: 0 },
            { value: "1", key: 1 },
            { value: "string", key: "a string" },
            { value: "true", key: true },
            { value: "false", key: false }
        ], "equal", done);
    });

    it('complex-object values in "json" encoding', (done) => {
        runTest([
            {
                key: "0", value: {
                    foo: "bar",
                    bar: [1, 2, 3],
                    bang: { yes: true, no: false }
                }
            }
        ], "deepEqual", done);
    });

    it('complex-object keys in "json" encoding', (done) => {
        runTest([
            {
                value: "0", key: {
                    foo: "bar",
                    bar: [1, 2, 3],
                    bang: { yes: true, no: false }
                }
            }
        ], "equal", done);
    });
});
