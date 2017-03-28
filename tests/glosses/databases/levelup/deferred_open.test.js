const { levelup } = adone.database;
const async = require("async");
const common = require("./common");
const refute = require("referee").refute;

describe("Deferred open()", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("put() and get() on pre-opened database", (done) => {
        const location = common.nextLocation();
        // 1) open database without callback, opens in worker thread
        const db = levelup(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });

        ctx.closeableDatabases.push(db);
        ctx.cleanupDirs.push(location);
        assert.isObject(db);
        assert.equal(db.location, location);

        async.parallel([
            // 2) insert 3 values with put(), these should be deferred until the database is actually open
            db.put.bind(db, "k1", "v1")
            , db.put.bind(db, "k2", "v2")
            , db.put.bind(db, "k3", "v3")
        ], () => {
            // 3) when the callbacks have returned, the database should be open and those values should be in
            //    verify that the values are there
            async.forEach(
                [1, 2, 3]
                , (k, cb) => {
                    db.get(`k${k}`, (err, v) => {
                        refute(err);
                        assert.equal(v, `v${k}`);
                        cb();
                    });
                }
                // sanity, this shouldn't exist
                , () => {
                    db.get("k4", (err) => {
                        assert(err);
                        // DONE
                        done();
                    });
                }
            );
        });

        // we should still be in a state of limbo down here, not opened or closed, but 'new'
        refute(db.isOpen());
        refute(db.isClosed());
    });

    it("batch() on pre-opened database", (done) => {
        const location = common.nextLocation();
        // 1) open database without callback, opens in worker thread
        const db = levelup(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });

        ctx.closeableDatabases.push(db);
        ctx.cleanupDirs.push(location);
        assert.isObject(db);
        assert.equal(db.location, location);

        // 2) insert 3 values with batch(), these should be deferred until the database is actually open
        db.batch([
            { type: "put", key: "k1", value: "v1" }
            , { type: "put", key: "k2", value: "v2" }
            , { type: "put", key: "k3", value: "v3" }
        ], () => {
            // 3) when the callbacks have returned, the database should be open and those values should be in
            //    verify that the values are there
            async.forEach(
                [1, 2, 3]
                , (k, cb) => {
                    db.get(`k${k}`, (err, v) => {
                        refute(err);
                        assert.equal(v, `v${k}`);
                        cb();
                    });
                }
                // sanity, this shouldn't exist
                , () => {
                    db.get("k4", (err) => {
                        assert(err);
                        // DONE
                        done();
                    });
                }
            );
        });

        // we should still be in a state of limbo down here, not opened or closed, but 'new'
        refute(db.isOpen());
        refute(db.isClosed());
    });

    it("chained batch() on pre-opened database", (done) => {
        const location = common.nextLocation();
        // 1) open database without callback, opens in worker thread
        const db = levelup(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });

        ctx.closeableDatabases.push(db);
        ctx.cleanupDirs.push(location);
        assert.isObject(db);
        assert.equal(db.location, location);

        // 2) insert 3 values with batch(), these should be deferred until the database is actually open
        db.batch()
            .put("k1", "v1")
            .put("k2", "v2")
            .put("k3", "v3")
            .write(() => {
                // 3) when the callbacks have returned, the database should be open and those values should be in
                //    verify that the values are there
                async.forEach(
                    [1, 2, 3]
                    , (k, cb) => {
                        db.get(`k${k}`, (err, v) => {
                            refute(err);
                            assert.equal(v, `v${k}`);
                            cb();
                        });
                    }
                    // sanity, this shouldn't exist
                    , () => {
                        db.get("k4", (err) => {
                            assert(err);
                            // DONE
                            done();
                        });
                    }
                );

            });

        // we should still be in a state of limbo down here, not opened or closed, but 'new'
        refute(db.isOpen());
        refute(db.isClosed());
    });

    describe("test deferred ReadStream", () => {
        beforeEach((done) => {
            common.readStreamSetUp(ctx, done);
        });

        it("simple ReadStream", (done) => {
            ctx.openTestDatabase((db) => {
                const location = db.location;
                db.batch(ctx.sourceData.slice(), (err) => {
                    refute(err);
                    db.close((err) => {
                        refute(err, "no error");
                        db = levelup(location, { createIfMissing: false, errorIfExists: false });
                        const rs = db.createReadStream();
                        rs.on("data", ctx.dataSpy);
                        rs.on("end", ctx.endSpy);
                        rs.on("close", ctx.verify.bind(this, rs, done));
                    });
                });
            });
        });
    });

    it("maxListeners warning", (done) => {
        const location = common.nextLocation();
        // 1) open database without callback, opens in worker thread
        const db = levelup(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "utf8" });
        const stderrMock = mock(console);

        ctx.closeableDatabases.push(db);
        ctx.cleanupDirs.push(location);
        stderrMock.expects("error").never();

        // 2) provoke an EventEmitter maxListeners warning
        let toPut = 11;

        for (let i = 0; i < toPut; i++) {
            db.put("some", "string", (err) => {
                refute(err);

                if (!--toPut) {
                    done();
                }
            });
        }
    });
});
