const { levelup } = adone.database;
const errors = levelup.errors;
const common = require("./common");
const refute = require("referee").refute;

describe("null & undefined keys & values", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    describe("null and undefined", () => {
        let _db;
        beforeEach((done) => {
            levelup(ctx.cleanupDirs[0] = common.nextLocation(), { createIfMissing: true }, (err, db) => {
                refute(err); // sanity
                ctx.closeableDatabases.push(db);
                assert.isTrue(db.isOpen());
                _db = db;
                done();
            });
        });

        it("get() with null key causes error", (done) => {
            _db.get(null, (err, value) => {
                refute(value);
                assert.instanceOf(err, Error);
                assert.instanceOf(err, errors.LevelUPError);
                done();
            });
        });

        it("get() with undefined key causes error", (done) => {
            _db.get(undefined, (err, value) => {
                refute(value);
                assert.instanceOf(err, Error);
                assert.instanceOf(err, errors.LevelUPError);
                done();
            });
        });

        it("del() with null key causes error", (done) => {
            _db.del(null, (err, value) => {
                refute(value);
                assert.instanceOf(err, Error);
                assert.instanceOf(err, errors.LevelUPError);
                done();
            });
        });

        it("del() with undefined key causes error", (done) => {
            _db.del(undefined, (err, value) => {
                refute(value);
                assert.instanceOf(err, Error);
                assert.instanceOf(err, errors.LevelUPError);
                done();
            });
        });

        it("put() with null key causes error", (done) => {
            _db.put(null, "foo", (err, value) => {
                refute(value);
                assert.instanceOf(err, Error);
                assert.instanceOf(err, errors.LevelUPError);
                done();
            });
        });

        it("put() with undefined key causes error", (done) => {
            _db.put(undefined, "foo", (err, value) => {
                refute(value);
                assert.instanceOf(err, Error);
                assert.instanceOf(err, errors.LevelUPError);
                done();
            });
        });

        it("put() with null value works", (done) => {
            _db.put("foo", null, (err, value) => {
                refute(err);
                done();
            });
        });

        it("put() with undefined value works", (done) => {
            _db.put("foo", undefined, (err, value) => {
                refute(err);
                done();
            });
        });

        it("batch() with undefined value works", (done) => {
            _db.batch([{ key: "foo", value: undefined, type: "put" }], (err) => {
                refute(err);
                done();
            });
        });

        it("batch() with null value works", (done) => {
            _db.batch([{ key: "foo", value: null, type: "put" }], (err) => {
                refute(err);
                done();
            });
        });

        it("batch() with undefined key causes error", (done) => {
            _db.batch([{ key: undefined, value: "bar", type: "put" }], (err) => {
                assert.instanceOf(err, Error);
                assert.instanceOf(err, errors.LevelUPError);
                done();
            });
        });

        it("batch() with null key causes error", (done) => {
            _db.batch([{ key: null, value: "bar", type: "put" }], (err) => {
                assert.instanceOf(err, Error);
                assert.instanceOf(err, errors.LevelUPError);
                done();
            });
        });
    });
});
