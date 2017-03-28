const common = require("./common");
const { levelup } = adone.database;
const { errors } = levelup;

describe("Argument checking", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("test get() throwables", (done) => {
        ctx.openTestDatabase((db) => {
            assert.throws(db.get.bind(db), errors.ReadError, "get() requires key and callback arguments", "no-arg get() throws");
            assert.throws(db.get.bind(db, "foo"), errors.ReadError, "get() requires key and callback arguments", "callback-less, 1-arg get() throws");
            assert.throws(db.get.bind(db, "foo", {}), errors.ReadError, "get() requires key and callback arguments", "callback-less, 2-arg get() throws");

            done();
        });
    });

    it("test put() throwables", (done) => {
        ctx.openTestDatabase((db) => {
            assert.throws(db.put.bind(db), errors.WriteError, "put() requires a key argument", "no-arg put() throws");
            done();
        });
    });

    it("test del() throwables", (done) => {
        ctx.openTestDatabase((db) => {
            assert.throws(db.del.bind(db), errors.WriteError, "del() requires a key argument", "no-arg del() throws");
            done();
        });
    });

    it("test approximateSize() throwables", (done) => {
        ctx.openTestDatabase((db) => {
            assert.throws(db.approximateSize.bind(db), errors.ReadError, "approximateSize() requires start, end and callback arguments", "no-arg approximateSize() throws");

            assert.throws(db.approximateSize.bind(db, "foo"), errors.ReadError, "approximateSize() requires start, end and callback arguments", "callback-less, 1-arg approximateSize() throws");

            assert.throws(db.approximateSize.bind(db, "foo", "bar"), errors.ReadError, "approximateSize() requires start, end and callback arguments", "callback-less, 2-arg approximateSize() throws");

            assert.throws(db.approximateSize.bind(db, "foo", "bar", {}), errors.ReadError, "approximateSize() requires start, end and callback arguments", "callback-less, 3-arg approximateSize(), no cb throws");

            done();
        });
    });

    it("test batch() throwables", (done) => {
        ctx.openTestDatabase((db) => {
            assert.throws(db.batch.bind(db, null, {}), errors.WriteError, "batch() requires an array argument", "no-arg batch() throws");
            assert.throws(db.batch.bind(db, {}), errors.WriteError, "batch() requires an array argument", "1-arg, no Array batch() throws");
            done();
        });
    });
});
