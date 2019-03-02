const common = require("./common");

const {
    database: { level: { DB, backend: { Memory } } }
} = adone;

describe("null & undefined keys & values", () => {
    beforeEach((done) => {
        common.commonSetUp(done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    describe("null and undefined", () => {
        beforeEach((done) => {
            new DB(new Memory(), (err, db) => {
                assert.notExists(err); // sanity
                common.closeableDatabases.push(db);
                assert.isTrue(db.isOpen());
                common.db = db;
                done();
            });
        });

        it("get() with null key causes error", () => {
            assert.throws(() => {
                common.db.get(null);
            }, "get() requires a key argument");
        });

        it("get() with undefined key causes error", () => {
            assert.throws(() => {
                common.db.get(undefined);
            }, "get() requires a key argument");
        });

        it("del() with null key causes error", () => {
            assert.throws(() => {
                common.db.del(null);
            }, "del() requires a key argument");
        });

        it("del() with undefined key causes error", () => {
            assert.throws(() => {
                common.db.del(undefined);
            }, "del() requires a key argument");
        });

        it("put() with null key causes error", () => {
            assert.throws(() => {
                common.db.put(null, "foo");
            }, "put() requires a key argument");
        });

        it("put() with undefined key causes error", () => {
            assert.throws(() => {
                common.db.put(undefined, "foo");
            }, "put() requires a key argument");
        });

        it.todo("put() with null value works", (done) => {
            common.db.put("foo", null, (err, value) => {
                assert.notExists(err);
                done();
            });
        });

        it.todo("put() with undefined value works", (done) => {
            common.db.put("foo", undefined, (err, value) => {
                assert.notExists(err);
                done();
            });
        });

        it.todo("batch() with undefined value works", (done) => {
            common.db.batch([{ key: "foo", value: undefined, type: "put" }], (err) => {
                assert.notExists(err);
                done();
            });
        });

        it.todo("batch() with null value works", (done) => {
            common.db.batch([{ key: "foo", value: null, type: "put" }], (err) => {
                assert.notExists(err);
                done();
            });
        });

        it("batch() with undefined key causes error", (done) => {
            common.db.batch([{ key: undefined, value: "bar", type: "put" }], (err) => {
                assert.instanceOf(err, Error);
                assert.instanceOf(err, adone.error.DatabaseException);
                done();
            });
        });

        it("batch() with null key causes error", (done) => {
            common.db.batch([{ key: null, value: "bar", type: "put" }], (err) => {
                assert.instanceOf(err, Error);
                assert.instanceOf(err, adone.error.DatabaseException);
                done();
            });
        });
    });
});
