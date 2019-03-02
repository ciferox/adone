const async = require("async");
const du = require("du");
const delayed = require("delayed");
const testCommon = require("./common");

const {
    database: { level: { backend: { LevelDB } } }
} = adone;

const compressableData = Buffer.from(Array.apply(null, Array(1024 * 100)).map(() => {
    return "aaaaaaaaaa";
}).join(""));

const multiples = 10;
const dataSize = compressableData.length * multiples;

const verify = function (location, compression, done) {
    du(location, (err, size) => {
        assert.notExists(err);
        if (compression) {
            assert.isTrue(size < dataSize, `on-disk size (${size}) is less than data size (${dataSize})`);
        } else {
            assert.isTrue(size >= dataSize, `on-disk size (${size}) is greater than data size (${dataSize})`);
        }
        done();
    });
};

// close, open, close again.. 'compaction' is also performed on open()s
const cycle = function (db, compression, callback) {
    const location = db.location;
    db.close((err) => {
        assert.notExists(err);
        db = new LevelDB(location);
        db.open({ errorIfExists: false, compression }, () => {
            assert.notExists(err);
            db.close((err) => {
                assert.notExists(err);
                callback();
            });
        });
    });
};

describe("compression", () => {
    it("set up", testCommon.setUp);

    it("test data is compressed by default (db.put())", (done) => {
        const db = testCommon.factory();
        db.open((err) => {
            assert.notExists(err);
            async.forEach(
                Array.apply(null, Array(multiples)).map((e, i) => {
                    return [i, compressableData];
                }), (args, callback) => {
                    db.put.apply(db, args.concat([callback]));
                }, cycle.bind(null, db, true, delayed.delayed(verify.bind(null, db.location, true, done), 0.01))
            );
        });
    });

    it("test data is not compressed with compression=false on open() (db.put())", (done) => {
        const db = testCommon.factory();
        db.open({ compression: false }, (err) => {
            assert.notExists(err);
            async.forEach(
                Array.apply(null, Array(multiples)).map((e, i) => {
                    return [i, compressableData];
                }), (args, callback) => {
                    db.put.apply(db, args.concat([callback]));
                }, cycle.bind(null, db, false, delayed.delayed(verify.bind(null, db.location, false, done), 0.01))
            );
        });
    });

    it("test data is compressed by default (db.batch())", (done) => {
        const db = testCommon.factory();
        db.open((err) => {
            assert.notExists(err);
            db.batch(
                Array.apply(null, Array(multiples)).map((e, i) => {
                    return { type: "put", key: i, value: compressableData };
                }), cycle.bind(null, db, false, delayed.delayed(verify.bind(null, db.location, false, done), 0.01))
            );
        });
    });
});
