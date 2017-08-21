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

const $watchOpts = {
    awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
    }
};

const notificatorFor = (title) => ({ watch }) => ({
    title,
    filter: (file) => file.extname !== ".map",
    message: watch ? (file) => path.relative(process.cwd(), file.path) : "done",
    onLast: !watch,
    console: watch
});

const errorHandlerFor = (title) => fast.transform.notify.onError({
    title,
    message: (error) => error.message
});

const importAdoneReplacer = (replacer) => () => ({
    visitor: {
        ImportDeclaration(p, state) {
            if (p.node.source.value === "adone") {
                p.node.source.value = replacer(state.file.opts);
            }
        }
    }
});

export default {
    project: {
        structure: {
            bin: {
                $progress: ({ watch }) => !watch,
                async $clean() {
                    await fs.rm("bin");
                },
                async $before({ watch }) {
                    if (!watch) {
                        await this.$clean();
                    } else {
                        adone.info("watch bin");
                    }
                },
                $from: "src/cli/adone.js",
                $to: "bin",
                $watchOpts,
                $transform: (stream) => {
                    stream.sourcemapsInit();
                    transpile(stream, importAdoneReplacer(({ filenameRelative }) => {
                        return path.relative(path.join("bin", path.dirname(filenameRelative)), "lib");
                    }));
                    stream.sourcemapsWrite(".", {
                        destPath: "bin"
                    });
                    stream.chmod({
                        owner: { read: true, write: true, execute: true },
                        group: { read: true, write: false, execute: true },
                        others: { read: true, write: false, execute: true }
                    });
                },
                $notify: notificatorFor("bin"),
                $onError: errorHandlerFor("bin")
            },
            cli: {
                $progress: ({ watch }) => !watch,
                async $clean() {
                    await fs.rm("lib/cli");
                },
                async $before({ watch }) {
                    if (!watch) {
                        await this.$clean();
                    } else {
                        adone.info("watch cli");
                    }
                },
                $from: ["src/cli/**/*", "!src/cli/adone.js"],
                $to: "lib/cli",
                $watchOpts,
                $transform: (stream) => {
                    stream.sourcemapsInit();
                    transpile(stream, importAdoneReplacer(({ filename }) => {
                        return path.relative(path.dirname(filename), "lib");
                    }));
                    stream.sourcemapsWrite(".", {
                        destPath: "lib/cli"
                    });
                },
                $notify: notificatorFor("cli"),
                $onError: errorHandlerFor("cli")
            },
            glosses: {
                async $clean() {
                    await fs.rm("lib/glosses");
                },
                async $before({ watch }) {
                    if (!watch) {
                        await this.$clean();
                    } else {
                        adone.info("watch glosses");
                    }
                },
                js: {
                    $progress: ({ watch }) => !watch,
                    $from: "src/glosses/**/*.js",
                    $to: "lib/glosses",
                    $watchOpts,
                    $transform: (stream) => {
                        stream.sourcemapsInit();
                        transpile(stream, importAdoneReplacer(({ filename }) => {
                            return path.relative(path.dirname(filename), "lib");
                        }));
                        stream.sourcemapsWrite(".", {
                            destPath: "lib/glosses"
                        });
                    },
                    $notify: notificatorFor("glosses.js"),
                    $onError: errorHandlerFor("glosses.js")
                },
                dot: {
                    $progress: ({ watch }) => !watch,
                    $watch: "src/glosses/schema/__/dot/**/*",
                    $watchOpts,
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
                            .on("error", errorHandlerFor("glosses.js"))
                            .dest("lib/glosses/schema/__/dot").catch(adone.noop);
                    }
                },
                other: {
                    $progress: ({ watch }) => !watch,
                    $from: ["src/glosses/**/*", "!src/glosses/**/*.js", "!src/glosses/schema/__/dot/*"],
                    $to: "lib/glosses",
                    $watchOpts,
                    $notify: notificatorFor("glosses.other")
                }
            },
            vendor: {
                $progress: ({ watch }) => !watch,
                async $clean() {
                    await fs.rm("lib/vendor");
                },
                async $before({ watch }) {
                    if (!watch) {
                        await this.$clean();
                    } else {
                        adone.info("watch vendor");
                    }
                },
                $from: "src/vendor/**/*",
                $to: "lib/vendor",
                $watchOpts,
                $notify: notificatorFor("vendor")
            },
            npm: {
                $progress: ({ watch }) => !watch,
                async $clean() {
                    await fs.rm("lib/npm");
                },
                async $before({ watch }) {
                    if (!watch) {
                        await this.$clean();
                    } else {
                        adone.info("watch npm");
                    }
                },
                $from: "src/npm/**/*",
                $to: "lib/npm",
                $watchOpts,
                $notify: notificatorFor("npm")
            },
            index: {
                $progress: ({ watch }) => !watch,
                async $clean() {
                    await fs.rm("lib/@(index.js|index.js.map)");
                },
                async $before({ watch }) {
                    if (!watch) {
                        await this.$clean();
                    } else {
                        adone.info("watch index");
                    }
                },
                $from: "src/index.js",
                $to: "lib",
                $watchOpts,
                $transform: (stream) => {
                    stream.sourcemapsInit();
                    transpile(stream);
                    stream.sourcemapsWrite(".", {
                        destPath: "lib"
                    });
                },
                $notify: notificatorFor("index"),
                $onError: errorHandlerFor("index")
            },
            omnitron: {
                $progress: ({ watch }) => !watch,
                async $clean() {
                    await fs.rm("lib/omnitron");
                },
                async $before({ watch }) {
                    if (!watch) {
                        await this.$clean();
                    } else {
                        adone.info("watch omnitron");
                    }
                },
                $from: "src/omnitron/**/*",
                $to: "lib/omnitron",
                $watchOpts,
                $transform: (stream) => {
                    stream.sourcemapsInit();
                    transpile(stream, importAdoneReplacer(({ filename }) => {
                        return path.relative(path.dirname(filename), "lib");
                    }));
                    stream.sourcemapsWrite(".", {
                        destPath: "lib/omnitron"
                    });
                },
                $notify: notificatorFor("omnitron"),
                $onError: errorHandlerFor("omnitron")
            }
        }
    }
};
