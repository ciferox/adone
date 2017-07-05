const { fast, std: { path }, js, fs, templating: { dot } } = adone;

adone.run({
    initialize() {
        this.defineArguments({
            help: "build adone",
            options: [
                { name: "--coverage", help: "build with coverage support" }
            ]
        });
    },
    async cleanBin() {
        await fs.rm("bin");
    },
    async bin(args, opts) {
        await fast.src("src/cli/**/*.js")
            .stash((x) => x.path.includes(path.join("meta", "polyfills")))
            .sourcemapsInit()
            .transpile({
                compact: false,
                sourceMaps: true,
                plugins: [
                    "syntax.decorators",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.classProperties",
                    "syntax.flow",
                    ...(opts.has("coverage") ? [js.coverage.plugin] : []),
                    "transform.flowStripTypes",
                    "transform.decoratorsLegacy",
                    "transform.classProperties",
                    "transform.functionBind",
                    "transform.objectRestSpread",
                    "transform.ESModules",
                    () => ({
                        visitor: {
                            ImportDeclaration(p, state) {
                                if (p.node.source.value === "adone") {
                                    p.node.source.value = path.relative(path.join("bin", path.dirname(state.file.opts.filenameRelative)), "lib");
                                }
                            }
                        }
                    })
                ]
            })
            .sourcemapsWrite(".", {
                mapSources: (sourcePath, file) => {
                    return path.relative(path.dirname(path.resolve("bin", file.relative)), file.path);
                }
            }).
            chmod({
                owner: {
                    read: true,
                    write: true,
                    execute: true
                },
                group: {
                    read: true,
                    write: false,
                    execute: true
                },
                others: {
                    read: true,
                    write: false,
                    execute: true
                }
            })
            .unstash()
            .dest("bin");
    },
    async cleanGlosses() {
        await fs.rm("lib/glosses");
    },
    async glosses(args, opts) {
        await fast.src("src/glosses/**/*.js")
            .stash((x) => x.path.includes(path.join("glosses", "vendor")))
            .sourcemapsInit()
            .transpile({
                compact: false,
                only: /\.js$/,
                sourceMaps: true,
                plugins: [
                    "syntax.decorators",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.classProperties",
                    "syntax.flow",
                    ...(opts.has("coverage") ? [js.coverage.plugin] : []),
                    "transform.flowStripTypes",
                    "transform.decoratorsLegacy",
                    "transform.classProperties",
                    "transform.ESModules",
                    "transform.functionBind",
                    "transform.objectRestSpread",
                    () => ({
                        visitor: {
                            ImportDeclaration(p, state) {
                                if (p.node.source.value === "adone") {
                                    p.node.source.value = path.relative(path.dirname(state.file.opts.filename), "lib");
                                }
                            }
                        }
                    })
                ]
            })
            .sourcemapsWrite(".", {
                mapSources: (sourcePath, file) => {
                    return path.relative(path.dirname(path.resolve("lib", "glosses", file.relative)), file.path);
                }
            })
            .unstash()
            .dest("lib/glosses");
        await fast.src(["src/glosses/**/*", "!src/glosses/**/*.js", "!src/glosses/schema/__/dot/*"], { cwd: __dirname })
            .dest("lib/glosses", { produceFiles: true });
        {
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
                .dest("lib/glosses/schema/__/dot");
        }
    },
    async cleanIndex() {
        await fs.rm("lib/index.js");
    },
    async index(args, opts) {
        await fast.src("src/index.js")
            .sourcemapsInit()
            .transpile({
                compact: false,
                only: /\.js$/,
                sourceMaps: true,
                plugins: [
                    "syntax.decorators",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.classProperties",
                    "syntax.flow",
                    ...(opts.has("coverage") ? [js.coverage.plugin] : []),
                    "transform.flowStripTypes",
                    "transform.decoratorsLegacy",
                    "transform.classProperties",
                    "transform.ESModules",
                    "transform.functionBind",
                    "transform.objectRestSpread"
                ]
            })
            .sourcemapsWrite(".", {
                mapSources: (sourcePath, file) => {
                    return path.relative(path.dirname(path.resolve("lib", "glosses", file.relative)), file.path);
                }
            })
            .dest("lib");
    },
    async cleanOmnitron() {
        await fs.rm("lib/omnitron");
    },
    async omnitron(args, opts) {
        await fast.src("src/omnitron/**/*.js")
            .sourcemapsInit()
            .transpile({
                compact: false,
                only: /\.js$/,
                sourceMaps: true,
                plugins: [
                    "syntax.decorators",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.classProperties",
                    "syntax.flow",
                    ...(opts.has("coverage") ? [js.coverage.plugin] : []),
                    "transform.flowStripTypes",
                    "transform.decoratorsLegacy",
                    "transform.classProperties",
                    "transform.ESModules",
                    "transform.functionBind",
                    "transform.objectRestSpread",
                    () => ({
                        visitor: {
                            ImportDeclaration(p, state) {
                                if (p.node.source.value === "adone") {
                                    p.node.source.value = path.relative(path.dirname(state.file.opts.filename), "lib");
                                }
                            }
                        }
                    })
                ]
            })
            .sourcemapsWrite(".", {
                mapSources: (sourcePath, file) => {
                    return path.relative(path.dirname(path.resolve("lib", "glosses", file.relative)), file.path);
                }
            })
            .dest("lib/omnitron");
    },
    async clean() {
        await this.cleanBin();
        await this.cleanGlosses();
        await this.cleanOmnitron();
        await this.cleanIndex();
    },
    async main(args, opts) {
        await this.clean();
        await this.glosses(args, opts);
        await this.omnitron(args, opts);
        await this.bin(args, opts);
        await this.index(args, opts);
    }
});
