const common = require("./common");

const {
    database: { level: { DB, backend: { Memory } } }
} = adone;

const test = function (fun) {
    return function (done) {
        // 1) open database without callback, opens in next tick
        const db = new DB(new Memory());
        db.open();

        common.closeableDatabases.push(db);
        assert.isObject(db);

        fun(db, done);
        // we should still be in a state of limbo down here, not opened or closed, but 'new'
        assert.isFalse(db.isOpen());
        assert.isFalse(db.isClosed());
    };
};

describe("Deferred open() is patch-safe", () => {
    beforeEach((done) => {
        common.commonSetUp(done);
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
            { key: "key", value: "v", type: "put" },
            { key: "key2", value: "v2", type: "put" }
        ], () => {
            assert.equal(called, 1);
            done();
        });
    }));
});
