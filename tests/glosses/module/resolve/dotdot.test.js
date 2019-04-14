const {
    module: { resolve }
} = adone;

const path = require("path");

it("dotdot", () => {
    const dir = path.join(__dirname, "/dotdot/abc");

    const a = resolve("..", { basedir: dir });
    assert.equal(a, path.join(__dirname, "dotdot/index.js"));

    const b = resolve(".", { basedir: dir });
    assert.equal(b, path.join(dir, "index.js"));
});
