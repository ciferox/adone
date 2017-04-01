import Manager from "./common";
const { x: { NotFoundError }, Batch } = adone.database.level;

describe("Deferred open()", () => {
    let manager;
    beforeEach(() => {
        manager = new Manager();
        return manager.setUp();
    });

    afterEach(() => {
        return manager.shutdown();
    });

    it("put() and get() on pre-opened database", async () => {
        const location = manager.nextLocation();
        const db = await Manager.open(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });

        manager.closeableDatabases.push(db);
        manager.cleanupDirs.push(location);
        assert.isObject(db);
        assert.equal(db.location, location);

        await db.put("k1", "v1");
        await db.put("k2", "v2");
        await db.put("k3", "v3");

        for (const k of [1, 2, 3]) {
            const v = await db.get(`k${k}`);
            assert.equal(v, `v${k}`);
        }
        await Manager.shouldThrows(() => db.get("k4"), NotFoundError);
    });

    it("batch() on pre-opened database", async () => {
        const location = manager.nextLocation();
        const db = await Manager.open(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });

        manager.closeableDatabases.push(db);
        manager.cleanupDirs.push(location);
        assert.isObject(db);
        assert.equal(db.location, location);

        await db.batch([
            { type: "put", key: "k1", value: "v1" },
            { type: "put", key: "k2", value: "v2" },
            { type: "put", key: "k3", value: "v3" }
        ]);

        for (const k of [1, 2, 3]) {
            const v = await db.get(`k${k}`);
            assert.equal(v, `v${k}`);
        }
        await Manager.shouldThrows(() => db.get("k4"), NotFoundError);
    });

    it("chained batch() on pre-opened database", async () => {
        const location = manager.nextLocation();
        const db = await Manager.open(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });
        
        manager.closeableDatabases.push(db);
        manager.cleanupDirs.push(location);
        assert.isObject(db);
        assert.equal(db.location, location);

        const batch = new Batch(db);
        await batch.put("k1", "v1")
            .put("k2", "v2")
            .put("k3", "v3")
            .write();
        
        for (const k of [1, 2, 3]) {
            const v = await db.get(`k${k}`);
            assert.equal(v, `v${k}`);
        }
        await Manager.shouldThrows(() => db.get("k4"), NotFoundError);
    });

    describe("test deferred ReadStream", () => {
        beforeEach(() => {
            return manager.streamSetUp();
        });

        it("simple ReadStream", async (done) => {
            let db = await manager.openTestDatabase();
            const location = db.location;
            await db.batch(manager.sourceData.slice());
            await db.close();

            db = await Manager.open(location, { createIfMissing: false, errorIfExists: false });
            const rs = db.createReadStream();
            rs.on("data", manager.dataSpy);
            rs.on("end", manager.endSpy);
            rs.on("close", manager.verify.bind(this, rs, () => {
                db.close().then(done);
            }));
        });
    });
});
