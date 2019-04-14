const {
    module: { resolve }
} = adone;
const path = require("path");

it("shadowed core modules still return core module", () => {
    const res = resolve("util", { basedir: path.join(__dirname, "shadowed_core") });

    assert.equal(res, "util");
});

it("shadowed core modules return shadow when appending `/`", () => {
    const res = resolve("util/", { basedir: path.join(__dirname, "shadowed_core") });

    assert.equal(res, path.join(__dirname, "shadowed_core/node_modules/util/index.js"));
});

