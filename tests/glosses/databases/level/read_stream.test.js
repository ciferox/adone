const common = require("./common");

const {
    database: { level: { DB, backend: { Memory, Encoding } } }
} = adone;

const bigBlob = Array.apply(null, Array(1024 * 100)).map(() => {
    return "aaaaaaaaaa";
}).join("");

describe("ReadStream", () => {
    beforeEach((done) => {
        common.readStreamSetUp(done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    // TODO: test various encodings

    it("test simple ReadStream", (done) => {
        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream();
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));
            });
        });
    });

    it("test pausing", (done) => {
        let calls = 0;
        let rs;
        const pauseVerify = function () {
            assert.equal(calls, 5, "stream should still be paused");
            rs.resume();
            pauseVerify.called = true;
        };
        const onData = function () {
            if (++calls === 5) {
                rs.pause();
                setTimeout(pauseVerify, 50);
            }
        };
        const verify = function () {
            assert.equal(calls, common.sourceData.length, "onData was used in test");
            assert(pauseVerify.called, "pauseVerify was used in test");
            common.verify(rs, done);
        };

        common.dataSpy = spy(onData); // so we can still verify

        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                rs = db.createReadStream();
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("end", verify.bind(this));
            });
        });
    });

    it("test destroy() immediately", (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream();
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", () => {
                    assert.equal(common.dataSpy.callCount, 0, '"data" event was not fired');
                    assert.equal(common.endSpy.callCount, 0, '"end" event was not fired');
                    done();
                });
                rs.destroy();
            });
        });
    });

    it("test destroy() after close", (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream();
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", () => {
                    rs.destroy();
                    done();
                });
            });
        });
    });

    it("test destroy() after closing db", (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);
                db.close((err) => {
                    assert.notExists(err);
                    const rs = db.createReadStream();
                    rs.destroy();
                    done();
                });
            });
        });
    });

    it("test destroy() twice", (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream();
                rs.on("data", () => {
                    rs.destroy();
                    rs.destroy();
                    done();
                });
            });
        });
    });

    it("test destroy() half way through", (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream();
                const endSpy = spy();
                let calls = 0;
                common.dataSpy = spy(() => {
                    if (++calls === 5) {
                        rs.destroy();
                    }
                });
                rs.on("data", common.dataSpy);
                rs.on("end", endSpy);
                rs.on("close", () => {
                    // should do "data" 5 times ONLY
                    assert.equal(common.dataSpy.callCount, 5, 'ReadStream emitted correct number of "data" events (5)');
                    common.sourceData.slice(0, 5).forEach((d, i) => {
                        const call = common.dataSpy.getCall(i);
                        assert(call);
                        if (call) {
                            assert.equal(call.args.length, 1, `ReadStream "data" event #${i} fired with 1 argument`);
                            assert.notNull(call.args[0].key, `ReadStream "data" event #${i} argument has "key" property`);
                            assert.notNull(call.args[0].value, `ReadStream "data" event #${i} argument has "value" property`);
                            assert.equal(call.args[0].key, d.key, `ReadStream "data" event #${i} argument has correct "key"`);
                            assert.equal(Number(call.args[0].value), Number(d.value), `ReadStream "data" event #${i} argument has correct "value"`);
                        }
                    });
                    done();
                });
            });
        });
    });

    it('test readStream() with "reverse=true"', (done) => {
        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ reverse: true });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                common.sourceData.reverse(); // for verify
            });
        });
    });

    it('test readStream() with "start"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ start: "50" });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // slice off the first 50 so verify() expects only the last 50 even though all 100 are in the db
                common.sourceData = common.sourceData.slice(50);
            });
        });
    });

    it('test readStream() with "start" and "reverse=true"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ start: "50", reverse: true });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // reverse and slice off the first 50 so verify() expects only the first 50 even though all 100 are in the db
                common.sourceData.reverse();
                common.sourceData = common.sourceData.slice(49);
            });
        });
    });

    it('test readStream() with "start" being mid-way key (float)', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                // '49.5' doesn't actually exist but we expect it to start at '50' because '49' < '49.5' < '50' (in string terms as well as numeric)
                const rs = db.createReadStream({ start: "49.5" });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // slice off the first 50 so verify() expects only the last 50 even though all 100 are in the db
                common.sourceData = common.sourceData.slice(50);
            });
        });
    });

    it('test readStream() with "start" being mid-way key (float) and "reverse=true"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ start: "49.5", reverse: true });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // reverse & slice off the first 50 so verify() expects only the first 50 even though all 100 are in the db
                common.sourceData.reverse();
                common.sourceData = common.sourceData.slice(50);
            });
        });
    });

    it('test readStream() with "start" being mid-way key (string)', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                // '499999' doesn't actually exist but we expect it to start at '50' because '49' < '499999' < '50' (in string terms)
                // the same as the previous test but we're relying solely on string ordering
                const rs = db.createReadStream({ start: "499999" });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // slice off the first 50 so verify() expects only the last 50 even though all 100 are in the db
                common.sourceData = common.sourceData.slice(50);
            });
        });
    });

    it('test readStream() with "end"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ end: "50" });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // slice off the last 49 so verify() expects only 0 -> 50 inclusive, even though all 100 are in the db
                common.sourceData = common.sourceData.slice(0, 51);
            });
        });
    });

    it('test readStream() with "end" being mid-way key (float)', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ end: "50.5" });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // slice off the last 49 so verify() expects only 0 -> 50 inclusive, even though all 100 are in the db
                common.sourceData = common.sourceData.slice(0, 51);
            });
        });
    });

    it('test readStream() with "end" being mid-way key (string)', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ end: "50555555" });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // slice off the last 49 so verify() expects only 0 -> 50 inclusive, even though all 100 are in the db
                common.sourceData = common.sourceData.slice(0, 51);
            });
        });
    });

    it('test readStream() with "end" being mid-way key (float) and "reverse=true"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ end: "50.5", reverse: true });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                common.sourceData.reverse();
                common.sourceData = common.sourceData.slice(0, 49);
            });
        });
    });

    it('test readStream() with both "start" and "end"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ start: 30, end: 70 });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // should include 30 to 70, inclusive
                common.sourceData = common.sourceData.slice(30, 71);
            });
        });
    });

    it('test readStream() with both "start" and "end" and "reverse=true"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ start: 70, end: 30, reverse: true });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                // expect 70 -> 30 inclusive
                common.sourceData.reverse();
                common.sourceData = common.sourceData.slice(29, 70);
            });
        });
    });

    it("test hex encoding", (done) => {
        const options = { keyEncoding: "utf8", valueEncoding: "hex" };
        const data = [
            { type: "put", key: "ab", value: "abcdef0123456789" }
        ];

        common.openTestDatabase({}, (db) => {
            db.batch(data.slice(), options, (err) => {
                assert.notExists(err);

                const rs = db.createReadStream(options);
                rs.on("data", (data) => {
                    assert.equal(data.value, "abcdef0123456789");
                });
                rs.on("end", common.endSpy);
                rs.on("close", done);
            });
        });
    });

    it("test json encoding", (done) => {
        const options = { keyEncoding: "utf8", valueEncoding: "json" };
        const data = [
            { type: "put", key: "aa", value: { a: "complex", obj: 100 } },
            { type: "put", key: "ab", value: { b: "foo", bar: [1, 2, 3] } },
            { type: "put", key: "ac", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
            { type: "put", key: "ba", value: { a: "complex", obj: 100 } },
            { type: "put", key: "bb", value: { b: "foo", bar: [1, 2, 3] } },
            { type: "put", key: "bc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
            { type: "put", key: "ca", value: { a: "complex", obj: 100 } },
            { type: "put", key: "cb", value: { b: "foo", bar: [1, 2, 3] } },
            { type: "put", key: "cc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } }
        ];

        common.openTestDatabase(options, (db) => {
            db.batch(data.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream();
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done, data));
            });
        });
    });

    it("test injectable encoding", (done) => {
        const options = {
            keyEncoding: "utf8",
            valueEncoding: {
                encode: JSON.stringify,
                decode: JSON.parse,
                buffer: false
            }
        };
        const data = [
            { type: "put", key: "aa", value: { a: "complex", obj: 100 } },
            { type: "put", key: "ab", value: { b: "foo", bar: [1, 2, 3] } },
            { type: "put", key: "ac", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
            { type: "put", key: "ba", value: { a: "complex", obj: 100 } },
            { type: "put", key: "bb", value: { b: "foo", bar: [1, 2, 3] } },
            { type: "put", key: "bc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } },
            { type: "put", key: "ca", value: { a: "complex", obj: 100 } },
            { type: "put", key: "cb", value: { b: "foo", bar: [1, 2, 3] } },
            { type: "put", key: "cc", value: { c: "w00t", d: { e: [0, 10, 20, 30], f: 1, g: "wow" } } }
        ];

        common.openTestDatabase(options, (db) => {
            db.batch(data.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream();
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done, data));
            });
        });
    });

    it('test readStream() "reverse=true" not sticky (issue #6)', (done) => {
        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);
                // read in reverse, assume all's good
                const rs = db.createReadStream({ reverse: true });
                rs.on("close", () => {
                    // now try reading the other way
                    const rs = db.createReadStream();
                    rs.on("data", common.dataSpy);
                    rs.on("end", common.endSpy);
                    rs.on("close", common.verify.bind(this, rs, done));
                });
                rs.resume();
            });
        });
    });

    it("test ReadStream, start=0", (done) => {
        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ start: 0 });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));
            });
        });
    });

    // we don't expect any data to come out of here because the keys start at '00' not 0
    // we just want to ensure that we don't kill the process
    it("test ReadStream, end=0", (done) => {
        common.openTestDatabase((db) => {
            // execute
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ end: 0 });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                common.sourceData = [];
            });
        });
    });

    // this is just a fancy way of testing levelup(db).createReadStream()
    // i.e. not waiting for 'open' to complete
    // the logic for this is inside the ReadStream constructor which waits for 'ready'
    it("test ReadStream on pre-opened db", (done) => {
        const db = new DB(new Encoding(new Memory()));
        db.open();
        
        const execute = function () {
            // is in limbo
            assert.false(db.isOpen());
            assert.false(db.isClosed());

            const rs = db.createReadStream();
            rs.on("data", common.dataSpy);
            rs.on("end", common.endSpy);
            rs.on("close", common.verify.bind(this, rs, done));
        }.bind(this);
        const setup = function () {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);
                db.close((err) => {
                    assert.notExists(err);

                    let async = true;
                    db.open((err) => {
                        async = false;
                        assert.notExists(err, "no open error");
                    });

                    execute();

                    // Should open lazily
                    assert(async);
                });
            });
        };

        setup();
    });

    it('test readStream() with "limit"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ limit: 20 });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                common.sourceData = common.sourceData.slice(0, 20);
            });
        });
    });

    it('test readStream() with "start" and "limit"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ start: "20", limit: 20 });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                common.sourceData = common.sourceData.slice(20, 40);
            });
        });
    });

    it('test readStream() with "end" after "limit"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ end: "50", limit: 20 });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                common.sourceData = common.sourceData.slice(0, 20);
            });
        });
    });

    it('test readStream() with "end" before "limit"', (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream({ end: "30", limit: 50 });
                rs.on("data", common.dataSpy);
                rs.on("end", common.endSpy);
                rs.on("close", common.verify.bind(this, rs, done));

                common.sourceData = common.sourceData.slice(0, 31);
            });
        });
    });

    // can, fairly reliably, trigger a core dump if next/end isn't
    // protected properly
    // the use of large blobs means that next() takes time to return
    // so we should be able to slip in an end() while it's working
    it("test iterator next/end race condition", (done) => {
        const data = [];
        let i = 5;
        let v;

        while (i--) {
            v = bigBlob + i;
            data.push({ type: "put", key: v, value: v });
        }

        common.openTestDatabase((db) => {
            db.batch(data, (err) => {
                assert.false(Boolean(err));
                const rs = db.createReadStream().on("close", done);
                rs.once("data", () => {
                    rs.destroy();
                });
            });
        });
    });

    it("test can only end once", (done) => {
        common.openTestDatabase((db) => {
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);

                const rs = db.createReadStream()
                    .on("close", done);

                process.nextTick(() => {
                    rs.destroy();
                });
            });
        });
    });
});
