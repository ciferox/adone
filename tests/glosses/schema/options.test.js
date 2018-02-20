import getInstances from "./get_instances";

describe("schema", "options", () => {
    const { schema: { Validator, refs } } = adone;

    describe("removeAdditional", () => {
        it("should remove all additional properties", () => {
            const instance = new Validator({ removeAdditional: "all" });

            instance.addSchema({
                id: "//test/fooBar",
                properties: { foo: { type: "string" }, bar: { type: "string" } }
            });

            const object = {
                foo: "foo", bar: "bar", baz: "baz-to-be-removed"
            };

            expect(instance.validate("//test/fooBar", object)).to.be.equal(true);
            expect(object).to.have.property("foo");
            expect(object).to.have.property("bar");

            expect(object).not.to.have.property("baz");
        });

        it("should remove properties that would error when `additionalProperties = false`", () => {
            const instance = new Validator({ removeAdditional: true });

            instance.addSchema({
                id: "//test/fooBar",
                properties: { foo: { type: "string" }, bar: { type: "string" } },
                additionalProperties: false
            });

            const object = {
                foo: "foo", bar: "bar", baz: "baz-to-be-removed"
            };

            expect(instance.validate("//test/fooBar", object)).to.be.equal(true);
            expect(object).to.have.property("foo");
            expect(object).to.have.property("bar");

            expect(object).not.to.have.property("baz");
        });

        it("should remove properties that would error when `additionalProperties` is a schema", () => {
            const instance = new Validator({ removeAdditional: "failing" });

            instance.addSchema({
                id: "//test/fooBar",
                properties: { foo: { type: "string" }, bar: { type: "string" } },
                additionalProperties: { type: "string" }
            });

            let object = {
                foo: "foo", bar: "bar", baz: "baz-to-be-kept", fizz: 1000
            };

            expect(instance.validate("//test/fooBar", object)).to.be.equal(true);
            expect(object).to.have.property("foo");
            expect(object).to.have.property("bar");
            expect(object).to.have.property("baz");

            expect(object).not.to.have.property("fizz");

            instance.addSchema({
                id: "//test/fooBar2",
                properties: { foo: { type: "string" }, bar: { type: "string" } },
                additionalProperties: { type: "string", pattern: "^to-be-", maxLength: 10 }
            });

            object = {
                foo: "foo", bar: "bar", baz: "to-be-kept", quux: "to-be-removed", fizz: 1000
            };

            expect(instance.validate("//test/fooBar2", object)).to.be.equal(true);
            expect(object).to.have.property("foo");
            expect(object).to.have.property("bar");
            expect(object).to.have.property("baz");

            expect(object).not.to.have.property("fizz");
        });
    });

    describe("ownProperties", () => {
        let instance;
        let instanceOP;
        let instanceOP1;

        beforeEach(() => {
            instance = new Validator({ allErrors: true });
            instanceOP = new Validator({ ownProperties: true, allErrors: true });
            instanceOP1 = new Validator({ ownProperties: true });
        });

        it("should only validate own properties with additionalProperties", () => {
            const schema = {
                properties: { a: { type: "number" } },
                additionalProperties: false
            };

            const obj = { a: 1 };
            const proto = { b: 2 };
            test(schema, obj, proto);
        });

        it("should only validate own properties with properties keyword", () => {
            const schema = {
                properties: {
                    a: { type: "number" },
                    b: { type: "number" }
                }
            };

            const obj = { a: 1 };
            const proto = { b: "not a number" };
            test(schema, obj, proto);
        });

        it("should only validate own properties with required keyword", () => {
            const schema = {
                required: ["a", "b"]
            };

            const obj = { a: 1 };
            const proto = { b: 2 };
            test(schema, obj, proto, 1, true);
        });

        it("should only validate own properties with required keyword - many properties", () => {
            instance = new Validator({ allErrors: true, loopRequired: 1 });
            instanceOP = new Validator({ ownProperties: true, allErrors: true, loopRequired: 1 });
            instanceOP1 = new Validator({ ownProperties: true, loopRequired: 1 });

            const schema = {
                required: ["a", "b", "c", "d"]
            };

            const obj = { a: 1, b: 2 };
            const proto = { c: 3, d: 4 };
            test(schema, obj, proto, 2, true);
        });

        it("should only validate own properties with required keyword as $data", () => {
            instance = new Validator({ allErrors: true, $data: true });
            instanceOP = new Validator({ ownProperties: true, allErrors: true, $data: true });
            instanceOP1 = new Validator({ ownProperties: true, $data: true });

            const schema = {
                required: { $data: "0/req" },
                properties: {
                    req: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            };

            const obj = {
                req: ["a", "b"],
                a: 1
            };
            const proto = { b: 2 };
            test(schema, obj, proto, 1, true);
        });

        it("should only validate own properties with properties and required keyword", () => {
            const schema = {
                properties: {
                    a: { type: "number" },
                    b: { type: "number" }
                },
                required: ["a", "b"]
            };

            const obj = { a: 1 };
            const proto = { b: 2 };
            test(schema, obj, proto, 1, true);
        });

        it("should only validate own properties with dependencies keyword", () => {
            const schema = {
                dependencies: {
                    a: ["c"],
                    b: ["d"]
                }
            };

            let obj = { a: 1, c: 3 };
            let proto = { b: 2 };
            test(schema, obj, proto);

            obj = { a: 1, b: 2, c: 3 };
            proto = { d: 4 };
            test(schema, obj, proto, 1, true);
        });

        it("should only validate own properties with schema dependencies", () => {
            const schema = {
                dependencies: {
                    a: { not: { required: ["c"] } },
                    b: { not: { required: ["d"] } }
                }
            };

            let obj = { a: 1, d: 3 };
            let proto = { b: 2 };
            test(schema, obj, proto);

            obj = { a: 1, b: 2 };
            proto = { d: 4 };
            test(schema, obj, proto);
        });

        it("should only validate own properties with patternProperties", () => {
            const schema = {
                patternProperties: { "f.*o": { type: "integer" } }
            };

            const obj = { fooo: 1 };
            const proto = { foo: "not a number" };
            test(schema, obj, proto);
        });

        it("should only validate own properties with patternGroups", () => {
            instance = new Validator({ allErrors: true, patternGroups: true });
            instanceOP = new Validator({ ownProperties: true, allErrors: true, patternGroups: true });

            const schema = {
                patternGroups: {
                    "f.*o": { schema: { type: "integer" } }
                }
            };

            const obj = { fooo: 1 };
            const proto = { foo: "not a number" };
            test(schema, obj, proto);
        });

        it("should only validate own properties with propertyNames", () => {
            const schema = {
                propertyNames: {
                    format: "email"
                }
            };

            const obj = { "e@example.com": 2 };
            const proto = { "not email": 1 };
            test(schema, obj, proto, 2);
        });

        function test(schema, obj, proto, errors, reverse) {
            errors = errors || 1;
            const validate = instance.compile(schema);
            const validateOP = instanceOP.compile(schema);
            const validateOP1 = instanceOP1.compile(schema);
            const data = Object.create(proto);
            for (const key in obj) {
                data[key] = obj[key];
            }

            if (reverse) {
                expect(validate(data)).to.be.equal(true);
                expect(validateOP(data)).to.be.equal(false);

                expect(validateOP.errors).to.have.lengthOf(errors);

                expect(validateOP1(data)).to.be.equal(false);

                expect(validateOP1.errors).to.have.lengthOf(1);
            } else {
                expect(validate(data)).to.be.equal(false);

                expect(validate.errors).to.have.lengthOf(errors);

                expect(validateOP(data)).to.be.equal(true);
                expect(validateOP1(data)).to.be.equal(true);
            }
        }
    });

    describe("meta and validateSchema", () => {
        it("should add draft-6 meta schema by default", () => {
            testOptionMeta(new Validator());
            testOptionMeta(new Validator({ meta: true }));

            function testOptionMeta(instance) {
                expect(instance.getSchema("http://json-schema.org/draft-06/schema")).to.be.a("function");
                expect(instance.validateSchema({ type: "integer" })).to.be.equal(true);
                expect(instance.validateSchema({ type: 123 })).to.be.equal(false);

                expect(() => {
                    instance.addSchema({ type: "integer" });
                }).not.to.throw();
                expect(() => {
                    instance.addSchema({ type: 123 });
                }).to.throw();
            }
        });

        it("should throw if meta: false and validateSchema: true", () => {
            const instance = new Validator({ meta: false });
            expect(instance.getSchema("http://json-schema.org/draft-06/schema")).not.to.be.ok();
            expect(() => {
                instance.addSchema({ type: "wrong_type" }, "integer");
            }).not.to.throw();
        });

        it("should skip schema validation with validateSchema: false", () => {
            let instance = new Validator();
            expect(() => {
                instance.addSchema({ type: 123 }, "integer");
            }).to.throw();

            instance = new Validator({ validateSchema: false });
            expect(() => {
                instance.addSchema({ type: 123 }, "integer");
            }).not.to.throw();

            instance = new Validator({ validateSchema: false, meta: false });
            expect(() => {
                instance.addSchema({ type: 123 }, "integer");
            }).not.to.throw();
        });

        it('should not throw on invalid schema with validateSchema: "log"', () => {
            const logError = adone.logError;
            let loggedError = false;
            adone.logError = function (...args) {
                loggedError = true;
                logError.apply(adone, args);
            };
            try {
                let instance = new Validator({ validateSchema: "log" });
                expect(() => {
                    instance.addSchema({ type: 123 }, "integer");
                }).not.to.throw();
                expect(loggedError).to.be.equal(true);

                loggedError = false;
                instance = new Validator({ validateSchema: "log", meta: false });
                expect(() => {
                    instance.addSchema({ type: 123 }, "integer");
                }).not.to.throw();
                expect(loggedError).to.be.equal(false);
            } finally {
                adone.logError = logError;
            }
        });

        it("should validate v6 schema", () => {
            const instance = new Validator();
            expect(instance.validateSchema({ contains: { minimum: 2 } })).to.be.equal(true);
            expect(instance.validateSchema({ contains: 2 })).to.be.equal(false);
        });

        it("should use option meta as default meta schema", () => {
            const meta = {
                $schema: "http://json-schema.org/draft-06/schema",
                properties: {
                    myKeyword: { type: "boolean" }
                }
            };
            let instance = new Validator({ meta });
            expect(instance.validateSchema({ myKeyword: true })).to.be.equal(true);
            expect(instance.validateSchema({ myKeyword: 2 })).to.be.equal(false);
            expect(instance.validateSchema({
                $schema: "http://json-schema.org/draft-06/schema",
                myKeyword: 2
            })).to.be.equal(true);

            instance = new Validator();
            expect(instance.validateSchema({ myKeyword: true })).to.be.equal(true);
            expect(instance.validateSchema({ myKeyword: 2 })).to.be.equal(true);
        });
    });

    describe("schemas", () => {
        it("should add schemas from object", () => {
            const instance = new Validator({
                schemas: {
                    int: { type: "integer" },
                    str: { type: "string" }
                }
            });

            expect(instance.validate("int", 123)).to.be.equal(true);
            expect(instance.validate("int", "foo")).to.be.equal(false);
            expect(instance.validate("str", "foo")).to.be.equal(true);
            expect(instance.validate("str", 123)).to.be.equal(false);
        });

        it("should add schemas from array", () => {
            const instance = new Validator({ schemas: [{ id: "int", type: "integer" }, { id: "str", type: "string" }, { id: "obj", properties: { int: { $ref: "int" }, str: { $ref: "str" } } }] });

            expect(instance.validate("obj", { int: 123, str: "foo" })).to.be.equal(true);
            expect(instance.validate("obj", { int: "foo", str: "bar" })).to.be.equal(false);
            expect(instance.validate("obj", { int: 123, str: 456 })).to.be.equal(false);
        });
    });

    describe("format", () => {
        it("should not validate formats if option format == false", () => {
            let instance = new Validator(),
                instanceFF = new Validator({ format: false });

            const schema = { format: "date-time" };
            const invalideDateTime = "06/19/1963 08:30:06 PST";

            expect(instance.validate(schema, invalideDateTime)).to.be.equal(false);
            expect(instanceFF.validate(schema, invalideDateTime)).to.be.equal(true);
        });
    });

    describe("formats", () => {
        it("should add formats from options", () => {
            const instance = new Validator({
                formats: {
                    identifier: /^[a-z_$][a-z0-9_$]*$/i
                }
            });

            const validate = instance.compile({ format: "identifier" });
            expect(validate("Abc1")).to.be.equal(true);
            expect(validate("123")).to.be.equal(false);
            expect(validate(123)).to.be.equal(true);
        });
    });

    describe("missingRefs", () => {
        it("should throw if ref is missing without this option", () => {
            const instance = new Validator();
            expect(() => {
                instance.compile({ $ref: "missing_reference" });
            }).to.throw();
        });

        it('should not throw and pass validation with missingRef === "ignore"', () => {
            testMissingRefsIgnore(new Validator({ missingRefs: "ignore" }));
            testMissingRefsIgnore(new Validator({ missingRefs: "ignore", allErrors: true }));

            function testMissingRefsIgnore(instance) {
                const validate = instance.compile({ $ref: "missing_reference" });
                expect(validate({})).to.be.equal(true);
            }
        });

        it('should not throw and fail validation with missingRef === "fail" if the ref is used', () => {
            testMissingRefsFail(new Validator({ missingRefs: "fail" }));
            testMissingRefsFail(new Validator({ missingRefs: "fail", verbose: true }));
            testMissingRefsFail(new Validator({ missingRefs: "fail", allErrors: true }));
            testMissingRefsFail(new Validator({ missingRefs: "fail", allErrors: true, verbose: true }));

            function testMissingRefsFail(instance) {
                let validate = instance.compile({
                    anyOf: [{ type: "number" }, { $ref: "missing_reference" }]
                });
                expect(validate(123)).to.be.equal(true);
                expect(validate("foo")).to.be.equal(false);

                validate = instance.compile({ $ref: "missing_reference" });
                expect(validate({})).to.be.equal(false);
            }
        });
    });

    describe("uniqueItems", () => {
        it("should not validate uniqueItems with uniqueItems option == false", () => {
            testUniqueItems(new Validator({ uniqueItems: false }));
            testUniqueItems(new Validator({ uniqueItems: false, allErrors: true }));

            function testUniqueItems(instance) {
                const validate = instance.compile({ uniqueItems: true });
                expect(validate([1, 2, 3])).to.be.equal(true);
                expect(validate([1, 1, 1])).to.be.equal(true);
            }
        });
    });

    describe("unicode", () => {
        it("should use String.prototype.length with unicode option == false", () => {
            const instanceUnicode = new Validator();
            testUnicode(new Validator({ unicode: false }));
            testUnicode(new Validator({ unicode: false, allErrors: true }));

            function testUnicode(instance) {
                let validateWithUnicode = instanceUnicode.compile({ minLength: 2 });
                let validate = instance.compile({ minLength: 2 });

                expect(validateWithUnicode("😀")).to.be.equal(false);
                expect(validate("😀")).to.be.equal(true);

                validateWithUnicode = instanceUnicode.compile({ maxLength: 1 });
                validate = instance.compile({ maxLength: 1 });

                expect(validateWithUnicode("😀")).to.be.equal(true);
                expect(validate("😀")).to.be.equal(false);
            }
        });
    });

    describe("verbose", () => {
        it("should add schema, parentSchema and data to errors with verbose option == true", () => {
            testVerbose(new Validator({ verbose: true }));
            testVerbose(new Validator({ verbose: true, allErrors: true }));

            function testVerbose(instance) {
                const schema = { properties: { foo: { minimum: 5 } } };
                const validate = instance.compile(schema);

                const data = { foo: 3 };
                expect(validate(data)).to.be.equal(false);

                expect(validate.errors).to.have.lengthOf(1);

                const err = validate.errors[0];

                expect(err.schema).to.be.equal(5);
                expect(err.parentSchema).to.be.deep.equal({ minimum: 5 });
                expect(err.parentSchema).to.be.equal(schema.properties.foo); // by reference

                expect(err.data).to.be.equal(3);
            }
        });
    });

    describe("multipleOfPrecision", () => {
        it("should allow for some deviation from 0 when validating multipleOf with value < 1", () => {
            test(new Validator({ multipleOfPrecision: 7 }));
            test(new Validator({ multipleOfPrecision: 7, allErrors: true }));

            function test(instance) {
                let schema = { multipleOf: 0.01 };
                let validate = instance.compile(schema);

                expect(validate(4.18)).to.be.equal(true);
                expect(validate(4.181)).to.be.equal(false);

                schema = { multipleOf: 0.0000001 };
                validate = instance.compile(schema);

                expect(validate(53.198098)).to.be.equal(true);
                expect(validate(53.1980981)).to.be.equal(true);
                expect(validate(53.19809811)).to.be.equal(false);
            }
        });
    });

    describe("useDefaults", () => {
        it("should replace undefined property with default value", () => {
            const instances = getInstances({
                allErrors: true,
                loopRequired: 3
            }, { useDefaults: true });

            instances.forEach(test);

            function test(instance) {
                const schema = {
                    properties: {
                        foo: { type: "string", default: "abc" },
                        bar: { type: "number", default: 1 },
                        baz: { type: "boolean", default: false },
                        nil: { type: "null", default: null },
                        obj: { type: "object", default: {} },
                        arr: { type: "array", default: [] }
                    },
                    required: ["foo", "bar", "baz", "nil", "obj", "arr"],
                    minProperties: 6
                };

                const validate = instance.compile(schema);

                let data = {};
                expect(validate(data)).to.be.equal(true);
                expect(data).to.be.deep.equal({ foo: "abc", bar: 1, baz: false, nil: null, obj: {}, arr: [] });

                data = { foo: "foo", bar: 2, obj: { test: true } };
                expect(validate(data)).to.be.equal(true);
                expect(data).to.be.deep.equal({ foo: "foo", bar: 2, baz: false, nil: null, obj: { test: true }, arr: [] });
            }
        });

        it("should replace undefined item with default value", () => {
            test(new Validator({ useDefaults: true }));
            test(new Validator({ useDefaults: true, allErrors: true }));

            function test(instance) {
                const schema = {
                    items: [{ type: "string", default: "abc" }, { type: "number", default: 1 }, { type: "boolean", default: false }],
                    minItems: 3
                };

                const validate = instance.compile(schema);

                let data = [];
                expect(validate(data)).to.be.equal(true);
                expect(data).to.be.deep.equal(["abc", 1, false]);

                data = ["foo"];
                expect(validate(data)).to.be.equal(true);
                expect(data).to.be.deep.equal(["foo", 1, false]);

                data = ["foo", 2, "false"];
                expect(validate(data)).to.be.equal(false);

                expect(validate.errors).to.have.lengthOf(1);

                expect(data).to.be.deep.equal(["foo", 2, "false"]);
            }
        });

        describe("useDefaults: by value / by reference", () => {
            describe("using by value", () => {
                it("should NOT modify underlying defaults when modifying validated data", () => {
                    test("value", new Validator({ useDefaults: true }));
                    test("value", new Validator({ useDefaults: true, allErrors: true }));
                });
            });

            describe("using by reference", () => {
                it("should modify underlying defaults when modifying validated data", () => {
                    test("reference", new Validator({ useDefaults: "shared" }));
                    test("reference", new Validator({ useDefaults: "shared", allErrors: true }));
                });
            });

            function test(useDefaultsMode, instance) {
                const schema = {
                    properties: {
                        items: {
                            type: "array",
                            default: ["a-default"]
                        }
                    }
                };

                const validate = instance.compile(schema);

                const data = {};
                expect(validate(data)).to.be.equal(true);
                expect(data.items).to.be.deep.equal(["a-default"]);

                data.items.push("another-value");
                expect(data.items).to.be.deep.equal(["a-default", "another-value"]);

                const data2 = {};
                expect(validate(data2)).to.be.equal(true);

                if (useDefaultsMode === "reference") {
                    expect(data2.items).to.be.deep.equal(["a-default", "another-value"]);
                } else if (useDefaultsMode === "value") {
                    expect(data2.items).to.be.deep.equal(["a-default"]);
                } else {
                    throw new Error("unknown useDefaults mode");
                }
            }
        });
    });

    describe("addUsedSchema", () => {
        [true, undefined].forEach((optionValue) => {
            describe(`= ${optionValue}`, () => {
                let instance;

                beforeEach(() => {
                    instance = new Validator({ addUsedSchema: optionValue });
                });

                describe("compile and validate", () => {
                    it("should add schema", () => {
                        let schema = { id: "str", type: "string" };
                        const validate = instance.compile(schema);
                        expect(validate("abc")).to.be.equal(true);
                        expect(validate(1)).to.be.equal(false);
                        expect(instance.getSchema("str")).to.be.equal(validate);

                        schema = { id: "int", type: "integer" };
                        expect(instance.validate(schema, 1)).to.be.equal(true);
                        expect(instance.validate(schema, "abc")).to.be.equal(false);

                        expect(instance.getSchema("int")).to.be.a("function");
                    });

                    it("should throw with duplicate ID", () => {
                        instance.compile({ id: "str", type: "string" });
                        expect(() => {
                            instance.compile({ id: "str", minLength: 2 });
                        }).to.throw();

                        const schema = { id: "int", type: "integer" };
                        const schema2 = { id: "int", minimum: 0 };
                        expect(instance.validate(schema, 1)).to.be.equal(true);

                        expect(() => {
                            instance.validate(schema2, 1);
                        }).to.throw();
                    });
                });
            });
        });

        describe("= false", () => {
            let instance;

            beforeEach(() => {
                instance = new Validator({ addUsedSchema: false });
            });

            describe("compile and validate", () => {
                it("should NOT add schema", () => {
                    let schema = { id: "str", type: "string" };
                    const validate = instance.compile(schema);
                    expect(validate("abc")).to.be.equal(true);
                    expect(validate(1)).to.be.equal(false);

                    expect(instance.getSchema("str")).to.be.equal(undefined);

                    schema = { id: "int", type: "integer" };
                    expect(instance.validate(schema, 1)).to.be.equal(true);
                    expect(instance.validate(schema, "abc")).to.be.equal(false);

                    expect(instance.getSchema("int")).to.be.equal(undefined);
                });

                it("should NOT throw with duplicate ID", () => {
                    instance.compile({ id: "str", type: "string" });
                    expect(() => {
                        instance.compile({ id: "str", minLength: 2 });
                    }).not.to.throw();

                    const schema = { id: "int", type: "integer" };
                    const schema2 = { id: "int", minimum: 0 };
                    expect(instance.validate(schema, 1)).to.be.equal(true);

                    expect(() => {
                        expect(instance.validate(schema2, 1)).to.be.equal(true);
                    }).not.to.throw();
                });
            });
        });
    });

    describe("passContext", () => {
        let instance, contexts;

        beforeEach(() => {
            contexts = [];
        });

        describe("= true", () => {
            it("should pass this value as context to custom keyword validation function", () => {
                const validate = getValidate(true);
                const self = {};
                validate.call(self, {});
                expect(contexts).to.have.lengthOf(4);

                contexts.forEach((ctx) => {
                    expect(ctx).to.be.equal(self);
                });
            });
        });

        describe("= false", () => {
            it("should pass instance as context to custom keyword validation function", () => {
                const validate = getValidate(false);
                const self = {};
                validate.call(self, {});
                expect(contexts).to.have.lengthOf(4);

                contexts.forEach((ctx) => {
                    expect(ctx).to.be.equal(instance);
                });
            });
        });

        function getValidate(passContext) {
            instance = new Validator({ passContext, inlineRefs: false });
            instance.addKeyword("testValidate", { validate: storeContext });
            instance.addKeyword("testCompile", { compile: compileTestValidate });

            const schema = {
                definitions: {
                    test1: {
                        testValidate: true,
                        testCompile: true
                    },
                    test2: {
                        allOf: [{ $ref: "#/definitions/test1" }]
                    }
                },
                allOf: [{ $ref: "#/definitions/test1" }, { $ref: "#/definitions/test2" }]
            };

            return instance.compile(schema);
        }

        function storeContext() {
            contexts.push(this);
            return true;
        }

        function compileTestValidate() {
            return storeContext;
        }
    });

    describe("allErrors", () => {
        it('should be disabled inside "not" keyword', () => {
            test(new Validator(), false);
            test(new Validator({ allErrors: true }), true);

            function test(instance, allErrors) {
                let format1called = false,
                    format2called = false;

                instance.addFormat("format1", () => {
                    format1called = true;
                    return false;
                });

                instance.addFormat("format2", () => {
                    format2called = true;
                    return false;
                });

                const schema1 = {
                    allOf: [{ format: "format1" }, { format: "format2" }]
                };

                expect(instance.validate(schema1, "abc")).to.be.equal(false);

                expect(instance.errors).to.have.lengthOf(allErrors ? 2 : 1);

                expect(format1called).to.be.equal(true);
                expect(format2called).to.be.equal(allErrors);

                const schema2 = {
                    not: schema1
                };

                format1called = format2called = false;
                expect(instance.validate(schema2, "abc")).to.be.equal(true);

                expect(instance.errors).to.be.equal(null);
                expect(format1called).to.be.equal(true);
                expect(format2called).to.be.equal(false);
            }
        });
    });

    describe("extendRefs", () => {
        describe("= true", () => {
            it("should allow extending $ref with other keywords", () => {
                test(new Validator({ extendRefs: true }), true);
            });

            it("should NOT log warning if extendRefs is true", () => {
                testWarning(new Validator({ extendRefs: true }));
            });
        });

        describe('= "ignore" and default', () => {
            it("should ignore other keywords when $ref is used", () => {
                test(new Validator());
                test(new Validator({ extendRefs: "ignore" }), false);
            });

            it("should log warning when other keywords are used with $ref", () => {
                testWarning(new Validator(), /keywords\signored/);
                testWarning(new Validator({ extendRefs: "ignore" }), /keywords\signored/);
            });
        });

        describe('= "fail"', () => {
            it("should fail schema compilation if other keywords are used with $ref", () => {
                testFail(new Validator({ extendRefs: "fail" }));

                function testFail(instance) {
                    expect(() => {
                        const schema = {
                            definitions: {
                                int: { type: "integer" }
                            },
                            $ref: "#/definitions/int",
                            minimum: 10
                        };
                        instance.compile(schema);
                    }).to.throw();

                    expect(() => {
                        const schema = {
                            definitions: {
                                int: { type: "integer" }
                            },
                            allOf: [{ $ref: "#/definitions/int" }, { minimum: 10 }]
                        };
                        instance.compile(schema);
                    }).not.to.throw();
                }
            });
        });

        const test = (instance, shouldExtendRef) => {
            let schema = {
                definitions: {
                    int: { type: "integer" }
                },
                $ref: "#/definitions/int",
                minimum: 10
            };

            let validate = instance.compile(schema);
            expect(validate(10)).to.be.equal(true);
            expect(validate(1)).to.be.equal(!shouldExtendRef);

            schema = {
                definitions: {
                    int: { type: "integer" }
                },
                type: "object",
                properties: {
                    foo: {
                        $ref: "#/definitions/int",
                        minimum: 10
                    },
                    bar: {
                        allOf: [{ $ref: "#/definitions/int" }, { minimum: 10 }]
                    }
                }
            };

            validate = instance.compile(schema);
            expect(validate({ foo: 10, bar: 10 })).to.be.equal(true);
            expect(validate({ foo: 1, bar: 10 })).to.be.equal(!shouldExtendRef);
            expect(validate({ foo: 10, bar: 1 })).to.be.equal(false);
        };

        const testWarning = (instance, msgPattern) => {
            let oldConsole;
            try {
                oldConsole = adone.logWarn;
                let consoleMsg;
                adone.logWarn = function () {
                    consoleMsg = Array.prototype.join.call(arguments, " ");
                };

                const schema = {
                    definitions: {
                        int: { type: "integer" }
                    },
                    $ref: "#/definitions/int",
                    minimum: 10
                };

                instance.compile(schema);
                if (msgPattern) {
                    expect(consoleMsg).to.match(msgPattern);
                } else {
                    expect(consoleMsg).not.to.be.ok();
                }
            } finally {
                adone.logWarn = oldConsole;
            }
        };
    });

    describe("sourceCode", () => {
        describe("= true", () => {
            it("should add source.code property", () => {
                test(new Validator({ sourceCode: true }));

                function test(instance) {
                    const validate = instance.compile({ type: "number" });
                    expect(validate.source.code).to.be.a("string");
                }
            });
        });

        describe("= false and default", () => {
            it("should not add source and sourceCode properties", () => {
                test(new Validator());
                test(new Validator({ sourceCode: false }));

                function test(instance) {
                    const validate = instance.compile({ type: "number" });
                    expect(validate.source).not.to.be.ok();
                    expect(validate.sourceCode).not.to.be.ok();
                }
            });
        });
    });

    describe("unknownFormats", () => {
        describe("= true (default)", () => {
            it("should fail schema compilation if unknown format is used", () => {
                test(new Validator());
                test(new Validator({ unknownFormats: true }));

                function test(instance) {
                    expect(() => {
                        instance.compile({ format: "unknown" });
                    }).to.throw();
                }
            });

            it("should fail validation if unknown format is used via $data", () => {
                test(new Validator({ $data: true }));
                test(new Validator({ $data: true, unknownFormats: true }));

                function test(instance) {
                    const validate = instance.compile({
                        properties: {
                            foo: { format: { $data: "1/bar" } },
                            bar: { type: "string" }
                        }
                    });

                    expect(validate({ foo: 1, bar: "unknown" })).to.be.equal(false);
                    expect(validate({ foo: "2016-10-16", bar: "date" })).to.be.equal(true);
                    expect(validate({ foo: "20161016", bar: "date" })).to.be.equal(false);
                    expect(validate({ foo: "20161016" })).to.be.equal(true);
                    expect(validate({ foo: "2016-10-16", bar: "unknown" })).to.be.equal(false);
                }
            });
        });

        describe('= "ignore (default before 5.0.0)"', () => {
            it("should pass schema compilation and be valid if unknown format is used", () => {
                test(new Validator({ unknownFormats: "ignore" }));

                function test(instance) {
                    const validate = instance.compile({ format: "unknown" });
                    expect(validate("anything")).to.be.equal(true);
                }
            });

            it("should be valid if unknown format is used via $data", () => {
                test(new Validator({ $data: true, unknownFormats: "ignore" }));

                function test(instance) {
                    const validate = instance.compile({
                        properties: {
                            foo: { format: { $data: "1/bar" } },
                            bar: { type: "string" }
                        }
                    });

                    expect(validate({ foo: 1, bar: "unknown" })).to.be.equal(true);
                    expect(validate({ foo: "2016-10-16", bar: "date" })).to.be.equal(true);
                    expect(validate({ foo: "20161016", bar: "date" })).to.be.equal(false);
                    expect(validate({ foo: "20161016" })).to.be.equal(true);
                    expect(validate({ foo: "2016-10-16", bar: "unknown" })).to.be.equal(true);
                }
            });
        });

        describe("= [String]", () => {
            it("should pass schema compilation and be valid if whitelisted unknown format is used", () => {
                test(new Validator({ unknownFormats: ["allowed"] }));

                function test(instance) {
                    const validate = instance.compile({ format: "allowed" });
                    expect(validate("anything")).to.be.equal(true);

                    expect(() => {
                        instance.compile({ format: "unknown" });
                    }).to.throw();
                }
            });

            it("should be valid if whitelisted unknown format is used via $data", () => {
                test(new Validator({ $data: true, unknownFormats: ["allowed"] }));

                function test(instance) {
                    const validate = instance.compile({
                        properties: {
                            foo: { format: { $data: "1/bar" } },
                            bar: { type: "string" }
                        }
                    });

                    expect(validate({ foo: 1, bar: "allowed" })).to.be.equal(true);
                    expect(validate({ foo: 1, bar: "unknown" })).to.be.equal(false);
                    expect(validate({ foo: "2016-10-16", bar: "date" })).to.be.equal(true);
                    expect(validate({ foo: "20161016", bar: "date" })).to.be.equal(false);
                    expect(validate({ foo: "20161016" })).to.be.equal(true);
                    expect(validate({ foo: "2016-10-16", bar: "allowed" })).to.be.equal(true);
                    expect(validate({ foo: "2016-10-16", bar: "unknown" })).to.be.equal(false);
                }
            });
        });
    });

    describe("processCode", () => {
        it("should process generated code", () => {
            const instance = new Validator();
            let validate = instance.compile({ type: "string" });
            expect(validate.toString().split("\n").length).to.be.equal(1);

            const instancePC = new Validator({ processCode: (x) => x.replace(/;/g, ";\n") });
            validate = instancePC.compile({ type: "string" });
            expect(validate.toString().split("\n")).length.to.be.gt(1);
            expect(validate("foo")).to.be.equal(true);
            expect(validate(1)).to.be.equal(false);
        });
    });

    describe("serialize", () => {
        let serializeCalled;

        it("should use custom function to serialize schema to string", () => {
            serializeCalled = undefined;
            const instance = new Validator({ serialize });
            instance.addSchema({ type: "string" });
            expect(serializeCalled).to.be.equal(true);
        });

        function serialize(schema) {
            serializeCalled = true;
            return JSON.stringify(schema);
        }
    });

    describe("patternGroups without draft-06 meta-schema", () => {
        it("should use default meta-schema", () => {
            const instance = new Validator({
                patternGroups: true,
                meta: refs["json-schema-draft-04"]
            });

            instance.compile({
                patternGroups: {
                    "^foo": {
                        schema: { type: "number" },
                        minimum: 1
                    }
                }
            });

            expect(() => {
                instance.compile({
                    patternGroups: {
                        "^foo": {
                            schema: { type: "wrong_type" },
                            minimum: 1
                        }
                    }
                });
            }).to.throw();
        });

        it("should not use meta-schema if not available", () => {
            const instance = new Validator({
                patternGroups: true,
                meta: false
            });

            instance.compile({
                patternGroups: {
                    "^foo": {
                        schema: { type: "number" },
                        minimum: 1
                    }
                }
            });

            instance.compile({
                patternGroups: {
                    "^foo": {
                        schema: { type: "wrong_type" },
                        minimum: 1
                    }
                }
            });
        });
    });

    describe("schemaId", () => {
        describe("= undefined (default)", () => {
            it("should throw if both id and $id are available and different", () => {
                const instance = new Validator();

                instance.compile({
                    id: "mySchema",
                    $id: "mySchema"
                });

                expect(() => {
                    instance.compile({
                        id: "mySchema1",
                        $id: "mySchema2"
                    });
                }).to.throw();
            });
        });

        describe('= "id"', () => {
            it("should use id and ignore $id", () => {
                const instance = new Validator({ schemaId: "id" });

                instance.addSchema({ id: "mySchema1", type: "string" });
                let validate = instance.getSchema("mySchema1");
                expect(validate("foo")).to.be.equal(true);
                expect(validate(1)).to.be.equal(false);

                validate = instance.compile({ $id: "mySchema2", type: "string" });
                expect(instance.getSchema("mySchema2")).not.to.be.ok();
            });
        });

        describe('= "$id"', () => {
            it("should use $id and ignore id", () => {
                const instance = new Validator({ schemaId: "$id" });

                instance.addSchema({ $id: "mySchema1", type: "string" });
                let validate = instance.getSchema("mySchema1");
                expect(validate("foo")).to.be.equal(true);
                expect(validate(1)).to.be.equal(false);

                validate = instance.compile({ id: "mySchema2", type: "string" });
                expect(instance.getSchema("mySchema2")).not.to.be.ok();
            });
        });
    });


    describe("logger", () => {
        /**
         * The logger option tests are based on the meta scenario which writes into the logger.warn
         */

        const origConsoleWarn = adone.logWarn;
        let consoleCalled;

        beforeEach(() => {
            consoleCalled = false;
            adone.logWarn = function () {
                consoleCalled = true;
            };
        });

        afterEach(() => {
            adone.logWarn = origConsoleWarn;
        });

        it("no custom logger is given - global console should be used", () => {
            const instance = new Validator({
                meta: false
            });

            instance.compile({
                type: "number",
                minimum: 1
            });

            assert.equal(consoleCalled, true);
        });

        it("custom logger is an object - logs should only report to it", () => {
            let loggerCalled = false;

            const log = () => {
                loggerCalled = true;
            };

            const logger = {
                warn: log,
                log,
                error: log
            };

            const instance = new Validator({
                meta: false,
                logger
            });

            instance.compile({
                type: "number",
                minimum: 1
            });

            assert.equal(loggerCalled, true);
            assert.equal(consoleCalled, false);
        });

        it("logger option is false - no logs should be reported", () => {
            const instance = new Validator({
                meta: false,
                logger: false
            });

            instance.compile({
                type: "number",
                minimum: 1
            });

            assert.equal(consoleCalled, false);
        });

        it("logger option is an object without required methods - an error should be thrown", () => {
            expect(() => {
                new Validator({
                    meta: false,
                    logger: {}
                });
            }).to.throw(Error, /logger must implement log, warn and error methods/);
        });
    });
});
