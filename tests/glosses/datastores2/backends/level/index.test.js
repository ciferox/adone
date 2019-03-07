const eachSeries = require("async/eachSeries");

const {
    database: { level },
    datastore2: { backend: { LevelDatastore } }
} = adone;

describe("datastore", "backend", "LevelDatastore", () => {
    describe("initialization", () => {
        it("should default to a leveldown database", (done) => {
            const levelStore = new LevelDatastore("init-default");

            levelStore.open((err) => {
                expect(err).to.not.exist();
                expect(levelStore.db.db.db instanceof level.backend.LevelDB).to.equal(true);
                expect(levelStore.db.options).to.include({
                    createIfMissing: true,
                    errorIfExists: false
                });
                expect(levelStore.db.db.codec.opts).to.include({
                    valueEncoding: "binary"
                });
                done();
            });
        });

        it("should be able to override the database", (done) => {
            const levelStore = new LevelDatastore("init-default", {
                db: level.backend.Memory,
                createIfMissing: true,
                errorIfExists: true
            });

            levelStore.open((err) => {
                expect(err).to.not.exist();
                expect(levelStore.db.db.db instanceof level.backend.Memory).to.equal(true);
                expect(levelStore.db.options).to.include({
                    createIfMissing: true,
                    errorIfExists: true
                });
                done();
            });
        });
    });

    eachSeries([
        level.backend.Memory,
        level.backend.LevelDB
    ], (Database) => {
        describe(`interface-datastore ${Database.name}`, () => {
            require("../interface")({
                setup(callback) {
                    callback(null, new LevelDatastore("datastore-test", { db: Database }));
                },
                teardown(callback) {
                    // memdown.clearGlobalStore();
                    callback();
                }
            });
        });
    }, (err) => {
        expect(err).to.not.exist();
    });
});
