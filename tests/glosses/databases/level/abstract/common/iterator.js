const {
    is
} = adone;

let db;
export const sourceData = (function () {
    const d = [];
    let k;
    for (let i = 0; i < 100; i++) {
        k = (i < 10 ? "0" : "") + i;
        d.push({
            type: "put",
            key: k,
            value: String(Math.random())
        });
    }
    return d;
}());
export const transformSource = function (d) {
    return { key: d.key, value: d.value };
};

export const setUp = function (leveldown, testCommon) {
    describe("iterator", () => {
        it("setUp common", testCommon.setUp);
        it("setUp db", async () => {
            db = leveldown(testCommon.location());
            await db.open();
        });
    });
};

export const sequence = function () {
    describe("iterator", () => {
        it("twice iterator#end() callback with error", async () => {
            const iterator = db.iterator();
            await iterator.end();
            const err = await assert.throws(async () => iterator.end());
            assert.instanceOf(err, Error);
        });

        it("iterator#next after iterator#end() with error", async () => {
            const iterator = db.iterator();
            await iterator.end();
            const err = await assert.throws(async () => iterator.next());
            assert.instanceOf(err, Error);
        });

        it("twice iterator#next() throws", async () => {
            const iterator = db.iterator();
            await iterator.next();
            await iterator.end();

            const err = await assert.throws(async () => iterator.next());
            assert.instanceOf(err, Error);
        });
    });
};

export const iterator = function (leveldown, testCommon) {
    describe("iterator", () => {
        it("simple iterator()", async () => {
            const data = [
                { type: "put", key: "foobatch1", value: "bar1" },
                { type: "put", key: "foobatch2", value: "bar2" },
                { type: "put", key: "foobatch3", value: "bar3" }
            ];
            let idx = 0;

            await db.batch(data);
            const iterator = db.iterator();

            for (; ;) {
                const result = await iterator.next(); // eslint-disable-line
                if (result) {
                    const { key, value } = result;
                    assert.ok(is.buffer(key), "key argument is a Buffer");
                    assert.ok(is.buffer(value), "value argument is a Buffer");
                    assert.equal(key.toString(), data[idx].key, "correct key");
                    assert.equal(value.toString(), data[idx].value, "correct value");
                    idx++;
                } else { // end
                    assert.equal(idx, data.length, "correct number of entries");
                    await iterator.end(); // eslint-disable-line
                    break;
                }
            }
        });
    });
};

export const snapshot = function (leveldown, testCommon) {
    describe("iterator", () => {
        it("setUp #2", async () => {
            await db.close();
            db = leveldown(testCommon.location());
            await db.open();
            await db.put("foobatch1", "bar1");
        });

        it("iterator create snapshot correctly", async () => {
            const iterator = db.iterator();
            await db.del("foobatch1");
            const { key, value } = await iterator.next();
            assert.ok(key, "got a key");
            assert.equal(key.toString(), "foobatch1", "correct key");
            assert.equal(value.toString(), "bar1", "correct value");
            await iterator.end();
        });
    });
};

export const tearDown = function (testCommon) {
    describe("iterator", () => {
        it("tearDown", async () => {
            await db.close();
            await testCommon.tearDown();
        });
    });
};

export const all = function (leveldown, testCommon) {
    setUp(leveldown, testCommon);
    sequence();
    iterator(leveldown, testCommon, testCommon.collectEntries);
    snapshot(leveldown, testCommon);
    tearDown(testCommon);
};
