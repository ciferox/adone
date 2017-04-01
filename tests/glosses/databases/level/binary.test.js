import Manager from "./common";
const { x: { NotFoundError } } = adone.database.level;

describe("Binary API", () => {
    let testData;
    let manager;

    beforeEach(async () => {
        manager = new Manager();
        await manager.setUp();
        testData = await manager.loadBinaryTestData();
    });

    afterEach(() => {
        return manager.shutdown();
    });

    it("sanity check on test data", () => {
        assert.isOk(Buffer.isBuffer(testData));
        manager.checkBinaryTestData(testData);
    });

    it("test put() and get() with binary value {valueEncoding:binary}", async () => {
        const db = await manager.openTestDatabase();
        await db.put("binarydata", testData, { valueEncoding: "binary" });
        const value = await db.get("binarydata", { valueEncoding: "binary" });
        assert(value);
        manager.checkBinaryTestData(value);
    });

    it("test put() and get() with binary value {valueEncoding:binary} on createDatabase()", async () => {
        const db = await manager.openTestDatabase(null, { createIfMissing: true, errorIfExists: true, valueEncoding: "binary" });
        await db.put("binarydata", testData);
        const value = await db.get("binarydata");
        assert(value);
        manager.checkBinaryTestData(value);
    });

    it("test put() and get() with binary key {valueEncoding:binary}", async () => {
        const db = await manager.openTestDatabase();
        await db.put(testData, "binarydata", { valueEncoding: "binary" });
        const value = await db.get(testData, { valueEncoding: "binary" });
        assert(value instanceof Buffer, "value is buffer");
        assert.equal(value.toString(), "binarydata");
    });

    it("test put() and get() with binary value {keyEncoding:utf8,valueEncoding:binary}", async () => {
        const db = await manager.openTestDatabase();
        await db.put("binarydata", testData, { keyEncoding: "utf8", valueEncoding: "binary" });
        const value = await db.get("binarydata", { keyEncoding: "utf8", valueEncoding: "binary" });
        assert(value);
        manager.checkBinaryTestData(value);
    });

    it("test put() and get() with binary value {keyEncoding:utf8,valueEncoding:binary} on createDatabase()", async () => {
        const db = await manager.openTestDatabase(null, { createIfMissing: true, errorIfExists: true, keyEncoding: "utf8", valueEncoding: "binary" });
        await db.put("binarydata", testData);
        const value = await db.get("binarydata");
        assert(value);
        manager.checkBinaryTestData(value);
    });

    it("test put() and get() with binary key {keyEncoding:binary,valueEncoding:utf8}", async () => {
        const db = await manager.openTestDatabase();
        await db.put(testData, "binarydata", { keyEncoding: "binary", valueEncoding: "utf8" });
        const value = await db.get(testData, { keyEncoding: "binary", valueEncoding: "utf8" });
        assert.equal(value, "binarydata");
    });

    it("test put() and get() with binary key & value {valueEncoding:binary}", async () => {
        const db = await manager.openTestDatabase();
        await db.put(testData, testData, { valueEncoding: "binary" });
        const value = await db.get(testData, { valueEncoding: "binary" });
        manager.checkBinaryTestData(value);
    });

    it("test put() and del() and get() with binary key {valueEncoding:binary}", async () => {
        const db = await manager.openTestDatabase();
        await db.put(testData, "binarydata", { valueEncoding: "binary" });
        await db.del(testData, { valueEncoding: "binary" });
        Manager.shouldThrows(() => db.get(testData, { valueEncoding: "binary" }), NotFoundError);
    });

    it("batch() with multiple puts", async () => {
        const db = await manager.openTestDatabase();
        await db.batch([
            { type: "put", key: "foo", value: testData },
            { type: "put", key: "bar", value: testData },
            { type: "put", key: "baz", value: "abazvalue" }
        ], { keyEncoding: "utf8", valueEncoding: "binary" });

        for (const key of ["foo", "bar", "baz"]) {
            const value = await db.get(key, { valueEncoding: "binary" });
            if (key === "baz") {
                assert(value instanceof Buffer, "value is buffer");
                assert.equal(value.toString(), `a${key}value`);
            } else {
                manager.checkBinaryTestData(value);
            }
        }
    });
});
