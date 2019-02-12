const makeTest = require("./make");

const {
    database: { level: { backend: { LevelDB } } },
    std: { fs }
} = adone;

it("test argument-less repair() throws", () => {
    assert.throws(() => {
        LevelDB.repair();
    }, "repair() requires `location` and `callback` arguments", "no-arg repair() throws");
});

it("test callback-less, 1-arg, repair() throws", () => {
    assert.throws(() => {
        LevelDB.repair("foo");
    }, "repair() requires `location` and `callback` arguments", "callback-less, 1-arg repair() throws");
});

it("test repair non-existent directory returns error", (done) => {
    LevelDB.repair("/1/2/3/4", (err) => {
        if (process.platform !== "win32") {
            assert.ok(/no such file or directory/i.test(err), "error on callback");
        } else {
            assert.ok(/IO error/i.test(err), "error on callback");
        }
        done();
    });
});

// a proxy indicator that RepairDB is being called and doing its thing
makeTest("test repair() compacts", (db, done) => {
    const location = db.location;

    db.close((err) => {
        assert.notExists(err, "no error from close()");

        let files = fs.readdirSync(location);
        assert.ok(files.some((f) => {
            return (/\.log$/).test(f);
        }), "directory contains log file(s)");
        assert.notOk(files.some((f) => {
            return (/\.ldb$/).test(f);
        }), "directory does not contain ldb file(s)");

        LevelDB.repair(location, (err) => {
            assert.notExists(err, "no error from repair()");

            files = fs.readdirSync(location);
            assert.notOk(files.some((f) => {
                return (/\.log$/).test(f);
            }), "directory does not contain log file(s)");
            assert.ok(files.some((f) => {
                return (/\.ldb$/).test(f);
            }), "directory contains ldb file(s)");

            done(null, false);
        });
    });
});
