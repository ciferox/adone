const common = require("./common");

describe("Argument checking", () => {
    before((done) => {
        common.commonSetUp(done);
    });

    after((done) => {
        common.commonTearDown(done);
    });

    it("test get() throwables", (done) => {
        common.openTestDatabase((db) => {
            assert.throws(() => {
                db.get();
            }, "get() requires a key argument", "no-arg get() throws");
            done();
        });
    });

    it("test put() throwables", (done) => {
        common.openTestDatabase((db) => {
            assert.throws(() => {
                db.put();
            }, "put() requires a key argument", "no-arg put() throws");

            done();
        });
    });

    it("test del() throwables", (done) => {
        common.openTestDatabase((db) => {
            assert.throws(() => {
                db.del();
            }, "del() requires a key argument", "no-arg del() throws");

            done();
        });
    });

    it("test batch() throwables", (done) => {
        common.openTestDatabase((db) => {
            assert.throws(() => {
                db.batch(null, {});
            }, "batch() requires an array argument", "no-arg batch() throws");

            assert.throws(() => {
                db.batch({});
            }, "batch() requires an array argument", "1-arg, no Array batch() throws");

            done();
        });
    });
});
