const async = require("async");
const common = require("./common");

const {
    database: { level: { DB, backend: { Memory, Encoding } } }
} = adone;

describe("custom encoding", () => {
    let runTest;
    before((done) => {
        common.commonSetUp(() => {
            runTest = function (testData, assertType, done) {
                const customEncoding = {
                    encode: JSON.stringify,
                    decode: JSON.parse,
                    buffer: false,
                    type: "custom"
                };

                new DB(new Encoding(new Memory(), {
                    keyEncoding: customEncoding,
                    valueEncoding: customEncoding
                }), (err, db) => {
                    assert.notExists(err);
                    if (err) {
                        return;
                    }

                    common.closeableDatabases.push(db);

                    const PUT = testData.map((d) => {
                        return db.put.bind(db, d.key, d.value);
                    });
                    async.parallel(PUT, (err) => {
                        assert.notExists(err);
                        async.forEach(testData, (d, callback) => {
                            db.get(d.key, (err, value) => {
                                if (err) {
                                    console.error(err.stack);
                                }
                                assert.notExists(err);
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

    after((done) => {
        common.commonTearDown(done);
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
            // Test keys that would be considered the same with default utf8 encoding.
            // Because String([1]) === String(1).
            { value: "0", key: [1] },
            { value: "1", key: 1 },
            { value: "string", key: "a string" },
            { value: "true", key: true },
            { value: "false", key: false }
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
            // Test keys that would be considered the same with default utf8 encoding.
            // Because String({}) === String({}) === '[object Object]'.
            {
                value: "0",
                key: {
                    foo: "bar",
                    bar: [1, 2, 3],
                    bang: { yes: true, no: false }
                }
            },
            {
                value: "1",
                key: {
                    foo: "different",
                    bar: [1, 2, 3],
                    bang: { yes: true, no: false }
                }
            }
        ], "deepEqual", done);
    });
});
