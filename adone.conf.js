const { std: { path }, fs, fast, templating: { dot } } = adone;

const transpile = (stream, ...plugins) => stream.transpile({
    compact: false,
    // sourceMaps: sourcemaps,
    sourceMaps: true,
    plugins: [
        "syntax.decorators",
        "syntax.objectRestSpread",
        "syntax.functionBind",
        "syntax.classProperties",
        "syntax.flow",
        // ...(coverage ? [js.coverage.plugin] : []),
        "transform.flowStripTypes",
        "transform.decoratorsLegacy",
        "transform.classProperties",
        "transform.functionBind",
        "transform.objectRestSpread",
        "transform.ESModules",
        ...plugins
    ]
});

export default {
    project: {
        structure: {
            bin: {
                $progress: ({ watch }) => !watch,
                async $before({ watch }) {
                    if (!watch) {
                        await fs.rm("bin");
                    } else {
                        adone.info("watch bin");
                    }
                },
                $from: "src/cli/adone.js",
                $to: "bin",
                $transform: (stream, { watch }) => {
                    stream.sourcemapsInit();
                    transpile(stream, () => ({
                        visitor: {
                            ImportDeclaration(p, state) {
                                if (p.node.source.value === "adone") {
                                    p.node.source.value = path.relative(
                                        path.join("bin", path.dirname(state.file.opts.filenameRelative)),
                                        "lib"
                                    );
                                }
                            }
                        }
                    }));
                    stream.sourcemapsWrite(".", {
                        mapSources: (sourcePath, file) => {
                            return path.relative(path.dirname(path.resolve("bin", file.relative)), file.path);
                        }
                    });
                    stream.chmod({
                        owner: { read: true, write: true, execute: true },
                        group: { read: true, write: false, execute: true },
                        others: { read: true, write: false, execute: true }
                    });
                    if (watch) {
                        stream.notify({
                            title: "bin",
                            filter: (file) => file.extname !== ".map",
                            message: (file) => path.relative(process.cwd(), file.path)
                        }).on("error", fast.transform.notify.onError({
                            title: "bin",
                            message: (error) => error.message
                        }));
                    } else {
                        stream.notify({
                            onLast: true,
                            title: "bin",
                            message: "done",
                            console: false
                        });
                    }
                }
            },
            glosses: {
                async $before({ watch }) {
                    if (!watch) {
                        await fs.rm("lib/glosses");
                    } else {
                        adone.info("watch glosses");
                    }
                },
                js: {
                    $progress: ({ watch }) => !watch,
                    $from: "src/glosses/**/*.js",
                    $to: "lib/glosses",
                    $transform: (stream, { watch }) => {
                        stream.sourcemapsInit();
                        transpile(stream, () => ({
                            visitor: {
                                ImportDeclaration(p, state) {
                                    if (p.node.source.value === "adone") {
                                        p.node.source.value = path.relative(
                                            path.dirname(state.file.opts.filename),
                                            "lib"
                                        );
                                    }
                                }
                            }
                        }));
                        stream.sourcemapsWrite(".", {
                            mapSources: (sourcePath, file) => {
                                return path.relative(
                                    path.dirname(path.resolve("lib", "glosses", file.relative)),
                                    file.path
                                );
                            }
                        });
                        if (watch) {
                            stream.notify({
                                title: "glosses.js",
                                filter: (file) => file.extname !== ".map",
                                message: (file) => path.relative(process.cwd(), file.path)
                            }).on("error", fast.transform.notify.onError({
                                title: "glosses.js",
                                message: (error) => error.message
                            }));
                        } else {
                            stream.notify({
                                onLast: true,
                                title: "glosses.js",
                                message: "done",
                                console: false
                            });
                        }
                    }
                },
                dot: {
                    $progress: ({ watch }) => !watch,
                    $watch: "src/glosses/schema/__/dot/**/*",
                    async $handler({ watch }, event, file) {
                        const FUNCTION_NAME = /function\s+anonymous\s*\(it[^)]*\)\s*{/;
                        const OUT_EMPTY_STRING = /out\s*\+=\s*'\s*';/g;
                        const ISTANBUL = /'(istanbul[^']+)';/g;
                        const ERROR_KEYWORD = /\$errorKeyword/g;
                        const ERROR_KEYWORD_OR = /\$errorKeyword\s+\|\|/g;
                        const VARS = [
                            "$errs", "$valid", "$lvl", "$data", "$dataLvl",
                            "$errorKeyword", "$closingBraces", "$schemaPath",
                            "$validate"
                        ];
                        const defs = (await fast.src("src/glosses/schema/__/dot/*.def")).reduce((defs, file) => {
                            const name = path.basename(file.path, ".def");
                            defs[name] = file.contents.toString("utf-8");
                            return defs;
                        }, {});
                        await fast.src("src/glosses/schema/__/dot/*.jst")
                            .map((file) => {
                                const keyword = path.basename(file.path, ".jst");
                                const template = file.contents.toString("utf-8");
                                let code = dot
                                    .compile(template, defs)
                                    .toString()
                                    .replace(OUT_EMPTY_STRING, "")
                                    .replace(FUNCTION_NAME, `function generate_${keyword}(it, $keyword, $ruleType) {`)
                                    .replace(ISTANBUL, "/* $1 */");

                                const occurrences = (regexp) => (code.match(regexp) || []).length;
                                const countUsed = occurrences(ERROR_KEYWORD);
                                const countOr = occurrences(ERROR_KEYWORD_OR);
                                if (countUsed === countOr + 1) {
                                    code = code.replace(ERROR_KEYWORD_OR, "");
                                }
                                VARS.forEach(function removeUnusedVar(v) {
                                    v = v.replace(/\$/g, "\\$$");
                                    let regexp = new RegExp(`${v}[^A-Za-z0-9_$]`, "g");
                                    const count = occurrences(regexp);
                                    if (count === 1) {
                                        regexp = new RegExp(`var\\s+${v}\\s*=[^;]+;|var\\s+${v};`);
                                        code = code.replace(regexp, "");
                                    }
                                });
                                code = `'use strict';\nmodule.exports = ${code}`;
                                file.contents = Buffer.from(code);
                                file.path = `${file.path.slice(0, -4)}.js`;
                                return file;
                            })
                            .notify({
                                onLast: true,
                                title: "glosses.dot",
                                message: watch ? path.relative(process.cwd(), file) : "done",
                                console: watch
                            })
                            .dest("lib/glosses/schema/__/dot");
                    }
                },
                other: {
                    $progress: ({ watch }) => !watch,
                    $from: ["src/glosses/**/*", "!src/glosses/**/*.js", "!src/glosses/schema/__/dot/*"],
                    $to: "lib/glosses",
                    $transform: (stream, { watch }) => {
                        if (watch) {
                            stream.notify({
                                title: "glosses.other",
                                filter: (file) => file.extname !== ".map",
                                message: (file) => path.relative(process.cwd(), file.path)
                            }).on("error", fast.transform.notify.onError({
                                title: "glosses.other",
                                message: (error) => error.message
                            }));
                        } else {
                            stream.notify({
                                onLast: true,
                                title: "glosses.other",
                                message: "done",
                                console: false
                            });
                        }
                    }
                }
            },
            vendor: {
                $progress: ({ watch }) => !watch,
                async $before({ watch }) {
                    if (!watch) {
                        await fs.rm("lib/vendor");
                    } else {
                        adone.info("watch vendor");
                    }
                },
                $from: "src/vendor/**/*",
                $to: "lib/vendor",
                transform: (stream, { watch }) => {
                    if (watch) {
                        stream.notify({
                            title: "vendor",
                            filter: (file) => file.extname !== ".map",
                            message: (file) => path.relative(process.cwd(), file.path)
                        }).on("error", fast.transform.notify.onError({
                            title: "vendor",
                            message: (error) => error.message
                        }));
                    } else {
                        stream.notify({
                            onLast: true,
                            title: "vendor",
                            message: "done",
                            console: false
                        });
                    }
                }
            },
            index: {
                $progress: ({ watch }) => !watch,
                async $before({ watch }) {
                    if (!watch) {
                        await fs.rm("lib/@(index.js|index.js.map)");
                    } else {
                        adone.info("watch index");
                    }
                },
                $from: "src/index.js",
                $to: "lib",
                $transform: (stream, { watch }) => {
                    stream.sourcemapsInit();
                    transpile(stream);
                    stream.sourcemapsWrite(".", {
                        mapSources: (sourcePath, file) => {
                            return path.relative(
                                path.dirname(path.resolve("lib", file.relative)),
                                file.path
                            );
                        }
                    });
                    if (watch) {
                        stream.notify({
                            title: "index",
                            filter: (file) => file.extname !== ".map",
                            message: (file) => path.relative(process.cwd(), file.path)
                        }).on("error", fast.transform.notify.onError({
                            title: "index",
                            message: (error) => error.message
                        }));
                    } else {
                        stream.notify({
                            onLast: true,
                            title: "index",
                            message: "done",
                            console: false
                        });
                    }
                }
            },
            omnitron: {
                $progress: ({ watch }) => !watch,
                async $before({ watch }) {
                    if (!watch) {
                        await fs.rm("lib/omnitron");
                    } else {
                        adone.info("watch omnitron");
                    }
                },
                $from: "src/omnitron/**/*",
                $to: "lib/omnitron",
                $transform: (stream, { watch }) => {
                    stream.sourcemapsInit();
                    transpile(stream, () => ({
                        visitor: {
                            ImportDeclaration(p, state) {
                                if (p.node.source.value === "adone") {
                                    p.node.source.value = path.relative(
                                        path.dirname(state.file.opts.filename),
                                        "lib"
                                    );
                                }
                            }
                        }
                    }));
                    stream.sourcemapsWrite(".", {
                        mapSources: (sourcePath, file) => {
                            return path.relative(
                                path.dirname(path.resolve("lib", "omnitron", file.relative)),
                                file.path
                            );
                        }
                    });
                    if (watch) {
                        stream.notify({
                            title: "omnitron",
                            filter: (file) => file.extname !== ".map",
                            message: (file) => path.relative(process.cwd(), file.path)
                        }).on("error", fast.transform.notify.onError({
                            title: "omnitron",
                            message: (error) => error.message
                        }));
                    } else {
                        stream.notify({
                            onLast: true,
                            title: "omnitron",
                            message: "done",
                            console: false
                        });
                    }
                }
            },
            subsystems: {
                $progress: ({ watch }) => !watch,
                async $before({ watch }) {
                    if (!watch) {
                        await fs.rm("lib/subsystems");
                    } else {
                        adone.info("watch subsystems");
                    }
                },
                $from: "src/subsystems/**/*",
                $to: "lib/subsystems",
                $transform: (stream, { watch }) => {
                    stream.sourcemapsInit();
                    transpile(stream);
                    stream.sourcemapsWrite(".", {
                        mapSources: (sourcePath, file) => {
                            return path.relative(
                                path.dirname(path.resolve("lib", "subsystems", file.relative)),
                                file.path
                            );
                        }
                    });
                    if (watch) {
                        stream.notify({
                            title: "subsystems",
                            filter: (file) => file.extname !== ".map",
                            message: (file) => path.relative(process.cwd(), file.path)
                        }).on("error", fast.transform.notify.onError({
                            title: "subsystems",
                            message: (error) => error.message
                        }));
                    } else {
                        stream.notify({
                            onLast: true,
                            title: "subsystems",
                            message: "done",
                            console: false
                        });
                    }
                }
            }
        }
    }
};
