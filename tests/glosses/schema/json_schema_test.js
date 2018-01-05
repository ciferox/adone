const path = adone.std.path;

module.exports = jsonSchemaTest;


function jsonSchemaTest(validators, opts) {
    const assert = opts.assert || require("" + "assert");
    let _Promise;
    if (opts.async) {
        _Promise = opts.Promise || Promise;
        if (!_Promise) {
            throw new Error("async mode requires Promise support");
        }
    }

    skipOrOnly(opts, describe)(opts.description || "JSON schema tests", function () {
        if (opts.timeout) {
            this.timeout(opts.timeout);
        }
        for (const suiteName in opts.suites) {
            addTests(suiteName, opts.suites[suiteName]);
        }
    });


    function addTests(suiteName, filesOrPath) {
        describe(suiteName, () => {
            const files = getTestFiles(filesOrPath);

            files.forEach((file) => {
                const filter = {
                    skip: getFileFilter(file, "skip"),
                    only: getFileFilter(file, "only")
                };

                skipOrOnly(filter, describe)(file.name, () => {
                    if (file.test) {
                        var testSets = file.test;
                    } else if (file.path) {
                        var testPath = file.path,
                            testDir = path.dirname(testPath);
                        var testSets = require(testPath);
                    }
                    testSets.forEach((testSet) => {
                        skipOrOnly(testSet, describe)(testSet.description, () => {
                            if (Array.isArray(testSet.schemas)) {
                                testSet.schemas.forEach((schema, i) => {
                                    const descr = schema.description || schema.id || schema.$ref || (`#${i}`);
                                    describe(`schema ${descr}`, () => {
                                        testSchema(schema);
                                    });
                                });
                            } else {
                                testSchema(testSet.schema);
                            }

                            function testSchema(schema) {
                                testSet.tests.forEach((test) => {
                                    skipOrOnly(test, it)(test.description, () => {
                                        if (Array.isArray(validators)) {
                                            if (opts.async) {
                                                return _Promise.all(validators.map(doTest));
                                            }
                                            validators.forEach(doTest);
                                        } else {
                                            return doTest(validators);
                                        }
                                    });

                                    function doTest(validator) {
                                        let data;
                                        if (test.dataFile) {
                                            const dataFile = path.resolve(testDir || "", test.dataFile);
                                            data = require(dataFile);
                                        } else {
                                            data = test.data;
                                        }

                                        const valid = validator.validate(schema, data);
                                        if (opts.async && typeof valid === "object" && typeof valid.then === "function") {
                                            return valid.then(
                                                (_valid) => {
                                                    testResults(_valid, null);
                                                },
                                                (err) => {
                                                    if (err.errors) {
                                                        testResults(false, err.errors);
                                                    } else {
                                                        testException(err);
                                                    }
                                                }
                                            );
                                        }
                                        testResults(valid, validator.errors);


                                        function testResults(valid, errors) {
                                            if (opts.asyncValid === "data" && test.valid === true) {
                                                valid = valid === data;
                                            }
                                            const passed = valid === test.valid;
                                            if (!passed && opts.log !== false) {
                                                console.log("result:", valid, "\nexpected: ", test.valid, "\nerrors:", validator.errors);
                                            }
                                            if (valid) {
                                                assert(!errors || errors.length == 0);
                                            } else {
                                                assert(errors.length > 0);
                                            }

                                            suiteHooks(passed, valid, errors);
                                            assert.equal(valid, test.valid);
                                        }

                                        function testException(err) {
                                            const passed = err.message == test.error;
                                            if (!passed && opts.log !== false) {
                                                console.log("error:", err.message,
                                                    "\nexpected: ",
                                                    test.valid ? "valid"
                                                        : test.valid === false ? "invalid"
                                                            : `error ${test.error}`);
                                            }

                                            suiteHooks(passed);
                                            assert.equal(err.message, test.error);
                                        }

                                        function suiteHooks(passed, valid, errors) {
                                            const result = {
                                                passed,
                                                validator,
                                                schema,
                                                data,
                                                valid,
                                                expected: test.valid,
                                                expectedError: test.error,
                                                errors
                                            };

                                            if (opts.afterEach) {
                                                opts.afterEach(result);
                                            }
                                            if (opts.afterError && !passed) {
                                                opts.afterError(result);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    });
                });
            });
        });

        function getFileFilter(file, property) {
            const filter = opts[property];
            return Array.isArray(filter) && filter.indexOf(file.name) >= 0;
        }
    }


    function skipOrOnly(filter, func) {
        return filter.only === true ? func.only : filter.skip === true ? func.skip : func;
    }


    function getTestFiles(files) {
        return files.map((file) => {
            const match = file.match(/(\w+\/)\w+\.json/);
            let folder = match ? match[1] : "";
            if (opts.hideFolder && folder == opts.hideFolder) {
                folder = "";
            }
            return {
                path: path.join(opts.cwd, file),
                name: folder + path.basename(file, ".json")
            };
        });
    }
}
