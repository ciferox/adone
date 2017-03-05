
const { OptionManager, Logger } = adone.js.compiler.transformation.file;
const { path } = adone.std;

describe("option-manager", () => {
    describe("memoisePluginContainer", () => {
        it("throws for babel 5 plugin", () => {
            return assert.throws(
                () => OptionManager.memoisePluginContainer(({ Plugin }) => new Plugin("object-assign", {})),
                /Babel 5 plugin is being run with Babel 6/
            );
        });
    });

    describe("mergeOptions", () => {
        it("throws for removed babel 5 options", () => {
            return assert.throws(
                () => {
                    let opt = new OptionManager(new Logger(null, "unknown"));
                    opt.init({
                        "randomOption": true
                    });
                },
                /Unknown option: base.randomOption/
            );
        });

        it("throws for removed babel 5 options", () => {
            return assert.throws(
                () => {
                    let opt = new OptionManager(new Logger(null, "unknown"));
                    opt.init({
                        "auxiliaryComment": true,
                        "blacklist": true
                    });
                },
                /Using removed Babel 5 option: base.auxiliaryComment - Use `auxiliaryCommentBefore` or `auxiliaryCommentAfter`/
            );
        });

        it.skip("throws for resolved but erroring preset", () => {
            return assert.throws(
                () => {
                    let opt = new OptionManager(new Logger(null, "unknown"));
                    opt.init({
                        "presets": [path.join(__dirname, "fixtures/option-manager/not-a-preset")]
                    });
                },
                /While processing preset: .*option-manager(?:\/|\\\\)not-a-preset\.js/
            );
        });

        it.skip("throws for invalid preset configuration", function () {
            return assert.throws(
                function () {
                    let opt = new OptionManager(new Logger(null, "unknown"));
                    opt.init({
                        "presets": [{ option: "value" }]
                    });
                },
                /Unknown option: foreign.option\.(?:.|\n)+A common cause of this error is the presence of a configuration options object without the corresponding preset name/
            );
        });
    });

    describe.skip("presets", function () {
        function presetTest(name) {
            it(name, function () {
                let opt = new OptionManager(new Logger(null, "unknown"));
                let options = opt.init({
                    "presets": [path.join(__dirname, "fixtures/option-manager/presets", name)]
                });

                assert.equal(true, Array.isArray(options.plugins));
                assert.equal(1, options.plugins.length);
            });
        }

        presetTest("es5");
        presetTest("es5_function");
        presetTest("es2015_default");
        presetTest("es2015_default_function");
        presetTest("es2015_default_object_function");
        presetTest("es2015_function");
        presetTest("es2015_function_fallback");
        presetTest("es2015_named");

    });
});
