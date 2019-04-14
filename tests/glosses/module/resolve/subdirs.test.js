const {
    module: { resolve }
} = adone;
const path = require("path");

it("subdirs", () => {
    const dir = path.join(__dirname, "/subdirs");
    const res = resolve("a/b/c/x.json", { basedir: dir });
    assert.equal(res, path.join(dir, "node_modules/a/b/c/x.json"));
});
