const {
    module: { resolve }
} = adone;

const path = require("path");

it("faulty basedir must produce error in windows", { skip: process.platform !== "win32" }, (done) => {
    const resolverDir = "C:\\a\\b\\c\\d";
    try {
        resolve("tape/lib/test.js", { basedir: resolverDir });
    } catch (err) {
        assert.equal(Boolean(err), true);
        done();
    }
});

it("non-existent basedir should not throw when preserveSymlinks is false", (done) => {
    const opts = {
        basedir: path.join(path.sep, "unreal", "path", "that", "does", "not", "exist"),
        preserveSymlinks: false
    };

    const module = "./dotdot/abc";

    try {
        resolve(module, opts);
    } catch (err) {
        assert.equal(err.code, "INVALID_BASEDIR");
        done();
    }
});
