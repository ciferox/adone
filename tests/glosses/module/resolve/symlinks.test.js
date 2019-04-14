const {
    module: { resolve }
} = adone;
const path = require("path");
const fs = require("fs");

const symlinkDir = path.join(__dirname, "resolver", "symlinked", "symlink");
try {
    fs.unlinkSync(symlinkDir);
} catch (err) { }
try {
    fs.symlinkSync("./_/symlink_target", symlinkDir, "dir");
} catch (err) {
    if (err.code !== "EEXIST") {
        // if fails then it is probably on Windows and lets try to create a junction
        fs.symlinkSync(`${path.join(__dirname, "resolver", "symlinked", "_", "symlink_target")}\\`, symlinkDir, "junction");
    }
}

it("symlink", () => {
    const res = resolve("foo", { basedir: symlinkDir });
    assert.equal(res, path.join(__dirname, "resolver", "symlinked", "_", "node_modules", "foo.js"));
});

it("sync symlink when preserveSymlinks = true", () => {
    const err = assert.throws(() => resolve("foo", { basedir: symlinkDir, preserveSymlinks: true }));
    assert.equal(err && err.code, "MODULE_NOT_FOUND", "error code matches require.resolve");
    assert.equal(
        err && err.message,
        `Cannot find module 'foo' from '${symlinkDir}'`,
        "can not find nonexistent module"
    );
});

it("sync symlink", () => {
    const start = new Date();
    assert.equal(resolve("foo", { basedir: symlinkDir, preserveSymlinks: false }), path.join(__dirname, "resolver", "symlinked", "_", "node_modules", "foo.js"));
    assert.ok(new Date() - start < 50, "resolve.sync timedout");
});

it("sync symlink when preserveSymlinks = true", () => {
    assert.throws(() => {
        resolve("foo", { basedir: symlinkDir, preserveSymlinks: true });
    }, /Cannot find module 'foo'/);
});
