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
const importReplace = function () {  // ... gulp
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
        from: ["src/cli/**/*"],
        to: "bin"
    },
    omnitron: {
        from: ["src/omnitron/**/*"],
        to: "lib/omnitron"
    },
    glosses: {
        from: ["src/glosses/**/*", "!src/glosses/vendor/**/*"],
        to: "lib/glosses"
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
        from: ["src/glosses/vendor/**/*"],
        to: "lib/glosses/vendor"
    }
};

function errorHandler() {
    return plumber({
        errorHandler: (err) => {
            gutil.log(`${err}\n${err.codeFrame}`);
            notify.onError("Error: <%= error.message %>")(err);
        }
    });
}

function transform() {
    return babel({
        compact: false,
        only: /\.js$/,
        sourceMaps: true,
        plugins: [
            "transform-flow-strip-types",
            "transform-decorators-legacy",
            "transform-class-properties",
            "transform-es2015-modules-commonjs",
            "transform-async-to-generator",
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
}

function buildBin() {
    return gulp.src(paths.bin.from)
        .pipe(errorHandler())
        .pipe(cache("bin"))
        .pipe(sourcemaps.init())
        .pipe(transform())
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
}

function buildOmnitron() {
    return gulp.src(paths.omnitron.from)
        .pipe(errorHandler())
        .pipe(cache("omnitron"))
        .pipe(sourcemaps.init())
        .pipe(transform())
        .pipe(sourcemaps.write("."))
        .pipe(notify({ message: "Done: omnitron", onLast: true }))
        .pipe(gulp.dest(paths.omnitron.to));
}

function buildIndex() {
    return gulp.src(paths.index.from)
        .pipe(errorHandler())
        .pipe(cache("index"))
        .pipe(sourcemaps.init())
        .pipe(transform())
        .pipe(sourcemaps.write("."))
        .pipe(notify({ message: "Done: index", onLast: true }))
        .pipe(gulp.dest(paths.index.to));
}

function buildGlosses() {
    return gulp.src(paths.glosses.from)
        .pipe(errorHandler())
        .pipe(cache("glosses"))
        .pipe(sourcemaps.init())
        .pipe(transform())
        .pipe(sourcemaps.write("."))
        .pipe(notify({ message: "Done: glosses", onLast: true }))
        .pipe(gulp.dest(paths.glosses.to));
}

function buildTests() {
    return gulp.src(paths.tests.from)
        .pipe(errorHandler())
        .pipe(cache("tests"))
        .pipe(sourcemaps.init())
        .pipe(transform())
        .pipe(sourcemaps.write("."))
        .pipe(notify({ message: "Done: tests", onLast: true }))
        .pipe(gulp.dest(paths.tests.to));
}

function buildExamples() {
    return gulp.src(paths.examples.from)
        .pipe(errorHandler())
        .pipe(cache("examples"))
        .pipe(sourcemaps.init())
        .pipe(transform())
        .pipe(sourcemaps.write("."))
        .pipe(notify({ message: "Done: examples", onLast: true }))
        .pipe(gulp.dest(paths.examples.to));
}

function copyVendor() {
    return gulp.src(paths.vendor.from)
        .pipe(errorHandler())
        .pipe(cache("vendor"))
        .pipe(notify({ message: "Done: vendor", onLast: true }))
        .pipe(gulp.dest(paths.vendor.to));
}

gulp.task("clean-bin", () => del(paths.bin.to));
gulp.task("build-bin", ["clean-bin"], buildBin);

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

gulp.task("clean-vendor", () => del(paths.vendor.to));
gulp.task("build-vendor", ["clean-vendor"], copyVendor);

gulp.task("clean", ["clean-examples", "clean-tests", "clean-glosses", "clean-bin", "clean-omnitron", "clean-index", "clean-vendor"]);
gulp.task("build", ["build-examples", "build-tests", "build-glosses", "build-bin", "build-omnitron", "build-index", "build-vendor"]);

gulp.task("watch", ["build"], () => {
    gulp.watch(paths.bin.from, buildBin);
    gulp.watch(paths.tests.from, buildTests);
    gulp.watch(paths.examples.from, buildExamples);
    gulp.watch(paths.glosses.from, buildGlosses);
    gulp.watch(paths.omnitron.from, buildOmnitron);
    gulp.watch(paths.index.from, buildIndex);
    gulp.watch(paths.vendor.from, copyVendor);
});

gulp.task("default", ["build"]);
