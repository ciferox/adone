const common = require("./common");

const {
    database: { level: { DB, backend: { Memory } } }
} = adone;

describe("without encoding backend", () => {
    beforeEach((done) => {
        common.commonSetUp(done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("serializes key", (done) => {
        const down = new Memory();

        down._serializeKey = function (key) {
            return key.toUpperCase();
        };

        const db = new DB(down);
        db.open();

        common.closeableDatabases.push(db);

        db.put("key", "value", (err) => {
            assert.notExists(err);

            db.get("KEY", { asBuffer: false }, (err, value) => {
                assert.notExists(err);
                assert.equal(value, "value");
                done();
            });
        });
    });

    it("serializes value", (done) => {
        const down = new Memory();

        down._serializeValue = function (value) {
            return value.toUpperCase();
        };

        const db = new DB(down);
        db.open();

        common.closeableDatabases.push(db);

        db.put("key", "value", (err) => {
            assert.notExists(err);

            db.get("key", { asBuffer: false }, (err, value) => {
                assert.notExists(err);
                assert.equal(value, "VALUE");
                done();
            });
        });
    });
});
