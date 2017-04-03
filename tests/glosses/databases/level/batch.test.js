import Manager from "./common";
const { x, database: { level: { Batch } } } = adone;

describe("batch()", () => {
    let manager;
    beforeEach(() => {
        manager = new Manager();
        return manager.setUp();
    });

    afterEach(() => {
        return manager.shutdown();
    });

    it("batch() with multiple puts", async () => {
        const db = await manager.openTestDatabase();
        await db.batch([
            { type: "put", key: "foo", value: "afoovalue" },
            { type: "put", key: "bar", value: "abarvalue" },
            { type: "put", key: "baz", value: "abazvalue" }
        ]);
        for (const key of ["foo", "bar", "baz"]) {
            const value = await db.get(key);
            assert.equal(value, `a${key}value`);
        }
    });

    it("batch() no type set defaults to put", async () => {
        const db = await manager.openTestDatabase();
        await db.batch([
            { key: "foo", value: "afoovalue" },
            { key: "bar", value: "abarvalue" },
            { key: "baz", value: "abazvalue" }
        ]);

        for (const key of ["foo", "bar", "baz"]) {
            const value = await db.get(key);
            assert.equal(value, `a${key}value`);
        }
    });

    it("batch() with multiple puts and deletes", async () => {
        const db = await manager.openTestDatabase();
        await db.batch([
            { type: "put", key: "1", value: "one" },
            { type: "put", key: "2", value: "two" },
            { type: "put", key: "3", value: "three" }
        ]);
        await db.batch([
            { type: "put", key: "foo", value: "afoovalue" },
            { type: "del", key: "1" },
            { type: "put", key: "bar", value: "abarvalue" },
            { type: "del", key: "foo" },
            { type: "put", key: "baz", value: "abazvalue" }
        ]);

        // these should exist
        for (const key of ["2", "3", "bar", "baz"]) {
            const value = await db.get(key);
            assert.isNotNull(value);
        }

        // these shouldn't exist
        for (const key of ["1", "foo"]) {
            Manager.shouldThrows(() => db.get(key), x.NotFound);
        }
    });

    it("batch() with chained interface", async () => {
        const db = await manager.openTestDatabase();
        await db.put("1", "one");
        const batch = new Batch(db);
        await batch.put("one", "1")
            .del("two")
            .put("three", "3")
            .clear()
            .del("1")
            .put("2", "two")
            .put("3", "three")
            .del("3")
            .write();
        for (const key of ["one", "three", "1", "2", "3"]) {
            let thrown = false;
            try {
                const value = await db.get(key);
            } catch (err) {
                thrown = true;
            }

            if (["one", "three", "1", "3"].indexOf(key) > -1 && !thrown) {
                assert.fail("Should throws NotFound");
            } else if (key === "2" && thrown) {
                assert.fail("Should not throw NotFound");
            }
        }
    });

    it("batch() exposes ops queue length", async () => {
        const db = await manager.openTestDatabase();
        const batch = new Batch(db);
        batch.put("one", "1")
            .del("two")
            .put("three", "3");
        assert.equal(batch.length, 3);
        batch.clear();
        assert.equal(batch.length, 0);
        batch
            .del("1")
            .put("2", "two")
            .put("3", "three")
            .del("3");
        assert.equal(batch.length, 4);
    });

    it("batch() with can manipulate data from put()", async () => {
        // checks encoding and whatnot
        const db = await manager.openTestDatabase();
        await db.put("1", "one");
        await db.put("2", "two");
        await db.put("3", "three");
        await db.batch([
            { type: "put", key: "foo", value: "afoovalue" },
            { type: "del", key: "1" },
            { type: "put", key: "bar", value: "abarvalue" },
            { type: "del", key: "foo" },
            { type: "put", key: "baz", value: "abazvalue" }
        ]);

        // these should exist
        for (const key of ["2", "3", "bar", "baz"]) {
            const value = await db.get(key);
            assert.isNotNull(value);
        }
        // these shouldn't exist
        for (const key of ["1", "foo"]) {
            Manager.shouldThrows(() => db.get(key), x.NotFound);
        }
    });

    it("batch() data can be read with get() and del()", async () => {
        const db = await manager.openTestDatabase();
        await db.batch([
            { type: "put", key: "1", value: "one" },
            { type: "put", key: "2", value: "two" },
            { type: "put", key: "3", value: "three" }
        ]);
        await db.del("1");
        // these should exist
        for (const key of ["2", "3"]) {
            const value = await db.get(key);
            assert.isNotNull(value);
        }
        // this shouldn't exist
        await Manager.shouldThrows(() => db.get("1"), x.NotFound);
    });

    describe("chained batch() arguments", () => {
        let _db;
        let _batch;
        beforeEach(async () => {
            _db = await manager.openTestDatabase();
            _batch = new Batch(_db);
        });

        it("test batch#put() with missing `value`", () => {
            // value = undefined
            _batch.put("foo1");
            _batch.put("foo1", null);
        });

        it("test batch#put() with missing `key`", () => {
            // key = undefined
            assert.throws(() => _batch.put(undefined, "foo1"), x.DatabaseWrite, "key cannot be `null` or `undefined`");

            // key = null
            assert.throws(() => _batch.put(null, "foo1"), x.DatabaseWrite, "key cannot be `null` or `undefined`");
        });

        it("test batch#put() with missing `key` and `value`", () => {
            // undefined
            assert.throws(() => _batch.put(), x.DatabaseWrite, "key cannot be `null` or `undefined`");

            // null
            assert.throws(() => _batch.put(null, null), x.DatabaseWrite, "key cannot be `null` or `undefined`");
        });

        it("test batch#del() with missing `key`", () => {
            // key = undefined
            assert.throws(() => _batch.del(undefined, "foo1"), x.DatabaseWrite, "key cannot be `null` or `undefined`");

            // key = null
            assert.throws(() => _batch.del(null, "foo1"), x.DatabaseWrite, "key cannot be `null` or `undefined`");
        });

        describe("test batch operations after write()", () => {
            beforeEach(async () => {
                await _batch.put("foo", "bar").put("boom", "bang").del("foo").write();
                manager.verify = (cb) => Manager.shouldThrows(cb, x.DatabaseWrite, "write() already called on this batch");
            });

            it("test put()", () => {
                manager.verify(() => _batch.put("whoa", "dude"));
            });

            it("test del()", () => {
                manager.verify(() => _batch.del("foo"));
            });

            it("test clear()", () => {
                manager.verify(() => _batch.clear());
            });

            it("test write()", () => {
                manager.verify(() => _batch.write());
            });
        });
    });
});
