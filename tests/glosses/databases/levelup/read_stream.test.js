// import Manager from "./common";
// const SlowStream = require("slow-stream");
// const delayed = require("delayed");
// const rimraf = require("rimraf");
// const async = require("async");
// const msgpack = require("msgpack-js");
// const bigBlob = Array.apply(null, Array(1024 * 100)).map(() => {
//     return "aaaaaaaaaa";
// }).join("");


// describe("ReadStream", () => {
//     let manager;
//     beforeEach(() => {
//         manager = new Manager();
//         return manager.streamSetUp();
//     });

//     afterEach(() => {
//         return manager.shutdown();
//     });

//     it("test simple ReadStream", (done) => {
//         manager.openTestDatabase((db) => {
//             // execute
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream();
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));
//             });
//         });
//     });

//     it("test pausing", (done) => {
//         let calls = 0;
//         let rs;
//         const pauseVerify = function () {
//             assert.equal(calls, 5, "stream should still be paused");
//             rs.resume();
//             pauseVerify.called = true;
//         };
//         const onData = function () {
//             if (++calls === 5) {
//                 rs.pause();
//                 setTimeout(pauseVerify, 50);
//             }
//         };
//         const verify = function () {
//             assert.equal(calls, manager.sourceData.length, "onData was used in test");
//             assert(pauseVerify.called, "pauseVerify was used in test");
//             manager.verify(rs, done);
//         };

//         manager.dataSpy = spy(onData); // so we can still verify

//         manager.openTestDatabase((db) => {
//             // execute
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 rs = db.createReadStream();
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("end", verify);
//             });
//         });
//     });

//     it("test destroy() immediately", (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream();
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", () => {
//                     assert.equal(manager.dataSpy.callCount, 0, '"data" event was not fired');
//                     assert.equal(manager.endSpy.callCount, 0, '"end" event was not fired');
//                     done();
//                 });
//                 rs.destroy();
//             });
//         });
//     });

//     it("test destroy() after close", (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream();
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", () => {
//                     rs.destroy();
//                     done();
//                 });
//             });
//         });
//     });

//     it("test destroy() after closing db", (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);
//                 db.close((err) => {
//                     const rs = db.createReadStream();
//                     rs.destroy();
//                     done();
//                 });
//             });
//         });
//     });

//     it("test destroy() twice", (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream();
//                 rs.on("data", () => {
//                     rs.destroy();
//                     rs.destroy();
//                     done();
//                 });
//             });
//         });
//     });

//     it("test destroy() half way through", (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream();
//                 const endSpy = spy();
//                 let calls = 0;
//                 manager.dataSpy = spy(() => {
//                     if (++calls === 5) {
//                         rs.destroy();
//                     }
//                 });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", endSpy);
//                 rs.on("close", () => {
//                     //  assert.equal(this.readySpy.callCount, 1, 'ReadStream emitted single "ready" event')
//                     // should do "data" 5 times ONLY
//                     assert.equal(manager.dataSpy.callCount, 5, 'ReadStream emitted correct number of "data" events (5)');
//                     manager.sourceData.slice(0, 5).forEach((d, i) => {
//                         const call = manager.dataSpy.getCall(i);
//                         assert(call);
//                         if (call) {
//                             assert.equal(call.args.length, 1, `ReadStream "data" event #${i} fired with 1 argument`);
//                             assert.isNotNull(call.args[0].key, `ReadStream "data" event #${i} argument has "key" property`);
//                             assert.isNotNull(call.args[0].value, `ReadStream "data" event #${i} argument has "value" property`);
//                             assert.equal(call.args[0].key, d.key, `ReadStream "data" event #${i} argument has correct "key"`);
//                             assert.equal(Number(call.args[0].value), Number(d.value), `ReadStream "data" event #${i} argument has correct "value"`);
//                         }
//                     });
//                     done();
//                 });
//             });
//         });
//     });

//     it('test readStream() with "reverse=true"', (done) => {
//         manager.openTestDatabase((db) => {
//             // execute
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ reverse: true });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 manager.sourceData.reverse(); // for verify
//             });
//         });
//     });

//     it('test readStream() with "start"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ start: "50" });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // slice off the first 50 so verify() expects only the last 50 even though all 100 are in the db
//                 manager.sourceData = manager.sourceData.slice(50);
//             });
//         });
//     });

//     it('test readStream() with "start" and "reverse=true"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ start: "50", reverse: true });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // reverse and slice off the first 50 so verify() expects only the first 50 even though all 100 are in the db
//                 manager.sourceData.reverse();
//                 manager.sourceData = manager.sourceData.slice(49);
//             });
//         });
//     });

//     it('test readStream() with "start" being mid-way key (float)', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 // '49.5' doesn't actually exist but we expect it to start at '50' because '49' < '49.5' < '50' (in string terms as well as numeric)
//                 const rs = db.createReadStream({ start: "49.5" });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // slice off the first 50 so verify() expects only the last 50 even though all 100 are in the db
//                 manager.sourceData = manager.sourceData.slice(50);
//             });
//         });
//     });

//     it('test readStream() with "start" being mid-way key (float) and "reverse=true"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ start: "49.5", reverse: true });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // reverse & slice off the first 50 so verify() expects only the first 50 even though all 100 are in the db
//                 manager.sourceData.reverse();
//                 manager.sourceData = manager.sourceData.slice(50);
//             });
//         });
//     });

//     it('test readStream() with "start" being mid-way key (string)', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 // '499999' doesn't actually exist but we expect it to start at '50' because '49' < '499999' < '50' (in string terms)
//                 // the same as the previous test but we're relying solely on string ordering
//                 const rs = db.createReadStream({ start: "499999" });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // slice off the first 50 so verify() expects only the last 50 even though all 100 are in the db
//                 manager.sourceData = manager.sourceData.slice(50);
//             });
//         });
//     });

//     it('test readStream() with "end"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ end: "50" });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // slice off the last 49 so verify() expects only 0 -> 50 inclusive, even though all 100 are in the db
//                 manager.sourceData = manager.sourceData.slice(0, 51);
//             });
//         });
//     });

//     it('test readStream() with "end" being mid-way key (float)', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ end: "50.5" });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // slice off the last 49 so verify() expects only 0 -> 50 inclusive, even though all 100 are in the db
//                 manager.sourceData = manager.sourceData.slice(0, 51);
//             });
//         });
//     });

//     it('test readStream() with "end" being mid-way key (string)', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ end: "50555555" });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // slice off the last 49 so verify() expects only 0 -> 50 inclusive, even though all 100 are in the db
//                 manager.sourceData = manager.sourceData.slice(0, 51);
//             });
//         });
//     });

//     it('test readStream() with "end" being mid-way key (float) and "reverse=true"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ end: "50.5", reverse: true });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 manager.sourceData.reverse();
//                 manager.sourceData = manager.sourceData.slice(0, 49);
//             });
//         });
//     });

//     it('test readStream() with both "start" and "end"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ start: 30, end: 70 });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // should include 30 to 70, inclusive
//                 manager.sourceData = manager.sourceData.slice(30, 71);
//             });
//         });
//     });

//     it('test readStream() with both "start" and "end" and "reverse=true"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ start: 70, end: 30, reverse: true });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 // expect 70 -> 30 inclusive
//                 manager.sourceData.reverse();
//                 manager.sourceData = manager.sourceData.slice(29, 70);
//             });
//         });
//     });

//     it("test hex encoding", (done) => {
//         const options = { createIfMissing: true, errorIfExists: true, keyEncoding: "utf8", valueEncoding: "hex" };
//         const data = [
//             { type: "put", key: "ab", value: "abcdef0123456789" }
//         ];

//         manager.openTestDatabase({}, (db) => {
//             db.batch(data.slice(), options, (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream(options);
//                 rs.on("data", (data) => {
//                     assert.equal(data.value, "abcdef0123456789");
//                 });
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", done);

//             });
//         });
//     });

//     it("test json encoding", (done) => {
//         const options = { createIfMissing: true, errorIfExists: true, keyEncoding: "utf8", valueEncoding: "json" };
//         const data = [
//             { type: "put", key: "aa", value: { a: "complex", obj: 100 } },
//             { type: "put", key: "ab", value: { b: "foo", bar: [1, 2, 3] } },
//             { type: "put", key: "ac", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
//             { type: "put", key: "ba", value: { a: "complex", obj: 100 } },
//             { type: "put", key: "bb", value: { b: "foo", bar: [1, 2, 3] } },
//             { type: "put", key: "bc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
//             { type: "put", key: "ca", value: { a: "complex", obj: 100 } },
//             { type: "put", key: "cb", value: { b: "foo", bar: [1, 2, 3] } },
//             { type: "put", key: "cc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } }
//         ];

//         manager.openTestDatabase(options, (db) => {
//             db.batch(data.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream();
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done, data));
//             });
//         });
//     });

//     it("test injectable encoding", (done) => {
//         const options = {
//             createIfMissing: true, errorIfExists: true, keyEncoding: "utf8", valueEncoding: {
//                 decode: msgpack.decode,
//                 encode: msgpack.encode,
//                 buffer: true
//             }
//         };
//         const data = [
//             { type: "put", key: "aa", value: { a: "complex", obj: 100 } },
//             { type: "put", key: "ab", value: { b: "foo", bar: [1, 2, 3] } },
//             { type: "put", key: "ac", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
//             { type: "put", key: "ba", value: { a: "complex", obj: 100 } },
//             { type: "put", key: "bb", value: { b: "foo", bar: [1, 2, 3] } },
//             { type: "put", key: "bc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
//             { type: "put", key: "ca", value: { a: "complex", obj: 100 } },
//             { type: "put", key: "cb", value: { b: "foo", bar: [1, 2, 3] } },
//             { type: "put", key: "cc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } }
//         ];

//         manager.openTestDatabase(options, (db) => {
//             db.batch(data.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream();
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done, data));
//             });
//         });
//     });

//     it('test readStream() "reverse=true" not sticky (issue #6)', (done) => {
//         manager.openTestDatabase((db) => {
//             // execute
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);
//                 // read in reverse, assume all's good
//                 const rs = db.createReadStream({ reverse: true });
//                 rs.on("close", () => {
//                     // now try reading the other way
//                     const rs = db.createReadStream();
//                     rs.on("data", manager.dataSpy);
//                     rs.on("end", manager.endSpy);
//                     rs.on("close", manager.verify.bind(null, rs, done));
//                 });
//                 rs.resume();
//             });
//         });
//     });

//     it("test ReadStream, start=0", (done) => {
//         manager.openTestDatabase((db) => {
//             // execute
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ start: 0 });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));
//             });
//         });
//     });

//     // we don't expect any data to come out of here because the keys start at '00' not 0
//     // we just want to ensure that we don't kill the process
//     it("test ReadStream, end=0", (done) => {
//         manager.openTestDatabase((db) => {
//             // execute
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ end: 0 });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 manager.sourceData = [];
//             });
//         });
//     });

//     // ok, so here's the deal, this is kind of obscure: when you have 2 databases open and
//     // have a readstream coming out from both of them with no references to the dbs left
//     // V8 will GC one of them and you'll get an failed assert from leveldb.
//     // This ISN'T a problem if you only have one of them open, even if the db gets GCed!
//     // Process:
//     //   * open
//     //   * batch write data
//     //   * close
//     //   * reopen
//     //   * create ReadStream, keeping no reference to the db
//     //   * pipe ReadStream through SlowStream just to make sure GC happens
//     //       - the error should occur here if the bug exists
//     //   * when both streams finish, verify all 'data' events happened
//     it("test ReadStream without db ref doesn't get GCed", (done) => {
//         const dataSpy1 = spy();
//         const dataSpy2 = spy();
//         const location1 = manager.nextLocation();
//         const location2 = manager.nextLocation();
//         const sourceData = manager.sourceData;
//         const verify = function () {
//             // no reference to `db` here, should have been GCed by now if it could be
//             assert(dataSpy1.callCount, sourceData.length);
//             assert(dataSpy2.callCount, sourceData.length);
//             async.parallel([rimraf.bind(null, location1), rimraf.bind(null, location2)], done);
//         };
//         const execute = function (d, callback) {
//             // no reference to `db` here, could be GCed
//             d.readStream
//                 .pipe(new SlowStream({ maxWriteInterval: 5 }))
//                 .on("data", d.spy)
//                 .on("close", delayed.delayed(callback, 0.05));
//         };
//         const open = function (reopen, location, callback) {
//             levelup(location, { createIfMissing: !reopen, errorIfExists: !reopen }, callback);
//         };
//         const write = function (db, callback) {
//             db.batch(sourceData.slice(), callback);
//         };
//         const close = function (db, callback) {
//             db.close(callback);
//         };
//         const setup = function (callback) {
//             async.map([location1, location2], open.bind(null, false), (err, dbs) => {
//                 assert(!err);
//                 if (err) {
//                     return;
//                 }
//                 async.map(dbs, write, (err) => {
//                     assert(!err);
//                     if (err) {
//                         return;
//                     }
//                     async.forEach(dbs, close, callback);
//                 });
//             });
//         };
//         const reopen = function () {
//             async.map([location1, location2], open.bind(null, true), (err, dbs) => {
//                 assert(!err);
//                 if (err) {
//                     return;
//                 }
//                 async.forEach([
//                     { readStream: dbs[0].createReadStream(), spy: dataSpy1 }
//                     , { readStream: dbs[1].createReadStream(), spy: dataSpy2 }
//                 ], execute, verify);
//             });
//         };

//         setup(delayed.delayed(reopen, 0.05));
//     });

//     // this is just a fancy way of testing levelup('/path').createReadStream()
//     // i.e. not waiting for 'open' to complete
//     // the logic for this is inside the ReadStream constructor which waits for 'ready'
//     it("test ReadStream on pre-opened db", (done) => {
//         const execute = function (db) {
//             // is in limbo
//             assert(!db.isOpen());
//             assert(!db.isClosed());

//             const rs = db.createReadStream();
//             rs.on("data", manager.dataSpy);
//             rs.on("end", manager.endSpy);
//             rs.on("close", manager.verify.bind(null, rs, done));
//         };
//         const setup = function (db) {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);
//                 db.close((err) => {
//                     assert(!err);
//                     const db2 = levelup(db.location, { createIfMissing: false, errorIfExists: false, valueEncoding: "utf8" });
//                     execute(db2);
//                 });
//             });
//         };

//         manager.openTestDatabase(setup);
//     });

//     it('test readStream() with "limit"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ limit: 20 });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 manager.sourceData = manager.sourceData.slice(0, 20);
//             });
//         });
//     });

//     it('test readStream() with "start" and "limit"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ start: "20", limit: 20 });
//                 //rs.on('ready', this.readySpy)
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 manager.sourceData = manager.sourceData.slice(20, 40);
//             });
//         });
//     });

//     it('test readStream() with "end" after "limit"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ end: "50", limit: 20 });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 manager.sourceData = manager.sourceData.slice(0, 20);
//             });
//         });
//     });

//     it('test readStream() with "end" before "limit"', (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream({ end: "30", limit: 50 });
//                 rs.on("data", manager.dataSpy);
//                 rs.on("end", manager.endSpy);
//                 rs.on("close", manager.verify.bind(null, rs, done));

//                 manager.sourceData = manager.sourceData.slice(0, 31);
//             });
//         });
//     });

//     // can, fairly reliably, trigger a core dump if next/end isn't
//     // protected properly
//     // the use of large blobs means that next() takes time to return
//     // so we should be able to slip in an end() while it's working
//     it("test iterator next/end race condition", (done) => {
//         const data = [];
//         let i = 5;
//         let v;

//         while (i--) {
//             v = bigBlob + i;
//             data.push({ type: "put", key: v, value: v });
//         }

//         manager.openTestDatabase((db) => {
//             db.batch(data, (err) => {
//                 assert(!err);
//                 const rs = db.createReadStream().on("close", done);
//                 rs.once("data", rs.destroy.bind(rs));
//             });
//         });
//     });

//     it("test can only end once", (done) => {
//         manager.openTestDatabase((db) => {
//             db.batch(manager.sourceData.slice(), (err) => {
//                 assert(!err);

//                 const rs = db.createReadStream()
//                     .on("close", done);

//                 process.nextTick(() => {
//                     rs.destroy();
//                 });

//             });
//         });
//     });
// });
