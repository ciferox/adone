const {
    module: { resolve }
} = adone;

const path = require("path");

it("mock", () => {
    const files = {};
    files[path.resolve("/foo/bar/baz.js")] = "beep";

    const dirs = {};
    dirs[path.resolve("/foo/bar")] = true;

    const opts = (basedir) => ({
        basedir: path.resolve(basedir),
        isFile(file) {
            return Object.prototype.hasOwnProperty.call(files, path.resolve(file));
        },
        isDirectory(dir) {
            return Boolean(dirs[path.resolve(dir)]);
        },
        readFileSync(file) {
            return files[path.resolve(file)];
        }
    });

    assert.equal(
        resolve("./baz", opts("/foo/bar")),
        path.resolve("/foo/bar/baz.js")
    );

    assert.equal(
        resolve("./baz.js", opts("/foo/bar")),
        path.resolve("/foo/bar/baz.js")
    );

    assert.throws(() => {
        resolve("baz", opts("/foo/bar"));
    });

    assert.throws(() => {
        resolve("../baz", opts("/foo/bar"));
    });
});

it("mock package", () => {
    const files = {};
    files[path.resolve("/foo/node_modules/bar/baz.js")] = "beep";
    files[path.resolve("/foo/node_modules/bar/package.json")] = JSON.stringify({
        main: "./baz.js"
    });

    const dirs = {};
    dirs[path.resolve("/foo")] = true;

    const opts = (basedir) => ({
        basedir: path.resolve(basedir),
        isFile(file) {
            return Object.prototype.hasOwnProperty.call(files, path.resolve(file));
        },
        isDirectory(dir) {
            return Boolean(dirs[path.resolve(dir)]);
        },
        readFileSync(file) {
            return files[path.resolve(file)];
        }
    });

    assert.equal(
        resolve("bar", opts("/foo")),
        path.resolve("/foo/node_modules/bar/baz.js")
    );
});
