const tempy = require("tempy");
const mkfiletree = require("mkfiletree");
const readfiletree = require("readfiletree");
const rimraf = require("rimraf");
const makeTest = require("./make");

const {
    database: { level: { backend: { LevelDB } } },
    std: { fs, path }
} = adone;

it("test argument-less destroy() throws", () => {
    assert.throws(() => {
        LevelDB.destroy();
    }, "destroy() requires `location` and `callback` arguments", "no-arg destroy() throws");
});

it("test callback-less, 1-arg, destroy() throws", () => {
    assert.throws(() => {
        LevelDB.destroy("foo");
    }, "destroy() requires `location` and `callback` arguments", "callback-less, 1-arg destroy() throws");
});

it("test destroy non-existent directory", (done) => {
    const location = tempy.directory();
    const parent = path.dirname(location);

    // For symmetry with the opposite test below.
    assert.ok(fs.existsSync(parent), "parent exists before");

    // Cleanup to avoid conflicts with other tests
    rimraf(location, { glob: false }, (err) => {
        assert.notExists(err, "no error from rimraf()");

        LevelDB.destroy(location, (err) => {
            assert.notExists(err, "no error");

            // Assert that destroy() didn't inadvertently create the directory.
            // Or if it did, that it was at least cleaned up afterwards.
            assert.notOk(fs.existsSync(location), "directory does not exist after");
            done();
        });
    });
});

it("test destroy non-existent parent directory", (done) => {
    const location = "/1/2/3/4";
    const parent = path.dirname(location);

    assert.notOk(fs.existsSync(parent), "parent does not exist before");

    LevelDB.destroy(location, (err) => {
        assert.notExists(err, "no error");
        assert.notOk(fs.existsSync(location), "directory does not exist after");
        done();
    });
});

it("test destroy non leveldb directory", (done) => {
    const tree = {
        foo: "FOO",
        bar: { one: "ONE", two: "TWO", three: "THREE" }
    };

    mkfiletree.makeTemp("destroy-test", tree, (err, dir) => {
        assert.notExists(err, "no error from makeTemp()");

        LevelDB.destroy(dir, (err) => {
            assert.notExists(err, "no error from destroy()");

            readfiletree(dir, (err, actual) => {
                assert.notExists(err, "no error from readfiletree()");
                assert.deepEqual(actual, tree, "directory remains untouched");

                mkfiletree.cleanUp((err) => {
                    assert.notExists(err, "no error from cleanup()");
                    done();
                });
            });
        });
    });
});

makeTest("test destroy() cleans and removes leveldb-only dir", (db, done) => {
    const location = db.location;
    db.close((err) => {
        assert.notExists(err, "no error from close()");

        LevelDB.destroy(location, (err) => {
            assert.notExists(err, "no error from destroy()");
            assert.notOk(fs.existsSync(location), "directory completely removed");

            done(null, false);
        });
    });
});

makeTest("test destroy() cleans and removes only leveldb parts of a dir", (db, done) => {
    const location = db.location;
    fs.writeFileSync(path.join(location, "foo"), "FOO");

    db.close((err) => {
        assert.notExists(err, "no error from close()");

        LevelDB.destroy(location, (err) => {
            assert.notExists(err, "no error from destroy()");

            readfiletree(location, (err, tree) => {
                assert.notExists(err, "no error from readfiletree()");
                assert.deepEqual(tree, { foo: "FOO" }, "non-leveldb files left intact");

                done(null, false);
            });
        });
    });
});
