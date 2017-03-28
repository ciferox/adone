const { levelup } = adone.database;
const async = require("async");
const common = require("./common");
const refute = require("referee").refute;

describe("approximateSize()", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, done);
    });

    afterEach(async (done) => {
        common.commonTearDown(done);
    });

    it("approximateSize() is deprecated", (done) => {
        ctx.openTestDatabase((db) => {
            const error = console.error;
            console.error = function (str) {
                console.error = error;
                assert.isOk(/deprecated/.test(str));
                done();
            };
            db.approximateSize("a", "z", () => { });
        });
    });

    it("approximateSize() works on empty database", (done) => {
        ctx.openTestDatabase((db) => {
            db.approximateSize("a", "z", (err, size) => {
                refute(err); // sanity
                assert.equal(size, 0);
                done();
            });
        });
    });

    it("approximateSize() work on none-empty database", (done) => {
        const location = common.nextLocation();
        let db;

        async.series(
            [
                function (callback) {
                    ctx.openTestDatabase(location, (_db) => {
                        db = _db;
                        callback();
                    });
                }, function (callback) {
                    const batch = [];
                    let i = 0;

                    for (; i < 10; ++i) {
                        batch.push({
                            type: "put", key: String(i), value: "afoovalue"
                        });
                    }
                    db.batch(batch, { sync: true }, callback);
                }, function (callback) {
                    // close db to make sure stuff gets written to disc
                    db.close(callback);
                }, function (callback) {
                    levelup(location, { errorIfExists: false }, (err, _db) => {
                        refute(err);
                        db = _db;
                        callback();
                    });
                }, function (callback) {
                    db.approximateSize("0", "99", (err, size) => {
                        refute(err); // sanity
                        refute.equals(size, 0);
                        callback();
                    });
                }, function (callback) {
                    // close db to make sure stuff gets written to disc
                    db.close(callback);
                }
            ], done
        );
    });
});
