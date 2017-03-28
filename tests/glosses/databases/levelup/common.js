const referee = require("referee");
const assert = referee.assert;
const refute = referee.refute;
const crypto = require("crypto");
const async = require("async");
const rimraf = require("rimraf");
const fs = require("fs");
const path = require("path");
const delayed = require("delayed").delayed;
const { levelup } = adone.database;
let dbidx = 0;
let _ctx;

referee.add("isInstanceOf", {
    assert(actual, expected) {
        return actual instanceof expected;
    }
    , refute(actual, expected) {
        return !(actual instanceof expected);
    }
    , assertMessage: "${0} expected to be instance of ${1}"
    , refuteMessage: "${0} expected not to be instance of ${1}"
});

referee.add("isUndefined", {
    assert(actual) {
        return actual === undefined;
    }
    , refute(actual) {
        return actual !== undefined;
    }
    , assertMessage: "${0} expected to be undefined"
    , refuteMessage: "${0} expected not to be undefined"
});

module.exports.nextLocation = function () {
    return path.join(__dirname, `_levelup_test_db_${dbidx++}`);
};

module.exports.cleanup = function (callback) {
    fs.readdir(__dirname, (err, list) => {
        if (err) {
            return callback(err);
        }

        list = list.filter((f) => {
            return (/^_levelup_test_db_/).test(f);
        });

        if (!list.length) {
            return callback();
        }

        let ret = 0;

        list.forEach((f) => {
            rimraf(path.join(__dirname, f), () => {
                if (++ret === list.length) {
                    callback();
                }
            });
        });
    });
};

module.exports.openTestDatabase = function (...args) {
    const options = typeof args[0] === "object" ? args[0] : { createIfMissing: true, errorIfExists: true };
    const callback = typeof args[0] === "function" ? args[0] : args[1];
    const location = typeof args[0] === "string" ? args[0] : module.exports.nextLocation();
    // adone.log(location);
    // adone.log();

    rimraf(location, (err) => {
        refute(err);
        _ctx.cleanupDirs.push(location);
        levelup(location, options, (err, db) => {
            if (err) {
                adone.log(err);
                adone.log();
            }
            refute(err);
            if (!err) {
                _ctx.closeableDatabases.push(db);
                callback(db);
            }
        });
    });
};

module.exports.commonTearDown = function (done) {
    async.forEach(_ctx.closeableDatabases, (db, callback) => {
        db.close(callback);
    }, () => {
        // adone.log("fine");
        // adone.log();
        module.exports.cleanup(done);
    });
};

module.exports.loadBinaryTestData = function (callback) {
    fs.readFile(path.join(__dirname, "data/testdata.bin"), callback);
};

module.exports.binaryTestDataMD5Sum = "920725ef1a3b32af40ccd0b78f4a62fd";

module.exports.checkBinaryTestData = function (testData, callback) {
    const md5sum = crypto.createHash("md5");
    md5sum.update(testData);
    assert.equals(md5sum.digest("hex"), module.exports.binaryTestDataMD5Sum);
    callback();
};

module.exports.commonSetUp = function (ctx, done) {
    _ctx = ctx;
    ctx.cleanupDirs = [];
    ctx.closeableDatabases = [];
    ctx.openTestDatabase = module.exports.openTestDatabase;
    ctx.timeout = 10000;
    module.exports.cleanup(done);
};

module.exports.readStreamSetUp = function (ctx, done) {
    module.exports.commonSetUp(ctx, () => {
        let i;
        let k;

        ctx.dataSpy = spy();
        ctx.endSpy = spy();
        ctx.sourceData = [];

        for (i = 0; i < 100; i++) {
            k = (i < 10 ? "0" : "") + i;
            ctx.sourceData.push({
                type: "put"
                , key: k
                , value: Math.random()
            });
        }

        ctx.verify = delayed((done, data) => {
            if (!data) {
                data = ctx.sourceData;
            } // can pass alternative data array for verification
            assert.equals(ctx.endSpy.callCount, 1, 'ReadStream emitted single "end" event');
            assert.equals(ctx.dataSpy.callCount, data.length, 'ReadStream emitted correct number of "data" events');
            data.forEach((d, i) => {
                const call = ctx.dataSpy.getCall(i);
                if (call) {
                    assert.equals(call.args.length, 1, `ReadStream "data" event #${i} fired with 1 argument`);
                    refute.isNull(call.args[0].key, `ReadStream "data" event #${i} argument has "key" property`);
                    refute.isNull(call.args[0].value, `ReadStream "data" event #${i} argument has "value" property`);
                    assert.equals(call.args[0].key, d.key, `ReadStream "data" event #${i} argument has correct "key"`);
                    assert.equals(Number(call.args[0].value), Number(d.value), `ReadStream "data" event #${i} argument has correct "value"`
                    );
                }
            });
            done();
        }, 0.05);

        done();
    });
};
