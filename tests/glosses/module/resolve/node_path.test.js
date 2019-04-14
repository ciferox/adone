const {
    module: { resolve }
} = adone;

const fs = require("fs");
const path = require("path");

it("$NODE_PATH", () => {
    const isDir = function (dir) {
        if (dir === "/node_path" || dir === "node_path/x") {
            return true;
        }
        try {
            const stat = fs.statSync(dir);
            return stat.isDirectory();
        } catch (err) {
            if (err.code === "ENOENT" || err.code === "ENOTDIR") {
                return false;
            }
            throw err;
        }
    };

    let res = resolve("aaa", {
        paths: [
            path.join(__dirname, "/node_path/x"),
            path.join(__dirname, "/node_path/y")
        ],
        basedir: __dirname,
        isDirectory: isDir
    });
    assert.equal(res, path.join(__dirname, "/node_path/x/aaa/index.js"), "aaa resolves");

    res = resolve("bbb", {
        paths: [
            path.join(__dirname, "/node_path/x"),
            path.join(__dirname, "/node_path/y")
        ],
        basedir: __dirname,
        isDirectory: isDir
    });
    assert.equal(res, path.join(__dirname, "/node_path/y/bbb/index.js"), "bbb resolves");

    res = resolve("ccc", {
        paths: [
            path.join(__dirname, "/node_path/x"),
            path.join(__dirname, "/node_path/y")
        ],
        basedir: __dirname,
        isDirectory: isDir
    });
    assert.equal(res, path.join(__dirname, "/node_path/x/ccc/index.js"), "ccc resolves");

    // ensure that relative paths still resolve against the regular `node_modules` correctly
    res = resolve("safe-buffer", {
        paths: [
            "node_path"
        ],
        basedir: path.join(__dirname, "node_path/x"),
        isDirectory: isDir
    });
    const root = require("safe-buffer/package.json").main;
    assert.equal(res, path.resolve(adone.ROOT_PATH, "node_modules/safe-buffer", root), "safe-buffer resolves");
});
