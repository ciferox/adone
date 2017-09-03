const { is } = adone;
const { LevelDB } = adone.database.level.backend;
const testCommon = require("../testCommon");
const cleanup = testCommon.cleanup;
const location = testCommon.location;

const makeTest = (name, testFn) => {
    it(name, async () => {
        await cleanup();
        const loc = location();
        const db = new LevelDB(loc);
        const done = async function (close) {
            if (close === false) {
                return cleanup();
            }
            await db.close();
            return cleanup();
        };
        await db.open();
        await db.batch([
            { type: "put", key: "one", value: "1" },
            { type: "put", key: "two", value: "2" },
            { type: "put", key: "three", value: "3" }
        ]);
        return testFn(db, done, loc);
    });
};


describe("database", "level", "backend", "default", () => {
    const factory = (location, options) => new LevelDB(location, options);

    require("../common/open").all(factory, testCommon);
    require("../common/put").all(factory, testCommon);
    require("../common/get").all(factory, testCommon);
    require("../common/del").all(factory, testCommon);
    require("../common/put_get_del").all(factory, testCommon, adone.std.fs.readFileSync(adone.std.path.join(__dirname, "../data/testdata.bin")));
    require("../common/batch").all(factory, testCommon);
    require("../common/chained_batch").all(factory, testCommon);
    require("../common/ranges").all(factory, testCommon);
    require("../common/backend").args(factory);


    require("../common/iterator").all(factory, testCommon);

    const lexi = require("lexicographic-integer");

    const not = (n) => {
        if (is.function(n)) {
            return function (k) {
                return !n(k);
            };
        }
        return function (k) {
            return k !== n;
        };
    };

    const pairs = (length, opts) => {
        opts = opts || {};
        const arr = [];
        for (let i = 0; i < length; i++) {
            arr.push(i);
        }
        return arr.filter(not(opts.not)).map((k) => {
            const key = opts.lex ? lexi.pack(k, "hex") : String(k);
            return { type: "put", key, value: `${k}` };
        });
    };

    const even = (n) => n % 2 === 0;

    makeTest("iterator throws if key is not a string or buffer", async (db, done) => {
        const keys = [null, undefined, 1, true, false];
        let pending = keys.length;

        for (const key of keys) {
            let error;
            const ite = db.iterator();

            await assert.throws(async () => ite.seek(key));
            await ite.end();
            if (!--pending) {
                await done();
            }
        }
    });

    makeTest("iterator is seekable", async (db, done) => {
        const ite = db.iterator();
        await ite.seek("two");
        const { key, value } = await ite.next();
        assert.equal(key.toString(), "two", "key matches");
        assert.equal(value.toString(), "2", "value matches");
        const pair = await ite.next();
        assert.isUndefined(pair, "end of iterator");
        return ite.end(done);
    });

    makeTest("iterator is seekable with buffer", async (db, done) => {
        const ite = db.iterator();
        await ite.seek(Buffer.from("two"));
        const { key, value } = await ite.next();
        assert.equal(key.toString(), "two", "key matches");
        assert.equal(value.toString(), "2", "value matches");
        const pair = await ite.next();
        assert.isUndefined(pair, "end of iterator");
        return ite.end(done);
    });

    makeTest("reverse seek in the middle", async (db, done) => {
        const ite = db.iterator({ reverse: true, limit: 1 });
        await ite.seek("three!");
        const { key, value } = await ite.next();
        assert.equal(key.toString(), "three", "key matches");
        assert.equal(value.toString(), "3", "value matches");
        return ite.end(done);
    });

    makeTest("iterator invalid seek", async (db, done) => {
        const ite = db.iterator();
        await ite.seek("zzz");
        const pair = await ite.next();
        assert.isUndefined(pair, "end of iterator");
        return ite.end(done);
    });

    makeTest("reverse seek from invalid range", async (db, done) => {
        const ite = db.iterator({ reverse: true });
        await ite.seek("zzz");
        const { key, value } = await ite.next();
        assert.equal(key.toString(), "two", "end of iterator");
        assert.equal(value.toString(), "2", "end of iterator");
        return ite.end(done);
    });

    makeTest("iterator optimized for seek", async (db, done) => {
        const batch = db.chainedBatch();
        batch.put("a", 1);
        batch.put("b", 1);
        batch.put("c", 1);
        batch.put("d", 1);
        batch.put("e", 1);
        batch.put("f", 1);
        batch.put("g", 1);
        await batch.write();
        const ite = db.iterator();
        const pair1 = await ite.next();
        assert.equal(pair1.key.toString(), "a", "key matches");
        assert.equal(ite.cache.length, 0, "no cache");
        const pair2 = await ite.next();
        assert.equal(pair2.key.toString(), "b", "key matches");
        assert.isTrue(ite.cache.length > 0, "has cached items");
        await ite.seek("d");
        assert.isNotOk(ite.cache, "cache is removed");
        const pair3 = await ite.next();
        assert.equal(pair3.key.toString(), "d", "key matches");
        assert.equal(ite.cache.length, 0, "no cache");
        const pair4 = await ite.next();
        assert.equal(pair4.key.toString(), "e", "key matches");
        assert.isTrue(ite.cache.length > 0, "has cached items");
        return ite.end(done);
    });

    makeTest("iterator seek before next has completed", async (db, done) => {
        const ite = db.iterator();
        const { key, value } = await ite.next();
        await ite.end(done);
        await assert.throws(async () => ite.seek("two"));
    });

    makeTest("close db with open iterator", async (db, done) => {
        const ite = db.iterator();
        let cnt = 0;
        let pClose;
        for (; ;) {
            let pair;
            if (cnt++ === 0) {
                pair = await ite.next();
                pClose = db.close();
            } else {
                await assert.throws(async () => ite.next());
            }
            if (is.undefined(pair)) {
                break;
            }
        }

        await pClose;
        return done(false);
    });

    makeTest("iterator seek after end", async (db, done) => {
        const ite = db.iterator();
        const { key, value } = await ite.next();
        await ite.end();
        await assert.throws(async () => ite.seek("two"));
        return done();
    });

    makeTest("iterator seek respects range", async (db, done) => {
        await db.batch(pairs(10));
        const expect = async (range, target, expected) => {
            const ite = db.iterator(range);

            await ite.seek(target);
            const pair = await ite.next();
            const tpl = "seek(%s) on %s yields %s";
            const msg = adone.std.util.format(tpl, target, adone.std.util.inspect(range), expected);

            if (is.undefined(expected)) {
                assert.equal(pair, undefined, msg);
            } else {
                assert.equal(pair.value.toString(), expected, msg);
            }

            await ite.end();
        };

        await expect({ gt: "5" }, "4", undefined);
        await expect({ gt: "5" }, "5", undefined);
        await expect({ gt: "5" }, "6", "6");

        await expect({ gte: "5" }, "4", undefined);
        await expect({ gte: "5" }, "5", "5");
        await expect({ gte: "5" }, "6", "6");

        await expect({ start: "5" }, "4", undefined);
        await expect({ start: "5" }, "5", "5");
        await expect({ start: "5" }, "6", "6");

        await expect({ lt: "5" }, "4", "4");
        await expect({ lt: "5" }, "5", undefined);
        await expect({ lt: "5" }, "6", undefined);

        await expect({ lte: "5" }, "4", "4");
        await expect({ lte: "5" }, "5", "5");
        await expect({ lte: "5" }, "6", undefined);

        await expect({ end: "5" }, "4", "4");
        await expect({ end: "5" }, "5", "5");
        await expect({ end: "5" }, "6", undefined);

        await expect({ lt: "5", reverse: true }, "4", "4");
        await expect({ lt: "5", reverse: true }, "5", undefined);
        await expect({ lt: "5", reverse: true }, "6", undefined);

        await expect({ lte: "5", reverse: true }, "4", "4");
        await expect({ lte: "5", reverse: true }, "5", "5");
        await expect({ lte: "5", reverse: true }, "6", undefined);

        await expect({ start: "5", reverse: true }, "4", "4");
        await expect({ start: "5", reverse: true }, "5", "5");
        await expect({ start: "5", reverse: true }, "6", undefined);

        await expect({ gt: "5", reverse: true }, "4", undefined);
        await expect({ gt: "5", reverse: true }, "5", undefined);
        await expect({ gt: "5", reverse: true }, "6", "6");

        await expect({ gte: "5", reverse: true }, "4", undefined);
        await expect({ gte: "5", reverse: true }, "5", "5");
        await expect({ gte: "5", reverse: true }, "6", "6");

        await expect({ end: "5", reverse: true }, "4", undefined);
        await expect({ end: "5", reverse: true }, "5", "5");
        await expect({ end: "5", reverse: true }, "6", "6");

        await expect({ gt: "7", lt: "8" }, "7", undefined);
        await expect({ gte: "7", lt: "8" }, "7", "7");
        await expect({ gte: "7", lt: "8" }, "8", undefined);
        await expect({ gt: "7", lte: "8" }, "8", "8");

        return done();
    });


    describe("getProperty()", () => {
        let db;
        it("setUp common", testCommon.setUp);

        it("setUp db", async () => {
            db = new LevelDB(testCommon.location());
            await db.open();
        });

        it("test argument-less getProperty() throws", () => {
            assert.throws(() => db.getProperty());
        });

        it("test non-string getProperty() throws", () => {
            assert.throws(() => db.getProperty({}));
        });

        it("test invalid getProperty() returns empty string", () => {
            assert.equal(db.getProperty("foo"), "", "invalid property");
            assert.equal(db.getProperty("leveldb.foo"), "", "invalid leveldb.* property");
        });

        it('test invalid getProperty("leveldb.num-files-at-levelN") returns numbers', () => {
            for (let i = 0; i < 7; i++) {
                assert.equal(db.getProperty(`leveldb.num-files-at-level${i}`), "0", '"leveldb.num-files-at-levelN" === "0"');
            }
        });

        it('test invalid getProperty("leveldb.stats")', () => {
            assert.ok(db.getProperty("leveldb.stats").split("\n").length > 3, "leveldb.stats has > 3 newlines");
        });

        it('test invalid getProperty("leveldb.sstables")', () => {
            const expected = `${[0, 1, 2, 3, 4, 5, 6].map((l) => {
                return `--- level ${l} ---`;
            }).join("\n")}\n`;
            assert.equal(db.getProperty("leveldb.sstables"), expected, "leveldb.sstables");
        });

        it("tearDown", async () => {
            await db.close();
            await testCommon.tearDown();
        });
    });

    makeTest("test ended iterator", async (db, done) => {
        // standard iterator with an end() properly called, easy

        const it = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });
        const { key, value } = await it.next();
        assert.equal(key, "one", "correct key");
        assert.equal(value, "1", "correct value");
        await it.end();
        return done();
    });

    makeTest("test non-ended iterator", async (db, done) => {
        // no end() call on our iterator, cleanup should crash Node if not handled properly
        const it = db.iterator({ keyAsBuffer: false, valueAsBuffer: false });
        const { key, value } = await it.next();
        assert.equal(key, "one", "correct key");
        assert.equal(value, "1", "correct value");
        return done();
    });

    makeTest("test multiple non-ended iterators", async (db, done) => {
        // no end() call on our iterator, cleanup should crash Node if not handled properly
        db.iterator();
        await db.iterator().next();
        await db.iterator().next();
        await db.iterator().next();
        await adone.promise.delay(50);
        return done();
    });

    makeTest("test ending iterators", async (db, done) => {
        // at least one end() should be in progress when we try to close the db
        const it1 = db.iterator();
        await it1.next();
        await it1.end();
        const it2 = db.iterator();
        await it2.next();
        await it2.end();
        return done();
    });

    // Compression

    // const du = require("du");
    // const delayed = require("delayed");
    // const common = require("../testCommon");

    // const compressableData = new Buffer(Array.apply(null, Array(1024 * 100)).map(() => {
    //     return "aaaaaaaaaa";
    // }).join(""));

    // const multiples = 10;
    // const dataSize = compressableData.length * multiples;

    // const verify = function (location, compression, t) {
    //     du(location, (err, size) => {
    //         t.error(err);
    //         if (compression) {
    //             t.ok(size < dataSize, `on-disk size (${size}) is less than data size (${dataSize})`);
    //         } else {
    //             t.ok(size >= dataSize, `on-disk size (${size}) is greater than data size (${dataSize})`);
    //         }
    //         t.end();
    //     });
    // };

    // // close, open, close again.. 'compaction' is also performed on open()s
    // const cycle = async function (db, compression) {
    //     const location = db.location;
    //     await db.close();
    //     db = new adone.database.level.backend.Default(location);
    //     await db.open({ errorIfExists: false, compression });
    //     await db.close();
    // };

    // describe("Compression", () => {
    //     it("set up", common.setUp);

    //     it("test data is compressed by default (db.put())", async () => {
    //         const db = new adone.database.level.backend.Default(common.location());
    //         await db.open();
    //         const items = Array.apply(null, Array(multiples)).map((e, i) => {
    //             return [i, compressableData];
    //         });

    //         for (const item of items) {
    //             await db.put(...item);
    //             await cycle(db, true);
    //             delayed.delayed(() => verify(db.location, true), 0.01);
    //         }
    //     });

    //     it("test data is not compressed with compression=false on open() (db.put())", async () => {
    //         const db = new adone.database.level.backend.Default(common.location());
    //         await db.open({ compression: false });
    //         const items = Array.apply(null, Array(multiples)).map((e, i) => {
    //             return [i, compressableData];
    //         });
    //         for (const item of items) {
    //             await db.put(...item);
    //             await cycle(db, false);
    //             delayed.delayed(() => verify(db.location, false), 0.01)
    //         }
    //     });

    //     it("test data is compressed by default (db.batch())", async () => {
    //         const db = new adone.database.level.backend.Default(common.location());
    //         await db.open();
    //         await db.batch(Array.apply(null, Array(multiples)).map((e, i) => ({ type: "put", key: i, value: compressableData })));
    //         await cycle(db, false);
    //         delayed.delayed(verify.bind(null, db.location, false), 0.01);
    //     });
    // });



    // Repair
    // const test = require('tape')
    //     , fs = require('fs')
    //     , path = require('path')
    //     , mkfiletree = require('mkfiletree')
    //     , readfiletree = require('readfiletree')
    //     , testCommon = require('abstract-leveldown/testCommon')
    //     , leveldown = require('../')
    //     , makeTest = require('./make')

    // test('test argument-less repair() throws', function (t) {
    //     t.throws(
    //         leveldown.repair
    //         , { name: 'Error', message: 'repair() requires `location` and `callback` arguments' }
    //         , 'no-arg repair() throws'
    //     )
    //     t.end()
    // })

    // test('test callback-less, 1-arg, repair() throws', function (t) {
    //     t.throws(
    //         leveldown.repair.bind(null, 'foo')
    //         , { name: 'Error', message: 'repair() requires `location` and `callback` arguments' }
    //         , 'callback-less, 1-arg repair() throws'
    //     )
    //     t.end()
    // })

    // test('test repair non-existent directory returns error', function (t) {
    //     leveldown.repair('/1/2/3/4', function (err) {
    //         if (process.platform !== 'win32')
    //             t.ok(/no such file or directory/i.test(err), 'error on callback')
    //         else
    //             t.ok(/IO error/i.test(err), 'error on callback')
    //         t.end()
    //     })
    // })

    // // a proxy indicator that RepairDB is being called and doing its thing
    // makeTest('test repair() compacts', function (db, t, done, location) {
    //     db.close(function (err) {
    //         t.notOk(err, 'no error')
    //         var files = fs.readdirSync(location)
    //         t.ok(files.some(function (f) { return (/\.log$/).test(f) }), 'directory contains log file(s)')
    //         t.notOk(files.some(function (f) { return (/\.ldb$/).test(f) }), 'directory does not contain ldb file(s)')
    //         leveldown.repair(location, function () {
    //             files = fs.readdirSync(location)
    //             t.notOk(files.some(function (f) { return (/\.log$/).test(f) }), 'directory does not contain log file(s)')
    //             t.ok(files.some(function (f) { return (/\.ldb$/).test(f) }), 'directory contains ldb file(s)')
    //             done(false)
    //         })
    //     })
    // })
});
