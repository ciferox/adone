const { core } = adone.js.compiler;
const { fs, path } = adone.std;

// Test that plugins & presets are resolved relative to `filename`.
describe.skip("js", "compiler", "core", "addon resolution", () => {
    it("addon resolution", async () => {
        const fixtures = {};
        const paths = {};

        paths.fixtures = path.join(
            __dirname,
            "fixtures",
            "resolution",
            "resolve-addons-relative-to-file"
        );

        const p = [];
        for (const key of ["actual", "expected"]) {
            paths[key] = path.join(paths.fixtures, `${key}.js`);

            p.push(new Promise((resolve, reject) => {
                fs.readFile(paths[key], { encoding: "utf8" }, (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    fixtures[key] = data.trim();
                    resolve();
                });
            }));
        }
        await Promise.all(p);

        const actual = core.transform(fixtures.actual, {
            filename: paths.actual,
            plugins: ["addons/plugin"],
            presets: ["addons/preset"]
        }).code;

        assert.equal(actual, fixtures.expected);
    });
});
