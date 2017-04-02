import Manager from "./common";
const { x, database: { level: { DB, backend: { Memory } } } } = adone;

describe("Init & open()", () => {
    let manager;
    beforeEach(() => {
        manager = new Manager();
        return manager.setUp();
    });

    afterEach(() => {
        return manager.shutdown();
    });

    it("DB", () => {
        assert.throws(() => new DB(), x.DatabaseInitialization); // no location
    });

    it("default options", async () => {
        const location = manager.nextLocation();
        let db = await Manager.open(location, { createIfMissing: true, errorIfExists: true });
        assert.isTrue(db.isOpen());
        manager.closeableDatabases.push(db);
        manager.cleanupDirs.push(location);
        await db.close();
        assert.isFalse(db.isOpen());

        db = await Manager.open(location, { errorIfExists: false });
        assert.isObject(db);
        assert.isTrue(db.options.createIfMissing);
        assert.isFalse(db.options.errorIfExists);
        assert.equal(db.options.keyEncoding, "utf8");
        assert.equal(db.options.valueEncoding, "utf8");
        assert.equal(db.location, location);

        // read-only properties
        try {
            db.location = "foo";
        } catch (err) { /*ignore*/ }
        assert.equal(db.location, location);
        await db.close();
    });

    it("basic options", async () => {
        const location = manager.nextLocation();
        const db = await Manager.open(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "binary" });
        manager.closeableDatabases.push(db);
        manager.cleanupDirs.push(location);
        assert.isObject(db);
        assert.isTrue(db.options.createIfMissing);
        assert.isTrue(db.options.errorIfExists);
        assert.equal(db.options.keyEncoding, "utf8");
        assert.equal(db.options.valueEncoding, "binary");
        assert.equal(db.location, location);

        // read-only properties
        try {
            db.location = "bar";
        } catch (err) { /*ignore*/ }
        assert.equal(db.location, location);

        await db.close();
    });

    it("options with encoding", async () => {
        const location = manager.nextLocation();
        const db = await Manager.open(location, { createIfMissing: true, errorIfExists: true, keyEncoding: "ascii", valueEncoding: "json" });

        manager.closeableDatabases.push(db);
        manager.cleanupDirs.push(location);
        assert.isObject(db);
        assert.isTrue(db.options.createIfMissing);
        assert.isTrue(db.options.errorIfExists);
        assert.equal(db.options.keyEncoding, "ascii");
        assert.equal(db.options.valueEncoding, "json");
        assert.equal(db.location, location);


        // read-only properties
        try {
            db.location = "bar";
        } catch (err) { }
        assert.equal(db.location, location);

        await db.close();
    });

    it("open() with !createIfMissing expects error", async () => {
        try {
            const db = await Manager.open(manager.cleanupDirs[0] = manager.nextLocation(), { createIfMissing: false });
        } catch (err) {
            assert.instanceOf(err, Error);
            assert.instanceOf(err, x.Exception);
            assert.instanceOf(err, x.Database);
            assert.instanceOf(err, x.DatabaseOpen);
            assert(err.notFound === undefined, "err.notFound is `undefined`, should only be on NotFoundError");
        }
    });

    it("open() with createIfMissing expects directory to be created", async () => {
        const db = await Manager.open(manager.cleanupDirs[0] = manager.nextLocation(), { createIfMissing: true });
        manager.closeableDatabases.push(db);        
        assert.isTrue(db.isOpen());
        const stat = await adone.fs.stat(manager.cleanupDirs[0]);
        assert(stat.isDirectory());
        await db.close();
    });

    it("open() with errorIfExists expects error if exists", async () => {
        const db = await Manager.open(manager.cleanupDirs[0] = manager.nextLocation(), { createIfMissing: true });
        manager.closeableDatabases.push(db);
        try {
            await Manager.open(manager.cleanupDirs[0], { errorIfExists: true });
        } catch (err) {
            assert.instanceOf(err, Error);
            assert.instanceOf(err, x.Exception);
            assert.instanceOf(err, x.Database);
            assert.instanceOf(err, x.DatabaseOpen);
            await db.close();
        }
    });

    it("open() with !errorIfExists does not expect error if exists", async () => {
        let db = await Manager.open(manager.cleanupDirs[0] = manager.nextLocation(), { createIfMissing: true });
        manager.closeableDatabases.push(db);
        assert.isTrue(db.isOpen());

        await db.close();
        assert.isFalse(db.isOpen());

        db = await Manager.open(manager.cleanupDirs[0], { errorIfExists: false });
        manager.closeableDatabases.push(db);
        assert.isTrue(db.isOpen());
        await db.close();
    });

    it("constructor with options argument uses factory", async () => {
        const db = await Manager.open({ db: Memory });
        assert.isNull(db.location, "location property is null");
        assert.instanceOf(db.db, Memory);
        assert.equal(db.db.location, "", 'db location property is ""');
        await db.put("foo", "bar");
        const value = await db.get("foo");
        assert.equal(value, "bar", "correct value");
        await db.close();
    });

    it("constructor with only function argument uses factory", async () => {
        const db = await Manager.open(Memory);
        assert.isNull(db.location, "location property is null");
        assert.instanceOf(db.db, Memory);
        assert.equal(db.db.location, "", 'db location property is ""');
        await db.put("foo", "bar");
        const value = await db.get("foo");
        assert.equal(value, "bar", "correct value");
        await db.close();
    });
});
