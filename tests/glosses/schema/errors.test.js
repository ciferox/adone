describe("glosses", "schema", "validation errors", () => {
    const { schema: { Validator } } = adone;

    let instance;
    let instanceJP;
    let fullInstance;

    beforeEach(() => {
        createInstances();
    });

    function createInstances(errorDataPath) {
        instance = new Validator({ errorDataPath, loopRequired: 21 });
        instanceJP = new Validator({ errorDataPath, jsonPointers: true, loopRequired: 21 });
        fullInstance = new Validator({ errorDataPath, allErrors: true, verbose: true, jsonPointers: true, loopRequired: 21 });
    }

    it("error should include dataPath", () => {
        const schema = {
            properties: {
                foo: { type: "number" }
            }
        };

        testSchema1(schema);
    });

    it('"refs" error should include dataPath', () => {
        const schema = {
            definitions: {
                num: { type: "number" }
            },
            properties: {
                foo: { $ref: "#/definitions/num" }
            }
        };

        testSchema1(schema, "#/definitions/num");
    });

    describe('"additionalProperties" errors', () => {
        it('should include property in dataPath with option errorDataPath="property"', () => {
            createInstances("property");
            testAdditional("property");
        });

        it("should NOT include property in dataPath WITHOUT option errorDataPath", () => {
            testAdditional();
        });

        function testAdditional(errorDataPath) {
            const schema = {
                properties: {
                    foo: {},
                    bar: {}
                },
                additionalProperties: false
            };

            let data = { foo: 1, bar: 2 },
                invalidData = { foo: 1, bar: 2, baz: 3, quux: 4 };

            const path = pathFunc(errorDataPath);

            const validate = instance.compile(schema);
            shouldBeValid(validate, data);
            shouldBeInvalid(validate, invalidData);
            shouldBeError(validate.errors[0], "additionalProperties", "#/additionalProperties", path("['baz']"), undefined, { additionalProperty: "baz" });

            const validateJP = instanceJP.compile(schema);
            shouldBeValid(validateJP, data);
            shouldBeInvalid(validateJP, invalidData);
            shouldBeError(validateJP.errors[0], "additionalProperties", "#/additionalProperties", path("/baz"), undefined, { additionalProperty: "baz" });

            const fullValidate = fullInstance.compile(schema);
            shouldBeValid(fullValidate, data);
            shouldBeInvalid(fullValidate, invalidData, 2);
            shouldBeError(fullValidate.errors[0], "additionalProperties", "#/additionalProperties", path("/baz"), undefined, { additionalProperty: "baz" });
            shouldBeError(fullValidate.errors[1], "additionalProperties", "#/additionalProperties", path("/quux"), undefined, { additionalProperty: "quux" });

            if (errorDataPath == "property") {
                fullValidate.errors.filter((err) => {
                    return err.keyword == "additionalProperties";
                }).map((err) => {
                    return fullInstance._opts.jsonPointers ? err.dataPath.substr(1) : err.dataPath.slice(2, -2);
                }).forEach((p) => {
                    delete invalidData[p];
                });

                expect(invalidData).to.be.deep.equal({ foo: 1, bar: 2 });
            }
        }
    });

    describe('errors when "additionalProperties" is schema', () => {
        it('should include property in dataPath with option errorDataPath="property"', () => {
            createInstances("property");
            testAdditionalIsSchema("property");
        });

        it("should NOT include property in dataPath WITHOUT option errorDataPath", () => {
            testAdditionalIsSchema();
        });

        function testAdditionalIsSchema() {
            const schema = {
                properties: {
                    foo: { type: "integer" },
                    bar: { type: "integer" }
                },
                additionalProperties: {
                    type: "object",
                    properties: {
                        quux: { type: "string" }
                    }
                }
            };

            let data = { foo: 1, bar: 2, baz: { quux: "abc" } },
                invalidData = { foo: 1, bar: 2, baz: { quux: 3 }, boo: { quux: 4 } };

            const schPath = "#/additionalProperties/properties/quux/type";

            const validate = instance.compile(schema);
            shouldBeValid(validate, data);
            shouldBeInvalid(validate, invalidData);
            shouldBeError(validate.errors[0], "type", schPath, "['baz'].quux", "should be string", { type: "string" });

            const validateJP = instanceJP.compile(schema);
            shouldBeValid(validateJP, data);
            shouldBeInvalid(validateJP, invalidData);
            shouldBeError(validateJP.errors[0], "type", schPath, "/baz/quux", "should be string", { type: "string" });

            const fullValidate = fullInstance.compile(schema);
            shouldBeValid(fullValidate, data);
            shouldBeInvalid(fullValidate, invalidData, 2);
            shouldBeError(fullValidate.errors[0], "type", schPath, "/baz/quux", "should be string", { type: "string" });
            shouldBeError(fullValidate.errors[1], "type", schPath, "/boo/quux", "should be string", { type: "string" });
        }
    });

    describe('"required" errors', () => {
        it('should include missing property in dataPath with option errorDataPath="property"', () => {
            createInstances("property");
            testRequired("property");
        });

        it("should NOT include missing property in dataPath WITHOUT option errorDataPath", () => {
            testRequired();
        });

        function testRequired(errorDataPath) {
            const schema = {
                required: ["foo", "bar", "baz"]
            };

            _testRequired(errorDataPath, schema, "#", ".");
        }

        it('large data/schemas with option errorDataPath="property"', () => {
            createInstances("property");
            testRequiredLargeSchema("property");
        });

        it("large data/schemas WITHOUT option errorDataPath", () => {
            testRequiredLargeSchema();
        });

        function testRequiredLargeSchema(errorDataPath) {
            let schema = { required: [] },
                data = {},
                invalidData1 = {},
                invalidData2 = {};
            for (let i = 0; i < 100; i++) {
                schema.required.push(String(i)); // properties from '0' to '99' are required
                data[i] = invalidData1[i] = invalidData2[i] = i;
            }

            delete invalidData1[1]; // property '1' will be missing
            delete invalidData2[2]; // properties '2' and '198' will be missing
            delete invalidData2[98];

            const path = pathFunc(errorDataPath);
            const msg = msgFunc(errorDataPath);

            test();

            schema = { anyOf: [schema] };
            test(1, "#/anyOf/0");

            function test(extraErrors, schemaPathPrefix) {
                extraErrors = extraErrors || 0;
                const schPath = `${schemaPathPrefix || "#"}/required`;
                const validate = instance.compile(schema);
                shouldBeValid(validate, data);
                shouldBeInvalid(validate, invalidData1, 1 + extraErrors);
                shouldBeError(validate.errors[0], "required", schPath, path("['1']"), msg("1"), { missingProperty: "1" });
                shouldBeInvalid(validate, invalidData2, 1 + extraErrors);
                shouldBeError(validate.errors[0], "required", schPath, path("['2']"), msg("2"), { missingProperty: "2" });

                const validateJP = instanceJP.compile(schema);
                shouldBeValid(validateJP, data);
                shouldBeInvalid(validateJP, invalidData1, 1 + extraErrors);
                shouldBeError(validateJP.errors[0], "required", schPath, path("/1"), msg("1"), { missingProperty: "1" });
                shouldBeInvalid(validateJP, invalidData2, 1 + extraErrors);
                shouldBeError(validateJP.errors[0], "required", schPath, path("/2"), msg("2"), { missingProperty: "2" });

                const fullValidate = fullInstance.compile(schema);
                shouldBeValid(fullValidate, data);
                shouldBeInvalid(fullValidate, invalidData1, 1 + extraErrors);
                shouldBeError(fullValidate.errors[0], "required", schPath, path("/1"), msg("1"), { missingProperty: "1" });
                shouldBeInvalid(fullValidate, invalidData2, 2 + extraErrors);
                shouldBeError(fullValidate.errors[0], "required", schPath, path("/2"), msg("2"), { missingProperty: "2" });
                shouldBeError(fullValidate.errors[1], "required", schPath, path("/98"), msg("98"), { missingProperty: "98" });
            }
        }

        it('with "properties" with option errorDataPath="property"', () => {
            createInstances("property");
            testRequiredAndProperties("property");
        });

        it('with "properties" WITHOUT option errorDataPath', () => {
            testRequiredAndProperties();
        });

        function testRequiredAndProperties(errorDataPath) {
            const schema = {
                properties: {
                    foo: { type: "number" },
                    bar: { type: "number" },
                    baz: { type: "number" }
                },
                required: ["foo", "bar", "baz"]
            };

            _testRequired(errorDataPath, schema);
        }

        it('in "anyOf" with option errorDataPath="property"', () => {
            createInstances("property");
            testRequiredInAnyOf("property");
        });

        it('in "anyOf" WITHOUT option errorDataPath', () => {
            testRequiredInAnyOf();
        });

        function testRequiredInAnyOf(errorDataPath) {
            const schema = {
                anyOf: [{ required: ["foo", "bar", "baz"] }]
            };

            _testRequired(errorDataPath, schema, "#/anyOf/0", ".", 1);
        }

        it("should not validate required twice in large schemas with loopRequired option", () => {
            instance = new Validator({ loopRequired: 1, allErrors: true });

            const schema = {
                properties: {
                    foo: { type: "integer" },
                    bar: { type: "integer" }
                },
                required: ["foo", "bar"]
            };

            const validate = instance.compile(schema);

            expect(validate({})).to.be.equal(false);
            expect(validate.errors).to.have.lengthOf(2);
        });

        it("should not validate required twice with $data ref", () => {
            instance = new Validator({ $data: true, allErrors: true });

            const schema = {
                properties: {
                    foo: { type: "integer" },
                    bar: { type: "integer" }
                },
                required: { $data: "0/requiredProperties" }
            };

            const validate = instance.compile(schema);

            expect(validate({ requiredProperties: ["foo", "bar"] })).to.be.equal(false);
            expect(validate.errors).to.have.lengthOf(2);
        });
    });

    describe('"dependencies" errors', () => {
        it('should include missing property in dataPath with option errorDataPath="property"', () => {
            createInstances("property");
            testDependencies("property");
        });

        it("should NOT include missing property in dataPath WITHOUT option errorDataPath", () => {
            testDependencies();
        });

        function testDependencies(errorDataPath) {
            const schema = {
                dependencies: {
                    a: ["foo", "bar", "baz"]
                }
            };

            let data = { a: 0, foo: 1, bar: 2, baz: 3 },
                invalidData1 = { a: 0, foo: 1, baz: 3 },
                invalidData2 = { a: 0, bar: 2 };

            const path = pathFunc(errorDataPath);
            const msg = "should have properties foo, bar, baz when property a is present";

            const validate = instance.compile(schema);
            shouldBeValid(validate, data);
            shouldBeInvalid(validate, invalidData1);
            shouldBeError(validate.errors[0], "dependencies", "#/dependencies", path(".bar"), msg, params(".bar"));
            shouldBeInvalid(validate, invalidData2);
            shouldBeError(validate.errors[0], "dependencies", "#/dependencies", path(".foo"), msg, params(".foo"));

            const validateJP = instanceJP.compile(schema);
            shouldBeValid(validateJP, data);
            shouldBeInvalid(validateJP, invalidData1);
            shouldBeError(validateJP.errors[0], "dependencies", "#/dependencies", path("/bar"), msg, params("bar"));
            shouldBeInvalid(validateJP, invalidData2);
            shouldBeError(validateJP.errors[0], "dependencies", "#/dependencies", path("/foo"), msg, params("foo"));

            const fullValidate = fullInstance.compile(schema);
            shouldBeValid(fullValidate, data);
            shouldBeInvalid(fullValidate, invalidData1);
            shouldBeError(fullValidate.errors[0], "dependencies", "#/dependencies", path("/bar"), msg, params("bar"));
            shouldBeInvalid(fullValidate, invalidData2, 2);
            shouldBeError(fullValidate.errors[0], "dependencies", "#/dependencies", path("/foo"), msg, params("foo"));
            shouldBeError(fullValidate.errors[1], "dependencies", "#/dependencies", path("/baz"), msg, params("baz"));

            function params(missing) {
                const p = {
                    property: "a",
                    deps: "foo, bar, baz",
                    depsCount: 3
                };
                p.missingProperty = missing;
                return p;
            }
        }
    });

    function _testRequired(errorDataPath, schema, schemaPathPrefix, prefix, extraErrors) {
        const schPath = `${schemaPathPrefix || "#"}/required`;
        prefix = prefix || "";
        extraErrors = extraErrors || 0;

        let data = { foo: 1, bar: 2, baz: 3 },
            invalidData1 = { foo: 1, baz: 3 },
            invalidData2 = { bar: 2 };

        const path = pathFunc(errorDataPath);
        const msg = msgFunc(errorDataPath);

        const validate = instance.compile(schema);
        shouldBeValid(validate, data);
        shouldBeInvalid(validate, invalidData1, 1 + extraErrors);
        shouldBeError(validate.errors[0], "required", schPath, path(".bar"), msg(`${prefix}bar`), { missingProperty: `${prefix}bar` });
        shouldBeInvalid(validate, invalidData2, 1 + extraErrors);
        shouldBeError(validate.errors[0], "required", schPath, path(".foo"), msg(`${prefix}foo`), { missingProperty: `${prefix}foo` });

        const validateJP = instanceJP.compile(schema);
        shouldBeValid(validateJP, data);
        shouldBeInvalid(validateJP, invalidData1, 1 + extraErrors);
        shouldBeError(validateJP.errors[0], "required", schPath, path("/bar"), msg("bar"), { missingProperty: "bar" });
        shouldBeInvalid(validateJP, invalidData2, 1 + extraErrors);
        shouldBeError(validateJP.errors[0], "required", schPath, path("/foo"), msg("foo"), { missingProperty: "foo" });

        const fullValidate = fullInstance.compile(schema);
        shouldBeValid(fullValidate, data);
        shouldBeInvalid(fullValidate, invalidData1, 1 + extraErrors);
        shouldBeError(fullValidate.errors[0], "required", schPath, path("/bar"), msg("bar"), { missingProperty: "bar" });
        shouldBeInvalid(fullValidate, invalidData2, 2 + extraErrors);
        shouldBeError(fullValidate.errors[0], "required", schPath, path("/foo"), msg("foo"), { missingProperty: "foo" });
        shouldBeError(fullValidate.errors[1], "required", schPath, path("/baz"), msg("baz"), { missingProperty: "baz" });
    }

    function pathFunc(errorDataPath) {
        return function (dataPath) {
            return errorDataPath == "property" ? dataPath : "";
        };
    }

    function msgFunc(errorDataPath) {
        return function (prop) {
            return errorDataPath == "property" ? "is a required property" : `should have required property '${prop}'`;
        };
    }

    it('"items" errors should include item index without quotes in dataPath (#48)', () => {
        const schema1 = {
            id: "schema1",
            type: "array",
            items: {
                type: "integer",
                minimum: 10
            }
        };

        let data = [10, 11, 12],
            invalidData1 = [1, 10],
            invalidData2 = [10, 9, 11, 8, 12];

        let validate = instance.compile(schema1);
        shouldBeValid(validate, data);
        shouldBeInvalid(validate, invalidData1);
        shouldBeError(validate.errors[0], "minimum", "#/items/minimum", "[0]", "should be >= 10");
        shouldBeInvalid(validate, invalidData2);
        shouldBeError(validate.errors[0], "minimum", "#/items/minimum", "[1]", "should be >= 10");

        const validateJP = instanceJP.compile(schema1);
        shouldBeValid(validateJP, data);
        shouldBeInvalid(validateJP, invalidData1);
        shouldBeError(validateJP.errors[0], "minimum", "#/items/minimum", "/0", "should be >= 10");
        shouldBeInvalid(validateJP, invalidData2);
        shouldBeError(validateJP.errors[0], "minimum", "#/items/minimum", "/1", "should be >= 10");

        const fullValidate = fullInstance.compile(schema1);
        shouldBeValid(fullValidate, data);
        shouldBeInvalid(fullValidate, invalidData1);
        shouldBeError(fullValidate.errors[0], "minimum", "#/items/minimum", "/0", "should be >= 10");
        shouldBeInvalid(fullValidate, invalidData2, 2);
        shouldBeError(fullValidate.errors[0], "minimum", "#/items/minimum", "/1", "should be >= 10");
        shouldBeError(fullValidate.errors[1], "minimum", "#/items/minimum", "/3", "should be >= 10");

        const schema2 = {
            id: "schema2",
            type: "array",
            items: [{ minimum: 10 }, { minimum: 9 }, { minimum: 12 }]
        };

        validate = instance.compile(schema2);
        shouldBeValid(validate, data);
        shouldBeInvalid(validate, invalidData1);
        shouldBeError(validate.errors[0], "minimum", "#/items/0/minimum", "[0]", "should be >= 10");
        shouldBeInvalid(validate, invalidData2);
        shouldBeError(validate.errors[0], "minimum", "#/items/2/minimum", "[2]", "should be >= 12");
    });

    it("should have correct schema path for additionalItems", () => {
        const schema = {
            type: "array",
            items: [{ type: "integer" }, { type: "integer" }],
            additionalItems: false
        };

        let data = [1, 2],
            invalidData = [1, 2, 3];

        test(instance);
        test(instanceJP);
        test(fullInstance);

        function test(_instance) {
            const validate = _instance.compile(schema);
            shouldBeValid(validate, data);
            shouldBeInvalid(validate, invalidData);
            shouldBeError(validate.errors[0], "additionalItems", "#/additionalItems", "", "should NOT have more than 2 items");
        }
    });

    describe('"propertyNames" errors', () => {
        it("should add propertyName to errors", () => {
            const schema = {
                type: "object",
                propertyNames: { format: "email" }
            };

            const data = {
                "bar.baz@email.example.com": {}
            };

            const invalidData = {
                foo: {},
                bar: {},
                "bar.baz@email.example.com": {}
            };

            test(instance, 2);
            test(instanceJP, 2);
            test(fullInstance, 4);

            function test(_instance, numErrors) {
                const validate = _instance.compile(schema);
                shouldBeValid(validate, data);
                shouldBeInvalid(validate, invalidData, numErrors);
                shouldBeError(validate.errors[0], "format", "#/propertyNames/format", "", 'should match format "email"');
                shouldBeError(validate.errors[1], "propertyNames", "#/propertyNames", "", "property name 'foo' is invalid");
                if (numErrors == 4) {
                    shouldBeError(validate.errors[2], "format", "#/propertyNames/format", "", 'should match format "email"');
                    shouldBeError(validate.errors[3], "propertyNames", "#/propertyNames", "", "property name 'bar' is invalid");
                }
            }
        });
    });

    describe("oneOf errors", () => {
        it("should have errors from inner schemas", () => {
            const schema = {
                oneOf: [{ type: "number" }, { type: "integer" }]
            };

            test(instance);
            test(fullInstance);

            function test(_instance) {
                const validate = _instance.compile(schema);
                expect(validate("foo")).to.be.equal(false);
                expect(validate.errors.length).to.be.equal(3);
                expect(validate(1)).to.be.equal(false);
                expect(validate.errors.length).to.be.equal(1);
                expect(validate(1.5)).to.be.equal(true);
            }
        });
    });

    describe("anyOf errors", () => {
        it("should have errors from inner schemas", () => {
            const schema = {
                anyOf: [{ type: "number" }, { type: "integer" }]
            };

            test(instance);
            test(fullInstance);

            function test(_instance) {
                const validate = _instance.compile(schema);
                expect(validate("foo")).to.be.equal(false);
                expect(validate.errors.length).to.be.equal(3);
                expect(validate(1)).to.be.equal(true);
                expect(validate(1.5)).to.be.equal(true);
            }
        });
    });

    describe("type errors", () => {
        describe("integer", () => {
            it("should have only one error in {allErrors: false} mode", () => {
                test(instance);
            });

            it("should return all errors in {allErrors: true} mode", () => {
                test(fullInstance, 2);
            });

            function test(_instance, numErrors) {
                const schema = {
                    type: "integer",
                    minimum: 5
                };


                const validate = _instance.compile(schema);
                shouldBeValid(validate, 5);
                shouldBeInvalid(validate, 5.5);
                shouldBeInvalid(validate, 4);
                shouldBeInvalid(validate, "4");
                shouldBeInvalid(validate, 4.5, numErrors);
            }
        });

        describe("keyword for another type", () => {
            it("should have only one error in {allErrors: false} mode", () => {
                test(instance);
            });

            it("should return all errors in {allErrors: true} mode", () => {
                test(fullInstance, 2);
            });

            function test(_isntance, numErrors) {
                const schema = {
                    type: "array",
                    minItems: 2,
                    minimum: 5
                };


                const validate = _isntance.compile(schema);
                shouldBeValid(validate, [1, 2]);
                shouldBeInvalid(validate, [1]);
                shouldBeInvalid(validate, 5);
                shouldBeInvalid(validate, 4, numErrors);
            }
        });

        describe("array of types", () => {
            it("should have only one error in {allErrors: false} mode", () => {
                test(instance);
            });

            it("should return all errors in {allErrors: true} mode", () => {
                test(fullInstance, 2);
            });

            function test(_instance, numErrors) {
                const schema = {
                    type: ["array", "object"],
                    minItems: 2,
                    minProperties: 2,
                    minimum: 5
                };


                const validate = _instance.compile(schema);
                shouldBeValid(validate, [1, 2]);
                shouldBeValid(validate, { foo: 1, bar: 2 });
                shouldBeInvalid(validate, [1]);
                shouldBeInvalid(validate, { foo: 1 });
                shouldBeInvalid(validate, 5);
                shouldBeInvalid(validate, 4, numErrors);
            }
        });
    });


    describe("exclusiveMaximum/Minimum errors", () => {
        it("should include limits in error message", () => {
            const schema = {
                type: "integer",
                exclusiveMinimum: 2,
                exclusiveMaximum: 5
            };

            [instance, fullInstance].forEach((_instance) => {
                const validate = _instance.compile(schema);
                shouldBeValid(validate, 3);
                shouldBeValid(validate, 4);

                shouldBeInvalid(validate, 2);
                testError("exclusiveMinimum", "should be > 2", { comparison: ">", limit: 2, exclusive: true });

                shouldBeInvalid(validate, 5);
                testError("exclusiveMaximum", "should be < 5", { comparison: "<", limit: 5, exclusive: true });

                function testError(keyword, message, params) {
                    const err = validate.errors[0];
                    shouldBeError(err, keyword, `#/${keyword}`, "", message, params);
                }
            });
        });
    });

    function testSchema1(schema, schemaPathPrefix) {
        _testSchema1(instance, schema, schemaPathPrefix);
        _testSchema1(instanceJP, schema, schemaPathPrefix);
        _testSchema1(fullInstance, schema, schemaPathPrefix);
    }

    function _testSchema1(_instance, schema, schemaPathPrefix) {
        const schPath = `${schemaPathPrefix || "#/properties/foo"}/type`;

        let data = { foo: 1 },
            invalidData = { foo: "bar" };

        const validate = _instance.compile(schema);
        shouldBeValid(validate, data);
        shouldBeInvalid(validate, invalidData);
        shouldBeError(validate.errors[0], "type", schPath, _instance._opts.jsonPointers ? "/foo" : ".foo");
    }

    function shouldBeValid(validate, data) {
        expect(validate(data)).to.be.equal(true);

        expect(validate.errors).to.be.equal(null);
    }

    function shouldBeInvalid(validate, data, numErrors) {
        expect(validate(data)).to.be.equal(false);

        expect(validate.errors.length).to.be.equal(numErrors || 1);
    }

    function shouldBeError(error, keyword, schemaPath, dataPath, message, params) {
        expect(error.keyword).to.be.equal(keyword);
        expect(error.schemaPath).to.be.equal(schemaPath);
        expect(error.dataPath).to.be.equal(dataPath);

        expect(error.message).to.be.a("string");
        if (message !== undefined) {
            expect(error.message).to.be.equal(message);
        }
        if (params !== undefined) {
            expect(error.params).to.be.deep.equal(params);
        }
    }
});
