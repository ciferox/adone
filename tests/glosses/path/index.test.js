const {
    lodash: _,
    path,
    std: { path: npath, fs, util }
} = adone;

const __range__ = function (left, right, inclusive) {
    const range = [];
    const ascending = left < right;
    const end = !inclusive ? right : ascending ? right + 1 : right - 1;
    for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
        range.push(i);
    }
    return range;
};


const splitPaths = (pathsStr) => pathsStr.split(",").map((p) => _.trim(p));

const getMaxLengths = (inputToExpected) => [
    _.max(_.map(_.keys(inputToExpected), "length")),
    _.max(_.map(inputToExpected, "length"))
];

const formatObjectToOneLine = (any) => util.inspect(any, { colors: true }).replace(/\n /g, "");

const getDefaultLine = function (input, expected) {
    return `\`'${input}'\` ---> \`${formatObjectToOneLine(expected)}\``;
};

const runSpec = function (inputToExpected, getLine, itTest) {
    if (!itTest) { // can also be called as runSpec(inputToExpected, itTest) for getdefaultLine
        itTest = getLine;
        getLine = getDefaultLine;
    }

    const maxLengths = getMaxLengths(inputToExpected);
    return (() => {
        const result = [];
        for (const input in inputToExpected) {
            const expected = inputToExpected[input];
            // eslint-disable-next-line no-loop-func
            result.push((function (input, expected, maxLengths) {
                let line;
                let finalLine = (line = getLine(input, expected));
                if (_.isArray(line)) {
                    finalLine = getDefaultLine(line[0], line[1]);
                    // if (line[2]) {
                    //     finalLine += line[2];
                    // } // extra line info
                }
                // call the actual `it`
                return it(finalLine, itTest(input, expected));
            })(input, expected, maxLengths));
        }
        return result;
    })();
};

describe("path", () => {
    describe("#1", () => {
        const inputToExpected = {
            "c:/windows/nodejs/path": "c:/windows/nodejs/path",
            "c:/windows/../nodejs/path": "c:/nodejs/path",

            "c:\\windows\\nodejs\\path": "c:/windows/nodejs/path",
            "c:\\windows\\..\\nodejs\\path": "c:/nodejs/path",

            "//windows\\unix\/mixed": "/windows/unix/mixed",
            "\\windows//unix\/mixed": "/windows/unix/mixed",

            "////\\windows\\..\\unix\/mixed/": "/unix/mixed/"
        };

        runSpec(inputToExpected,
            (input, expected) => {
                let pathResult;
                return [ // alt line output
                    input.replace(/\\/g, "\\\\"),
                    expected,
                    (pathResult = npath.normalize(input)) !== expected ?
                        `  // \`path.normalize()\` gives \`'${pathResult}'\``
                        :
                        "  // equal to `path.normalize()`"
                ];
            },
            (input, expected) => () => assert.equal(path.normalize(input), expected)
        );
    });
    describe("#2", () => {
        const inputToExpected = {
            "some/nodejs/deep, ../path": "some/nodejs/path",
            "some/nodejs\\windows, ../path": "some/nodejs/path",
            "some\\windows\\only, ..\\path": "some/windows/path"
        };

        runSpec(inputToExpected,
            (input, expected) => {
                let pathResult;
                return [ // alt line output
                    splitPaths(input.replace(/\\/g, "\\\\")).join("', '"),
                    expected,
                    (pathResult = npath.join.apply(null, splitPaths(input))) !== expected ?
                        `  // \`path.join()\` gives \`'${pathResult}'\``
                        :
                        "  // equal to `path.join()`"
                ];
            },
            (input, expected) => () => assert.equal(path.join.apply(null, splitPaths(input)), expected)
        );
    });

    // parse is not available in node v0.10
    describe("#3", () => {
        const inputToExpected = {
            "c:\\Windows\\Directory\\somefile.ext":
                { root: "", dir: "c:/Windows/Directory", base: "somefile.ext", ext: ".ext", name: "somefile" },
            "/root/of/unix/somefile.ext":
                { root: "/", dir: "/root/of/unix", base: "somefile.ext", ext: ".ext", name: "somefile" }
        };


        runSpec(inputToExpected,
            (input, expected) => {
                let pathResult;
                return [ // alt line output
                    input,
                    expected,
                    !_.isEqual((pathResult = npath.parse.call(null, input)), expected) ?
                        `\n${__range__(1, input.length + 2, true).map(() => " ").join("")}${` // \`path.parse()\` gives \`'${formatObjectToOneLine(pathResult)}'\``}`
                        :
                        "  // equal to `path.parse()`"
                ];
            },
            (input, expected) => () => assert.deepEqual(path.parse.call(null, input), expected)
        );
    });


    describe("#4", () => {
        describe("#1", () => {
            const inputToExpected = {
                ".//windows\\//unix/\/mixed////": "./windows/unix/mixed/",
                "..///windows\\..\\\\unix\/mixed": "../windows/../unix/mixed"
            };

            runSpec(inputToExpected, (input, expected) => () => assert.equal(path.toUnix(input), expected)
            );
        });

        describe("#2", () => {
            const inputToExpected = {
                // equal to path
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
                dep: "dep",
                "path//dep": "path/dep",
                // different to path
                "./dep": "./dep",
                "./path/dep": "./path/dep",
                "./path/../dep": "./dep",
                ".//windows\\unix\/mixed/": "./windows/unix/mixed/",
                "..//windows\\unix\/mixed": "../windows/unix/mixed",
                "windows\\unix\/mixed/": "windows/unix/mixed/",
                "..//windows\\..\\unix\/mixed": "../unix/mixed"
            };

            runSpec(inputToExpected,
                (input, expected) => {
                    let pathResult;
                    return [ // alt line output
                        input.replace(/\\/g, "\\\\"),
                        expected,
                        (pathResult = npath.normalize(input)) !== expected ?
                            `  // \`path.normalize()\` gives \`'${pathResult}'\``
                            :
                            "  // equal to `path.normalize()`"
                    ];
                },
                (input, expected) => () => assert.equal(path.normalizeSafe(input), expected)
            );
        });

        describe("#3", () => {
            const inputToExpected = {
                "./": ".",
                "./../": "..",
                "./../dep/": "../dep",
                "path//dep\\": "path/dep",
                ".//windows\\unix\/mixed/": "./windows/unix/mixed"
            };

            runSpec(inputToExpected,
                (input, expected) => {
                    let pathResult;
                    return [ // alt line output
                        input.replace(/\\/g, "\\\\"),
                        expected,
                        (pathResult = path.normalizeSafe(input)) !== expected ?
                            `  // \`upath.normalizeSafe()\` gives \`'${pathResult}'\``
                            :
                            "  // equal to `upath.normalizeSafe()`"
                    ];
                },
                (input, expected) => () => assert.equal(path.normalizeTrim(input), expected)
            );
        });

        describe("#4", () => {
            const inputToExpected = {
                "some/nodejs/deep, ../path": "some/nodejs/path",
                "./some/local/unix/, ../path": "./some/local/path",
                "./some\\current\\mixed, ..\\path": "./some/current/path",
                "../some/relative/destination, ..\\path": "../some/relative/path"
            };

            runSpec(inputToExpected,
                (input, expected) => {
                    let pathResult;
                    return [ // alt line output
                        splitPaths(input.replace(/\\/g, "\\\\")).join("', '"),
                        expected,
                        (pathResult = npath.join.apply(null, splitPaths(input))) !== expected ?
                            `  // \`path.join()\` gives \`'${pathResult}'\``
                            :
                            "  // equal to `path.join()`"
                    ];
                },
                (input, expected) => () => assert.equal(path.joinSafe.apply(null, splitPaths(input)), expected)
            );
        });
    });

    describe("#5", () => {
        describe("#1", () => {
            const inputToExpected = {
                "myfile/addExt": "myfile/addExt.js",
                "myfile/addExt.txt": "myfile/addExt.txt.js",
                "myfile/addExt.js": "myfile/addExt.js",
                "myfile/addExt.min.": "myfile/addExt.min..js" //trailing '.' considered part of filename
            };

            runSpec(inputToExpected, (input, expected) => function () {
                assert.equal(path.addExt(input, "js"), expected);
                assert.equal(path.addExt(input, ".js"), expected);
            }
            );

            describe(`\n`, () =>
                runSpec(inputToExpected,
                    (input) => [input, input],
                    (input, expected) => function () {
                        assert.equal(path.addExt(input), input);
                        assert.equal(path.addExt(input, ""), input);
                    }
                )
            );
        });

        describe("#2", () => {
            let inputToExpected = {
                "my/trimedExt.txt": "my/trimedExt",
                "my/trimedExt": "my/trimedExt",
                "my/trimedExt.min": "my/trimedExt",
                "my/trimedExt.min.js": "my/trimedExt.min",
                "../my/trimedExt.longExt": "../my/trimedExt.longExt"
            };

            runSpec(inputToExpected, (input, expected) => () => assert.equal(path.trimExt(input), expected)
            );

            describe("#1", () => {
                inputToExpected = {
                    "my/trimedExt.txt": "my/trimedExt",
                    "my/trimedExt.min": "my/trimedExt.min",
                    "my/trimedExt.dev": "my/trimedExt.dev",
                    "../my/trimedExt.longExt": "../my/trimedExt",
                    "../my/trimedExt.longRExt": "../my/trimedExt.longRExt"
                };

                runSpec(inputToExpected, (input, expected) => () => assert.equal(path.trimExt(input, ["min", ".dev"], 8), expected)
                );
            });
        });

        describe("#3", () => {
            const inputToExpected = {
                "removedExt.js": "removedExt",
                "removedExt.txt.js": "removedExt.txt",
                "notRemoved.txt": "notRemoved.txt"
            };

            runSpec(inputToExpected, (input, expected) => function () {
                assert.equal(path.removeExt(input, ".js"), expected);
                assert.equal(path.removeExt(input, "js"), expected);
            }
            );
        });

        describe("#4", () => {
            let inputToExpected;
            describe("#1", () => {
                inputToExpected = {
                    "my/module.min": "my/module.js",
                    "my/module.coffee": "my/module.js",
                    "my/module": "my/module.js",
                    "file/withDot.": "file/withDot.js",
                    "file/change.longExt": "file/change.longExt.js"
                };

                runSpec(inputToExpected, (input, expected) => function () {
                    assert.equal(path.changeExt(input, "js"), expected);
                    assert.equal(path.changeExt(input, ".js"), expected);
                }
                );
            });

            describe("#2", () =>
                runSpec(inputToExpected,
                    (input, expected) => [input, path.trimExt(expected)],
                    (input, expected) => function () {
                        assert.equal(path.changeExt(input), path.trimExt(expected));
                        assert.equal(path.changeExt(input, ""), path.trimExt(expected));
                    }
                )
            );

            describe("#3", () => {
                inputToExpected = {
                    "my/module.coffee": "my/module.js",
                    "file/notValidExt.min": "file/notValidExt.min.js",
                    "file/notValidExt.dev": "file/notValidExt.dev.js",
                    "file/change.longExt": "file/change.js",
                    "file/change.longRExt": "file/change.longRExt.js"
                };

                runSpec(inputToExpected,
                    (input, expected) => function () {
                        assert.equal(path.changeExt(input, "js", ["min", "dev"], 8), expected);
                        assert.equal(path.changeExt(input, ".js", [".min", ".dev"], 8), expected);
                    }
                );
            });
        });

        describe("#5", () => {
            let inputToExpected = {
                "fileWith/defaultExt": "fileWith/defaultExt.js",
                "fileWith/defaultExt.js": "fileWith/defaultExt.js",
                "fileWith/defaultExt.min": "fileWith/defaultExt.min",
                "fileWith/defaultExt.longExt": "fileWith/defaultExt.longExt.js"
            };

            describe("#1", () => {
                runSpec(inputToExpected, (input, expected) => function () {
                    assert.equal(path.defaultExt(input, "js"), expected);
                    assert.equal(path.defaultExt(input, ".js"), expected);
                });
            });

            describe("#2", () =>
                runSpec(inputToExpected,
                    (input) => [input, input],
                    (input, expected) => () => assert.equal(path.defaultExt(input), input)
                )
            );

            describe("#3", () => {
                inputToExpected = {
                    "fileWith/defaultExt": "fileWith/defaultExt.js",
                    "fileWith/defaultExt.min": "fileWith/defaultExt.min.js",
                    "fileWith/defaultExt.dev": "fileWith/defaultExt.dev.js",
                    "fileWith/defaultExt.longExt": "fileWith/defaultExt.longExt",
                    "fileWith/defaultExt.longRext": "fileWith/defaultExt.longRext.js"
                };

                runSpec(inputToExpected, (input, expected) => function () {
                    assert.equal(path.defaultExt(input, "js", ["min", ".dev"], 8), expected);
                    assert.equal(path.defaultExt(input, ".js", [".min", "dev"], 8), expected);
                }
                );
            });
        });
    });
});
