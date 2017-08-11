const gulp = require("gulp");
const babel = require("gulp-babel");
const cache = require("gulp-cached");
const notify = require("gulp-notify");
const plumber = require("gulp-plumber");
const sourcemaps = require("gulp-sourcemaps");
const gutil = require("gulp-util");
const del = require("del");
const chmod = require("gulp-chmod");
const path = require("path");
const dot = require("dot");
const through2 = require("through2");
const importReplace = function () { // ... gulp
    return {
        visitor: {
            ImportDeclaration(p, state) {
                if (p.node.source.value.startsWith(state.opts.old)) {
                    const relative = path.relative(state.opts.old, p.node.source.value);
                    if (state.file.opts.filename.includes("/src/cli/")) {
                        p.node.source.value = `./${path.relative(path.resolve(path.dirname(state.file.opts.filename), "../../bin"), path.resolve(state.opts.new, relative))}`;
                    } else {
                        p.node.source.value = `./${path.relative(path.dirname(state.file.opts.filename), path.resolve(state.opts.new, relative))}`;
                    }
                }
            }
        }
    };
};


const paths = {
    bin: {
        from: ["src/cli/adone.js"],
        to: "bin"
    },
    subsystems: {
        from: ["src/subsystems/**/*"],
        to: "lib/subsystems"
    },
    omnitron: {
        from: ["src/omnitron/**/*"],
        to: "lib/omnitron"
    },
    glosses: {
        from: ["src/glosses/**/*", "!src/glosses/vendor/**/*", "!src/glosses/schema/dot/*"],
        to: "lib/glosses"
    },
    schemaTemplates: {
        from: ["src/glosses/schema/__/dot/*"],
        to: "lib/glosses/schema/__/dot"
    },
    index: {
        from: ["src/index.js"],
        to: "lib"
    },
    tests: {
        from: ["tests/*.js", "tests/glosses*/shani/**/*"],
        to: "libTests"
    },
    examples: {
        from: ["examples/**/*.js"],
        to: "libExamples"
    },
    vendor: {
        from: ["src/vendor/**/*"],
        to: "lib/vendor"
    }
};

const errorHandler = () => plumber({
    errorHandler: (err) => {
        gutil.log(`${err}\n${err.codeFrame}`);
        notify.onError("Error: <%= error.message %>")(err);
    }
});

const transform = () => babel({
    compact: false,
    only: /\.js$/,
    sourceMaps: true,
    plugins: [
        "transform-flow-strip-types",
        "transform-decorators-legacy",
        "transform-class-properties",
        "transform.ESModules",
        "transform-function-bind",
        "transform-object-rest-spread",
        [importReplace, {
            old: "adone",
            new: path.resolve(__dirname, "lib")
        }],
        [importReplace, {
            old: "omnitron",
            new: path.resolve(__dirname, "lib", "omnitron")
        }]
    ]
});

const buildBin = () => gulp.src(paths.bin.from)
    .pipe(errorHandler())
    .pipe(cache("bin"))
    .pipe(sourcemaps.init())
    .pipe(transform())
    .pipe(sourcemaps.mapSources((sourcePath, file) => {
        return path.relative(path.dirname(path.resolve(paths.bin.to, file.relative)), file.path);
    }))
    .pipe(sourcemaps.write("."))
    .pipe(chmod({
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
    }))
    .pipe(notify({ message: "Done: bin", onLast: true }))
    .pipe(gulp.dest(paths.bin.to));

const buildSubsystems = () => gulp.src(paths.subsystems.from)
    .pipe(errorHandler())
    .pipe(cache("subsystems"))
    .pipe(sourcemaps.init())
    .pipe(transform())
    .pipe(sourcemaps.mapSources((sourcePath, file) => {
        return path.relative(path.dirname(path.resolve(paths.subsystems.to, file.relative)), file.path);
    }))
    .pipe(sourcemaps.write("."))
    .pipe(notify({ message: "Done: subsystems", onLast: true }))
    .pipe(gulp.dest(paths.subsystems.to));

const buildOmnitron = () => gulp.src(paths.omnitron.from)
    .pipe(errorHandler())
    .pipe(cache("omnitron"))
    .pipe(sourcemaps.init())
    .pipe(transform())
    .pipe(sourcemaps.mapSources((sourcePath, file) => {
        return path.relative(path.dirname(path.resolve(paths.omnitron.to, file.relative)), file.path);
    }))
    .pipe(sourcemaps.write("."))
    .pipe(notify({ message: "Done: omnitron", onLast: true }))
    .pipe(gulp.dest(paths.omnitron.to));

const buildIndex = () => gulp.src(paths.index.from)
    .pipe(errorHandler())
    .pipe(cache("index"))
    .pipe(sourcemaps.init())
    .pipe(transform())
    .pipe(sourcemaps.mapSources((sourcePath, file) => {
        return path.relative(path.dirname(path.resolve(paths.index.to, file.relative)), file.path);
    }))
    .pipe(sourcemaps.write("."))
    .pipe(notify({ message: "Done: index", onLast: true }))
    .pipe(gulp.dest(paths.index.to));

const buildGlosses = () => gulp.src(paths.glosses.from)
    .pipe(errorHandler())
    .pipe(cache("glosses"))
    .pipe(sourcemaps.init())
    .pipe(transform())
    .pipe(sourcemaps.mapSources((sourcePath, file) => {
        return path.relative(path.dirname(path.resolve(paths.glosses.to, file.relative)), file.path);
    }))
    .pipe(sourcemaps.write("."))
    .pipe(notify({ message: "Done: glosses", onLast: true }))
    .pipe(gulp.dest(paths.glosses.to));

const buildSchemaTemplates = (cb) => {
    // shit..
    const defs = {};
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

    gulp.src(`${paths.schemaTemplates.from}.def`)
        .on("data", (file) => {
            const name = path.basename(file.path, ".def");
            defs[name] = file.contents.toString("utf-8");
        })
        .once("error", cb)
        .once("end", () => {
            gulp.src(`${paths.schemaTemplates.from}.jst`)
                .once("error", cb)
                .pipe(through2.obj((file, _, cb) => {
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
                    cb(null, file);
                }))
                .once("error", cb)
                .pipe(gulp.dest(paths.schemaTemplates.to))
                .once("error", cb)
                .on("end", cb);
        });
};

const buildTests = () => gulp.src(paths.tests.from)
    .pipe(errorHandler())
    .pipe(cache("tests"))
    .pipe(sourcemaps.init())
    .pipe(transform())
    .pipe(sourcemaps.mapSources((sourcePath, file) => {
        return path.relative(path.dirname(path.resolve(paths.tests.to, file.relative)), file.path);
    }))
    .pipe(sourcemaps.write("."))
    .pipe(notify({ message: "Done: tests", onLast: true }))
    .pipe(gulp.dest(paths.tests.to));

const buildExamples = () => gulp.src(paths.examples.from)
    .pipe(errorHandler())
    .pipe(cache("examples"))
    .pipe(sourcemaps.init())
    .pipe(transform())
    .pipe(sourcemaps.mapSources((sourcePath, file) => {
        return path.relative(path.dirname(path.resolve(paths.examples.to, file.relative)), file.path);
    }))
    .pipe(sourcemaps.write("."))
    .pipe(notify({ message: "Done: examples", onLast: true }))
    .pipe(gulp.dest(paths.examples.to));

const copyVendor = () => gulp.src(paths.vendor.from)
    .pipe(errorHandler())
    .pipe(cache("vendor"))
    .pipe(notify({ message: "Done: vendor", onLast: true }))
    .pipe(gulp.dest(paths.vendor.to));

gulp.task("clean-bin", () => del(paths.bin.to));
gulp.task("build-bin", ["clean-bin"], buildBin);

gulp.task("clean-subsystems", () => del(paths.subsystems.to));
gulp.task("build-subsystems", ["clean-subsystems"], buildSubsystems);

gulp.task("clean-glosses", () => del(paths.glosses.to));
gulp.task("build-glosses", ["clean-glosses"], buildGlosses);

gulp.task("clean-omnitron", () => del(paths.omnitron.to));
gulp.task("build-omnitron", ["clean-omnitron"], buildOmnitron);

gulp.task("clean-index", () => del(path.join(paths.index.to, "index.js")));
gulp.task("build-index", [], buildIndex);

gulp.task("clean-tests", () => del(paths.tests.to));
gulp.task("build-tests", ["clean-tests"], buildTests);

gulp.task("clean-examples", () => del(paths.examples.to));
gulp.task("build-examples", ["clean-tests"], buildExamples);

gulp.task("build-vendor", ["clean-glosses"], copyVendor);

gulp.task("clean-schema-templates", () => del(paths.schemaTemplates.to));
gulp.task("build-schema-templates", ["clean-schema-templates"], buildSchemaTemplates);

gulp.task("clean", ["clean-examples", "clean-tests", "clean-glosses", "clean-bin", "clean-subsystems", "clean-omnitron", "clean-index", "clean-schema-templates"]);
gulp.task("build", ["build-examples", "build-tests", "build-glosses", "build-bin", "build-subsystems", "build-omnitron", "build-index", "build-vendor", "build-schema-templates"]);

gulp.task("watch", ["build"], () => {
    gulp.watch(paths.bin.from, buildBin);
    gulp.watch(paths.subsystems.from, buildSubsystems);
    gulp.watch(paths.tests.from, buildTests);
    gulp.watch(paths.examples.from, buildExamples);
    gulp.watch(paths.glosses.from, buildGlosses);
    gulp.watch(paths.omnitron.from, buildOmnitron);
    gulp.watch(paths.index.from, buildIndex);
    gulp.watch(paths.vendor.from, copyVendor);
    gulp.watch(paths.schemaTemplates.from, () => buildSchemaTemplates((err) => {
        if (err) {
            gutil.log(err);
        }
    }));
});

gulp.task("default", ["build"]);
