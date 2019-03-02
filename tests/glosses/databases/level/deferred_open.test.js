const async = require("async");
const concat = require("concat-stream");
const common = require("./common");

const {
    database: { level: { DB, backend: { Memory, Encoding } } }
} = adone;

describe("Deferred open()", () => {
    before((done) => {
        common.commonSetUp(done);
    });

    after((done) => {
        common.commonTearDown(done);
    });

    it("put() and get() on pre-opened database", (done) => {
        // 1) open database without callback, opens in next tick
        const db = new DB(new Encoding(new Memory()));
        db.open();

        common.closeableDatabases.push(db);
        assert.isObject(db);

        async.parallel([
            // 2) insert 3 values with put(), these should be deferred until the database is actually open
            db.put.bind(db, "k1", "v1"),
            db.put.bind(db, "k2", "v2"),
            db.put.bind(db, "k3", "v3")
        ], () => {
            // 3) when the callbacks have returned, the database should be open and those values should be in
            //    verify that the values are there
            async.forEach([1, 2, 3], (k, cb) => {
                db.get(`k${k}`, (err, v) => {
                    assert.notExists(err);
                    assert.equal(v, `v${k}`);
                    cb();
                });
            }, () => {
                db.get("k4", (err) => {
                    assert(err);
                    // DONE
                    done();
                });
            });
        });

        // we should still be in a state of limbo down here, not opened or closed, but 'new'
        assert.isFalse(db.isOpen());
        assert.isFalse(db.isClosed());
    });

    it("batch() on pre-opened database", (done) => {
        // 1) open database without callback, opens in next tick
        const db = new DB(new Encoding(new Memory()));
        db.open();

        common.closeableDatabases.push(db);
        assert.isObject(db);

        // 2) insert 3 values with batch(), these should be deferred until the database is actually open
        db.batch([
            { type: "put", key: "k1", value: "v1" },
            { type: "put", key: "k2", value: "v2" },
            { type: "put", key: "k3", value: "v3" }
        ], () => {
            // 3) when the callbacks have returned, the database should be open and those values should be in
            //    verify that the values are there
            async.forEach([1, 2, 3], (k, cb) => {
                db.get(`k${k}`, (err, v) => {
                    assert.notExists(err);
                    assert.equal(v, `v${k}`);
                    cb();
                });
            }, () => {
                db.get("k4", (err) => {
                    assert(err);
                    // DONE
                    done();
                });
            });
        });

        // we should still be in a state of limbo down here, not opened or closed, but 'new'
        assert.isFalse(db.isOpen());
        assert.isFalse(db.isClosed());
    });

    it("chained batch() on pre-opened database", (done) => {
        // 1) open database without callback, opens in next tick
        const db = new DB(new Encoding(new Memory()));
        db.open();

        common.closeableDatabases.push(db);
        assert.isObject(db);

        // 2) insert 3 values with batch(), these should be deferred until the database is actually open
        db.batch()
            .put("k1", "v1")
            .put("k2", "v2")
            .put("k3", "v3")
            .write(() => {
                // 3) when the callbacks have returned, the database should be open and those values should be in
                //    verify that the values are there
                async.forEach([1, 2, 3], (k, cb) => {
                    db.get(`k${k}`, (err, v) => {
                        assert.notExists(err);
                        assert.equal(v, `v${k}`);
                        cb();
                    });
                }, () => {
                    db.get("k4", (err) => {
                        assert(err);
                        // DONE
                        done();
                    });
                });
            });

        // we should still be in a state of limbo down here, not opened or closed, but 'new'
        assert.isFalse(db.isOpen());
        assert.isFalse(db.isClosed());
    });

    describe("test deferred ReadStream", () => {
        before((done) => {
            common.readStreamSetUp(done);
        });

        it("simple ReadStream", (done) => {
            const db = new DB(new Encoding(new Memory()));
            db.open();
            db.batch(common.sourceData.slice(), (err) => {
                assert.notExists(err);
                db.close((err) => {
                    assert.notExists(err, "no error");
                    let async = true;

                    db.open((err) => {
                        async = false;
                        assert.notExists(err, "no open error");
                    });

                    common.closeableDatabases.push(db);
                    const rs = db.createReadStream();
                    rs.on("data", common.dataSpy);
                    rs.on("end", common.endSpy);
                    rs.on("close", common.verify.bind(this, rs, done));

                    // db should open lazily
                    assert(async);
                });
            });
        });
    });

    it.todo("maxListeners warning", (done) => {
        // 1) open database without callback, opens in next tick
        const db = new DB(new Encoding(new Memory()));
        // const stderrMock = common.mock(console);

        common.closeableDatabases.push(db);
        // stderrMock.expects("error").never();

        // 2) provoke an EventEmitter maxListeners warning
        let toPut = 11;

        for (let i = 0; i < toPut; i++) {
            // eslint-disable-next-line no-loop-func
            db.put("some", "string", (err) => {
                assert.notExists(err);
                if (!--toPut) {
                    done();
                }
            });
        }
    });

    it("value of queued operation is not serialized", (done) => {
        const db = new DB(new Encoding(new Memory(), { valueEncoding: "json" }));
        db.open();

        common.closeableDatabases.push(db);

        // deferred-leveldown < 2.0.2 would serialize the object to a string.
        db.put("key", { thing: 2 }, (err) => {
            assert.notExists(err);

            db.get("key", (err, value) => {
                assert.notExists(err);
                assert.deepEqual(value, { thing: 2 });
                done();
            });
        });
    });

    it("key of queued operation is not serialized", (done) => {
        const db = new DB(new Encoding(new Memory(), { keyEncoding: "json" }));
        db.open();

        common.closeableDatabases.push(db);

        // deferred-leveldown < 2.0.2 would serialize the key to a string.
        db.put({ thing: 2 }, "value", (err) => {
            assert.notExists(err);

            db.createKeyStream().pipe(concat((result) => {
                assert.deepEqual(result, [{ thing: 2 }]);
                done();
            }));
        });
    });
});
