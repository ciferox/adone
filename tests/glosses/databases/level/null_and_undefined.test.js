import Manager from "./common";
const { x } = adone;

describe("null & undefined keys & values", () => {
    let manager;
    beforeEach(() => {
        manager = new Manager();
        return manager.setUp();
    });

    afterEach(() => {
        return manager.shutdown();
    });

    describe("null and undefined", () => {
        let _db;
        beforeEach(async () => {
            const db = await Manager.open(manager.cleanupDirs[0] = manager.nextLocation(), { createIfMissing: true });
            manager.closeableDatabases.push(db);
            assert.isTrue(db.isOpen());
            _db = db;
        });

        it("get() with null key causes error", async () => {
            await Manager.shouldThrows(() => _db.get(null), x.Database);
        });

        it("get() with undefined key causes error", async () => {
            await Manager.shouldThrows(() => _db.get(undefined), x.Database);
        });

        it("del() with null key causes error", async () => {
            await Manager.shouldThrows(() => _db.del(null), x.Database);
        });

        it("del() with undefined key causes error", async () => {
            await Manager.shouldThrows(() => _db.del(undefined), x.Database);
        });

        it("put() with null key causes error", async () => {
            await Manager.shouldThrows(() => _db.put(null, "foo"), x.Database);
        });

        it("put() with undefined key causes error", async () => {
            await Manager.shouldThrows(() => _db.put(undefined, "foo"), x.Database);
        });

        it("put() with null value works", async () => {
            await _db.put("foo", null);
        });

        it("put() with undefined value works", async () => {
            await _db.put("foo", undefined);
        });

        it("batch() with undefined value works", async () => {
            await _db.batch([{ key: "foo", value: undefined, type: "put" }]);
        });

        it("batch() with null value works", async () => {
            await _db.batch([{ key: "foo", value: null, type: "put" }]);
        });

        it("batch() with undefined key causes error", async () => {
            await Manager.shouldThrows(() => _db.batch([{ key: undefined, value: "bar", type: "put" }]), x.Database);
        });

        it("batch() with null key causes error", async () => {
            await Manager.shouldThrows(() => _db.batch([{ key: null, value: "bar", type: "put" }]), x.Database);
        });
    });
});
