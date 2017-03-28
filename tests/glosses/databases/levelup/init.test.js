const { levelup } = adone.database;
const { errors } = levelup;
const fs = require("fs");
const common = require("./common");
const refute = require("referee").refute;
const MemDOWN = require("memdown");

describe.skip("Init & open()", () => {
    let ctx;
    beforeEach((done) => {
        ctx = {};
        common.commonSetUp(ctx, done);
    });

    afterEach((done) => {
        common.commonTearDown(done);
    });

    it("levelup()", () => {
        assert.isFunction(levelup);
        assert.equal(levelup.length, 3); // location, options & callback arguments
        assert.throws(levelup, errors.InitializationError); // no location
    });

    it("default options", (done) => {
        const location = common.nextLocation();
        levelup(location, { createIfMissing: true }, (err, db) => {
            refute(err, "no error");
            assert.isTrue(db.isOpen());
            ctx.closeableDatabases.push(db);
            ctx.cleanupDirs.push(location);
            db.close((err) => {
                refute(err);

                assert.isFalse(db.isOpen());

                levelup(location, (err, db) => { // no options object
                    refute(err);
                    assert.isObject(db);
                    assert.isTrue(db.options.createIfMissing);
                    assert.isFalse(db.options.errorIfExists);
                    assert.equal(db.options.keyEncoding, "utf8");
                    assert.equal(db.options.valueEncoding, "utf8");
                    assert.equal(db.location, location);

                    // read-only properties
                    try {
                        db.location = "foo";
                    } catch (err) { /*ignore*/ }
                    assert.equal(db.location, location);

                    done();
                });
            });
        });
    });

    it("basic options", (done) => {
        const location = common.nextLocation();
        levelup(location, { createIfMissing: true, errorIfExists: true, valueEncoding: "binary" }, (err, db) => {
            refute(err);

            ctx.closeableDatabases.push(db);
            ctx.cleanupDirs.push(location);
            assert.isObject(db);
            assert.isTrue(db.options.createIfMissing);
            assert.isTrue(db.options.errorIfExists);
            assert.equal(db.options.keyEncoding, "utf8");
            assert.equal(db.options.valueEncoding, "binary");
            assert.equal(db.location, location);


            // read-only properties
            try {
                db.location = "bar";
            } catch (err) { /*ignore*/ }
            assert.equal(db.location, location);

            done();
        }
        );
    });

    it("options with encoding", (done) => {
        const location = common.nextLocation();
        levelup(location, { createIfMissing: true, errorIfExists: true, keyEncoding: "ascii", valueEncoding: "json" }, (err, db) => {
            refute(err);

            ctx.closeableDatabases.push(db);
            ctx.cleanupDirs.push(location);
            assert.isObject(db);
            assert.isTrue(db.options.createIfMissing);
            assert.isTrue(db.options.errorIfExists);
            assert.equal(db.options.keyEncoding, "ascii");
            assert.equal(db.options.valueEncoding, "json");
            assert.equal(db.location, location);


            // read-only properties
            try {
                db.location = "bar";
            } catch (err) { }
            assert.equal(db.location, location);

            done();
        }
        );
    });

    it("without callback", (done) => {
        const location = common.nextLocation();
        const db = levelup(location, { createIfMissing: true, errorIfExists: true });

        ctx.closeableDatabases.push(db);
        ctx.cleanupDirs.push(location);
        assert.isObject(db);
        assert.isTrue(db.options.createIfMissing);
        assert.isTrue(db.options.errorIfExists);
        assert.equal(db.location, location);

        db.on("ready", () => {
            assert.isTrue(db.isOpen());
            done();
        });
    });

    it("open() with !createIfMissing expects error", (done) => {
        levelup(ctx.cleanupDirs[0] = common.nextLocation(), { createIfMissing: false }, (err, db) => {
            assert(err);
            refute(db);
            assert.instanceOf(err, Error);
            assert.instanceOf(err, errors.LevelUPError);
            assert.instanceOf(err, errors.OpenError);
            assert(err.notFound === undefined, "err.notFound is `undefined`, should only be on NotFoundError");
            done();
        });
    });

    it("open() with createIfMissing expects directory to be created", (done) => {
        levelup(ctx.cleanupDirs[0] = common.nextLocation(), { createIfMissing: true }, (err, db) => {
            ctx.closeableDatabases.push(db);
            refute(err);
            assert.isTrue(db.isOpen());
            fs.stat(ctx.cleanupDirs[0], (err, stat) => {
                refute(err);
                assert(stat.isDirectory());
                done();
            });
        });
    });

    it("open() with errorIfExists expects error if exists", (done) => {
        levelup(ctx.cleanupDirs[0] = common.nextLocation(), { createIfMissing: true }, (err, db) => {
            ctx.closeableDatabases.push(db);
            refute(err); // sanity
            levelup(ctx.cleanupDirs[0], { errorIfExists: true }, (err) => {
                assert(err);
                assert.instanceOf(err, Error);
                assert.instanceOf(err, errors.LevelUPError);
                assert.instanceOf(err, errors.OpenError);
                done();
            });
        });
    });

    it("open() with !errorIfExists does not expect error if exists", (done) => {
        levelup(ctx.cleanupDirs[0] = common.nextLocation(), { createIfMissing: true }, (err, db) => {
            refute(err); // sanity
            ctx.closeableDatabases.push(db);
            assert.isTrue(db.isOpen());

            db.close(() => {
                assert.isFalse(db.isOpen());

                levelup(ctx.cleanupDirs[0], { errorIfExists: false }, (err, db) => {
                    refute(err);
                    ctx.closeableDatabases.push(db);
                    assert.isTrue(db.isOpen());
                    done();
                });
            });
        });
    });

    it("constructor with options argument uses factory", (done) => {
        const db = levelup({ db: MemDOWN });
        assert.isNull(db.location, "location property is null");
        db.on("open", () => {
            assert(db.db instanceof MemDOWN, "using a memdown backend");
            assert.equal(db.db.location, "", 'db location property is ""');
            db.put("foo", "bar", (err) => {
                refute(err, "no error");
                db.get("foo", (err, value) => {
                    assert.equal(value, "bar", "correct value");
                    done();
                });
            });
        });
    });

    it("constructor with only function argument uses factory", (done) => {
        const db = levelup(MemDOWN);
        assert.isNull(db.location, "location property is null");
        db.on("open", () => {
            assert(db.db instanceof MemDOWN, "using a memdown backend");
            assert.equal(db.db.location, "", 'db location property is ""');
            db.put("foo", "bar", (err) => {
                refute(err, "no error");
                db.get("foo", (err, value) => {
                    assert.equal(value, "bar", "correct value");
                    done();
                });
            });
        });
    });
});
