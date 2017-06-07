const { Default } = adone.database.level.backend;
const testCommon = require("../testCommon");
const cleanup = testCommon.cleanup;
const location = testCommon.location;

const makeTest = (name, testFn) => {
    it(name, async () => {
        await cleanup();
        const loc = location();
        const db = new adone.database.level.backend.Default(loc);
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


describe("databases", "level", "backend", "default", () => {
    const factory = (location, options) => new Default(location, options);

    require("../common/open").all(factory, testCommon);
    require("../common/put").all(factory, testCommon);
    require("../common/get").all(factory, testCommon);
    require("../common/del").all(factory, testCommon);
    require("../common/put_get_del").all(factory, testCommon, adone.std.fs.readFileSync(adone.std.path.join(__dirname, "../data/testdata.bin")));
    require("../common/batch").all(factory, testCommon);
    require("../common/chained_batch").all(factory, testCommon);
    require("../common/ranges").all(factory, testCommon);
    require("../common/backend").args(factory);


    // const iota = require("iota-array");
    // const lexi = require("lexicographic-integer");
    // const util = require("util");

    require("../common/iterator").all(factory, testCommon);

    // make("iterator throws if key is not a string or buffer", (db, t, done) => {
    //     let keys = [null, undefined, 1, true, false];
    //     let pending = keys.length;

    //     keys.forEach((key) => {
    //         let error;
    //         let ite = db.iterator();

    //         try {
    //             ite.seek(key);
    //         } catch (e) {
    //             error = e;
    //         }

    //         t.ok(error, "had error from seek()");
    //         ite.end(end);
    //     });

    //     function end(err) {
    //         t.error(err, "no error from end()");
    //         if (!--pending) { done() };
    //     }
    // });

    // make("iterator is seekable", (db, t, done) => {
    //     let ite = db.iterator();
    //     ite.seek("two");
    //     ite.next((err, key, value) => {
    //         t.error(err, "no error");
    //         t.same(key.toString(), "two", "key matches");
    //         t.same(value.toString(), "2", "value matches");
    //         ite.next((err, key, value) => {
    //             t.error(err, "no error");
    //             t.same(key, undefined, "end of iterator");
    //             t.same(value, undefined, "end of iterator");
    //             ite.end(done);
    //         });
    //     });
    // });

    // make("iterator is seekable with buffer", (db, t, done) => {
    //     let ite = db.iterator();
    //     ite.seek(Buffer("two"));
    //     ite.next((err, key, value) => {
    //         t.error(err, "no error from next()");
    //         t.equal(key.toString(), "two", "key matches");
    //         t.equal(value.toString(), "2", "value matches");
    //         ite.next((err, key, value) => {
    //             t.error(err, "no error from next()");
    //             t.equal(key, undefined, "end of iterator");
    //             t.equal(value, undefined, "end of iterator");
    //             ite.end(done);
    //         });
    //     });
    // });

    // make("reverse seek in the middle", (db, t, done) => {
    //     let ite = db.iterator({ reverse: true, limit: 1 });
    //     ite.seek("three!");
    //     ite.next((err, key, value) => {
    //         t.error(err, "no error");
    //         t.same(key.toString(), "three", "key matches");
    //         t.same(value.toString(), "3", "value matches");
    //         ite.end(done);
    //     });
    // });

    // make("iterator invalid seek", (db, t, done) => {
    //     let ite = db.iterator();
    //     ite.seek("zzz");
    //     ite.next((err, key, value) => {
    //         t.error(err, "no error");
    //         t.same(key, undefined, "end of iterator");
    //         t.same(value, undefined, "end of iterator");
    //         ite.end(done);
    //     });
    // });

    // make("reverse seek from invalid range", (db, t, done) => {
    //     let ite = db.iterator({ reverse: true });
    //     ite.seek("zzz");
    //     ite.next((err, key, value) => {
    //         t.error(err, "no error");
    //         t.same(key.toString(), "two", "end of iterator");
    //         t.same(value.toString(), "2", "end of iterator");
    //         ite.end(done);
    //     });
    // });

    // make("iterator optimized for seek", (db, t, done) => {
    //     let batch = db.batch();
    //     batch.put("a", 1);
    //     batch.put("b", 1);
    //     batch.put("c", 1);
    //     batch.put("d", 1);
    //     batch.put("e", 1);
    //     batch.put("f", 1);
    //     batch.put("g", 1);
    //     batch.write((err) => {
    //         let ite = db.iterator();
    //         t.error(err, "no error from batch");
    //         ite.next((err, key, value) => {
    //             t.error(err, "no error from next()");
    //             t.equal(key.toString(), "a", "key matches");
    //             t.equal(ite.cache.length, 0, "no cache");
    //             ite.next((err, key, value) => {
    //                 t.error(err, "no error from next()");
    //                 t.equal(key.toString(), "b", "key matches");
    //                 t.ok(ite.cache.length > 0, "has cached items");
    //                 ite.seek("d");
    //                 t.notOk(ite.cache, "cache is removed");
    //                 ite.next((err, key, value) => {
    //                     t.error(err, "no error from next()");
    //                     t.equal(key.toString(), "d", "key matches");
    //                     t.equal(ite.cache.length, 0, "no cache");
    //                     ite.next((err, key, value) => {
    //                         t.error(err, "no error from next()");
    //                         t.equal(key.toString(), "e", "key matches");
    //                         t.ok(ite.cache.length > 0, "has cached items");
    //                         done();
    //                     });
    //                 });
    //             });
    //         });
    //     });
    // });

    // make("iterator seek before next has completed", (db, t, done) => {
    //     let ite = db.iterator();
    //     ite.next((err, key, value) => {
    //         t.error(err, "no error from end()");
    //         done();
    //     });
    //     let error;
    //     try {
    //         ite.seek("two");
    //     } catch (e) {
    //         error = e;
    //     }
    //     t.ok(error, "had error from seek() before next() has completed");
    // });

    // make("iterator seek after end", (db, t, done) => {
    //     let ite = db.iterator();
    //     ite.next((err, key, value) => {
    //         t.error(err, "no error from next()");
    //         ite.end((err) => {
    //             t.error(err, "no error from end()");
    //             let error;
    //             try {
    //                 ite.seek("two");
    //             } catch (e) {
    //                 error = e;
    //             }
    //             t.ok(error, "had error from seek() after end()");
    //             done();
    //         });
    //     });
    // });

    // make("iterator seek respects range", (db, t, done) => {
    //     db.batch(pairs(10), (err) => {
    //         t.error(err, "no error from batch()");

    //         let pending = 0;

    //         expect({ gt: "5" }, "4", undefined);
    //         expect({ gt: "5" }, "5", undefined);
    //         expect({ gt: "5" }, "6", "6");

    //         expect({ gte: "5" }, "4", undefined);
    //         expect({ gte: "5" }, "5", "5");
    //         expect({ gte: "5" }, "6", "6");

    //         expect({ start: "5" }, "4", undefined);
    //         expect({ start: "5" }, "5", "5");
    //         expect({ start: "5" }, "6", "6");

    //         expect({ lt: "5" }, "4", "4");
    //         expect({ lt: "5" }, "5", undefined);
    //         expect({ lt: "5" }, "6", undefined);

    //         expect({ lte: "5" }, "4", "4");
    //         expect({ lte: "5" }, "5", "5");
    //         expect({ lte: "5" }, "6", undefined);

    //         expect({ end: "5" }, "4", "4");
    //         expect({ end: "5" }, "5", "5");
    //         expect({ end: "5" }, "6", undefined);

    //         expect({ lt: "5", reverse: true }, "4", "4");
    //         expect({ lt: "5", reverse: true }, "5", undefined);
    //         expect({ lt: "5", reverse: true }, "6", undefined);

    //         expect({ lte: "5", reverse: true }, "4", "4");
    //         expect({ lte: "5", reverse: true }, "5", "5");
    //         expect({ lte: "5", reverse: true }, "6", undefined);

    //         expect({ start: "5", reverse: true }, "4", "4");
    //         expect({ start: "5", reverse: true }, "5", "5");
    //         expect({ start: "5", reverse: true }, "6", undefined);

    //         expect({ gt: "5", reverse: true }, "4", undefined);
    //         expect({ gt: "5", reverse: true }, "5", undefined);
    //         expect({ gt: "5", reverse: true }, "6", "6");

    //         expect({ gte: "5", reverse: true }, "4", undefined);
    //         expect({ gte: "5", reverse: true }, "5", "5");
    //         expect({ gte: "5", reverse: true }, "6", "6");

    //         expect({ end: "5", reverse: true }, "4", undefined);
    //         expect({ end: "5", reverse: true }, "5", "5");
    //         expect({ end: "5", reverse: true }, "6", "6");

    //         expect({ gt: "7", lt: "8" }, "7", undefined);
    //         expect({ gte: "7", lt: "8" }, "7", "7");
    //         expect({ gte: "7", lt: "8" }, "8", undefined);
    //         expect({ gt: "7", lte: "8" }, "8", "8");

    //         function expect(range, target, expected) {
    //             pending++;
    //             let ite = db.iterator(range);

    //             ite.seek(target);
    //             ite.next((err, key, value) => {
    //                 t.error(err, "no error from next()");

    //                 let tpl = "seek(%s) on %s yields %s";
    //                 let msg = util.format(tpl, target, util.inspect(range), expected);

    //                 if (expected === undefined)
    //                 { t.equal(value, undefined, msg) };
    //                 else
    //                 { t.equal(value.toString(), expected, msg) };

    //                 ite.end((err) => {
    //                     t.error(err, "no error from end()");
    //                     if (!--pending) { done() };
    //                 });
    //             });
    //         }
    //     });
    // });

    // function pairs(length, opts) {
    //     opts = opts || {};
    //     return iota(length).filter(not(opts.not)).map((k) => {
    //         let key = opts.lex ? lexi.pack(k, "hex") : "" + k;
    //         return { type: "put", key, value: "" + k };
    //     });
    // }

    // function not(n) {
    //     if (typeof n === "function") { return function (k) { return !n(k) } };
    //     return function (k) {
    //         return k !== n;
    //     };
    // }

    // function even(n) {
    //     return n % 2 === 0;
    // }


    describe("getProperty()", () => {
        let db;
        it("setUp common", testCommon.setUp);

        it("setUp db", async () => {
            db = new adone.database.level.backend.Default(testCommon.location());
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
