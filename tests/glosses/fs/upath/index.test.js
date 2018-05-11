const {
    lodash: _,
    fs: { upath },
    std: { path, util }
} = adone;

// _.mixin(require("underscore.string").exports());
const ref = require("./specHelpers");
const { equal, deepEqual } = ref;
const splitPaths = function (pathsStr) {
    return pathsStr.split(",").map((p) => {
        return _.trim(p);
    });
};
const getMaxLengths = function (inputToExpected) {
    return [
        _.max(_.map(_.keys(inputToExpected), "length")),
        _.max(_.map(inputToExpected, "length"))
    ];
};
const formatObjectToOneLine = function (any) {
    return util.inspect(any, { colors: true }).replace(/\n /g, "");
};
const getDefaultLine = function (input, expected, maxLengths) {
    const ipad = _.pad("", maxLengths[0] - input.length + 5, " ");
    const epad = _.pad("", maxLengths[1] - expected.length + 5, " ");
    return `\`'${input}'\`${ipad} ---> ${epad}\`${formatObjectToOneLine(expected)}\``;
};
const runSpec = function (inputToExpected, getLine, itTest) {
    if (!itTest) {
        itTest = getLine;
        getLine = getDefaultLine;
    }
    const maxLengths = getMaxLengths(inputToExpected);
    const results = [];
    for (const input in inputToExpected) {
        const expected = inputToExpected[input];
        results.push(function (input, expected, maxLengths) {
            let finalLine;
            let line;
            finalLine = line = getLine(input, expected, maxLengths);
            if (_.isArray(line)) {
                finalLine = getDefaultLine(line[0], line[1], maxLengths);
                if (line[2]) {
                    finalLine += line[2];
                }
            }
            return it(finalLine, itTest(input, expected));
        }(input, expected, maxLengths));
    }
    return results;
};
describe("fs", "upath", () => {
    describe("\n\n[![Build Status](https://travis-ci.org/anodynos/upath.svg?branch=master)](https://travis-ci.org/anodynos/upath)\n[![Up to date Status](https://david-dm.org/anodynos/upath.png)](https://david-dm.org/anodynos/upath)\n\nA drop-in replacement / proxy to nodejs's `path` that:\n\n  * Replaces the windows `\\` with the unix `/` in all string params & results. This has significant positives - see below.\n\n  * Adds **filename extensions** functions `addExt`, `trimExt`, `removeExt`, `changeExt`, and `defaultExt`.\n\n  * Add a `normalizeSafe` function to preserve any meaningful leading `./` & a `normalizeTrim` which additionally trims any useless ending `/`.\n\n  * Plus a helper `toUnix` that simply converts `\\` to `/` and consolidates duplicates.\n\n**Useful note: these docs are actually auto generated from [specs](https://github.com/anodynos/upath/blob/master/source/spec/upath-spec.coffee), running on Linux.**\n\nNotes:\n\n * `upath.sep` is set to `'/'` for seamless replacement (as of 1.0.3).\n\n * upath has no runtime dependencies, except built-in `path` (as of 1.0.4)", () => {
        return describe("\n\n## Why ?\n\nNormal `path` doesn't convert paths to a unified format (ie `/`) before calculating paths (`normalize`, `join`), which can lead to numerous problems.\nAlso path joining, normalization etc on the two formats is not consistent, depending on where it runs. Running `path` on Windows yields different results than when it runs on Linux / Mac.\n\nIn general, if you code your paths logic while developing on Unix/Mac and it runs on Windows, you may run into problems when using `path`.\n\nNote that using **Unix `/` on Windows** works perfectly inside nodejs (and other languages), so there's no reason to stick to the Windows legacy at all.\n\n##### Examples / specs", function () {
            describe("\n\nCheck out the different (improved) behavior to vanilla `path`:\n\n    `upath.normalize(path)`        --returns-->\n", function () {
                var inputToExpected;
                inputToExpected = {
                    "c:/windows/nodejs/path": "c:/windows/nodejs/path",
                    "c:/windows/../nodejs/path": "c:/nodejs/path",
                    "c:\\windows\\nodejs\\path": "c:/windows/nodejs/path",
                    "c:\\windows\\..\\nodejs\\path": "c:/nodejs/path",
                    "//windows\\unix/mixed": "/windows/unix/mixed",
                    "\\windows//unix/mixed": "/windows/unix/mixed",
                    "////\\windows\\..\\unix/mixed/": "/unix/mixed/"
                };
                return runSpec(inputToExpected, function (input, expected) {
                    var pathResult;
                    return [
                        input.replace(/\\/g, "\\\\"),
                        expected,
                        (pathResult = path.normalize(input)) !== expected ? "  // `path.normalize()` gives `'" + pathResult + "'`" : "  // equal to `path.normalize()`"
                    ];
                }, function (input, expected) {
                    return function () {
                        return equal(upath.normalize(input), expected);
                    };
                });
            });
            describe("\n\nJoining paths can also be a problem:\n\n    `upath.join(paths...)`        --returns-->\n", function () {
                var inputToExpected;
                inputToExpected = {
                    "some/nodejs/deep, ../path": "some/nodejs/path",
                    "some/nodejs\\windows, ../path": "some/nodejs/path",
                    "some\\windows\\only, ..\\path": "some/windows/path"
                };
                return runSpec(inputToExpected, function (input, expected) {
                    var pathResult;
                    return [
                        splitPaths(input.replace(/\\/g, "\\\\")).join("', '"),
                        expected,
                        (pathResult = path.join.apply(null, splitPaths(input))) !== expected ? "  // `path.join()` gives `'" + pathResult + "'`" : "  // equal to `path.join()`"
                    ];
                }, function (input, expected) {
                    return function () {
                        return equal(upath.join.apply(null, splitPaths(input)), expected);
                    };
                });
            });
            if (!_.startsWith(process.version, "v0.10")) {
                return describe("\n\nParsing with `path.parse()` should also be consistent across OSes:\n\n  `upath.parse(path)`        --returns-->\n", function () {
                    var inputToExpected;
                    inputToExpected = {
                        "c:\\Windows\\Directory\\somefile.ext": {
                            root: "",
                            dir: "c:/Windows/Directory",
                            base: "somefile.ext",
                            ext: ".ext",
                            name: "somefile"
                        },
                        "/root/of/unix/somefile.ext": {
                            root: "/",
                            dir: "/root/of/unix",
                            base: "somefile.ext",
                            ext: ".ext",
                            name: "somefile"
                        }
                    };
                    return runSpec(inputToExpected, function (input, expected) {
                        var i, pathResult, ref1, results;
                        return [
                            input,
                            expected,
                            !_.isEqual(pathResult = path.parse.call(null, input), expected) ? "\n" + function () {
                                results = [];
                                for (var i = 1, ref1 = input.length + 2; 1 <= ref1 ? i <= ref1 : i >= ref1; 1 <= ref1 ? i++ : i--) {
                                    results.push(i);
                                }
                                return results;
                            }.apply(this).map(function () {
                                return " ";
                            }).join("") + (" // `path.parse()` gives `'" + formatObjectToOneLine(pathResult) + "'`") : "  // equal to `path.parse()`"
                        ];
                    }, function (input, expected) {
                        return function () {
                            return deepEqual(upath.parse.call(null, input), expected);
                        };
                    });
                });
            }
        });
    });
    describe("\n\n## Added functions", () => {
        describe("\n\n#### `upath.toUnix(path)`\n\nJust converts all `` to `/` and consolidates duplicates, without performing any normalization.\n\n##### Examples / specs\n\n    `upath.toUnix(path)`        --returns-->\n", function () {
            var inputToExpected;
            inputToExpected = {
                ".//windows\\//unix//mixed////": "./windows/unix/mixed/",
                "..///windows\\..\\\\unix/mixed": "../windows/../unix/mixed"
            };
            return runSpec(inputToExpected, function (input, expected) {
                return function () {
                    return equal(upath.toUnix(input), expected);
                };
            });
        });
        describe("\n\n#### `upath.normalizeSafe(path)`\n\nExactly like `path.normalize(path)`, but it keeps the first meaningful `./`.\n\nNote that the unix `/` is returned everywhere, so windows `\\` is always converted to unix `/`.\n\n##### Examples / specs & how it differs from vanilla `path`\n\n    `upath.normalizeSafe(path)`        --returns-->\n", function () {
            var inputToExpected;
            inputToExpected = {
                "": ".",
                ".": ".",
                "./": "./",
                ".//": "./",
                ".\\": "./",
                ".\\//": "./",
                "./..": "..",
                ".//..": "..",
                "./../": "../",
                ".\\..\\": "../",
                "./../dep": "../dep",
                "../dep": "../dep",
                "../path/dep": "../path/dep",
                "../path/../dep": "../dep",
                "dep": "dep",
                "path//dep": "path/dep",
                "./dep": "./dep",
                "./path/dep": "./path/dep",
                "./path/../dep": "./dep",
                ".//windows\\unix/mixed/": "./windows/unix/mixed/",
                "..//windows\\unix/mixed": "../windows/unix/mixed",
                "windows\\unix/mixed/": "windows/unix/mixed/",
                "..//windows\\..\\unix/mixed": "../unix/mixed"
            };
            return runSpec(inputToExpected, function (input, expected) {
                var pathResult;
                return [
                    input.replace(/\\/g, "\\\\"),
                    expected,
                    (pathResult = path.normalize(input)) !== expected ? "  // `path.normalize()` gives `'" + pathResult + "'`" : "  // equal to `path.normalize()`"
                ];
            }, function (input, expected) {
                return function () {
                    return equal(upath.normalizeSafe(input), expected);
                };
            });
        });
        describe("\n\n#### `upath.normalizeTrim(path)`\n\nExactly like `path.normalizeSafe(path)`, but it trims any useless ending `/`.\n\n##### Examples / specs\n\n    `upath.normalizeTrim(path)`        --returns-->\n", function () {
            var inputToExpected;
            inputToExpected = {
                "./": ".",
                "./../": "..",
                "./../dep/": "../dep",
                "path//dep\\": "path/dep",
                ".//windows\\unix/mixed/": "./windows/unix/mixed"
            };
            return runSpec(inputToExpected, function (input, expected) {
                var pathResult;
                return [
                    input.replace(/\\/g, "\\\\"),
                    expected,
                    (pathResult = upath.normalizeSafe(input)) !== expected ? "  // `upath.normalizeSafe()` gives `'" + pathResult + "'`" : "  // equal to `upath.normalizeSafe()`"
                ];
            }, function (input, expected) {
                return function () {
                    return equal(upath.normalizeTrim(input), expected);
                };
            });
        });
        return describe("\n\n#### `upath.joinSafe([path1][, path2][, ...])`\n\nExactly like `path.join()`, but it keeps the first meaningful `./`.\n\nNote that the unix `/` is returned everywhere, so windows `\\` is always converted to unix `/`.\n\n##### Examples / specs & how it differs from vanilla `path`\n\n    `upath.joinSafe(path)`        --returns-->\n", function () {
            var inputToExpected;
            inputToExpected = {
                "some/nodejs/deep, ../path": "some/nodejs/path",
                "./some/local/unix/, ../path": "./some/local/path",
                "./some\\current\\mixed, ..\\path": "./some/current/path",
                "../some/relative/destination, ..\\path": "../some/relative/path"
            };
            return runSpec(inputToExpected, function (input, expected) {
                var pathResult;
                return [
                    splitPaths(input.replace(/\\/g, "\\\\")).join("', '"),
                    expected,
                    (pathResult = path.join.apply(null, splitPaths(input))) !== expected ? "  // `path.join()` gives `'" + pathResult + "'`" : "  // equal to `path.join()`"
                ];
            }, function (input, expected) {
                return function () {
                    return equal(upath.joinSafe.apply(null, splitPaths(input)), expected);
                };
            });
        });
    });
    return describe("\n\n## Added functions for *filename extension* manipulation.\n\n**Happy notes:**\n\n  In all functions you can:\n\n  * use both `.ext` & `ext` - the dot `.` on the extension is always adjusted correctly.\n\n  * omit the `ext` param (pass null/undefined/empty string) and the common sense thing will happen.\n\n  * ignore specific extensions from being considered as valid ones (eg `.min`, `.dev` `.aLongExtIsNotAnExt` etc), hence no trimming or replacement takes place on them.\n", () => {
        describe(" \n\n#### `upath.addExt(filename, [ext])`\n\nAdds `.ext` to `filename`, but only if it doesn't already have the exact extension.\n\n##### Examples / specs\n\n    `upath.addExt(filename, 'js')`     --returns-->\n", function () {
            var inputToExpected;
            inputToExpected = {
                "myfile/addExt": "myfile/addExt.js",
                "myfile/addExt.txt": "myfile/addExt.txt.js",
                "myfile/addExt.js": "myfile/addExt.js",
                "myfile/addExt.min.": "myfile/addExt.min..js"
            };
            runSpec(inputToExpected, function (input, expected) {
                return function () {
                    equal(upath.addExt(input, "js"), expected);
                    return equal(upath.addExt(input, ".js"), expected);
                };
            });
            return describe("\n\nIt adds nothing if no `ext` param is passed.\n\n    `upath.addExt(filename)`           --returns-->\n", function () {
                return runSpec(inputToExpected, function (input) {
                    return [
                        input,
                        input
                    ];
                }, function (input, expected) {
                    return function () {
                        equal(upath.addExt(input), input);
                        return equal(upath.addExt(input, ""), input);
                    };
                });
            });
        });
        describe("\n\n#### `upath.trimExt(filename, [ignoreExts], [maxSize=7])`\n\nTrims a filename's extension.\n\n  * Extensions are considered to be up to `maxSize` chars long, counting the dot (defaults to 7).\n\n  * An `Array` of `ignoreExts` (eg `['.min']`) prevents these from being considered as extension, thus are not trimmed.\n\n##### Examples / specs\n\n    `upath.trimExt(filename)`          --returns-->\n", function () {
            var inputToExpected;
            inputToExpected = {
                "my/trimedExt.txt": "my/trimedExt",
                "my/trimedExt": "my/trimedExt",
                "my/trimedExt.min": "my/trimedExt",
                "my/trimedExt.min.js": "my/trimedExt.min",
                "../my/trimedExt.longExt": "../my/trimedExt.longExt"
            };
            runSpec(inputToExpected, function (input, expected) {
                return function () {
                    return equal(upath.trimExt(input), expected);
                };
            });
            return describe("\n\nIt is ignoring `.min` & `.dev` as extensions, and considers exts with up to 8 chars.\n\n    `upath.removeExt(filename, ['min', '.dev'], 8)`          --returns-->\n", function () {
                inputToExpected = {
                    "my/trimedExt.txt": "my/trimedExt",
                    "my/trimedExt.min": "my/trimedExt.min",
                    "my/trimedExt.dev": "my/trimedExt.dev",
                    "../my/trimedExt.longExt": "../my/trimedExt",
                    "../my/trimedExt.longRExt": "../my/trimedExt.longRExt"
                };
                return runSpec(inputToExpected, function (input, expected) {
                    return function () {
                        return equal(upath.trimExt(input, [
                            "min",
                            ".dev"
                        ], 8), expected);
                    };
                });
            });
        });
        describe("\n\n#### `upath.removeExt(filename, ext)`\n\nRemoves the specific `ext` extension from filename, if it has it. Otherwise it leaves it as is.\nAs in all upath functions, it be `.ext` or `ext`.\n\n##### Examples / specs\n\n    `upath.removeExt(filename, '.js')`          --returns-->\n", function () {
            var inputToExpected;
            inputToExpected = {
                "removedExt.js": "removedExt",
                "removedExt.txt.js": "removedExt.txt",
                "notRemoved.txt": "notRemoved.txt"
            };
            return runSpec(inputToExpected, function (input, expected) {
                return function () {
                    equal(upath.removeExt(input, ".js"), expected);
                    return equal(upath.removeExt(input, "js"), expected);
                };
            });
        });
        describe("\n\n#### `upath.changeExt(filename, [ext], [ignoreExts], [maxSize=7])`\n\nChanges a filename's extension to `ext`. If it has no (valid) extension, it adds it.\n\n  * Valid extensions are considered to be up to `maxSize` chars long, counting the dot (defaults to 7).\n\n  * An `Array` of `ignoreExts` (eg `['.min']`) prevents these from being considered as extension, thus are not changed - the new extension is added instead.\n\n##### Examples / specs\n\n    `upath.changeExt(filename, '.js')`  --returns-->\n", function () {
            var inputToExpected;
            inputToExpected = {
                "my/module.min": "my/module.js",
                "my/module.coffee": "my/module.js",
                "my/module": "my/module.js",
                "file/withDot.": "file/withDot.js",
                "file/change.longExt": "file/change.longExt.js"
            };
            runSpec(inputToExpected, function (input, expected) {
                return function () {
                    equal(upath.changeExt(input, "js"), expected);
                    return equal(upath.changeExt(input, ".js"), expected);
                };
            });
            describe("\n\nIf no `ext` param is given, it trims the current extension (if any).\n\n    `upath.changeExt(filename)`        --returns-->\n", function () {
                return runSpec(inputToExpected, function (input, expected) {
                    return [
                        input,
                        upath.trimExt(expected)
                    ];
                }, function (input, expected) {
                    return function () {
                        equal(upath.changeExt(input), upath.trimExt(expected));
                        return equal(upath.changeExt(input, ""), upath.trimExt(expected));
                    };
                });
            });
            return describe("\n\nIt is ignoring `.min` & `.dev` as extensions, and considers exts with up to 8 chars.\n\n    `upath.changeExt(filename, 'js', ['min', '.dev'], 8)`        --returns-->\n", function () {
                inputToExpected = {
                    "my/module.coffee": "my/module.js",
                    "file/notValidExt.min": "file/notValidExt.min.js",
                    "file/notValidExt.dev": "file/notValidExt.dev.js",
                    "file/change.longExt": "file/change.js",
                    "file/change.longRExt": "file/change.longRExt.js"
                };
                return runSpec(inputToExpected, function (input, expected) {
                    return function () {
                        equal(upath.changeExt(input, "js", [
                            "min",
                            "dev"
                        ], 8), expected);
                        return equal(upath.changeExt(input, ".js", [
                            ".min",
                            ".dev"
                        ], 8), expected);
                    };
                });
            });
        });
        return describe("\n\n#### `upath.defaultExt(filename, [ext], [ignoreExts], [maxSize=7])`\n\nAdds `.ext` to `filename`, only if it doesn't already have _any_ *old* extension.\n\n  * (Old) extensions are considered to be up to `maxSize` chars long, counting the dot (defaults to 7).\n\n  * An `Array` of `ignoreExts` (eg `['.min']`) will force adding default `.ext` even if one of these is present.\n\n##### Examples / specs\n\n    `upath.defaultExt(filename, 'js')`   --returns-->\n", function () {
            var inputToExpected;
            inputToExpected = {
                "fileWith/defaultExt": "fileWith/defaultExt.js",
                "fileWith/defaultExt.js": "fileWith/defaultExt.js",
                "fileWith/defaultExt.min": "fileWith/defaultExt.min",
                "fileWith/defaultExt.longExt": "fileWith/defaultExt.longExt.js"
            };
            runSpec(inputToExpected, function (input, expected) {
                return function () {
                    equal(upath.defaultExt(input, "js"), expected);
                    return equal(upath.defaultExt(input, ".js"), expected);
                };
            });
            describe("\n\nIf no `ext` param is passed, it leaves filename intact.\n\n    `upath.defaultExt(filename)`       --returns-->\n", function () {
                return runSpec(inputToExpected, function (input) {
                    return [
                        input,
                        input
                    ];
                }, function (input, expected) {
                    return function () {
                        return equal(upath.defaultExt(input), input);
                    };
                });
            });
            return describe("\n\nIt is ignoring `.min` & `.dev` as extensions, and considers exts with up to 8 chars.\n\n    `upath.defaultExt(filename, 'js', ['min', '.dev'], 8)` --returns-->\n", function () {
                inputToExpected = {
                    "fileWith/defaultExt": "fileWith/defaultExt.js",
                    "fileWith/defaultExt.min": "fileWith/defaultExt.min.js",
                    "fileWith/defaultExt.dev": "fileWith/defaultExt.dev.js",
                    "fileWith/defaultExt.longExt": "fileWith/defaultExt.longExt",
                    "fileWith/defaultExt.longRext": "fileWith/defaultExt.longRext.js"
                };
                return runSpec(inputToExpected, function (input, expected) {
                    return function () {
                        equal(upath.defaultExt(input, "js", [
                            "min",
                            ".dev"
                        ], 8), expected);
                        return equal(upath.defaultExt(input, ".js", [
                            ".min",
                            "dev"
                        ], 8), expected);
                    };
                });
            });
        });
    });
});
