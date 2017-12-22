const { Memory } = adone.database.level.backend;

const testCommon = require("../testCommon");
const testBuffer = require("./testdata_b64");

describe("database", "level", "backend", "memory", () => {
    const factory = (location, options) => new Memory(location, options);

    require("../common/open").open(factory, testCommon);

    require("../common/del").all(factory, testCommon);

    require("../common/get").all(factory, testCommon);

    require("../common/put").all(factory, testCommon);

    require("../common/put_get_del").all(factory, testCommon, testBuffer);

    require("../common/batch").all(factory, testCommon);
    require("../common/chained_batch").all(factory, testCommon);

    require("../common/iterator").all(factory, testCommon);

    require("../common/ranges").all(factory, testCommon);

    it("test .destroy", async () => {
        const db = new Memory("destroy-test");
        const db2 = new Memory("other-db");
        await db2.put("key2", "value2");
        await db.put("key", "value");
        let value = await db.get("key", { asBuffer: false });
        assert.equal(value, "value", "should have value");
        await db.close();
        await db2.close();
        await Memory.destroy("destroy-test");
        const db3 = new Memory("destroy-test");
        const db4 = new Memory("other-db");
        try {
            value = undefined;
            await db3.get("key");
        } catch (err) {
        }
        assert.undefined(value);
        value = await db4.get("key2", { asBuffer: false });
        assert.equal(value, "value2", "should have value2");
    });

    it("unsorted entry, sorted iterator", async () => {
        const db = new Memory("foo");
        await db.open();
        await db.put("f", "F");
        await db.put("a", "A");
        await db.put("c", "C");
        await db.put("e", "E");
        await db.batch([
            { type: "put", key: "d", value: "D" },
            { type: "put", key: "b", value: "B" },
            { type: "put", key: "g", value: "G" }
        ]);
        const data = await testCommon.collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false }));
        assert.equal(data.length, 7, "correct number of entries");
        const expected = [
            { key: "a", value: "A" },
            { key: "b", value: "B" },
            { key: "c", value: "C" },
            { key: "d", value: "D" },
            { key: "e", value: "E" },
            { key: "f", value: "F" },
            { key: "g", value: "G" }
        ];
        assert.deepEqual(data, expected);
    });

    it("reading while putting", async () => {
        const db = new Memory("foo2");
        await db.open();
        await db.put("f", "F");
        await db.put("c", "C");
        await db.put("e", "E");
        const iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });
        let result = await iterator.next();
        assert.equal(result.key, "c");
        assert.equal(result.value, "C");
        await db.put("a", "A");
        result = await iterator.next();
        assert.equal(result.key, "e");
        assert.equal(result.value, "E");
    });

    it("reading while deleting", async () => {
        const db = new Memory("foo3");
        await db.open();
        await db.put("f", "F");
        await db.put("a", "A");
        await db.put("c", "C");
        await db.put("e", "E");
        const iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });
        let result = await iterator.next();
        assert.equal(result.key, "a");
        assert.equal(result.value, "A");
        await db.del("a");
        result = await iterator.next();
        assert.equal(result.key, "c");
        assert.equal(result.value, "C");
    });

    it("reverse ranges", async () => {
        const db = new Memory("foo4");
        await db.open();
        await db.put("a", "A");
        await db.put("c", "C");
        const iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "b", reverse: true });
        const { key, value } = await iterator.next();
        assert.equal(key, "a");
        assert.equal(value, "A");
    });

    it("no location", async () => {
        const db = new Memory();
        await db.open();
        await db.put("a", "A");
        await db.put("c", "C");
        const iterator = await db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "b", reverse: true });
        const { key, value } = await iterator.next();
        assert.equal(key, "a");
        assert.equal(value, "A");
    });

    it("delete while iterating", async () => {
        const db = new Memory();
        await db.open();
        await db.put("a", "A");
        await db.put("b", "B");
        await db.put("c", "C");
        const iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "a" });
        let result = await iterator.next();
        assert.equal(result.key, "a");
        assert.equal(result.value, "A");
        await db.del("b");
        result = await iterator.next();
        assert.equal(result.key, "b");
        assert.equal(result.value, "B");
    });

    it("iterator with byte range", async () => {
        const db = new Memory();

        await db.open();
        await db.put(Buffer.from("a0", "hex"), "A");

        const iterator = db.iterator({ valueAsBuffer: false, lt: Buffer.from("ff", "hex") });

        const { key, value } = await iterator.next();
        assert.equal(key.toString("hex"), "a0");
        assert.equal(value, "A");
    });

    it("backing rbtree is buffer-aware", async () => {
        const db = new Memory();

        await db.open();

        const one = Buffer.from("80", "hex");
        const two = Buffer.from("c0", "hex");

        assert.ok(two.toString() === one.toString(), "would be equal when not buffer-aware");
        assert.ok(adone.util.ltgt.compare(two, one) > 0, "but greater when buffer-aware");

        await db.put(one, "one");
        let value = await db.get(one, { asBuffer: false });
        assert.equal(value, "one", "value one ok");

        await db.put(two, "two");
        value = await db.get(one, { asBuffer: false });
        assert.equal(value, "one", "value one is the same");
    });

    it("empty value in batch", async () => {
        const db = new Memory();

        await db.open();

        await db.batch([{
            type: "put",
            key: "empty-string",
            value: ""
        }, {
            type: "put",
            key: "empty-buffer",
            value: Buffer.allocUnsafe(0)
        }]);
        let val = await db.get("empty-string");
        assert.deepEqual(val, Buffer.allocUnsafe(0), "empty string");
        val = await db.get("empty-buffer");
        assert.deepEqual(val, Buffer.allocUnsafe(0), "empty buffer");
    });

    it("empty buffer key in batch", async () => {
        const db = new Memory("empty-buffer");

        await db.open();

        try {
            await db.batch([{
                type: "put",
                key: Buffer.allocUnsafe(0),
                value: ""
            }]);
        } catch (err) {
            return;
        }
        assert.fail("Should have thrown");
    });

    it("buffer key in batch", async () => {
        const db = new Memory("buffer-key");

        await db.open();

        await db.batch([{
            type: "put",
            key: Buffer.from("foo", "utf8"),
            value: "val1"
        }]);
        const val = await db.get(Buffer.from("foo", "utf8"), { asBuffer: false });
        assert.deepEqual(val, "val1");
    });

    it("array with holes in batch()", async () => {
        const db = new Memory("holey");

        await db.open();

        await db.batch([{
            type: "put",
            key: "key1",
            value: "val1"
        }, void 0, {
            type: "put",
            key: "key2",
            value: "val2"
        }]);
        let val = await db.get("key1", { asBuffer: false });
        assert.deepEqual(val, "val1");
        val = await db.get("key2", { asBuffer: false });
        assert.deepEqual(val, "val2");
    });

    it("put multiple times", async () => {
        const db = new Memory();

        await db.open();

        await db.put("key", "val");
        await db.put("key", "val2");
        const val = await db.get("key", { asBuffer: false });
        assert.deepEqual(val, "val2");
    });

    it("global store", async () => {
        const db = new Memory("foobar");

        await db.open();

        await db.put("key", "val");
        let val = await db.get("key", { asBuffer: false });
        assert.deepEqual(val, "val");
        const db2 = new Memory("foobar");
        await db2.open();
        val = await db2.get("key", { asBuffer: false });
        assert.deepEqual(val, "val");
        Memory.clearGlobalStore();
        const db3 = new Memory("foobar");
        await db3.open();
        try {
            await db3.get("key", { asBuffer: false });
        } catch (err) {
            return;
        }
        assert.fail("Should have thrown");
    });

    it("global store, strict", async () => {
        const db = new Memory("foobar");

        await db.open();

        await db.put("key", "val");
        let val = await db.get("key", { asBuffer: false });
        assert.deepEqual(val, "val");
        const db2 = new Memory("foobar");
        await db2.open();
        val = await db2.get("key", { asBuffer: false });
        assert.deepEqual(val, "val");
        Memory.clearGlobalStore(true);
        const db3 = new Memory("foobar");
        await db3.open();
        try {
            await db3.get("key", { asBuffer: false });
        } catch (err) {
            return;
        }
        assert.fail("Should have thrown");
    });

    it("call .destroy twice", async () => {
        const db = new Memory("destroy-test");
        const db2 = new Memory("other-db");
        await db2.put("key2", "value2");
        await db.put("key", "value");
        let value = await db.get("key", { asBuffer: false });
        assert.equal(value, "value", "should have value");
        await db.close();
        await db2.close();
        await Memory.destroy("destroy-test");
        await Memory.destroy("destroy-test");
        const db3 = new Memory("destroy-test");
        const db4 = new Memory("other-db");
        try {
            value = await db3.get("key");
        } catch (err) {
            value = await db4.get("key2", { asBuffer: false });
            assert.equal(value, "value2", "should have value2");
            return;
        }
        assert.fail("Should have thrown");
    });
});
