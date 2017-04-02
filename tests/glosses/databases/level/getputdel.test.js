import Manager from "./common";
const { x } = adone;

describe("get() / put() / del()", () => {
    let manager;
    beforeEach(() => {
        manager = new Manager();
        return manager.setUp();
    });

    afterEach(() => {
        return manager.shutdown();
    });

    describe("Simple operations", () => {
        it("get() on empty database causes error", async () => {
            const db = await manager.openTestDatabase();
            try {
                const value = await db.get("undefkey");
            } catch (err) {
                assert.instanceOf(err, Error);
                assert.instanceOf(err, x.Exception);
                assert.instanceOf(err, x.NotFound);
                assert.match(err, /[undefkey]/);
                return;
            }
            assert.fail("Should throws NotFound");
        });

        it("put() and get() simple string key/value pairs", async () => {
            const db = await manager.openTestDatabase();
            await db.put("some key", "some value stored in the database");
            const value = await db.get("some key");
            assert.equal(value, "some value stored in the database");
        });

        it("del() on empty database doesn't cause error", async () => {
            const db = await manager.openTestDatabase();
            await db.del("undefkey");
        });

        it("del() works on real entries", async () => {
            const db = await manager.openTestDatabase();
            for (const key of ["foo", "bar", "baz"]) {
                await db.put(key, 1 + Math.random());
            }

            await db.del("bar");
            for (const key of ["foo", "bar", "baz"]) {
                
                // we should get foo & baz but not bar
                if (key === "bar") {
                    await Manager.shouldThrows(() => db.get(key), x.NotFound);
                } else {
                    await db.get(key);
                }
            }
        });
    });

    it("test get() throwables", async () => {
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.get(), x.DatabaseRead, "get() requires key argument", "no-arg get() throws");
    });

    it("test put() throwables", async () => {
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.put(), x.DatabaseWrite, "put() requires a key argument", "no-arg put() throws");
    });

    it("test del() throwables", async () => {
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.del(), x.DatabaseWrite, "del() requires a key argument", "no-arg del() throws");
    });
});
