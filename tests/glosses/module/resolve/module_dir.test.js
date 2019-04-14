const {
    module: { resolve }
} = adone;

const path = require("path");

it("moduleDirectory strings", () => {
    const dir = path.join(__dirname, "module_dir");
    const xopts = {
        basedir: dir,
        moduleDirectory: "xmodules"
    };
    let res = resolve("aaa", xopts);
    assert.equal(res, path.join(dir, "/xmodules/aaa/index.js"));

    const yopts = {
        basedir: dir,
        moduleDirectory: "ymodules"
    };
    res = resolve("aaa", yopts);
    assert.equal(res, path.join(dir, "/ymodules/aaa/index.js"));
});

it("moduleDirectory array", () => {
    const dir = path.join(__dirname, "module_dir");
    const aopts = {
        basedir: dir,
        moduleDirectory: ["xmodules", "ymodules", "zmodules"]
    };
    let res = resolve("aaa", aopts);
    assert.equal(res, path.join(dir, "/xmodules/aaa/index.js"));

    const bopts = {
        basedir: dir,
        moduleDirectory: ["zmodules", "ymodules", "xmodules"]
    };
    res = resolve("aaa", bopts);
    assert.equal(res, path.join(dir, "/ymodules/aaa/index.js"));

    const copts = {
        basedir: dir,
        moduleDirectory: ["xmodules", "ymodules", "zmodules"]
    };
    res = resolve("bbb", copts);
    assert.equal(res, path.join(dir, "/zmodules/bbb/main.js"));
});
