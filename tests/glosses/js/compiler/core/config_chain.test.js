const {
    std: { path, fs },
    js: { compiler: { core: { buildConfigChain } } }
} = adone;

const fixture = (...args) => {
    args = [__dirname, "fixtures", "config"].concat(args);
    return path.join.apply(path, args);
};

const base = () => process.cwd();

describe("js", "compiler", "core", "buildConfigChain", () => {
    let oldBabelEnv;
    let oldNodeEnv;

    beforeEach(() => {
        oldBabelEnv = process.env.BABEL_ENV;
        oldNodeEnv = process.env.NODE_ENV;

        delete process.env.BABEL_ENV;
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env.BABEL_ENV = oldBabelEnv;
        process.env.NODE_ENV = oldNodeEnv;
    });

    describe("ignore/only", () => {
        // TODO: More tests for ignore and only

        it("should ignore files that match", () => {
            const chain = buildConfigChain({
                filename: fixture("nonexistant-fake", "src.js"),
                babelrc: false,
                ignore: [
                    fixture("nonexistant-fake", "src.js"),

                    // We had a regression where multiple ignore patterns broke things, so
                    // we keep some extra random items in here.
                    fixture("nonexistant-fake", "other.js"),
                    fixture("nonexistant-fake", "misc.js")
                ]
            });

            assert.equal(chain, null);
        });
    });

    describe("caching", () => {
        describe("programmatic options", () => {
            it("should not cache the input options by identity", () => {
                const comments = false;

                const chain1 = buildConfigChain({ comments });
                const chain2 = buildConfigChain({ comments });

                assert.equal(chain1.length, 1);
                assert.equal(chain2.length, 1);
                assert.notStrictEqual(chain1[0], chain2[0]);
            });

            it("should cache the env options by identity", () => {
                process.env.NODE_ENV = "foo";
                const env = {
                    foo: {
                        comments: false
                    }
                };

                const chain1 = buildConfigChain({ env });
                const chain2 = buildConfigChain({ env });

                assert.equal(chain1.length, 2);
                assert.equal(chain2.length, 2);
                assert.strictEqual(chain1[0], chain2[0]);
                assert.strictEqual(chain1[1], chain2[1]);
            });

            it("should cache the plugin options by identity", () => {
                const plugins = [];

                const chain1 = buildConfigChain({ plugins });
                const chain2 = buildConfigChain({ plugins });

                assert.equal(chain1.length, 1);
                assert.equal(chain2.length, 1);
                assert.strictEqual(chain1[0], chain2[0]);
            });

            it("should cache the presets options by identity", () => {
                const presets = [];

                const chain1 = buildConfigChain({ presets });
                const chain2 = buildConfigChain({ presets });

                assert.equal(chain1.length, 1);
                assert.equal(chain2.length, 1);
                assert.strictEqual(chain1[0], chain2[0]);
            });

            it("should not cache the presets options with passPerPreset", () => {
                const presets = [];

                const chain1 = buildConfigChain({ presets });
                const chain2 = buildConfigChain({ presets, passPerPreset: true });
                const chain3 = buildConfigChain({ presets, passPerPreset: false });

                assert.equal(chain1.length, 1);
                assert.equal(chain2.length, 1);
                assert.equal(chain3.length, 1);
                assert.notStrictEqual(chain1[0], chain2[0]);
                assert.strictEqual(chain1[0], chain3[0]);
                assert.notStrictEqual(chain2[0], chain3[0]);
            });
        });

        describe("config file options", () => {
            function touch(filepath) {
                const s = fs.statSync(filepath);
                fs.utimesSync(
                    filepath,
                    s.atime,
                    s.mtime + Math.random() > 0.5 ? 1 : -1,
                );
            }

            it("should cache package.json files by mtime", () => {
                const filename = fixture(
                    "complex-plugin-config",
                    "config-identity",
                    "pkg",
                    "src.js",
                );
                const pkgJSON = fixture(
                    "complex-plugin-config",
                    "config-identity",
                    "pkg",
                    "package.json",
                );

                const chain1 = buildConfigChain({ filename });
                const chain2 = buildConfigChain({ filename });

                touch(pkgJSON);

                const chain3 = buildConfigChain({ filename });
                const chain4 = buildConfigChain({ filename });

                assert.equal(chain1.length, 3);
                assert.equal(chain2.length, 3);
                assert.equal(chain3.length, 3);
                assert.equal(chain4.length, 3);
                assert.equal(chain1[1].alias, pkgJSON);
                assert.equal(chain2[1].alias, pkgJSON);
                assert.equal(chain3[1].alias, pkgJSON);
                assert.equal(chain4[1].alias, pkgJSON);
                assert.strictEqual(chain1[1], chain2[1]);

                // Identity changed after touch().
                assert.notStrictEqual(chain3[1], chain1[1]);
                assert.strictEqual(chain3[1], chain4[1]);
            });

            it("should cache .babelrc files by mtime", () => {
                const filename = fixture(
                    "complex-plugin-config",
                    "config-identity",
                    "babelrc",
                    "src.js",
                );
                const babelrcFile = fixture(
                    "complex-plugin-config",
                    "config-identity",
                    "babelrc",
                    ".babelrc",
                );

                const chain1 = buildConfigChain({ filename });
                const chain2 = buildConfigChain({ filename });

                touch(babelrcFile);

                const chain3 = buildConfigChain({ filename });
                const chain4 = buildConfigChain({ filename });

                assert.equal(chain1.length, 3);
                assert.equal(chain2.length, 3);
                assert.equal(chain3.length, 3);
                assert.equal(chain4.length, 3);
                assert.equal(chain1[1].alias, babelrcFile);
                assert.equal(chain2[1].alias, babelrcFile);
                assert.equal(chain3[1].alias, babelrcFile);
                assert.equal(chain4[1].alias, babelrcFile);
                assert.strictEqual(chain1[1], chain2[1]);

                // Identity changed after touch().
                assert.notStrictEqual(chain3[1], chain1[1]);
                assert.strictEqual(chain3[1], chain4[1]);
            });

            it("should cache .babelignore files by mtime", () => {
                const filename = fixture(
                    "complex-plugin-config",
                    "config-identity",
                    "babelignore",
                    "src.js",
                );
                const babelignoreFile = fixture(
                    "complex-plugin-config",
                    "config-identity",
                    "babelignore",
                    ".babelignore",
                );

                const chain1 = buildConfigChain({ filename });
                const chain2 = buildConfigChain({ filename });

                touch(babelignoreFile);

                const chain3 = buildConfigChain({ filename });
                const chain4 = buildConfigChain({ filename });

                assert.equal(chain1.length, 6);
                assert.equal(chain2.length, 6);
                assert.equal(chain3.length, 6);
                assert.equal(chain4.length, 6);
                assert.equal(chain1[4].alias, babelignoreFile);
                assert.equal(chain2[4].alias, babelignoreFile);
                assert.equal(chain3[4].alias, babelignoreFile);
                assert.equal(chain4[4].alias, babelignoreFile);
                assert.strictEqual(chain1[4], chain2[4]);

                // Identity changed after touch().
                assert.notStrictEqual(chain3[4], chain1[4]);
                assert.strictEqual(chain3[4], chain4[4]);
            });

            it("should cache .babelrc.js files programmable behavior", () => {
                const filename = fixture(
                    "complex-plugin-config",
                    "config-identity",
                    "babelrc-js",
                    "src.js",
                );
                const babelrcFile = fixture(
                    "complex-plugin-config",
                    "config-identity",
                    "babelrc-js",
                    ".babelrc.js",
                );

                const chain1 = buildConfigChain({ filename });
                const chain2 = buildConfigChain({ filename });

                process.env.NODE_ENV = "new-env";

                const chain3 = buildConfigChain({ filename });
                const chain4 = buildConfigChain({ filename });

                assert.equal(chain1.length, 3);
                assert.equal(chain2.length, 3);
                assert.equal(chain3.length, 3);
                assert.equal(chain4.length, 3);
                assert.equal(chain1[1].alias, babelrcFile);
                assert.equal(chain2[1].alias, babelrcFile);
                assert.equal(chain3[1].alias, babelrcFile);
                assert.equal(chain4[1].alias, babelrcFile);
                assert.strictEqual(chain1[1], chain2[1]);

                // Identity changed after changing the NODE_ENV.
                assert.notStrictEqual(chain3[1], chain1[1]);
                assert.strictEqual(chain3[1], chain4[1]);
            });
        });
    });

    it("dir1", () => {
        const chain = buildConfigChain({
            filename: fixture("dir1", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    plugins: ["extended"]
                },
                alias: fixture("extended.babelrc.json"),
                loc: fixture("extended.babelrc.json"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["root"]
                },
                alias: fixture(".babelrc"),
                loc: fixture(".babelrc"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("dir1", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it("dir2", () => {
        const chain = buildConfigChain({
            filename: fixture("dir2", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["dir2"]
                },
                alias: fixture("dir2", ".babelrc"),
                loc: fixture("dir2", ".babelrc"),
                dirname: fixture("dir2")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("dir2", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it("dir3", () => {
        const chain = buildConfigChain({
            filename: fixture("dir3", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    plugins: ["extended"]
                },
                alias: fixture("extended.babelrc.json"),
                loc: fixture("extended.babelrc.json"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["root"]
                },
                alias: fixture(".babelrc"),
                loc: fixture(".babelrc"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("dir3", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it("env - base", () => {
        const chain = buildConfigChain({
            filename: fixture("env", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["env-base"]
                },
                alias: fixture("env", ".babelrc"),
                loc: fixture("env", ".babelrc"),
                dirname: fixture("env")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("env", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it("env - foo", () => {
        process.env.NODE_ENV = "foo";

        const chain = buildConfigChain({
            filename: fixture("env", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["env-base"]
                },
                alias: fixture("env", ".babelrc"),
                loc: fixture("env", ".babelrc"),
                dirname: fixture("env")
            },
            {
                type: "options",
                options: {
                    plugins: ["env-foo"]
                },
                alias: fixture("env", ".babelrc.env.foo"),
                loc: fixture("env", ".babelrc.env.foo"),
                dirname: fixture("env")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("env", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it("env - bar", () => {
        process.env.NODE_ENV = "foo"; // overridden
        process.env.NODE_ENV = "bar";

        const chain = buildConfigChain({
            filename: fixture("env", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["env-base"]
                },
                alias: fixture("env", ".babelrc"),
                loc: fixture("env", ".babelrc"),
                dirname: fixture("env")
            },
            {
                type: "options",
                options: {
                    plugins: ["env-bar"]
                },
                alias: fixture("env", ".babelrc.env.bar"),
                loc: fixture("env", ".babelrc.env.bar"),
                dirname: fixture("env")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("env", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it("env - foo", () => {
        process.env.NODE_ENV = "foo";

        const chain = buildConfigChain({
            filename: fixture("pkg", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    plugins: ["pkg-plugin"]
                },
                alias: fixture("pkg", "package.json"),
                loc: fixture("pkg", "package.json"),
                dirname: fixture("pkg")
            },
            {
                type: "options",
                options: {
                    ignore: ["pkg-ignore"]
                },
                alias: fixture("pkg", ".babelignore"),
                loc: fixture("pkg", ".babelignore"),
                dirname: fixture("pkg")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("pkg", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it("js-config", () => {
        const chain = buildConfigChain({
            filename: fixture("js-config", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["foo", "bar"]
                },
                alias: fixture("js-config", ".babelrc.js"),
                loc: fixture("js-config", ".babelrc.js"),
                dirname: fixture("js-config")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("js-config", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it("js-config-function", () => {
        const chain = buildConfigChain({
            filename: fixture("js-config-function", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    compact: true
                },
                alias: fixture("js-config-function", ".babelrc.js"),
                loc: fixture("js-config-function", ".babelrc.js"),
                dirname: fixture("js-config-function")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("js-config-function", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it("js-config-default - should read transpiled export default", () => {
        const chain = buildConfigChain({
            filename: fixture("js-config-default", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["foo", "bar"]
                },
                alias: fixture("js-config-default", ".babelrc.js"),
                loc: fixture("js-config-default", ".babelrc.js"),
                dirname: fixture("js-config-default")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("js-config-default", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });
    it("js-config-extended", () => {
        const chain = buildConfigChain({
            filename: fixture("js-config-extended", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["extended"]
                },
                alias: fixture("extended.babelrc.json"),
                loc: fixture("extended.babelrc.json"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    plugins: ["foo", "bar"]
                },
                alias: fixture("js-config-extended", ".babelrc.js"),
                loc: fixture("js-config-extended", ".babelrc.js"),
                dirname: fixture("js-config-extended")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("js-config-extended", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);
    });

    it(
        "json-pkg-config-no-babel - should not throw if" +
        " package.json doesn't contain a `babel` field",
        () => {
            const chain = buildConfigChain({
                filename: fixture("json-pkg-config-no-babel", "src.js")
            });

            const expected = [
                {
                    type: "options",
                    options: {
                        ignore: ["root-ignore"]
                    },
                    alias: fixture(".babelignore"),
                    loc: fixture(".babelignore"),
                    dirname: fixture()
                },
                {
                    type: "options",
                    options: {
                        plugins: ["json"]
                    },
                    alias: fixture("json-pkg-config-no-babel", ".babelrc"),
                    loc: fixture("json-pkg-config-no-babel", ".babelrc"),
                    dirname: fixture("json-pkg-config-no-babel")
                },
                {
                    type: "arguments",
                    options: {
                        filename: fixture("json-pkg-config-no-babel", "src.js")
                    },
                    alias: "base",
                    loc: "base",
                    dirname: base()
                }
            ];

            assert.deepEqual(chain, expected);
        },
    );

    it("should not ignore file matching negated file pattern", () => {
        const chain = buildConfigChain({
            filename: fixture("ignore-negate", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    ignore: ["*", "!src.js"]
                },
                alias: fixture("ignore-negate", ".babelrc"),
                loc: fixture("ignore-negate", ".babelrc"),
                dirname: fixture("ignore-negate")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("ignore-negate", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);

        const chain2 = buildConfigChain({
            filename: fixture("ignore-negate", "src2.js")
        });

        assert.equal(chain2, null);
    });

    it("should not ignore file matching negated folder pattern", () => {
        const chain = buildConfigChain({
            filename: fixture("ignore-negate-folder", "folder", "src.js")
        });

        const expected = [
            {
                type: "options",
                options: {
                    ignore: ["root-ignore"]
                },
                alias: fixture(".babelignore"),
                loc: fixture(".babelignore"),
                dirname: fixture()
            },
            {
                type: "options",
                options: {
                    ignore: ["*", "!folder"]
                },
                alias: fixture("ignore-negate-folder", ".babelrc"),
                loc: fixture("ignore-negate-folder", ".babelrc"),
                dirname: fixture("ignore-negate-folder")
            },
            {
                type: "arguments",
                options: {
                    filename: fixture("ignore-negate-folder", "folder", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: base()
            }
        ];

        assert.deepEqual(chain, expected);

        const chain2 = buildConfigChain({
            filename: fixture("ignore-negate-folder", "src2.js")
        });

        assert.equal(chain2, null);
    });

    it(
        "js-json-config - should throw an error if both a .babelrc" +
        " and a .babelrc.js are present",
        () => {
            assert.throws(() => {
                buildConfigChain({
                    filename: fixture("js-json-config", "src.js")
                });
            }, /Multiple configuration files found\.(.|\n)*\.babelrc(.|\n)*\.babelrc\.js/);
        },
    );

    it(
        "js-pkg-config - should throw an error if both a .babelrc.js" +
        " and a package.json with a babel field are present",
        () => {
            assert.throws(() => {
                buildConfigChain({
                    filename: fixture("js-pkg-config", "src.js")
                });
            }, /Multiple configuration files found\.(.|\n)*\.babelrc\.js(.|\n)*package\.json/);
        },
    );

    it(
        "json-pkg-config - should throw an error if both a .babelrc" +
        " and a package.json with a babel field are present",
        () => {
            assert.throws(() => {
                buildConfigChain({
                    filename: fixture("json-pkg-config", "src.js")
                });
            }, /Multiple configuration files found\.(.|\n)*\.babelrc(.|\n)*package\.json/);
        },
    );

    it("js-config-error", () => {
        assert.throws(() => {
            buildConfigChain({
                filename: fixture("js-config-error", "src.js")
            });
        }, /Error while loading config/);
    });

    it("js-config-error2", () => {
        assert.throws(() => {
            buildConfigChain({
                filename: fixture("js-config-error2", "src.js")
            });
        }, /Configuration should be an exported JavaScript object/);
    });

    it("js-config-error3", () => {
        assert.throws(() => {
            buildConfigChain({
                filename: fixture("js-config-error3", "src.js")
            });
        }, /Configuration should be an exported JavaScript object/);
    });

    it("json-config-error", () => {
        assert.throws(() => {
            buildConfigChain({
                filename: fixture("json-config-error", "src.js")
            });
        }, /Error while parsing config/);
    });
});
