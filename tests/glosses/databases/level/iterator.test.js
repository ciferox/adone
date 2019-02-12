const common = require("./common");

const {
    database: { level: { DB, backend: { Memory } } }
} = adone;

describe("iterator", () => {
    beforeEach((done) => {
        common.commonSetUp(done);
    });


    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("test simple iterator", (done) => {
        const db = new DB(new Memory());
        db.open();
        common.closeableDatabases.push(db);

        db.put("key", "value", (err) => {
            assert.notExists(err);

            const it = db.iterator({
                keyAsBuffer: false,
                valueAsBuffer: false
            });

            it.next((err, key, value) => {
                assert.notExists(err);

                assert.equal(key, "key");
                assert.equal(value, "value");

                it.end(done);
            });
        });
    });
});
