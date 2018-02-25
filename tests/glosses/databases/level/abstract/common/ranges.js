let db;
const sourceData = require("./iterator").sourceData;
const transformSource = require("./iterator").transformSource;

export const setUp = function (leveldown, testCommon) {
    describe("ranges", () => {
        it("setUp common", testCommon.setUp);
        it("setUp db", async () => {
            db = leveldown(testCommon.location());
            await db.open();
        });
    });
};

export const iterator = function (leveldown, testCommon, collectEntries) {
    describe("ranges", () => {
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

        /** the following tests are mirroring the same series of tests in
          * LevelUP read-stream-test.js
          */

        it("setUp #2", async () => {
            await db.close();
            db = leveldown(testCommon.location());
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

        it("test iterator with gte=0", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gte: "00" }));
            assert.equal(data.length, sourceData.length, "correct number of entries");
            const expected = sourceData.map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with gte=50", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gte: "50" }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with lte=50 and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lte: "50", reverse: true }));
            assert.equal(data.length, 51, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(49).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start being a midway key (49.5)", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gte: "49.5" }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start being a midway key (49999)", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gte: "49999" }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start being a midway key and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lte: "49.5", reverse: true }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start being a midway key and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lt: "49.5", reverse: true }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start being a midway key and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lt: "50", reverse: true }));
            assert.equal(data.length, 50, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(50).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end=50", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lte: "50" }));
            assert.equal(data.length, 51, "correct number of entries");
            const expected = sourceData.slice(0, 51).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end being a midway key (50.5)", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lte: "50.5" }));
            assert.equal(data.length, 51, "correct number of entries");
            const expected = sourceData.slice(0, 51).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end being a midway key (50555)", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lte: "50555" }));
            assert.equal(data.length, 51, "correct number of entries");
            const expected = sourceData.slice(0, 51).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end being a midway key (50555)", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lt: "50555" }));
            assert.equal(data.length, 51, "correct number of entries");
            const expected = sourceData.slice(0, 51).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end being a midway key and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gte: "50.5", reverse: true }));
            assert.equal(data.length, 49, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(0, 49).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with gt a midway key and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gt: "50.5", reverse: true }));
            assert.equal(data.length, 49, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(0, 49).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with gt a midway key and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gt: "50", reverse: true }));
            assert.equal(data.length, 49, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(0, 49).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with gt 50 key and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gt: "50", reverse: true }));
            assert.equal(data.length, 49, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(0, 49).map(transformSource);
            assert.deepEqual(data, expected);
        });

        // end='0', starting key is actually '00' so it should avoid it
        it("test iterator with end=0", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lte: "0" }));
            assert.equal(data.length, 0, "correct number of entries");
        });

        // end='0', starting key is actually '00' so it should avoid it
        it("test iterator with end<0", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lt: "0" }));
            assert.equal(data.length, 0, "correct number of entries");
        });

        it("test iterator with start=30 and end=70", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gte: "30", lte: "70" }));
            assert.equal(data.length, 41, "correct number of entries");
            const expected = sourceData.slice(30, 71).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start=30 and end=70", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gt: "29", lt: "71" }));
            assert.equal(data.length, 41, "correct number of entries");
            const expected = sourceData.slice(30, 71).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start=30 and end=70 and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lte: "70", gte: "30", reverse: true }));
            assert.equal(data.length, 41, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(29, 70).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start=30 and end=70 and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lt: "71", gt: "29", reverse: true }));
            assert.equal(data.length, 41, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(29, 70).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with limit=20 and start=20", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gte: "20", limit: 20 }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice(20, 40).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with limit=20 and start=79 and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lte: "79", limit: 20, reverse: true }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice().reverse().slice(20, 40).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end after limit", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, limit: 20, lte: "50" }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice(0, 20).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with end before limit", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, limit: 50, lte: "19" }));
            assert.equal(data.length, 20, "correct number of entries");
            const expected = sourceData.slice(0, 20).map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start after database end", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gte: "9a" }));
            assert.equal(data.length, 0, "correct number of entries");
        });

        it("test iterator with start after database end", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, gt: "9a" }));
            assert.equal(data.length, 0, "correct number of entries");
        });

        it("test iterator with start after database end and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ keyAsBuffer: false, valueAsBuffer: false, lte: "9a", reverse: true }));
            assert.equal(data.length, sourceData.length, "correct number of entries");
            const expected = sourceData.slice().reverse().map(transformSource);
            assert.deepEqual(data, expected);
        });

        it("test iterator with start and end after database and and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ lte: "9b", gte: "9a", reverse: true }));
            assert.equal(data.length, 0, "correct number of entries");
        });

        it("test iterator with lt and gt after database and and reverse=true", async () => {
            const data = await collectEntries(db.iterator({ lt: "9b", gt: "9a", reverse: true }));
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
            gte: ""
        });
        testIteratorCollectsFullDatabase("test iterator with start as null", {
            gte: null
        });
        testIteratorCollectsFullDatabase("test iterator with end as empty string", {
            lte: ""
        });
        testIteratorCollectsFullDatabase("test iterator with end as null", {
            lte: null
        });
    });
};

export const tearDown = function (testCommon) {
    describe("ranges", () => {
        it("tearDown", async () => {
            await db.close();
            await testCommon.tearDown();
        });
    });
};

export const all = function (leveldown, testCommon) {
    setUp(leveldown, testCommon);
    iterator(leveldown, testCommon, testCommon.collectEntries);
    tearDown(testCommon);
};
