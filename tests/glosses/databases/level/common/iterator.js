let db;
export const sourceData = (function () {
    const d = [];
    let k;
    for (let i = 0; i < 100; i++) {
        k = (i < 10 ? "0" : "") + i;
        d.push({
            type: "put",
            key: k,
            value: Math.random()
        });
    }
    return d;
}());
export const transformSource = function (d) {
    return { key: d.key, value: String(d.value) };
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
        it("test twice iterator#end() callback with error", async () => {
            const iterator = db.iterator();
            await iterator.end();
            try {
                await iterator.end();
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test iterator#next after iterator#end() callback with error", async () => {
            const iterator = db.iterator();
            await iterator.end();
            try {
                iterator.next();
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });

        it("test twice iterator#next() throws", async () => {
            const iterator = db.iterator();
            await iterator.next();
            await iterator.end();

            try {
                await iterator.next();
            } catch (err) {
                assert.instanceOf(err, Error);
                return;
            }
            assert.fail("should have thrown");
        });
    });
};

export const iterator = function (leveldown, testCommon, collectEntries) {
    describe("iterator", () => {
        it("test simple iterator()", async () => {
            const data = [
                { type: "put", key: "foobatch1", value: "bar1" },
                { type: "put", key: "foobatch2", value: "bar2" },
                { type: "put", key: "foobatch3", value: "bar3" }
            ];
            let idx = 0;

            await db.batch(data);
            const iterator = db.iterator();

            for (; ;) {
                const result = await iterator.next();
                if (result) {
                    const { key, value } = result;
                    assert.ok(Buffer.isBuffer(key), "key argument is a Buffer");
                    assert.ok(Buffer.isBuffer(value), "value argument is a Buffer");
                    assert.equal(key.toString(), data[idx].key, "correct key");
                    assert.equal(value.toString(), data[idx].value, "correct value");
                    idx++;
                } else { // end
                    assert.ok(typeof err === "undefined", "err argument is undefined");
                    assert.equal(idx, data.length, "correct number of entries");
                    await iterator.end();
                    break;
                }
            }
        });

        /** the following tests are mirroring the same series of tests in LevelUP read-stream-test.js */
        it("setUp #2", async () => {
            await db.close();
            db = new adone.database.level.backend.Default(testCommon.location());
            await db.open();
            await db.batch(sourceData);
        });

        it("test full data collection", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false }));
            assert.equal(data.length, sourceData.length, "correct number of entries");
            const expected = sourceData.map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, reverse: true }));
            assert.equal(data.length, sourceData.length, "correct number of entries");
            const expected = sourceData.slice().reverse().map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start=0", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "00" }));
            assert.equal(data.length, sourceData.length, "correct number of entries");
            const expected = sourceData.map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start=50", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "50" }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start=50 and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "50", reverse: true }));
            assert.equal(data.length, 51, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(49).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start being a midway key (49.5)", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "49.5" }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start being a midway key (49999)", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "49999" }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start being a midway key and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "49.5", reverse: true }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end=50", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, end: "50" }));
            assert.equal(data.length, 51, "correct number of entries");
            const expected = sourceData.slice(0, 51).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end being a midway key (50.5)", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, end: "50.5" }));
            assert.equal(data.length, 51, "correct number of entries");
            const expected = sourceData.slice(0, 51).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end being a midway key (50555)", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, end: "50555" }));
            assert.equal(data.length, 51, "correct number of entries");
            const expected = sourceData.slice(0, 51).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end being a midway key and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, end: "50.5", reverse: true }));
            assert.equal(data.length, 49, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(0, 49).map(transformSource);
            assert.deepEqual(data, expected);
        });

        // end='0', starting key is actually '00' so it should avoid it
        it("test iterator with end=0", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, end: "0" }));
            assert.equal(data.length, 0, "correct number of entries");
        });

        it("test iterator with start=30 and end=70", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "30", end: "70" }));
            assert.equal(data.length, 41, "correct number of entries");
            const expected = sourceData.slice(30, 71).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start=30 and end=70 and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "70", end: "30", reverse: true }));
            assert.equal(data.length, 41, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(29, 70).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with limit=20", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, limit: 20 }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice(0, 20).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with limit=20 and start=20", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "20", limit: 20 }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice(20, 40).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with limit=20 and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, limit: 20, reverse: true }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(0, 20).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with limit=20 and start=20 and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "79", limit: 20, reverse: true }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(20, 40).map(transformSource);
            assert.deepEqual(data, expected);
        });

        // the default limit value from levelup is -1
        it("test iterator with limit=-1 should iterate over whole database", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, limit: -1 }));
            assert.equal(data.length, sourceData.length, "correct number of entries");
            const expected = sourceData.map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with limit=0 should not iterate over anything", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, limit: 0 }));
            assert.equal(data.length, 0, "correct number of entries");
        });

        it("test iterator with end after limit", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, limit: 20, end: "50" }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice(0, 20).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end before limit", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, limit: 50, end: "19" }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice(0, 20).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start after database end", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "9a" }));
            assert.equal(data.length, 0, "correct number of entries");
        });

        it("test iterator with start after database end and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: "9a", reverse: true }));
            assert.equal(data.length, sourceData.length, "correct number of entries");
            const expected = sourceData.slice().reverse().map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start and end after database and and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ start: "9b", end: "9a", reverse: true }));
            assert.equal(data.length, 0, "correct number of entries");
        });

        const testIteratorCollectsFullDatabase = (name, iteratorOptions) => {
            iteratorOptions.keyAsBuffer = false;
            iteratorOptions.valueAsBuffer = false;
            it(name, async () => {
                const data = await collectEntries(db.iterator(iteratorOptions));
                assert.equal(data.length, 100, "correct number of entries");
                const expected = sourceData.map(transformSource);
                assert.deepEqual(data, expected);
            });
        };

        // Can't use buffers as query keys in indexeddb (I think :P)
        testIteratorCollectsFullDatabase("test iterator with start as empty buffer", {
            start: new Buffer(0)
        });
        testIteratorCollectsFullDatabase("test iterator with end as empty buffer", {
            end: new Buffer(0)
        });
        testIteratorCollectsFullDatabase("test iterator with start as empty string", {
            start: ""
        });
        testIteratorCollectsFullDatabase("test iterator with start as null", {
            start: null
        });
        testIteratorCollectsFullDatabase("test iterator with end as empty string", {
            end: ""
        });
        testIteratorCollectsFullDatabase("test iterator with end as null", {
            end: null
        });
    });
};

export const snapshot = function (leveldown, testCommon) {
    describe("iterator", () => {
        it("setUp #3", async () => {
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
