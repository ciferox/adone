const {
    database: { level },
    datastore: { backend: { LevelDatastore } },
    std: { os }
} = adone;

describe("datastore", "backend", "LevelDatastore", () => {
    describe("initialization", () => {
        it("should default to a leveldown database", async () => {
            const levelStore = new LevelDatastore("init-default");
            await levelStore.open();

            expect(levelStore.db.options).to.include({
                createIfMissing: true,
                errorIfExists: false
            });
            expect(levelStore.db.db.codec.opts).to.include({
                valueEncoding: "binary"
            });
        });

        it("should be able to override the database", async () => {
            const levelStore = new LevelDatastore("init-default", {
                db: level.packager(level.backend.Memory),
                createIfMissing: true,
                errorIfExists: true
            });

            await levelStore.open();

            expect(levelStore.db.options).to.include({
                createIfMissing: true,
                errorIfExists: true
            });
        });
    });
    [level.packager(level.backend.Memory), level.packager(level.backend.LevelDB)].forEach((database) => {
        describe(`interface ${database.name}`, () => {
            require("../interface")({
                setup: () => new LevelDatastore(`${os.tmpdir()}/datastore-level-test-${Math.random()}`, { db: database }),
                teardown() { }
            });
        });
    });
});
