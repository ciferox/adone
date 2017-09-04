const {
    std: { path },
    js: { compiler: { core: { manageOptions } } }
} = adone;

describe("js", "compiler", "core", "option-manager", () => {
    it.skip("throws for babel 5 plugin", () => {
        return assert.throws(() => {
            manageOptions({
                plugins: [({ Plugin }) => new Plugin("object-assign", {})]
            });
        }, /Babel 5 plugin is being run with Babel 6/);
    });

    describe("mergeOptions", () => {
        it("throws for removed babel 5 options", () => {
            return assert.throws(() => {
                manageOptions({
                    randomOption: true
                });
            }, /Unknown option: base.randomOption/);
        });

        it("throws for removed babel 5 options", () => {
            return assert.throws(
                () => {
                    manageOptions({
                        auxiliaryComment: true,
                        blacklist: true
                    });
                },
                // eslint-disable-next-line max-len
                /Using removed Babel 5 option: base.auxiliaryComment - Use `auxiliaryCommentBefore` or `auxiliaryCommentAfter`/,
            );
        });

        it.skip("throws for resolved but erroring preset", () => {
            return assert.throws(() => {
                manageOptions({
                    presets: [
                        path.join(__dirname, "fixtures/option-manager/not-a-preset")
                    ]
                });
            }, /While processing: .*option-manager(?:\/|\\\\)not-a-preset\.js/);
        });
    });

    describe.skip("presets", () => {
        function presetTest(name) {
            it(name, () => {
                const { options, passes } = manageOptions({
                    presets: [
                        path.join(__dirname, "fixtures/option-manager/presets", name)
                    ]
                });

                assert.equal(true, is.array(options.plugins));
                assert.equal(1, options.plugins.length);
                assert.equal(1, passes.length);
                assert.equal(1, passes[0].length);
            });
        }

        function presetThrowsTest(name, msg) {
            it(name, () => {
                assert.throws(
                    () =>
                        manageOptions({
                            presets: [
                                path.join(__dirname, "fixtures/option-manager/presets", name)
                            ]
                        }),
                    msg,
                );
            });
        }

        presetTest("es5_function");
        presetTest("es5_object");
        presetTest("es2015_default_function");
        presetTest("es2015_default_object");

        presetThrowsTest(
            "es2015_named",
            /Must export a default export when using ES6 modules/,
        );
        presetThrowsTest("es2015_invalid", /Unsupported format: string/);
        presetThrowsTest("es5_invalid", /Unsupported format: string/);
    });
});
