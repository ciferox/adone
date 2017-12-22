import getInstances from "./get_instances";
import customRules from "./custom_rules";

const {
    is
} = adone;

describe("schema", "custom keywords", () => {
    let instance;
    let instances;

    beforeEach(() => {
        instances = getInstances({
            allErrors: true,
            verbose: true,
            inlineRefs: false
        });
        instance = instances[0];
    });

    describe("custom rules", () => {
        describe('rule with "interpreted" keyword validation', () => {
            it("should add and validate rule", () => {
                testEvenKeyword({ type: "number", validate: validateEven });

                function validateEven(schema, data) {
                    if (!is.boolean(schema)) {
                        throw new Error('The value of "even" keyword must be boolean');
                    }
                    return data % 2 ? !schema : schema;
                }
            });

            it("should add, validate keyword schema and validate rule", () => {
                testEvenKeyword({
                    type: "number",
                    validate: validateEven,
                    metaSchema: { type: "boolean" }
                });

                shouldBeInvalidSchema({ "x-even": "not_boolean" });

                function validateEven(schema, data) {
                    return data % 2 ? !schema : schema;
                }
            });

            it('should pass parent schema to "interpreted" keyword validation', () => {
                testRangeKeyword({
                    type: "number",
                    validate: validateRange
                });

                function validateRange(schema, data, parentSchema) {
                    validateRangeSchema(schema, parentSchema);

                    return parentSchema.exclusiveRange === true ? data > schema[0] && data < schema[1] : data >= schema[0] && data <= schema[1];
                }
            });

            it('should validate meta schema and pass parent schema to "interpreted" keyword validation', () => {
                testRangeKeyword({
                    type: "number",
                    validate: validateRange,
                    metaSchema: {
                        type: "array",
                        items: [{ type: "number" }, { type: "number" }],
                        additionalItems: false
                    }
                });
                shouldBeInvalidSchema({ "x-range": ["1", 2] });
                shouldBeInvalidSchema({ "x-range": {} });
                shouldBeInvalidSchema({ "x-range": [1, 2, 3] });

                function validateRange(schema, data, parentSchema) {
                    return parentSchema.exclusiveRange === true ? data > schema[0] && data < schema[1] : data >= schema[0] && data <= schema[1];
                }
            });

            it('should allow defining custom errors for "interpreted" keyword', () => {
                testRangeKeyword({ type: "number", validate: validateRange }, true);

                function validateRange(schema, data, parentSchema) {
                    validateRangeSchema(schema, parentSchema);
                    let min = schema[0],
                        max = schema[1],
                        exclusive = parentSchema.exclusiveRange === true;

                    const minOk = exclusive ? data > min : data >= min;
                    const maxOk = exclusive ? data < max : data <= max;
                    const valid = minOk && maxOk;

                    if (!valid) {
                        const err = { keyword: "x-range" };
                        validateRange.errors = [err];
                        let comparison, limit;
                        if (minOk) {
                            comparison = exclusive ? "<" : "<=";
                            limit = max;
                        } else {
                            comparison = exclusive ? ">" : ">=";
                            limit = min;
                        }
                        err.message = `should be ${comparison} ${limit}`;
                        err.params = {
                            comparison,
                            limit,
                            exclusive
                        };
                    }

                    return valid;
                }
            });
        });

        describe('rule with "compiled" keyword validation', () => {
            it("should add and validate rule", () => {
                testEvenKeyword({ type: "number", compile: compileEven });
                shouldBeInvalidSchema({ "x-even": "not_boolean" });

                function compileEven(schema) {
                    if (!is.boolean(schema)) {
                        throw new Error('The value of "even" keyword must be boolean');
                    }
                    return schema ? isEven : isOdd;
                }

                function isEven(data) {
                    return data % 2 === 0;
                }
                function isOdd(data) {
                    return data % 2 !== 0;
                }
            });

            it("should add, validate keyword schema and validate rule", () => {
                testEvenKeyword({
                    type: "number",
                    compile: compileEven,
                    metaSchema: { type: "boolean" }
                });
                shouldBeInvalidSchema({ "x-even": "not_boolean" });

                function compileEven(schema) {
                    return schema ? isEven : isOdd;
                }

                function isEven(data) {
                    return data % 2 === 0;
                }
                function isOdd(data) {
                    return data % 2 !== 0;
                }
            });

            it("should compile keyword validating function only once per schema", () => {
                testConstantKeyword({ compile: compileConstant });
            });

            it("should allow multiple schemas for the same keyword", () => {
                testMultipleConstantKeyword({ compile: compileConstant });
            });

            it('should pass parent schema to "compiled" keyword validation', () => {
                testRangeKeyword({ type: "number", compile: compileRange });
            });

            it("should allow multiple parent schemas for the same keyword", () => {
                testMultipleRangeKeyword({ type: "number", compile: compileRange });
            });
        });

        function compileConstant(schema) {
            return typeof schema === "object" && !is.null(schema) ? isDeepEqual : isStrictEqual;

            function isDeepEqual(data) {
                return adone.is.deepEqual(data, schema);
            }
            function isStrictEqual(data) {
                return data === schema;
            }
        }

        function compileRange(schema, parentSchema) {
            validateRangeSchema(schema, parentSchema);

            const min = schema[0];
            const max = schema[1];

            return parentSchema.exclusiveRange === true ? function (data) {
                return data > min && data < max;
            } : function (data) {
                return data >= min && data <= max;
            };
        }
    });

    describe("macro rules", () => {
        it('should add and validate rule with "macro" keyword', () => {
            testEvenKeyword({ type: "number", macro: macroEven }, 2);
        });

        it("should add and expand macro rule", () => {
            testConstantKeyword({ macro: macroConstant }, 2);
        });

        it("should allow multiple schemas for the same macro keyword", () => {
            testMultipleConstantKeyword({ macro: macroConstant }, 2);
        });

        it('should pass parent schema to "macro" keyword', () => {
            testRangeKeyword({ type: "number", macro: macroRange }, undefined, 2);
        });

        it("should allow multiple parent schemas for the same macro keyword", () => {
            testMultipleRangeKeyword({ type: "number", macro: macroRange }, 2);
        });

        it("should recursively expand macro keywords", () => {
            instances.forEach((_instance) => {
                _instance.addKeyword("deepProperties", { type: "object", macro: macroDeepProperties });
                _instance.addKeyword("range", { type: "number", macro: macroRange });

                const schema = {
                    deepProperties: {
                        "a.b.c": { type: "number", range: [2, 4] },
                        "d.e.f.g": { type: "string" }
                    }
                };

                /* This schema recursively expands to:
                {
                  "allOf": [
                    {
                      "properties": {
                        "a": {
                          "properties": {
                            "b": {
                              "properties": {
                                "c": {
                                  "type": "number",
                                  "minimum": 2,
                                  "exclusiveMinimum": false,
                                  "maximum": 4,
                                  "exclusiveMaximum": false
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    {
                      "properties": {
                        "d": {
                          "properties": {
                            "e": {
                              "properties": {
                                "f": {
                                  "properties": {
                                    "g": {
                                      "type": "string"
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
                */

                const validate = _instance.compile(schema);

                shouldBeValid(validate, {
                    a: { b: { c: 3 } },
                    d: { e: { f: { g: "foo" } } }
                });

                shouldBeInvalid(validate, {
                    a: { b: { c: 5 } }, // out of range
                    d: { e: { f: { g: "foo" } } }
                }, 5);

                shouldBeInvalid(validate, {
                    a: { b: { c: "bar" } }, // not number
                    d: { e: { f: { g: "foo" } } }
                }, 4);

                shouldBeInvalid(validate, {
                    a: { b: { c: 3 } },
                    d: { e: { f: { g: 2 } } } // not string
                }, 5);

                function macroDeepProperties(_schema) {
                    if (typeof _schema !== "object") {
                        throw new Error("schema of deepProperty should be an object");
                    }

                    const expanded = [];

                    for (const prop in _schema) {
                        const path = prop.split(".");
                        const properties = {};
                        if (path.length == 1) {
                            properties[prop] = _schema[prop];
                        } else {
                            const deepProperties = {};
                            deepProperties[path.slice(1).join(".")] = _schema[prop];
                            properties[path[0]] = { deepProperties };
                        }
                        expanded.push({ properties });
                    }

                    return expanded.length == 1 ? expanded[0] : { allOf: expanded };
                }
            });
        });

        it("should correctly expand multiple macros on the same level", () => {
            instances.forEach((_instance) => {
                _instance.addKeyword("range", { type: "number", macro: macroRange });
                _instance.addKeyword("even", { type: "number", macro: macroEven });

                const schema = {
                    range: [4, 6],
                    even: true
                };

                const validate = _instance.compile(schema);
                const numErrors = _instance._opts.allErrors ? 4 : 2;

                shouldBeInvalid(validate, 2, 2);
                shouldBeInvalid(validate, 3, numErrors);
                shouldBeValid(validate, 4);
                shouldBeInvalid(validate, 5, 2);
                shouldBeValid(validate, 6);
                shouldBeInvalid(validate, 7, numErrors);
                shouldBeInvalid(validate, 8, 2);
            });
        });

        it("should validate macro keyword when it resolves to the same keyword as exists", () => {
            instances.forEach((_instance) => {
                _instance.addKeyword("range", { type: "number", macro: macroRange });

                const schema = {
                    range: [1, 4],
                    minimum: 2.5
                };

                const validate = _instance.compile(schema);

                shouldBeValid(validate, 3);
                shouldBeInvalid(validate, 2);
            });
        });

        it("should correctly expand macros in subschemas", () => {
            instances.forEach((_instance) => {
                _instance.addKeyword("range", { type: "number", macro: macroRange });

                const schema = {
                    allOf: [{ range: [4, 8] }, { range: [2, 6] }]
                };

                const validate = _instance.compile(schema);

                shouldBeInvalid(validate, 2, 2);
                shouldBeInvalid(validate, 3, 2);
                shouldBeValid(validate, 4);
                shouldBeValid(validate, 5);
                shouldBeValid(validate, 6);
                shouldBeInvalid(validate, 7, 2);
                shouldBeInvalid(validate, 8, 2);
            });
        });

        it("should correctly expand macros in macro expansions", () => {
            instances.forEach((_instance) => {
                _instance.addKeyword("range", { type: "number", macro: macroRange });
                _instance.addKeyword("myContains", { type: "array", macro: macroContains });

                const schema = {
                    myContains: {
                        type: "number",
                        range: [4, 7],
                        exclusiveRange: true
                    }
                };

                const validate = _instance.compile(schema);

                shouldBeInvalid(validate, [1, 2, 3], 2);
                shouldBeInvalid(validate, [2, 3, 4], 2);
                shouldBeValid(validate, [3, 4, 5]); // only 5 is in range
                shouldBeValid(validate, [6, 7, 8]); // only 6 is in range
                shouldBeInvalid(validate, [7, 8, 9], 2);
                shouldBeInvalid(validate, [8, 9, 10], 2);

                function macroContains(_schema) {
                    return { not: { items: { not: _schema } } };
                }
            });
        });

        it("should throw exception if macro expansion is an invalid schema", () => {
            instance.addKeyword("invalid", { macro: macroInvalid });
            const schema = { invalid: true };

            expect(() => {
                instance.compile(schema);
            }).to.throw();

            function macroInvalid() /* schema */ {
                return { type: "invalid" };
            }
        });

        function macroEven(schema) {
            if (schema === true) {
                return { multipleOf: 2 };
            }
            if (schema === false) {
                return { not: { multipleOf: 2 } };
            }
            throw new Error('Schema for "even" keyword should be boolean');
        }

        function macroConstant(schema /*, parentSchema */) {
            return { enum: [schema] };
        }

        function macroRange(schema, parentSchema) {
            validateRangeSchema(schema, parentSchema);
            const exclusive = Boolean(parentSchema.exclusiveRange);

            return exclusive ? { exclusiveMinimum: schema[0], exclusiveMaximum: schema[1] } : { minimum: schema[0], maximum: schema[1] };
        }
    });

    describe("inline rules", () => {
        it('should add and validate rule with "inline" code keyword', () => {
            testEvenKeyword({ type: "number", inline: inlineEven });
        });

        it('should pass parent schema to "inline" keyword', () => {
            testRangeKeyword({ type: "number", inline: inlineRange, statements: true });
        });

        it('should define "inline" keyword as template', () => {
            const inlineRangeTemplate = customRules.range;

            testRangeKeyword({
                type: "number",
                inline: inlineRangeTemplate,
                statements: true
            });
        });

        it('should define "inline" keyword without errors', () => {
            const inlineRangeTemplate = customRules.range;

            testRangeKeyword({
                type: "number",
                inline: inlineRangeTemplate,
                statements: true,
                errors: false
            });
        });

        it("should allow defining optional errors", () => {
            const inlineRangeTemplate = customRules.rangeWithErrors;

            testRangeKeyword({
                type: "number",
                inline: inlineRangeTemplate,
                statements: true
            }, true);
        });

        it("should allow defining required errors", () => {
            const inlineRangeTemplate = customRules.rangeWithErrors;

            testRangeKeyword({
                type: "number",
                inline: inlineRangeTemplate,
                statements: true,
                errors: true
            }, true);
        });

        function inlineEven(it, keyword, schema) {
            const op = schema ? "===" : "!==";
            return `data${it.dataLevel || ""} % 2 ${op} 0`;
        }

        function inlineRange(it, keyword, schema, parentSchema) {
            let min = schema[0],
                max = schema[1],
                data = `data${it.dataLevel || ""}`,
                gt = parentSchema.exclusiveRange ? " > " : " >= ",
                lt = parentSchema.exclusiveRange ? " < " : " <= ";
            return `var valid${it.level} = ${data}${gt}${min} && ${data}${lt}${max};`;
        }
    });

    describe("$data reference support with custom keywords (with $data option)", () => {
        beforeEach(() => {
            instances = getInstances({
                allErrors: true,
                verbose: true,
                inlineRefs: false
            }, { $data: true });
            instance = instances[0];
        });

        it('should validate "interpreted" rule', () => {
            testEvenKeyword$data({
                type: "number",
                $data: true,
                validate: validateEven
            });

            function validateEven(schema, data) {
                if (!is.boolean(schema)) {
                    return false;
                }
                return data % 2 ? !schema : schema;
            }
        });

        it('should validate rule with "compile" and "validate" funcs', () => {
            let compileCalled;
            testEvenKeyword$data({
                type: "number",
                $data: true,
                compile: compileEven,
                validate: validateEven
            });
            expect(compileCalled).to.be.equal(true);


            function validateEven(schema, data) {
                if (!is.boolean(schema)) {
                    return false;
                }
                return data % 2 ? !schema : schema;
            }

            function compileEven(schema) {
                compileCalled = true;
                if (!is.boolean(schema)) {
                    throw new Error('The value of "even" keyword must be boolean');
                }
                return schema ? isEven : isOdd;
            }

            function isEven(data) {
                return data % 2 === 0;
            }
            function isOdd(data) {
                return data % 2 !== 0;
            }
        });

        it('should validate with "compile" and "validate" funcs with meta-schema', () => {
            let compileCalled;
            testEvenKeyword$data({
                type: "number",
                $data: true,
                compile: compileEven,
                validate: validateEven,
                metaSchema: { type: "boolean" }
            });
            expect(compileCalled).to.be.equal(true);

            shouldBeInvalidSchema({ "x-even-$data": "false" });

            function validateEven(schema, data) {
                return data % 2 ? !schema : schema;
            }

            function compileEven(schema) {
                compileCalled = true;
                return schema ? isEven : isOdd;
            }

            function isEven(data) {
                return data % 2 === 0;
            }
            function isOdd(data) {
                return data % 2 !== 0;
            }
        });

        it('should validate rule with "macro" and "validate" funcs', () => {
            let macroCalled;
            testEvenKeyword$data({
                type: "number",
                $data: true,
                macro: macroEven,
                validate: validateEven
            }, 2);
            expect(macroCalled).to.be.equal(true);


            function validateEven(schema, data) {
                if (!is.boolean(schema)) {
                    return false;
                }
                return data % 2 ? !schema : schema;
            }

            function macroEven(schema) {
                macroCalled = true;
                if (schema === true) {
                    return { multipleOf: 2 };
                }
                if (schema === false) {
                    return { not: { multipleOf: 2 } };
                }
                throw new Error('Schema for "even" keyword should be boolean');
            }
        });

        it('should validate with "macro" and "validate" funcs with meta-schema', () => {
            let macroCalled;
            testEvenKeyword$data({
                type: "number",
                $data: true,
                macro: macroEven,
                validate: validateEven,
                metaSchema: { type: "boolean" }
            }, 2);
            expect(macroCalled).to.be.equal(true);

            shouldBeInvalidSchema({ "x-even-$data": "false" });

            function validateEven(schema, data) {
                return data % 2 ? !schema : schema;
            }

            function macroEven(schema) {
                macroCalled = true;
                if (schema === true) {
                    return { multipleOf: 2 };
                }
                if (schema === false) {
                    return { not: { multipleOf: 2 } };
                }
            }
        });

        it('should validate rule with "inline" and "validate" funcs', () => {
            let inlineCalled;
            testEvenKeyword$data({
                type: "number",
                $data: true,
                inline: inlineEven,
                validate: validateEven
            });
            expect(inlineCalled).to.be.equal(true);


            function validateEven(schema, data) {
                if (!is.boolean(schema)) {
                    return false;
                }
                return data % 2 ? !schema : schema;
            }

            function inlineEven(it, keyword, schema) {
                inlineCalled = true;
                const op = schema ? "===" : "!==";
                return `data${it.dataLevel || ""} % 2 ${op} 0`;
            }
        });

        it('should validate with "inline" and "validate" funcs with meta-schema', () => {
            let inlineCalled;
            testEvenKeyword$data({
                type: "number",
                $data: true,
                inline: inlineEven,
                validate: validateEven,
                metaSchema: { type: "boolean" }
            });
            expect(inlineCalled).to.be.equal(true);

            shouldBeInvalidSchema({ "x-even-$data": "false" });

            function validateEven(schema, data) {
                return data % 2 ? !schema : schema;
            }

            function inlineEven(it, keyword, schema) {
                inlineCalled = true;
                const op = schema ? "===" : "!==";
                return `data${it.dataLevel || ""} % 2 ${op} 0`;
            }
        });

        it('should fail if keyword definition has "$data" but no "validate"', () => {
            expect(() => {
                instance.addKeyword("even", {
                    type: "number",
                    $data: true,
                    macro() {
                        return {};
                    }
                });
            }).to.throw();
        });
    });

    function testEvenKeyword(definition, numErrors) {
        instances.forEach((_instance) => {
            _instance.addKeyword("x-even", definition);
            const schema = { "x-even": true };
            const validate = _instance.compile(schema);

            shouldBeValid(validate, 2);
            shouldBeValid(validate, "abc");
            shouldBeInvalid(validate, 2.5, numErrors);
            shouldBeInvalid(validate, 3, numErrors);
        });
    }

    function testEvenKeyword$data(definition, numErrors) {
        instances.forEach((_instance) => {
            _instance.addKeyword("x-even-$data", definition);

            let schema = { "x-even-$data": true };
            let validate = _instance.compile(schema);

            shouldBeValid(validate, 2);
            shouldBeValid(validate, "abc");
            shouldBeInvalid(validate, 2.5, numErrors);
            shouldBeInvalid(validate, 3, numErrors);

            schema = {
                properties: {
                    data: { "x-even-$data": { $data: "1/evenValue" } },
                    evenValue: {}
                }
            };
            validate = _instance.compile(schema);

            shouldBeValid(validate, { data: 2, evenValue: true });
            shouldBeInvalid(validate, { data: 2, evenValue: false });
            shouldBeValid(validate, { data: "abc", evenValue: true });
            shouldBeValid(validate, { data: "abc", evenValue: false });
            shouldBeInvalid(validate, { data: 2.5, evenValue: true });
            shouldBeValid(validate, { data: 2.5, evenValue: false });
            shouldBeInvalid(validate, { data: 3, evenValue: true });
            shouldBeValid(validate, { data: 3, evenValue: false });

            shouldBeInvalid(validate, { data: 2, evenValue: "true" });

            // valid if the value of x-even-$data keyword is undefined
            shouldBeValid(validate, { data: 2 });
            shouldBeValid(validate, { data: 3 });
        });
    }

    function testConstantKeyword(definition, numErrors) {
        instances.forEach((_instance) => {
            _instance.addKeyword("myConstant", definition);

            const schema = { myConstant: "abc" };
            const validate = _instance.compile(schema);

            shouldBeValid(validate, "abc");
            shouldBeInvalid(validate, 2, numErrors);
            shouldBeInvalid(validate, {}, numErrors);
        });
    }

    function testMultipleConstantKeyword(definition, numErrors) {
        instances.forEach((_instance) => {
            _instance.addKeyword("x-constant", definition);

            const schema = {
                properties: {
                    a: { "x-constant": 1 },
                    b: { "x-constant": 1 }
                },
                additionalProperties: { "x-constant": { foo: "bar" } },
                items: { "x-constant": { foo: "bar" } }
            };
            const validate = _instance.compile(schema);

            shouldBeValid(validate, { a: 1, b: 1 });
            shouldBeInvalid(validate, { a: 2, b: 1 }, numErrors);

            shouldBeValid(validate, { a: 1, c: { foo: "bar" } });
            shouldBeInvalid(validate, { a: 1, c: { foo: "baz" } }, numErrors);

            shouldBeValid(validate, [{ foo: "bar" }]);
            shouldBeValid(validate, [{ foo: "bar" }, { foo: "bar" }]);

            shouldBeInvalid(validate, [1], numErrors);
        });
    }

    function testRangeKeyword(definition, customErrors, numErrors) {
        instances.forEach((_instance) => {
            _instance.addKeyword("x-range", definition);

            let schema = { "x-range": [2, 4] };
            let validate = _instance.compile(schema);

            shouldBeValid(validate, 2);
            shouldBeValid(validate, 3);
            shouldBeValid(validate, 4);
            shouldBeValid(validate, "abc");

            shouldBeInvalid(validate, 1.99, numErrors);
            if (customErrors) {
                shouldBeRangeError(validate.errors[0], "", "#/x-range", ">=", 2);
            }
            shouldBeInvalid(validate, 4.01, numErrors);
            if (customErrors) {
                shouldBeRangeError(validate.errors[0], "", "#/x-range", "<=", 4);
            }

            schema = {
                properties: {
                    foo: {
                        "x-range": [2, 4],
                        exclusiveRange: true
                    }
                }
            };
            validate = _instance.compile(schema);

            shouldBeValid(validate, { foo: 2.01 });
            shouldBeValid(validate, { foo: 3 });
            shouldBeValid(validate, { foo: 3.99 });

            shouldBeInvalid(validate, { foo: 2 }, numErrors);
            if (customErrors) {
                shouldBeRangeError(validate.errors[0], ".foo", "#/properties/foo/x-range", ">", 2, true);
            }
            shouldBeInvalid(validate, { foo: 4 }, numErrors);
            if (customErrors) {
                shouldBeRangeError(validate.errors[0], ".foo", "#/properties/foo/x-range", "<", 4, true);
            }
        });
    }

    function testMultipleRangeKeyword(definition, numErrors) {
        instances.forEach((_instance) => {
            _instance.addKeyword("x-range", definition);

            const schema = {
                properties: {
                    a: { "x-range": [2, 4], exclusiveRange: true },
                    b: { "x-range": [2, 4], exclusiveRange: false }
                },
                additionalProperties: { "x-range": [5, 7] },
                items: { "x-range": [5, 7] }
            };
            const validate = _instance.compile(schema);

            shouldBeValid(validate, { a: 3.99, b: 4 });
            shouldBeInvalid(validate, { a: 4, b: 4 }, numErrors);

            shouldBeValid(validate, { a: 2.01, c: 7 });
            shouldBeInvalid(validate, { a: 2.01, c: 7.01 }, numErrors);

            shouldBeValid(validate, [5, 6, 7]);
            shouldBeInvalid(validate, [7.01], numErrors);
        });
    }

    function shouldBeRangeError(error, dataPath, schemaPath, comparison, limit, exclusive) {
        delete error.schema;
        delete error.data;
        expect(error).to.be.deep.equal({
            keyword: "x-range",
            dataPath,
            schemaPath,
            message: `should be ${comparison} ${limit}`,
            params: {
                comparison,
                limit,
                exclusive: Boolean(exclusive)
            }
        });
    }

    function validateRangeSchema(schema, parentSchema) {
        const schemaValid = is.array(schema) && schema.length == 2 && is.number(schema[0]) && is.number(schema[1]);
        if (!schemaValid) {
            throw new Error("Invalid schema for range keyword, should be array of 2 numbers");
        }

        const exclusiveRangeSchemaValid = is.undefined(parentSchema.exclusiveRange) || is.boolean(parentSchema.exclusiveRange);
        if (!exclusiveRangeSchemaValid) {
            throw new Error("Invalid schema for exclusiveRange keyword, should be bolean");
        }
    }

    function shouldBeValid(validate, data) {
        expect(validate(data)).to.be.equal(true);

        expect(validate.errors).not.to.be.ok();
    }

    function shouldBeInvalid(validate, data, numErrors) {
        expect(validate(data)).to.be.equal(false);
        expect(validate.errors).to.have.lengthOf(numErrors || 1);
    }

    function shouldBeInvalidSchema(schema) {
        instances.forEach((_instance) => {
            expect(() => {
                _instance.compile(schema);
            }).to.throw();
        });
    }

    describe("addKeyword method", () => {
        const TEST_TYPES = [undefined, "number", "string", "boolean", ["number", "string"]];

        it("should throw if defined keyword is passed", () => {
            testThrow(["minimum", "maximum", "multipleOf", "minLength", "maxLength"]);
            testThrowDuplicate("custom");

            function testThrow(keywords) {
                TEST_TYPES.forEach((dataType, index) => {
                    expect(() => {
                        addKeyword(keywords[index], dataType);
                    }).to.throw();
                });
            }

            function testThrowDuplicate(keywordPrefix) {
                let index = 0;
                TEST_TYPES.forEach((dataType1) => {
                    TEST_TYPES.forEach((dataType2) => {
                        const keyword = keywordPrefix + index++;
                        addKeyword(keyword, dataType1);
                        expect(() => {
                            addKeyword(keyword, dataType2);
                        }).to.throw();
                    });
                });
            }
        });

        it("should throw if keyword is not a valid name", () => {
            expect(() => {
                instance.addKeyword("mykeyword", {
                    validate() {
                        return true;
                    }
                });
            }).not.to.throw();

            expect(() => {
                instance.addKeyword("hyphens-are-valid", {
                    validate() {
                        return true;
                    }
                });
            }).not.to.throw();

            expect(() => {
                instance.addKeyword("3-start-with-number-not-valid`", {
                    validate() {
                        return true;
                    }
                });
            }).to.throw();

            expect(() => {
                instance.addKeyword("-start-with-hyphen-not-valid`", {
                    validate() {
                        return true;
                    }
                });
            }).to.throw();

            expect(() => {
                instance.addKeyword("spaces not valid`", {
                    validate() {
                        return true;
                    }
                });
            }).to.throw();
        });

        it("should return instance of itself", () => {
            const res = instance.addKeyword("any", {
                validate() {
                    return true;
                }
            });
            expect(res).to.be.equal(instance);
        });

        it("should throw if unknown type is passed", () => {
            expect(() => {
                addKeyword("custom1", "wrongtype");
            }).to.throw();

            expect(() => {
                addKeyword("custom2", ["number", "wrongtype"]);
            }).to.throw();

            expect(() => {
                addKeyword("custom3", ["number", undefined]);
            }).to.throw();
        });

        function addKeyword(keyword, dataType) {
            instance.addKeyword(keyword, {
                type: dataType,
                validate() { }
            });
        }
    });

    describe("getKeyword", () => {
        it("should return boolean for pre-defined and unknown keywords", () => {
            expect(instance.getKeyword("type")).to.be.equal(true);
            expect(instance.getKeyword("properties")).to.be.equal(true);
            expect(instance.getKeyword("additionalProperties")).to.be.equal(true);
            expect(instance.getKeyword("unknown")).to.be.equal(false);
        });

        it("should return keyword definition for custom keywords", () => {
            const definition = {
                validate() {
                    return true;
                }
            };

            instance.addKeyword("mykeyword", definition);
            expect(instance.getKeyword("mykeyword")).to.be.equal(definition);
        });
    });

    describe("removeKeyword", () => {
        it("should remove and allow redefining custom keyword", () => {
            instance.addKeyword("positive", {
                type: "number",
                validate(schema, data) {
                    return data > 0;
                }
            });

            const schema = { positive: true };

            let validate = instance.compile(schema);
            expect(validate(0)).to.be.equal(false);
            expect(validate(1)).to.be.equal(true);


            expect(() => {
                instance.addKeyword("positive", {
                    type: "number",
                    validate(sch, data) {
                        return data >= 0;
                    }
                });
            }).to.throw();

            instance.removeKeyword("positive");
            instance.removeSchema(schema);
            instance.addKeyword("positive", {
                type: "number",
                validate(sch, data) {
                    return data >= 0;
                }
            });

            validate = instance.compile(schema);
            expect(validate(-1)).to.be.equal(false);
            expect(validate(0)).to.be.equal(true);
            expect(validate(1)).to.be.equal(true);
        });

        it("should remove and allow redefining standard keyword", () => {
            const schema = { minimum: 1 };
            let validate = instance.compile(schema);
            expect(validate(0)).to.be.equal(false);
            expect(validate(1)).to.be.equal(true);
            expect(validate(2)).to.be.equal(true);


            instance.removeKeyword("minimum");
            instance.removeSchema(schema);

            validate = instance.compile(schema);
            expect(validate(0)).to.be.equal(true);
            expect(validate(1)).to.be.equal(true);
            expect(validate(2)).to.be.equal(true);


            instance.addKeyword("minimum", {
                type: "number",
                // make minimum exclusive
                validate(sch, data) {
                    return data > sch;
                }
            });
            instance.removeSchema(schema);

            validate = instance.compile(schema);
            expect(validate(0)).to.be.equal(false);
            expect(validate(1)).to.be.equal(false);
            expect(validate(2)).to.be.equal(true);
        });

        it("should return instance of itself", () => {
            const res = instance
                .addKeyword("any", {
                    validate() {
                        return true;
                    }
                })
                .removeKeyword("any");
            expect(res).to.be.equal(instance);
        });
    });

    describe("custom keywords mutating data", () => {
        it("should NOT update data without option modifying", () => {
            expect(() => {
                testModifying(false);
            }).to.throw();
        });

        it("should update data with option modifying", () => {
            testModifying(true);
        });

        function testModifying(withOption) {
            const collectionFormat = {
                csv(data, dataPath, parentData, parentDataProperty) {
                    parentData[parentDataProperty] = data.split(",");
                    return true;
                }
            };

            instance.addKeyword("collectionFormat", {
                type: "string",
                modifying: withOption,
                compile(schema) {
                    return collectionFormat[schema];
                },
                metaSchema: {
                    enum: ["csv"]
                }
            });

            const validate = instance.compile({
                type: "object",
                properties: {
                    foo: {
                        allOf: [{ collectionFormat: "csv" }, {
                            type: "array",
                            items: { type: "string" }
                        }]
                    }
                },
                additionalProperties: false
            });

            const obj = { foo: "bar,baz,quux" };

            expect(validate(obj)).to.be.equal(true);
            expect(obj).to.be.deep.equal({ foo: ["bar", "baz", "quux"] });
        }
    });

    describe("custom keywords with predefined validation result", () => {
        it("should ignore result from validation function", () => {
            instance.addKeyword("pass", {
                validate() {
                    return false;
                },
                valid: true
            });

            instance.addKeyword("fail", {
                validate() {
                    return true;
                },
                valid: false
            });

            expect(instance.validate({ pass: "" }, 1)).to.be.equal(true);
            expect(instance.validate({ fail: "" }, 1)).to.be.equal(false);
        });

        it("should throw exception if used with macro keyword", () => {
            expect(() => {
                instance.addKeyword("pass", {
                    macro() {
                        return {};
                    },
                    valid: true
                });
            }).to.throw();

            expect(() => {
                instance.addKeyword("fail", {
                    macro() {
                        return { not: {} };
                    },
                    valid: false
                });
            }).to.throw();
        });
    });
});
