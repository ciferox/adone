const async = require("async");
const concat = require("concat-stream");
const common = require("./common");

const {
    database: { level: { DB, backend: { Memory, Encoding } } }
} = adone;

describe("JSON encoding", () => {
    let runTest;

    before((done) => {
        common.commonSetUp(() => {
            runTest = function (testData, assertType, done) {
                new DB(new Encoding(new Memory(), {
                    keyEncoding: "json",
                    valueEncoding: "json"
                }), (err, db) => {
                    assert.notExists(err);
                    if (err) {
                        return;
                    }

                    common.closeableDatabases.push(db);

                    const PUT = testData.map((d) => {
                        return db.put.bind(db, d.key, d.value);
                    });

                    const testGet = function (next) {
                        async.forEach(testData, (d, callback) => {
                            db.get(d.key, (err, value) => {
                                if (err) {
                                    console.error(err.stack);
                                }
                                assert.notExists(err);
                                assert[assertType](d.value, value);
                                callback();
                            });
                        }, next);
                    };

                    const testStream = function (next) {
                        db.createReadStream().pipe(concat((result) => {
                            assert.deepEqual(result, testData);
                            next();
                        }));
                    };

                    async.parallel(PUT, (err) => {
                        assert.notExists(err);
                        async.parallel([testGet, testStream], done);
                    });
                });
            };
            done();
        });
    });

    after((done) => {
        common.commonTearDown(done);
    });

    it('simple-object values in "json" encoding', (done) => {
        runTest([
            { key: "0", value: 0 },
            { key: "1", value: 1 },
            { key: "2", value: "a string" },
            { key: "3", value: true },
            { key: "4", value: false }
        ], "equal", done);
    });

    it('simple-object keys in "json" encoding', (done) => {
        runTest([
            { value: "string", key: "a string" },
            { value: "0", key: 0 },
            { value: "1", key: 1 },
            { value: "false", key: false },
            { value: "true", key: true }
        ], "deepEqual", done);
    });

    it('complex-object values in "json" encoding', (done) => {
        runTest([
            {
                key: "0",
                value: {
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
                value: "0",
                key: {
                    foo: "bar",
                    bar: [1, 2, 3],
                    bang: { yes: true, no: false }
                }
            }
        ], "deepEqual", done);
    });
});
