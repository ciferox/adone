
const { path } = adone.std;
const buildConfigChain = adone.js.compiler.transformation.file.buildConfigChain;

const fixture = (...args) => {
    args = [__dirname, "fixtures", "config"].concat(args);
    return path.join.apply(path, args);
};

describe("buildConfigChain", () => {
    let oldAcompilerEnv;
    let oldNodeEnv;

    beforeEach(() => {
        oldAcompilerEnv = process.env.ACOMPILER_ENV;
        oldNodeEnv = process.env.NODE_ENV;

        delete process.env.ACOMPILER_ENV;
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env.ACOMPILER_ENV = oldAcompilerEnv;
        process.env.NODE_ENV = oldNodeEnv;
    });

    it("dir1", () => {
        const chain = buildConfigChain({
            filename: fixture("dir1", "src.js")
        });

        const expected = [
            {
                options: {
                    plugins: [
                        "extended"
                    ]
                },
                alias: fixture("extended.acompiler_rc.json"),
                loc: fixture("extended.acompiler_rc.json"),
                dirname: fixture()
            },
            {
                options: {
                    plugins: [
                        "root"
                    ]
                },
                alias: fixture(".acompiler_rc"),
                loc: fixture(".acompiler_rc"),
                dirname: fixture()
            },
            {
                options: {
                    ignore: [
                        "root-ignore"
                    ]
                },
                alias: fixture(".acompiler_ignore"),
                loc: fixture(".acompiler_ignore"),
                dirname: fixture()
            },
            {
                options: {
                    filename: fixture("dir1", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: fixture("dir1")
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
                options: {
                    plugins: [
                        "dir2"
                    ]
                },
                alias: fixture("dir2", ".acompiler_rc"),
                loc: fixture("dir2", ".acompiler_rc"),
                dirname: fixture("dir2")
            },
            {
                options: {
                    ignore: [
                        "root-ignore"
                    ]
                },
                alias: fixture(".acompiler_ignore"),
                loc: fixture(".acompiler_ignore"),
                dirname: fixture()
            },
            {
                options: {
                    filename: fixture("dir2", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: fixture("dir2")
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
                options: {
                    plugins: [
                        "env-base"
                    ]
                },
                alias: fixture("env", ".acompiler_rc"),
                loc: fixture("env", ".acompiler_rc"),
                dirname: fixture("env")
            },
            {
                options: {
                    ignore: [
                        "root-ignore"
                    ]
                },
                alias: fixture(".acompiler_ignore"),
                loc: fixture(".acompiler_ignore"),
                dirname: fixture()
            },
            {
                options: {
                    filename: fixture("env", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: fixture("env")
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
                options: {
                    plugins: [
                        "env-base"
                    ]
                },
                alias: fixture("env", ".acompiler_rc"),
                loc: fixture("env", ".acompiler_rc"),
                dirname: fixture("env")
            },
            {
                options: {
                    plugins: [
                        "env-foo"
                    ]
                },
                alias: fixture("env", ".acompiler_rc.env.foo"),
                loc: fixture("env", ".acompiler_rc.env.foo"),
                dirname: fixture("env")
            },
            {
                options: {
                    ignore: [
                        "root-ignore"
                    ]
                },
                alias: fixture(".acompiler_ignore"),
                loc: fixture(".acompiler_ignore"),
                dirname: fixture()
            },
            {
                options: {
                    filename: fixture("env", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: fixture("env")
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
                options: {
                    plugins: [
                        "env-base"
                    ]
                },
                alias: fixture("env", ".acompiler_rc"),
                loc: fixture("env", ".acompiler_rc"),
                dirname: fixture("env")
            },
            {
                options: {
                    plugins: [
                        "env-bar"
                    ]
                },
                alias: fixture("env", ".acompiler_rc.env.bar"),
                loc: fixture("env", ".acompiler_rc.env.bar"),
                dirname: fixture("env")
            },
            {
                options: {
                    ignore: [
                        "root-ignore"
                    ]
                },
                alias: fixture(".acompiler_ignore"),
                loc: fixture(".acompiler_ignore"),
                dirname: fixture()
            },
            {
                options: {
                    filename: fixture("env", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: fixture("env")
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
                options: {
                    plugins: ["pkg-plugin"]
                },
                alias: fixture("pkg", "package.json"),
                loc: fixture("pkg", "package.json"),
                dirname: fixture("pkg")
            },
            {
                options: {
                    ignore: ["pkg-ignore"]
                },
                alias: fixture("pkg", ".acompiler_ignore"),
                loc: fixture("pkg", ".acompiler_ignore"),
                dirname: fixture("pkg")
            },
            {
                options: {
                    filename: fixture("pkg", "src.js")
                },
                alias: "base",
                loc: "base",
                dirname: fixture("pkg")
            }
        ];
        assert.deepEqual(chain, expected);
    });
});
