const {
    module: { resolve }
} = adone;

const path = require("path");

it("precedence", () => {
    const dir = path.join(__dirname, "precedence/aaa");

    const res = resolve("./", { basedir: dir });
    assert.equal(res, path.join(dir, "index.js"));
});

it("./ should not load ${dir}.js", () => { // eslint-disable-line no-template-curly-in-string
    const dir = path.join(__dirname, "precedence/bbb");

    assert.throws(() => resolve("./", { basedir: dir }));
});
