const { levelup } = adone.database;
const common = require("./common");
const refute = require("referee").refute;

describe("Deferred open() is patch-safe", () => {
    let ctx;

    function test(fun) {
        return function (done) {
            const location = common.nextLocation();
            // 1) open database without callback, opens in worker thread 
            const db = levelup(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });

            ctx.closeableDatabases.push(db);
            ctx.cleanupDirs.push(location);
            assert.isObject(db);
            assert.equal(db.location, location);

            fun(db, done);
            // we should still be in a state of limbo down here, not opened or closed, but 'new'
            refute(db.isOpen());
            refute(db.isClosed());
        };
    }
    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("put() on pre-opened database", test((db, done) => {
        const put = db.put;
        let called = 0;

        db.put = function () {
            called++;
            return put.apply(this, arguments);
        };

        db.put("key", "VALUE", () => {
            assert.equal(called, 1);
            done();
        });
    }));
    it("del() on pre-opened database", test((db, done) => {
        const del = db.del;
        let called = 0;

        db.del = function () {
            called++;
            return del.apply(this, arguments);
        };

        db.del("key", () => {
            assert.equal(called, 1);
            done();
        });
    }));

    it("batch() on pre-opened database", test((db, done) => {
        const batch = db.batch;
        let called = 0;

        db.batch = function () {
            called++;
            return batch.apply(this, arguments);
        };

        db.batch([
            { key: "key", value: "v", type: "put" }
            , { key: "key2", value: "v2", type: "put" }
        ], () => {
            assert.equal(called, 1);
            done();
        });
    }));
});
