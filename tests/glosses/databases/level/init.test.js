const common = require("./common");

const {
    is,
    database: { level: { DB, backend: { Memory } } }
} = adone;

describe("Init & open()", () => {
    before((done) => {
        common.commonSetUp(done);
    });

    after((done) => {
        common.commonTearDown(done);
    });

    it("new DB()", () => {
        assert.true(is.class(DB));
        assert.lengthOf(DB, 3); // db, options & callback arguments
        assert.throws(() => new DB(), adone.error.DatabaseInitializationException); // no db
    });

    it("open and close statuses", (done) => {
        new DB(new Memory(), (err, db) => {
            assert.notExists(err, "no error");
            assert.true(db.isOpen());
            common.closeableDatabases.push(db);
            db.close((err) => {
                assert.notExists(err);

                assert.false(db.isOpen());
                assert.true(db.isClosed());

                new DB(new Memory(), (err, db) => {
                    assert.notExists(err);
                    assert.object(db);
                    done();
                });
            });
        });
    });

    it("without callback", (done) => {
        const db = new DB(new Memory());
        common.closeableDatabases.push(db);
        assert.object(db);
        db.on("ready", () => {
            assert.true(db.isOpen());
            done();
        });
        db.open();
    });

    it("validate abstract-leveldown", (done) => {
        const down = new Memory();
        Object.defineProperty(down, "status", {
            get() {
                return null;
            },
            set() { }
        });
        try {
            new DB(down);
        } catch (err) {
            assert.equal(err.message, ".status required, old abstract backend");
            return done();
        }
        throw new Error("did not throw");
    });
});
