const {
    std: { path },
    js: { compiler: { generate, core } },
    sourcemap
} = adone;
const { Plugin, buildExternalHelpers } = core;

const assertIgnored = (result) => {
    assert.ok(!result);
};

const assertNotIgnored = (result) => {
    assert.ok(!result.ignored);
};

// shim
const transformAsync = (code, opts) => {
    return {
        then(resolve) {
            resolve(core.transform(code, opts));
        }
    };
};

describe("js", "compiler", "core", () => {
    describe("parser and generator options", () => {
        const recast = {
            parse(code, opts) {
                return opts.parser.parse(code);
            },
            print(ast) {
                return generate(ast);
            }
        };

        const newTransform = (string) => {
            return core.transform(string, {
                parserOpts: {
                    parser: recast.parse,
                    plugins: ["flow"],
                    allowImportExportEverywhere: true
                },
                generatorOpts: {
                    generator: recast.print
                }
            });
        };

        it("options", () => {
            const string = "original;";
            assert.deepEqual(newTransform(string).ast, core.transform(string).ast);
            assert.equal(newTransform(string).code, string);
        });

        it("experimental syntax", () => {
            const experimental = "var a: number = 1;";

            assert.deepEqual(
                newTransform(experimental).ast,
                core.transform(experimental, {
                    parserOpts: {
                        plugins: ["flow"]
                    }
                }).ast,
            );
            assert.equal(newTransform(experimental).code, experimental);

            const newTransformWithPlugins = (string) => {
                return core.transform(string, {
                    plugins: ["syntax.flow"],
                    parserOpts: {
                        parser: recast.parse
                    },
                    generatorOpts: {
                        generator: recast.print
                    }
                });
            };

            assert.deepEqual(
                newTransformWithPlugins(experimental).ast,
                core.transform(experimental, {
                    parserOpts: {
                        plugins: ["flow"]
                    }
                }).ast,
            );
            assert.equal(newTransformWithPlugins(experimental).code, experimental);
        });

        it("other options", () => {
            const experimental = "if (true) {\n  import a from 'a';\n}";

            assert.notEqual(
                newTransform(experimental).ast,
                core.transform(experimental, {
                    parserOpts: {
                        allowImportExportEverywhere: true
                    }
                }).ast,
            );
            assert.equal(newTransform(experimental).code, experimental);
        });
    });

    describe("api", () => {
        it("analyze", () => {
            assert.equal(core.analyse("foobar;").marked.length, 0);

            assert.equal(core.analyse("foobar;", {
                plugins: [
                    new Plugin({
                        visitor: {
                            Program(path) {
                                path.mark("category", "foobar");
                            }
                        }
                    })
                ]
            }).marked[0].message, "foobar");

            assert.equal(
                core.analyse(
                    "foobar;",
                    {},
                    {
                        Program(path) {
                            path.mark("category", "foobar");
                        }
                    },
                ).marked[0].message,
                "foobar",
            );
        });

        it.skip("exposes the resolvePlugin method", () => {
            assert.throws(
                () => core.resolvePlugin("nonexistent-plugin"),
                /Cannot find module 'babel-plugin-nonexistent-plugin'/,
            );
        });

        it.skip("exposes the resolvePreset method", () => {
            assert.throws(
                () => core.resolvePreset("nonexistent-preset"),
                /Cannot find module 'babel-preset-nonexistent-preset'/,
            );
        });

        it("transformFile", (done) => {
            core.transformFile(
                `${__dirname}/fixtures/api/file.js`,
                {
                    babelrc: false
                },
                (err, res) => {
                    if (err) {
                        return done(err);
                    }
                    assert.equal(res.code, "foo();");
                    done();
                },
            );
        });

        it("transformFileSync", () => {
            assert.equal(
                core.transformFileSync(`${__dirname}/fixtures/api/file.js`, {
                    babelrc: false
                }).code,
                "foo();",
            );
        });

        it.skip("options throw on falsy true", () => {
            return assert.throws(() => {
                core.transform("", {
                    plugins: [`${__dirname}/../../babel-plugin-syntax-jsx`, false]
                });
            }, /Error: \[BABEL\] unknown: Unexpected falsy value: false/);
        });

        it.skip("options merge backwards", () => {
            return transformAsync("", {
                presets: [`${__dirname}/../../babel-preset-es2015`],
                plugins: [`${__dirname}/../../babel-plugin-syntax-jsx`]
            }).then((result) => {
                assert.ok(
                    result.options.plugins[0][0].manipulateOptions
                        .toString()
                        .indexOf("jsx") >= 0,
                );
            });
        });

        it("option wrapPluginVisitorMethod", () => {
            let calledRaw = 0;
            let calledIntercept = 0;

            core.transform("function foo() { bar(foobar); }", {
                wrapPluginVisitorMethod(pluginAlias, visitorType, callback) {
                    if (pluginAlias !== "foobar") {
                        return callback;
                    }

                    assert.equal(visitorType, "enter");

                    return function () {
                        calledIntercept++;
                        return callback.apply(this, arguments);
                    };
                },

                plugins: [
                    new Plugin({
                        name: "foobar",
                        visitor: {
                            "Program|Identifier"() {
                                calledRaw++;
                            }
                        }
                    })
                ]
            });

            assert.equal(calledRaw, 4);
            assert.equal(calledIntercept, 4);
        });

        it.skip("pass per preset", () => {
            let aliasBaseType = null;

            const execTest = (passPerPreset) => {
                return core.transform("type Foo = number; let x = (y): Foo => y;", {
                    passPerPreset,
                    presets: [
                        // First preset with our plugin, "before"
                        function () {
                            return {
                                plugins: [
                                    new Plugin({
                                        visitor: {
                                            Function(path) {
                                                const alias = path.scope
                                                    .getProgramParent()
                                                    .path.get("body")[0].node;
                                                if (!core.types.isTypeAlias(alias)) {
                                                    return;
                                                }

                                                // In case of `passPerPreset` being `false`, the
                                                // alias node is already removed by Flow plugin.
                                                if (!alias) {
                                                    return;
                                                }

                                                // In case of `passPerPreset` being `true`, the
                                                // alias node should still exist.
                                                aliasBaseType = alias.right.type; // NumberTypeAnnotation
                                            }
                                        }
                                    })
                                ]
                            };
                        },

                        // ES2015 preset
                        require(`${__dirname}/../../babel-preset-es2015`),

                        // Third preset for Flow.
                        function () {
                            return {
                                plugins: [
                                    require(`${__dirname}/../../babel-plugin-syntax-flow`),
                                    require(`${__dirname}/../../babel-plugin-transform-flow-strip-types`)
                                ]
                            };
                        }
                    ]
                });
            };

            // 1. passPerPreset: true

            let result = execTest(true);

            assert.equal(aliasBaseType, "NumberTypeAnnotation");

            assert.deepEqual(result.code, "var x = function x(y) {\n  return y;\n};");

            // 2. passPerPreset: false

            aliasBaseType = null;

            result = execTest(false);

            assert.equal(aliasBaseType, null);

            assert.deepEqual(result.code, "var x = function x(y) {\n  return y;\n};");
        });

        it.skip("complex plugin and preset ordering", () => {
            const pushPlugin = (str) => {
                return {
                    visitor: {
                        Program(path) {
                            path.pushContainer(
                                "body",
                                core.types.expressionStatement(core.types.identifier(str)),
                            );
                        }
                    }
                };
            };

            const pushPreset = (str) => {
                return { plugins: [pushPlugin(str)] };
            };

            const result = core.transform("", {
                filename: path.join(
                    __dirname,
                    "fixtures",
                    "config",
                    "complex-plugin-config",
                    "file.js",
                ),
                presets: [pushPreset("argone"), pushPreset("argtwo")],
                env: {
                    development: {
                        passPerPreset: true,
                        presets: [pushPreset("argthree"), pushPreset("argfour")],
                        env: {
                            development: {
                                passPerPreset: true,
                                presets: [pushPreset("argfive"), pushPreset("argsix")]
                            }
                        }
                    }
                }
            });

            assert.equal(
                result.code,
                [
                    "argtwo;",
                    "argone;",
                    "eleven;",
                    "twelve;",
                    "one;",
                    "two;",
                    "five;",
                    "six;",
                    "three;",
                    "four;",
                    "seventeen;",
                    "eighteen;",
                    "nineteen;",
                    "twenty;",
                    "thirteen;",
                    "fourteen;",
                    "fifteen;",
                    "sixteen;",
                    "argfive;",
                    "argsix;",
                    "argthree;",
                    "argfour;",
                    "seven;",
                    "eight;",
                    "nine;",
                    "ten;"
                ].join("\n"),
            );
        });

        it("source map merging", () => {
            const result = core.transform(
                [
                    /* eslint-disable max-len */
                    'function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }',
                    "",
                    "let Foo = function Foo() {",
                    "  _classCallCheck(this, Foo);",
                    "};",
                    "",
                    "//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0ZG91dCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztJQUFNLEdBQUcsWUFBSCxHQUFHO3dCQUFILEdBQUciLCJmaWxlIjoidW5kZWZpbmVkIiwic291cmNlc0NvbnRlbnQiOlsiY2xhc3MgRm9vIHt9XG4iXX0="
                    /* eslint-enable max-len */
                ].join("\n"),
                {
                    sourceMaps: true
                },
            );

            assert.deepEqual(
                [
                    "function _classCallCheck(instance, Constructor) {",
                    "  if (!(instance instanceof Constructor)) {",
                    '    throw new TypeError("Cannot call a class as a function");',
                    "  }",
                    "}",
                    "",
                    "let Foo = function Foo() {",
                    "  _classCallCheck(this, Foo);",
                    "};"
                ].join("\n"),
                result.code,
            );

            const consumer = sourcemap.createConsumer(result.map);

            assert.deepEqual(
                consumer.originalPositionFor({
                    line: 7,
                    column: 4
                }),
                {
                    name: null,
                    source: "stdout",
                    line: 1,
                    column: 6
                },
            );
        });

        it("code option false", () => {
            return transformAsync("foo('bar');", { code: false }).then((
                result,
            ) => {
                assert.ok(!result.code);
            });
        });

        it("ast option false", () => {
            return transformAsync("foo('bar');", { ast: false }).then((result) => {
                assert.ok(!result.ast);
            });
        });

        it("auxiliaryComment option", () => {
            return transformAsync("class Foo {}", {
                auxiliaryCommentBefore: "before",
                auxiliaryCommentAfter: "after",
                plugins: [
                    function (babel) {
                        const t = core.types;
                        return {
                            visitor: {
                                Program(path) {
                                    path.unshiftContainer(
                                        "body",
                                        t.expressionStatement(t.identifier("start")),
                                    );
                                    path.pushContainer(
                                        "body",
                                        t.expressionStatement(t.identifier("end")),
                                    );
                                }
                            }
                        };
                    }
                ]
            }).then((result) => {
                assert.equal(
                    result.code,
                    "/*before*/\nstart;\n\n/*after*/\nclass Foo {}\n\n/*before*/\nend;\n\n/*after*/",
                );
            });
        });

        it.skip("modules metadata", () => {
            return Promise.all([
                // eslint-disable-next-line max-len
                transformAsync(
                    'import { externalName as localName } from "external";',
                ).then((result) => {
                    assert.deepEqual(result.metadata.modules.imports[0], {
                        source: "external",
                        imported: ["externalName"],
                        specifiers: [
                            {
                                kind: "named",
                                imported: "externalName",
                                local: "localName"
                            }
                        ]
                    });
                }),

                transformAsync('import * as localName2 from "external";').then((
                    result,
                ) => {
                    assert.deepEqual(result.metadata.modules.imports[0], {
                        source: "external",
                        imported: ["*"],
                        specifiers: [
                            {
                                kind: "namespace",
                                local: "localName2"
                            }
                        ]
                    });
                }),

                transformAsync('import localName3 from "external";').then((
                    result,
                ) => {
                    assert.deepEqual(result.metadata.modules.imports[0], {
                        source: "external",
                        imported: ["default"],
                        specifiers: [
                            {
                                kind: "named",
                                imported: "default",
                                local: "localName3"
                            }
                        ]
                    });
                }),

                transformAsync('import localName from "./array";', {
                    resolveModuleSource() {
                        return "override-source";
                    }
                }).then((result) => {
                    assert.deepEqual(result.metadata.modules.imports, [
                        {
                            source: "override-source",
                            imported: ["default"],
                            specifiers: [
                                {
                                    kind: "named",
                                    imported: "default",
                                    local: "localName"
                                }
                            ]
                        }
                    ]);
                }),

                transformAsync('export * as externalName1 from "external";', {
                    plugins: [require("../../babel-plugin-syntax-export-extensions")]
                }).then((result) => {
                    assert.deepEqual(result.metadata.modules.exports, {
                        exported: ["externalName1"],
                        specifiers: [
                            {
                                kind: "external-namespace",
                                exported: "externalName1",
                                source: "external"
                            }
                        ]
                    });
                }),

                transformAsync('export externalName2 from "external";', {
                    plugins: [require("../../babel-plugin-syntax-export-extensions")]
                }).then((result) => {
                    assert.deepEqual(result.metadata.modules.exports, {
                        exported: ["externalName2"],
                        specifiers: [
                            {
                                kind: "external",
                                local: "externalName2",
                                exported: "externalName2",
                                source: "external"
                            }
                        ]
                    });
                }),

                transformAsync("export function namedFunction() {}").then((
                    result,
                ) => {
                    assert.deepEqual(result.metadata.modules.exports, {
                        exported: ["namedFunction"],
                        specifiers: [
                            {
                                kind: "local",
                                local: "namedFunction",
                                exported: "namedFunction"
                            }
                        ]
                    });
                }),

                transformAsync('export var foo = "bar";').then((result) => {
                    assert.deepEqual(result.metadata.modules.exports, {
                        exported: ["foo"],
                        specifiers: [
                            {
                                kind: "local",
                                local: "foo",
                                exported: "foo"
                            }
                        ]
                    });
                }),

                transformAsync("export { localName as externalName3 };").then((
                    result,
                ) => {
                    assert.deepEqual(result.metadata.modules.exports, {
                        exported: ["externalName3"],
                        specifiers: [
                            {
                                kind: "local",
                                local: "localName",
                                exported: "externalName3"
                            }
                        ]
                    });
                }),

                transformAsync('export { externalName4 } from "external";').then((
                    result,
                ) => {
                    assert.deepEqual(result.metadata.modules.exports, {
                        exported: ["externalName4"],
                        specifiers: [
                            {
                                kind: "external",
                                local: "externalName4",
                                exported: "externalName4",
                                source: "external"
                            }
                        ]
                    });
                }),

                transformAsync('export * from "external";').then((result) => {
                    assert.deepEqual(result.metadata.modules.exports, {
                        exported: [],
                        specifiers: [
                            {
                                kind: "external-all",
                                source: "external"
                            }
                        ]
                    });
                }),

                transformAsync(
                    "export default function defaultFunction() {}",
                ).then((result) => {
                    assert.deepEqual(result.metadata.modules.exports, {
                        exported: ["defaultFunction"],
                        specifiers: [
                            {
                                kind: "local",
                                local: "defaultFunction",
                                exported: "default"
                            }
                        ]
                    });
                })
            ]);
        });

        it("ignore option", () => {
            return Promise.all([
                transformAsync("", {
                    ignore: ["/foo"],
                    filename: "/foo/node_modules/bar"
                }).then(assertIgnored),

                transformAsync("", {
                    ignore: ["/foo/node_modules"],
                    filename: "/foo/node_modules/bar"
                }).then(assertIgnored),

                transformAsync("", {
                    ignore: ["/foo/node_modules/*"],
                    filename: "/foo/node_modules/bar"
                }).then(assertIgnored),

                transformAsync("", {
                    ignore: ["/foo/**/*"],
                    filename: "/foo/node_modules/bar"
                }).then(assertIgnored),

                transformAsync("", {
                    ignore: ["/foo/node_modules/*.bar"],
                    filename: "/foo/node_modules/foo.bar"
                }).then(assertIgnored),

                transformAsync("", {
                    ignore: ["/foo/node_modules/*.foo"],
                    filename: "/foo/node_modules/foo.bar"
                }).then(assertNotIgnored),

                transformAsync("", {
                    ignore: ["/bar/**/*"],
                    filename: "/foo/node_modules/foo.bar"
                }).then(assertNotIgnored)
            ]);
        });

        it("only option", () => {
            return Promise.all([
                transformAsync("", {
                    only: ["/foo"],
                    filename: "/foo/node_modules/bar"
                }).then(assertNotIgnored),

                transformAsync("", {
                    only: ["/foo/*"],
                    filename: "/foo/node_modules/bar"
                }).then(assertNotIgnored),

                transformAsync("", {
                    only: ["/foo/node_modules"],
                    filename: "/foo/node_modules/bar"
                }).then(assertNotIgnored),

                transformAsync("", {
                    only: ["/foo/node_modules/*.bar"],
                    filename: "/foo/node_modules/foo.bar"
                }).then(assertNotIgnored),

                transformAsync("", {
                    only: ["/foo/node_modules"],
                    filename: "/foo/node_module/bar"
                }).then(assertIgnored),

                transformAsync("", {
                    only: ["/foo/node_modules"],
                    filename: "/bar/node_modules/foo"
                }).then(assertIgnored),

                transformAsync("", {
                    only: ["/foo/node_modules/*.bar"],
                    filename: "/foo/node_modules/bar.foo"
                }).then(assertIgnored)
            ]);
        });

        describe("env option", () => {
            const oldBabelEnv = process.env.BABEL_ENV;
            const oldNodeEnv = process.env.NODE_ENV;

            before(() => {
                // Tests need to run with the default and specific values for these. They
                // need to be cleared for each test.
                delete process.env.BABEL_ENV;
                delete process.env.NODE_ENV;
            });

            after(() => {
                process.env.BABEL_ENV = oldBabelEnv;
                process.env.NODE_ENV = oldNodeEnv;
            });

            it("default", () => {
                const result = core.transform("foo;", {
                    env: {
                        development: { code: false }
                    }
                });

                assert.equal(result.code, undefined);
            });

            it("BABEL_ENV", () => {
                process.env.BABEL_ENV = "foo";
                const result = core.transform("foo;", {
                    env: {
                        foo: { code: false }
                    }
                });
                assert.equal(result.code, undefined);
            });

            it("NODE_ENV", () => {
                process.env.NODE_ENV = "foo";
                const result = core.transform("foo;", {
                    env: {
                        foo: { code: false }
                    }
                });
                assert.equal(result.code, undefined);
            });
        });

        it("resolveModuleSource option", () => {
            /* eslint-disable max-len */
            const actual =
                'import foo from "foo-import-default";\nimport "foo-import-bare";\nexport { foo } from "foo-export-named";';
            const expected =
                'import foo from "resolved/foo-import-default";\nimport "resolved/foo-import-bare";\nexport { foo } from "resolved/foo-export-named";';
            /* eslint-enable max-len */

            return transformAsync(actual, {
                resolveModuleSource(originalSource) {
                    return `resolved/${originalSource}`;
                }
            }).then((result) => {
                assert.equal(result.code.trim(), expected);
            });
        });

        describe("buildExternalHelpers", () => {
            describe("smoke tests", () => {
                it("builds external helpers in global output type", () => {
                    buildExternalHelpers(null, "global");
                });

                it("builds external helpers in module output type", () => {
                    buildExternalHelpers(null, "module");
                });

                it("builds external helpers in umd output type", () => {
                    buildExternalHelpers(null, "umd");
                });

                it("builds external helpers in var output type", () => {
                    buildExternalHelpers(null, "var");
                });
            });

            it("all", () => {
                const script = buildExternalHelpers();
                assert.ok(script.indexOf("classCallCheck") >= -1);
                assert.ok(script.indexOf("inherits") >= 0);
            });

            it("whitelist", () => {
                const script = buildExternalHelpers(["inherits"]);
                assert.ok(script.indexOf("classCallCheck") === -1);
                assert.ok(script.indexOf("inherits") >= 0);
            });

            it("empty whitelist", () => {
                const script = buildExternalHelpers([]);
                assert.ok(script.indexOf("classCallCheck") === -1);
                assert.ok(script.indexOf("inherits") === -1);
            });

            it("underscored", () => {
                const script = buildExternalHelpers(["typeof"]);
                assert.ok(script.indexOf("typeof") >= 0);
            });
        });
    });
});
