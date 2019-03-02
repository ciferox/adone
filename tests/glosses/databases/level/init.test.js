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
        assert.isTrue(is.class(DB));
        assert.lengthOf(DB, 3); // db, options & callback arguments
        assert.throws(() => new DB(), adone.error.DatabaseInitializationException); // no db
    });

    it("open and close statuses", (done) => {
        new DB(new Memory(), (err, db) => {
            assert.notExists(err, "no error");
            assert.isTrue(db.isOpen());
            common.closeableDatabases.push(db);
            db.close((err) => {
                assert.notExists(err);

                assert.isFalse(db.isOpen());
                assert.isTrue(db.isClosed());

                new DB(new Memory(), (err, db) => {
                    assert.notExists(err);
                    assert.isObject(db);
                    done();
                });
            });
        });
    });

    it("without callback", (done) => {
        const db = new DB(new Memory());
        common.closeableDatabases.push(db);
        assert.isObject(db);
        db.on("ready", () => {
            assert.isTrue(db.isOpen());
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
