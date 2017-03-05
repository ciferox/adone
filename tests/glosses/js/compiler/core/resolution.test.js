
let async = require("async");
const { core } = adone.js.compiler;
const { fs, path } = adone.std;

// Test that plugins & presets are resolved relative to `filename`.
describe.skip("addon resolution", function () {
    it("addon resolution", function (done) {
        let fixtures = {};
        let paths = {};

        paths.fixtures = path.join(
            __dirname,
            "fixtures",
            "resolution",
            "resolve-addons-relative-to-file"
        );

        async.each(
            ["actual", "expected"],
            function (key, mapDone) {
                paths[key] = path.join(paths.fixtures, key + ".js");
                fs.readFile(paths[key], { encoding: "utf8" }, function (err, data) {
                    if (err) return mapDone(err);
                    fixtures[key] = data.trim();
                    mapDone();
                });
            },
            fixturesReady
        );

        function fixturesReady(err) {
            if (err) return done(err);

            let actual = core.transform(fixtures.actual, {
                filename: paths.actual,
                plugins: ["addons/plugin"],
                presets: ["addons/preset"],
            }).code;

            assert.equal(actual, fixtures.expected);
            done();
        }
        // fixturesReady
    });
});
