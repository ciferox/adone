const {
    database: { level: { backend: { Memory } } }
} = adone;

const testCommon = require("../testCommon");

describe("database", "level", "backend", "Memory", () => {
    const factory = () => new Memory();

    require("../abstract/common/open").open(factory, testCommon);

    require("../abstract/common/del").all(factory, testCommon);

    require("../abstract/common/get").all(factory, testCommon);

    require("../abstract/common/put").all(factory, testCommon);

    require("../abstract/common/put_get_del").all(factory, testCommon);

    require("../abstract/common/batch").all(factory, testCommon);
    require("../abstract/common/chained_batch").all(factory, testCommon);

    require("../abstract/common/close").close(factory, testCommon);

    require("../abstract/common/iterator").all(factory, testCommon);
    require("../abstract/common/iterator_range").all(factory, testCommon);

    it("unsorted entry, sorted iterator", async () => {
        const db = new Memory();

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
        const db = new Memory();

        await db.open();

        await db.put("f", "F");
        await db.put("c", "C");
        await db.put("e", "E");

        const iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });
        let result = await iterator.next();
        assert.equal(result.key, "c");
        assert.equal(result.value, "C");
        const p = db.put("a", "A");
        result = await iterator.next();
        assert.equal(result.key, "e");
        assert.equal(result.value, "E");

        await p;
    });

    it("reading while deleting", async () => {
        const db = new Memory();

        await db.open();

        await db.put("f", "F");
        await db.put("a", "A");
        await db.put("c", "C");
        await db.put("e", "E");

        const iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });
        let result = await iterator.next();
        assert.equal(result.key, "a");
        assert.equal(result.value, "A");
        const p = db.del("a");
        result = await iterator.next();
        assert.equal(result.key, "c");
        assert.equal(result.value, "C");

        await p;
    });

    it("reverse ranges", async () => {
        const db = new Memory("foo4");

        await db.open();

        await db.put("a", "A");
        await db.put("c", "C");

        const iterator = db.iterator({
            keyAsBuffer: false,
            valueAsBuffer: false,
            lte: "b",
            reverse: true
        });
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

        const iterator = db.iterator({
            keyAsBuffer: false,
            valueAsBuffer: false,
            gte: "a"
        });
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

        const iterator = db.iterator({
            valueAsBuffer: false,
            lt: Buffer.from("ff", "hex")
        });

        const { key, value } = await iterator.next();
        assert.equal(key.toString("hex"), "a0");
        assert.equal(value, "A");
    });

    it("iterator does not clone buffers", async () => {
        const db = new Memory();
        const buf = Buffer.from("a");

        await db.open();
        await db.put(buf, buf);

        const entries = await testCommon.collectEntries(db.iterator());
        assert.strictEqual(entries[0].key, buf, "key is same buffer");
        assert.strictEqual(entries[0].value, buf, "value is same buffer");
    });

    it("iterator stringifies buffer input", async () => {
        const db = new Memory();

        await db.open();
        await db.put(1, 2);

        const entries = await testCommon.collectEntries(db.iterator());
        assert.deepEqual(entries[0].key, Buffer.from("1"), "key is stringified");
        assert.deepEqual(entries[0].value, Buffer.from("2"), "value is stringified");
    });

    it("backing rbtree is buffer-aware", async () => {
        const db = new Memory();

        await db.open();

        const one = Buffer.from("80", "hex");
        const two = Buffer.from("c0", "hex");

        assert.true(two.toString() === one.toString(), "would be equal when not buffer-aware");
        assert.true(adone.util.ltgt.compare(two, one) > 0, "but greater when buffer-aware");

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

        await assert.throws(async () => db.batch([{
            type: "put",
            key: Buffer.allocUnsafe(0),
            value: ""
        }]));
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

    it("put multiple times", async () => {
        const db = new Memory();

        await db.open();

        await db.put("key", "val");
        await db.put("key", "val2");
        const val = await db.get("key", { asBuffer: false });
        assert.deepEqual(val, "val2");
    });

    const stringBuffer = (value) => Buffer.from(String(value));
    const putKey = (key) => {
        return { type: "put", key, value: "value" };
    };
    const getKey = (entry) => entry.key;

    it("number keys", async () => {
        const db = new Memory();
        const numbers = [2, 12];
        const buffers = numbers.map(stringBuffer);

        await db.open();
        await db.batch(numbers.map(putKey));

        const iterator1 = db.iterator({ keyAsBuffer: false });
        const iterator2 = db.iterator({ keyAsBuffer: true });

        let entries = await testCommon.collectEntries(iterator1);
        assert.deepEqual(entries.map(getKey), numbers, "sorts naturally");

        entries = await testCommon.collectEntries(iterator2);
        assert.deepEqual(entries.map(getKey), buffers, "buffer input is stringified");
    });

    it("date keys", async () => {
        const db = new Memory();
        const dates = [new Date(0), new Date(1)];
        const buffers = dates.map(stringBuffer);

        await db.open();
        await db.batch(dates.map(putKey));

        const iterator = db.iterator({ keyAsBuffer: false });
        const iterator2 = db.iterator({ keyAsBuffer: true });

        let entries = await testCommon.collectEntries(iterator);
        assert.deepEqual(entries.map(getKey), dates, "sorts naturally");

        entries = await testCommon.collectEntries(iterator2);
        assert.deepEqual(entries.map(getKey), buffers, "buffer input is stringified");
    });

    it("object value", async () => {
        const db = new Memory();
        const obj = {};

        await db.open();
        await db.put("key", obj);

        const value = await db.get("key", { asBuffer: false });
        assert.true(value === obj, "same object");
    });
});
