import Manager from "./common";

describe("JSON API", () => {
    let manager;
    let runTest;
    beforeEach(async () => {
        manager = new Manager();
        await manager.setUp();
        runTest = async (testData, assertType) => {
            const location = manager.nextLocation();
            manager.cleanupDirs.push(location);
            const db = await Manager.open(location, { createIfMissing: true, errorIfExists: true, valueEncoding: { encode: JSON.stringify, decode: JSON.parse } });
            manager.closeableDatabases.push(db);
            const promises = testData.map((d) => db.put(d.key, d.value));
            await Promise.all(promises);
            for (const d of testData) {
                const value = await db.get(d.key);
                assert[assertType](d.value, value);
            }
        };
    });

    afterEach(() => {
        return manager.shutdown();
    });

    it('simple-object values in "json" encoding', () => {
        return runTest([
            { key: "0", value: 0 },
            { key: "1", value: 1 },
            { key: "string", value: "a string" },
            { key: "true", value: true },
            { key: "false", value: false }
        ], "equal");
    });

    it('simple-object keys in "json" encoding', () => {
        return runTest([
            { value: "0", key: 0 },
            { value: "1", key: 1 },
            { value: "string", key: "a string" },
            { value: "true", key: true },
            { value: "false", key: false }
        ], "equal");
    });

    it('complex-object values in "json" encoding', () => {
        return runTest([
            {
                key: "0", value: {
                    foo: "bar",
                    bar: [1, 2, 3],
                    bang: { yes: true, no: false }
                }
            }
        ], "deepEqual");
    });

    it('complex-object keys in "json" encoding', () => {
        return runTest([
            {
                value: "0", key: {
                    foo: "bar",
                    bar: [1, 2, 3],
                    bang: { yes: true, no: false }
                }
            }
        ], "equal");
    });
});
