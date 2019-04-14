const {
    module: { resolve }
} = adone;
const path = require("path");

it("foo", () => {
    const dir = path.join(__dirname, "resolver");

    assert.equal(
        resolve("./foo", { basedir: dir }),
        path.join(dir, "foo.js")
    );

    assert.equal(
        resolve("./foo.js", { basedir: dir }),
        path.join(dir, "foo.js")
    );

    assert.equal(
        resolve("./foo.js", { basedir: dir, filename: path.join(dir, "bar.js") }),
        path.join(dir, "foo.js")
    );

    assert.throws(() => {
        resolve("foo", { basedir: dir });
    });

    // Test that filename is reported as the "from" value when passed.
    const err = assert.throws(
        () => {
            resolve("foo", { basedir: dir, filename: path.join(dir, "bar.js") });
        }, Error);

    assert.equal(err.message, `Cannot find module 'foo' from '${path.join(dir, "bar.js")}'`);
});

it("bar", () => {
    const dir = path.join(__dirname, "resolver");

    assert.equal(
        resolve("foo", { basedir: path.join(dir, "bar") }),
        path.join(dir, "bar/node_modules/foo/index.js")
    );
});

it("baz", () => {
    const dir = path.join(__dirname, "resolver");

    assert.equal(
        resolve("./baz", { basedir: dir }),
        path.join(dir, "baz/quux.js")
    );
});

it("biz", () => {
    const dir = path.join(__dirname, "resolver/biz/node_modules");
    assert.equal(
        resolve("./grux", { basedir: dir }),
        path.join(dir, "grux/index.js")
    );

    assert.equal(
        resolve("tiv", { basedir: path.join(dir, "grux") }),
        path.join(dir, "tiv/index.js")
    );

    assert.equal(
        resolve("grux", { basedir: path.join(dir, "tiv") }),
        path.join(dir, "grux/index.js")
    );
});

it("normalize", () => {
    const dir = path.join(__dirname, "resolver/biz/node_modules/grux");
    assert.equal(
        resolve("../grux", { basedir: dir }),
        path.join(dir, "index.js")
    );
});

it("cup", () => {
    const dir = path.join(__dirname, "resolver");
    assert.equal(
        resolve("./cup", {
            basedir: dir,
            extensions: [".js", ".coffee"]
        }),
        path.join(dir, "cup.coffee")
    );

    assert.equal(
        resolve("./cup.coffee", { basedir: dir }),
        path.join(dir, "cup.coffee")
    );

    assert.throws(() => {
        resolve("./cup", {
            basedir: dir,
            extensions: [".js"]
        });
    });
});

it("mug", () => {
    const dir = path.join(__dirname, "resolver");
    assert.equal(
        resolve("./mug", { basedir: dir }),
        path.join(dir, "mug.js")
    );

    assert.equal(
        resolve("./mug", {
            basedir: dir,
            extensions: [".coffee", ".js"]
        }),
        path.join(dir, "mug.coffee")
    );

    assert.equal(
        resolve("./mug", {
            basedir: dir,
            extensions: [".js", ".coffee"]
        }),
        path.join(dir, "mug.js")
    );
});

it("other path", () => {
    const resolverDir = path.join(__dirname, "resolver");
    const dir = path.join(resolverDir, "bar");
    const otherDir = path.join(resolverDir, "other_path");

    assert.equal(
        resolve("root", {
            basedir: dir,
            paths: [otherDir]
        }),
        path.join(resolverDir, "other_path/root.js")
    );

    assert.equal(
        resolve("lib/other-lib", {
            basedir: dir,
            paths: [otherDir]
        }),
        path.join(resolverDir, "other_path/lib/other-lib.js")
    );

    assert.throws(() => {
        resolve("root", { basedir: dir });
    });

    assert.throws(() => {
        resolve("zzz", {
            basedir: dir,
            paths: [otherDir]
        });
    });
});

it("incorrect main", () => {
    const resolverDir = path.join(__dirname, "resolver");
    const dir = path.join(resolverDir, "incorrect_main");

    assert.equal(
        resolve("./incorrect_main", { basedir: resolverDir }),
        path.join(dir, "index.js")
    );
});

const stubStatSync = function stubStatSync(fn) {
    const fs = require("fs");
    const statSync = fs.statSync;
    try {
        fs.statSync = function () {
            throw new EvalError("Unknown Error");
        };
        return fn();
    } finally {
        fs.statSync = statSync;
    }
};

it("#79 - re-throw non ENOENT errors from stat", () => {
    const dir = path.join(__dirname, "resolver");

    stubStatSync(() => {
        assert.throws(() => {
            resolve("foo", { basedir: dir });
        }, /Unknown Error/);
    });
});

it('#52 - incorrectly resolves module-paths like "./someFolder/" when there is a file of the same name', () => {
    const dir = path.join(__dirname, "resolver");

    assert.equal(
        resolve("./foo", { basedir: path.join(dir, "same_names") }),
        path.join(dir, "same_names/foo.js")
    );
    assert.equal(
        resolve("./foo/", { basedir: path.join(dir, "same_names") }),
        path.join(dir, "same_names/foo/index.js")
    );
});

it("sync: #121 - treating an existing file as a dir when no basedir", () => {
    const testFile = path.basename(__filename);

    it("sanity check", () => {
        assert.equal(
            resolve(`./${testFile}`),
            __filename,
            "sanity check"
        );
    });

    it("with a fake directory", () => {
        const run = () => resolve(`./${testFile}/blah`);

        assert.throws(run);

        try {
            run();
        } catch (e) {
            assert.equal(e.code, "MODULE_NOT_FOUND", "error code matches require.resolve");
            assert.equal(
                e.message,
                `Cannot find module './${testFile}/blah' from '${__dirname}'`,
                "can not find nonexistent module"
            );
        }
    });
});

it("sync dot main", () => {
    const start = new Date();
    assert.equal(resolve("./resolver/dot_main"), path.join(__dirname, "resolver/dot_main/index.js"));
    assert.ok(new Date() - start < 50, "resolve.sync timedout");
});

it("sync dot slash main", () => {
    const start = new Date();
    assert.equal(resolve("./resolver/dot_slash_main"), path.join(__dirname, "resolver/dot_slash_main/index.js"));
    assert.ok(new Date() - start < 50, "resolve.sync timedout");
});

it("not a directory", () => {
    const path = "./foo";
    try {
        resolve(path, { basedir: __filename });
        assert.fail();
    } catch (err) {
        assert.ok(err, "a non-directory errors");
        assert.equal(err && err.message, `Provided basedir "${__filename}" is not a directory, or a symlink to a directory`);
        assert.equal(err && err.code, "INVALID_BASEDIR");
    }
});

it('non-string "main" field in package.json', () => {
    const dir = path.join(__dirname, "resolver");
    try {
        const result = resolve("./invalid_main", { basedir: dir });
        assert.equal(result, undefined, "result should not exist");
        assert.fail("should not get here");
    } catch (err) {
        assert.ok(err, "errors on non-string main");
        assert.equal(err.message, "package “invalid main” `main` must be a string");
        assert.equal(err.code, "INVALID_PACKAGE_MAIN");
    }
});

it('non-string "main" field in package.json', () => {
    const dir = path.join(__dirname, "resolver");
    try {
        const result = resolve("./invalid_main", { basedir: dir });
        assert.equal(result, undefined, "result should not exist");
        assert.fail("should not get here");
    } catch (err) {
        assert.ok(err, "errors on non-string main");
        assert.equal(err.message, "package “invalid main” `main` must be a string");
        assert.equal(err.code, "INVALID_PACKAGE_MAIN");
    }
});

it("browser field in package.json", () => {
    const dir = path.join(__dirname, "resolver");
    const res = resolve("./browser_field", {
        basedir: dir,
        packageFilter: function packageFilter(pkg) {
            if (pkg.browser) {
                pkg.main = pkg.browser;
                delete pkg.browser;
            }
            return pkg;
        }
    });
    assert.equal(res, path.join(dir, "browser_field", "b.js"));
});
