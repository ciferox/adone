const { levelup } = adone.database;
const async = require("async");
const common = require("./common");
const refute = require("referee").refute;

describe("JSON API", () => {
    let ctx;
    let runTest;
    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, () => {
            runTest = function (testData, assertType, done) {
                const location = common.nextLocation();
                ctx.cleanupDirs.push(location);
                levelup(location, { createIfMissing: true, errorIfExists: true, valueEncoding: { encode: JSON.stringify, decode: JSON.parse } }, (err, db) => {
                    refute(err);
                    if (err) {
                        return;
                    }

                    ctx.closeableDatabases.push(db);

                    async.parallel(testData.map((d) => {
                        return db.put.bind(db, d.key, d.value);
                    }), (err) => {
                        refute(err);

                        async.forEach(
                            testData
                            , (d, callback) => {
                                db.get(d.key, (err, value) => {
                                    if (err) {
                                        console.error(err.stack);
                                    }
                                    refute(err);
                                    assert[assertType](d.value, value);
                                    callback();
                                });
                            }
                            , done
                        );
                    });
                });
            };
            done();
        });
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it('simple-object values in "json" encoding', (done) => {
        runTest([
            { key: "0", value: 0 }
            , { key: "1", value: 1 }
            , { key: "string", value: "a string" }
            , { key: "true", value: true }
            , { key: "false", value: false }
        ], "equal", done);
    });

    it('simple-object keys in "json" encoding', (done) => {
        runTest([
            { value: "0", key: 0 }
            , { value: "1", key: 1 }
            , { value: "string", key: "a string" }
            , { value: "true", key: true }
            , { value: "false", key: false }
        ], "equal", done);
    });

    it('complex-object values in "json" encoding', (done) => {
        runTest([
            {
                key: "0", value: {
                    foo: "bar"
                    , bar: [1, 2, 3]
                    , bang: { yes: true, no: false }
                }
            }
        ], "deepEqual", done);
    });

    it('complex-object keys in "json" encoding', (done) => {
        runTest([
            {
                value: "0", key: {
                    foo: "bar"
                    , bar: [1, 2, 3]
                    , bang: { yes: true, no: false }
                }
            }
        ], "equal", done);
    });
});
