const { fast, std: { path }, js, fs, templating: { dot } } = adone;

adone.application.run({
    initialize() {
        this.defineArguments({
            help: "build adone",
            arguments: [
                { name: "tasks", nargs: "*" }
            ],
            options: [
                { name: "--coverage", help: "build with coverage support" },
                { name: "--watch", help: "watch files" },
                { name: "--build", help: "force build before watch" },
                { name: "--no-sourcemaps", help: "disable sourcemaps generating" }
            ]
        });
    },
    async cleanBin() {
        await fs.rm("bin");
    },
    async bin({ watch, build, clean, coverage, sourcemaps }) {
        if (clean) {
            await this.cleanBin();
        }
        const start = (s) => {
            s.stash((x) => x.path.includes(path.join("meta", "polyfills")));
            if (sourcemaps) {
                s.sourcemapsInit();
            }
            s.transpile({
                compact: false,
                sourceMaps: sourcemaps,
                plugins: [
                    "syntax.decorators",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.classProperties",
                    "syntax.flow",
                    ...(coverage ? [js.coverage.plugin] : []),
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
            });
            if (sourcemaps) {
                s.sourcemapsWrite(".", {
                    mapSources: (sourcePath, file) => {
                        return path.relative(path.dirname(path.resolve("bin", file.relative)), file.path);
                    }
                });
            }
            return s
                .chmod({
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
                .unstash();
        };
        if (build) {
            const bar = adone.runtime.term.progress({
                schema: ":spinner [bin] :done / :total :elapsed"
            });
            let total = 0;
            let done = 0;
            bar.update(0, { done, total });
            await start(fast.src("src/cli/**/*.js").through(function (file) {
                ++total;
                bar.update(0, { done, total });
                this.push(file);
            }))
                .notify({
                    onLast: true,
                    title: "bin",
                    message: "done",
                    console: false
                })
                .through(function (file) {
                    if (file.extname !== ".map") {
                        ++done;
                        bar.update(0, { done, total });
                    }
                    this.push(file);
                })
                .dest("bin");
            bar.complete(true);
        }
        if (watch) {
            adone.info("[bin] start watching");

            start(fast.watch("src/cli/**/*.js")).notify({
                title: "bin",
                filter: (file) => file.extname !== ".map",
                message: (file) => path.relative(process.cwd(), file.path)
            }).dest("bin").on("error", fast.transform.notify.onError({
                title: "bin",
                message: (error) => error.message
            }));
        }
    },
    async cleanGlosses() {
        await fs.rm("lib/glosses");
    },
    async glosses({ watch, build, clean, coverage, sourcemaps }) {
        if (clean) {
            await this.cleanGlosses();
        }
        const start = (s) => {
            s.stash((x) => x.path.includes(path.join("glosses", "vendor")));
            if (sourcemaps) {
                s.sourcemapsInit();
            }
            s.transpile({
                compact: false,
                only: /\.js$/,
                sourceMaps: sourcemaps,
                plugins: [
                    "syntax.decorators",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.classProperties",
                    "syntax.flow",
                    ...(coverage ? [js.coverage.plugin] : []),
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
            });
            if (sourcemaps) {
                s.sourcemapsWrite(".", {
                    mapSources: (sourcePath, file) => {
                        return path.relative(path.dirname(path.resolve("lib", "glosses", file.relative)), file.path);
                    }
                });
            }
            return s.unstash();
        };

        const processTemplates = async () => {
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
            const files = await fast.src("src/glosses/schema/__/dot/*.jst")
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
                .dest("lib/glosses/schema/__/dot", { produceFiles: true });
            return files.length;
        };
        if (build) {
            const bar = adone.runtime.term.progress({
                schema: ":spinner [glosses] :done / :total :elapsed"
            });
            let done = 0;
            let total = 0;
            bar.update(0, { done, total });
            await start(fast.src("src/glosses/**/*.js").through(function (file) {
                ++total;
                bar.update(0, { done, total });
                this.push(file);
            }))
                .notify({
                    title: "glosses",
                    onLast: true,
                    message: "done",
                    console: false
                })
                .through(function (file) {
                    if (file.extname !== ".map") {
                        ++done;
                        bar.update(0, { done, total });
                    }
                    this.push(file);
                })
                .dest("lib/glosses");
            await fast.src(["src/glosses/**/*", "!src/glosses/**/*.js", "!src/glosses/schema/__/dot/*"], { cwd: __dirname })
                .through(function (file) {
                    ++total;
                    ++done;
                    bar.update(0, { done, total });
                    this.push(file);
                })
                .notify({
                    onLast: true,
                    title: "glosses",
                    message: "copying done",
                    console: false
                })
                .dest("lib/glosses");
            const f = await processTemplates();
            total += f;
            done += f;
            bar.complete(true, { done, total });
        }

        if (watch) {
            adone.info("[glosses] start watching");

            start(fast.watch("src/glosses/**/*.js")).notify({
                title: "glosses",
                filter: (file) => file.extname !== ".map",
                message: (file) => path.relative(process.cwd(), file.path)
            }).dest("lib/glosses").on("error", fast.transform.notify.onError({
                title: "glosses",
                message: (error) => error.message
            }));
            fast.watch(["src/glosses/**/*", "!src/glosses/**/*.js", "!src/glosses/schema/__/dot/*"], { cwd: __dirname })
                .notify({
                    title: "glosses",
                    filter: (file) => file.extname !== ".map",
                    message: (file) => path.relative(process.cwd(), file.path)
                }).dest("lib/glosses").on("error", fast.transform.notify.onError({
                    title: "glosses",
                    message: (error) => error.message
                }));
        }

    },
    async cleanIndex() {
        await fs.rm("lib/@(index.js|index.js.map)");
    },
    async index({ watch, build, clean, coverage, sourcemaps }) {
        if (clean) {
            await this.cleanIndex();
        }
        const start = (s) => {
            if (sourcemaps) {
                s.sourcemapsInit();
            }
            s.transpile({
                compact: false,
                only: /\.js$/,
                sourceMaps: sourcemaps,
                plugins: [
                    "syntax.decorators",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.classProperties",
                    "syntax.flow",
                    ...(coverage ? [js.coverage.plugin] : []),
                    "transform.flowStripTypes",
                    "transform.decoratorsLegacy",
                    "transform.classProperties",
                    "transform.ESModules",
                    "transform.functionBind",
                    "transform.objectRestSpread"
                ]
            });
            if (sourcemaps) {
                s.sourcemapsWrite(".", {
                    mapSources: (sourcePath, file) => {
                        return path.relative(path.dirname(path.resolve("lib", "glosses", file.relative)), file.path);
                    }
                });
            }
            return s;
        };
        if (build) {
            const bar = adone.runtime.term.progress({
                schema: ":spinner [index] :done / :total :elapsed"
            });
            let total = 0;
            let done = 0;
            bar.update(0, { done, total });
            await start(fast.src("src/index.js").through(function (file) {
                ++total;
                bar.update(0, { done, total });
                this.push(file);
            }))
                .notify({
                    onLast: true,
                    title: "index",
                    message: "done",
                    console: false
                })
                .through(function (file) {
                    if (file.extname !== ".map") {
                        ++done;
                        bar.update(0, { done, total });
                    }
                    this.push(file);
                })
                .dest("lib");
            bar.complete(true);
        }
        if (watch) {
            adone.info("[index] start watching");

            start(fast.watch("src/index.js")).notify({
                title: "index",
                filter: (file) => file.extname !== ".map",
                message: (file) => path.relative(process.cwd(), file.path)
            });
        }
    },
    async cleanOmnitron() {
        await fs.rm("lib/omnitron");
    },
    async omnitron({ watch, build, clean, coverage, sourcemaps }) {
        if (clean) {
            await this.cleanOmnitron();
        }
        const start = (s) => {
            if (sourcemaps) {
                s.sourcemapsInit();
            }
            s.transpile({
                compact: false,
                only: /\.js$/,
                sourceMaps: sourcemaps,
                plugins: [
                    "syntax.decorators",
                    "syntax.objectRestSpread",
                    "syntax.functionBind",
                    "syntax.classProperties",
                    "syntax.flow",
                    ...(coverage ? [js.coverage.plugin] : []),
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
            });
            if (sourcemaps) {
                s.sourcemapsWrite(".", {
                    mapSources: (sourcePath, file) => {
                        return path.relative(path.dirname(path.resolve("lib", "glosses", file.relative)), file.path);
                    }
                });
            }
            return s;
        };
        if (build) {
            const bar = adone.runtime.term.progress({
                schema: ":spinner [omnitron] :done / :total :elapsed"
            });
            let total = 0;
            let done = 0;
            bar.update(0, { done, total });
            await start(fast.src("src/omnitron/**/*.js").through(function (file) {
                ++total;
                bar.update(0, { done, total });
                this.push(file);
            }))
                .notify({
                    onLast: true,
                    title: "omnitron",
                    message: "done",
                    console: false
                })
                .through(function (file) {
                    if (file.extname !== ".map") {
                        ++done;
                        bar.update(0, { done, total });
                    }
                    this.push(file);
                })
                .dest("lib/omnitron");
            bar.complete(true);
        }
        if (watch) {
            adone.info("[omnitron] start watching");

            await start(fast.watch("src/omnitron/**/*.js")).notify({
                title: "omnitron",
                filter: (file) => file.extname !== ".map",
                message: (file) => path.relative(process.cwd(), file.path)
            }).dest("lib/omnitron").on("error", fast.transform.notify.onError({
                title: "bin",
                message: (error) => error.message
            }));
        }
    },
    async clean() {
        await this.cleanBin();
        await this.cleanGlosses();
        await this.cleanOmnitron();
        await this.cleanIndex();
    },
    async main(args, opts) {
        const tasks = (options) => {
            const tasks = args.has("tasks")
                ? args.get("tasks")
                : ["glosses", "omnitron", "bin", "index"];
            return Promise.all(tasks.map((x) => this[x](options)));
        };
        const coverage = opts.get("coverage");
        const sourcemaps = !opts.get("no-sourcemaps");
        const watch = opts.get("watch");
        if (!watch || opts.get("build")) {
            await tasks({ clean: true, build: true, watch: false, coverage, sourcemaps });
        }
        if (watch) {
            await tasks({ clean: false, build: false, watch: true, coverage, sourcemaps });
        }
    }
});
