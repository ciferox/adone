import Manager from "./common";
const { x: { LevelUPError, ReadError, WriteError, NotFoundError } } = adone.database.level;

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
                assert.instanceOf(err, LevelUPError);
                assert.instanceOf(err, NotFoundError);
                assert(err.notFound === true, "err.notFound is `true`");
                assert.equal(err.status, 404, "err.status is 404");
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
                    await Manager.shouldThrows(() => db.get(key), NotFoundError);
                } else {
                    await db.get(key);
                }
            }
        });
    });

    it("test get() throwables", async () => {
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.get(), ReadError, "get() requires key argument", "no-arg get() throws");
    });

    it("test put() throwables", async () => {
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.put(), WriteError, "put() requires a key argument", "no-arg put() throws");
    });

    it("test del() throwables", async () => {
        const db = await manager.openTestDatabase();
        await Manager.shouldThrows(() => db.del(), WriteError, "del() requires a key argument", "no-arg del() throws");
    });
});
