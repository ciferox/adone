import Manager from "./common";
const { x } = adone;

describe("Argument checking", () => {
    let manager;
    beforeEach(() => {
        manager = new Manager();
        return manager.setUp();
    });

    afterEach(() => {
        return manager.shutdown();
    });

    it("test get() throwables", async () => {
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.get(), x.DatabaseRead, "get() requires key argument", "no-arg get() throws");
        await Manager.shouldThrows(() => db.get("foo"), x.NotFound, "Key not found in database [foo]", "callback-less, 1-arg get() throws");
    });

    it("test put() throwables", async () => {
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.put(), x.DatabaseWrite, "put() requires a key argument", "no-arg put() throws");
    });

    it("test del() throwables", async () => {   
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.del(), x.DatabaseWrite, "del() requires a key argument", "no-arg del() throws");
    });

    it("test batch() throwables", async () => {
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.batch(null, {}), x.DatabaseWrite, "batch() requires an array argument", "no-arg batch() throws");
        await Manager.shouldThrows(() => db.batch({}), x.DatabaseWrite, "batch() requires an array argument", "1-arg, no Array batch() throws");
    });
});
