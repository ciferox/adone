const { data: { json5 } } = adone;

require.extensions[".json5"] = (module, filename) => {
    const content = adone.std.fs.readFileSync(filename, "utf8");
    module.exports = json5.decode(content);
};

const fixturePath = (name) => {
    return adone.std.path.resolve(__dirname, "fixtures", name);
};

describe("data", "json5", "require", () => {
    it("hook", () => {
        const json = require(fixturePath("misc/npm-package.json"));
        const json5 = require(fixturePath("misc/npm-package.json5"));

        assert.deepEqual(json5, json);
    });
});
