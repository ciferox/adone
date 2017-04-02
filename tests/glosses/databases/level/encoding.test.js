import Manager from "./common";
const { x } = adone;

describe("Encoding", () => {
    let manager;
    beforeEach(() => {
        manager = new Manager();
        return manager.streamSetUp();
    });

    afterEach(() => {
        return manager.shutdown();
    });

    it("test safe decode in get()", async () => {
        let db = await manager.openTestDatabase(null, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });
        await db.put("foo", "this {} is [] not : json");
        await db.close();
        db = await Manager.open(db.location, { createIfMissing: false, errorIfExists: false, valueEncoding: "json" });
        await Manager.shouldThrows(() => db.get("foo"), x.Encoding);
        await db.close();
    });

    it("test safe decode in readStream()", async (done) => {
        let db = await manager.openTestDatabase(null, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });
        await db.put("foo", "this {} is [] not : json");
        await db.close();
        const dataSpy = spy();
        const errorSpy = spy();

        db = await Manager.open(db.location, { createIfMissing: false, errorIfExists: false, valueEncoding: "json" });
        db.createReadStream()
            .on("data", dataSpy)
            .on("error", errorSpy)
            .on("close", () => {
                assert.equal(dataSpy.callCount, 0, "no data");
                assert.equal(errorSpy.callCount, 1, "error emitted");
                assert.equal("Encoding", errorSpy.getCall(0).args[0].name);
                db.close().then(done);
            });
    });

    it("test encoding = valueEncoding", async () => {
        // write a value as JSON, read as utf8 and check
        // the fact that we can get with keyEncoding of utf8 should demonstrate that
        // the key is not encoded as JSON
        const db = await manager.openTestDatabase(null, { createIfMissing: true, valueEncoding: "json" });
        await db.put("foo:foo", { bar: "bar" });
        const value = await db.get("foo:foo", { keyEncoding: "utf8", valueEncoding: "utf8" });
        assert.equal(value, '{"bar":"bar"}');
    });

    it("test batch op encoding", async () => {
        const db = await manager.openTestDatabase(null, { createIfMissing: true, valueEncoding: "json" });
        await db.batch([
            {
                type: "put",
                key: new Buffer([1, 2, 3]),
                value: new Buffer([4, 5, 6]),
                keyEncoding: "binary",
                valueEncoding: "binary"
            },
            {
                type: "put",
                key: "string",
                value: "string"
            }
        ], { keyEncoding: "utf8", valueEncoding: "utf8" });
        let val = await db.get(new Buffer([1, 2, 3]), {
            keyEncoding: "binary",
            valueEncoding: "binary"
        });
        assert.equal(val.toString(), "\u0004\u0005\u0006");

        val = await db.get("string", { valueEncoding: "utf8" });
        assert.equal(val, "string");
    });
});
