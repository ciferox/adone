describe("schema", "issues", () => {
    const { schema: { Validator, refs } } = adone;

    describe("issue #8: schema with shared references", () => {
        it("should be supported by addSchema", spec("addSchema"));

        it("should be supported by compile", spec("compile"));

        function spec(method) {
            return function () {
                const instance = new Validator();

                const propertySchema = {
                    type: "string",
                    maxLength: 4
                };

                const schema = {
                    id: "obj.json#",
                    type: "object",
                    properties: {
                        foo: propertySchema,
                        bar: propertySchema
                    }
                };

                instance[method](schema);

                let result = instance.validate("obj.json#", { foo: "abc", bar: "def" });
                expect(result).to.be.equal(true);


                result = instance.validate("obj.json#", { foo: "abcde", bar: "fghg" });
                expect(result).to.be.equal(false);
                expect(instance.errors).to.have.lengthOf(1);
            };
        }
    });

    describe('issue #50: references with "definitions"', () => {
        it("should be supported by addSchema", spec("addSchema"));

        it("should be supported by compile", spec("addSchema"));

        function spec(method) {
            return function () {
                let result;

                const instance = new Validator();

                instance[method]({
                    id: "http://example.com/test/person.json#",
                    definitions: {
                        name: { type: "string" }
                    },
                    type: "object",
                    properties: {
                        name: { $ref: "#/definitions/name" }
                    }
                });

                instance[method]({
                    id: "http://example.com/test/employee.json#",
                    type: "object",
                    properties: {
                        person: { $ref: "/test/person.json#" },
                        role: { type: "string" }
                    }
                });

                result = instance.validate("http://example.com/test/employee.json#", {
                    person: {
                        name: "Alice"
                    },
                    role: "Programmer"
                });

                expect(result).to.be.equal(true);

                expect(instance.errors).to.be.equal(null);
            };
        }
    });

    describe("issue #182, NaN validation", () => {
        it("should not pass minimum/maximum validation", () => {
            testNaN({ minimum: 1 }, false);
            testNaN({ maximum: 1 }, false);
        });

        it("should pass type: number validation", () => {
            testNaN({ type: "number" }, true);
        });

        it("should not pass type: integer validation", () => {
            testNaN({ type: "integer" }, false);
        });

        function testNaN(schema, NaNisValid) {
            const instance = new Validator();
            const validate = instance.compile(schema);
            expect(validate(NaN)).to.be.equal(NaNisValid);
        }
    });

    describe("issue #204, options schemas and $data used together", () => {
        it("should use v5 metaschemas by default", () => {
            const instance = new Validator({
                schemas: [{ id: "str", type: "string" }],
                $data: true
            });

            const schema = { const: 42 };
            const validate = instance.compile(schema);

            expect(validate(42)).to.be.equal(true);
            expect(validate(43)).to.be.equal(false);
            expect(instance.validate("str", "foo")).to.be.equal(true);
            expect(instance.validate("str", 42)).to.be.equal(false);
        });
    });

    describe("issue #181, custom keyword is not validated in allErrors mode if there were previous error", () => {
        it("should validate custom keyword that doesn't create errors", () => {
            testCustomKeywordErrors({
                type: "object",
                errors: true,
                validate: function v() /* value */ {
                    return false;
                }
            });
        });

        it("should validate custom keyword that creates errors", () => {
            testCustomKeywordErrors({
                type: "object",
                errors: true,
                validate: function v() /* value */ {
                    v.errors = v.errors || [];
                    v.errors.push({
                        keyword: "alwaysFails",
                        message: "alwaysFails error",
                        params: {
                            keyword: "alwaysFails"
                        }
                    });

                    return false;
                }
            });
        });

        function testCustomKeywordErrors(def) {
            const instance = new Validator({ allErrors: true });

            instance.addKeyword("alwaysFails", def);

            const schema = {
                required: ["foo"],
                alwaysFails: true
            };

            const validate = instance.compile(schema);

            expect(validate({ foo: 1 })).to.be.equal(false);
            expect(validate.errors).to.have.lengthOf(1);
            expect(validate.errors[0].keyword).to.be.equal("alwaysFails");
            expect(validate({})).to.be.equal(false);
            expect(validate.errors).to.have.lengthOf(2);
            expect(validate.errors[0].keyword).to.be.equal("required");
            expect(validate.errors[1].keyword).to.be.equal("alwaysFails");
        }
    });

    describe("issue #210, mutual recursive $refs that are schema fragments", () => {
        it("should compile and validate schema when one ref is fragment", () => {
            const instance = new Validator();

            instance.addSchema({
                id: "foo",
                definitions: {
                    bar: {
                        properties: {
                            baz: {
                                anyOf: [{ enum: [42] }, { $ref: "boo" }]
                            }
                        }
                    }
                }
            });

            instance.addSchema({
                id: "boo",
                type: "object",
                required: ["quux"],
                properties: {
                    quux: { $ref: "foo#/definitions/bar" }
                }
            });

            const validate = instance.compile({ $ref: "foo#/definitions/bar" });

            expect(validate({ baz: { quux: { baz: 42 } } })).to.be.equal(true);
            expect(validate({ baz: { quux: { baz: "foo" } } })).to.be.equal(false);
        });

        it("should compile and validate schema when both refs are fragments", () => {
            const instance = new Validator();

            instance.addSchema({
                id: "foo",
                definitions: {
                    bar: {
                        properties: {
                            baz: {
                                anyOf: [{ enum: [42] }, { $ref: "boo#/definitions/buu" }]
                            }
                        }
                    }
                }
            });

            instance.addSchema({
                id: "boo",
                definitions: {
                    buu: {
                        type: "object",
                        required: ["quux"],
                        properties: {
                            quux: { $ref: "foo#/definitions/bar" }
                        }
                    }
                }
            });

            const validate = instance.compile({ $ref: "foo#/definitions/bar" });

            expect(validate({ baz: { quux: { baz: 42 } } })).to.be.equal(true);
            expect(validate({ baz: { quux: { baz: "foo" } } })).to.be.equal(false);
        });
    });

    describe("issue #240, mutually recursive fragment refs reference a common schema", () => {
        const apiSchema = {
            $schema: "http://json-schema.org/draft-06/schema#",
            id: "schema://api.schema#",
            resource: {
                id: "#resource",
                properties: {
                    id: { type: "string" }
                }
            },
            resourceIdentifier: {
                id: "#resource_identifier",
                properties: {
                    id: { type: "string" },
                    type: { type: "string" }
                }
            }
        };

        const domainSchema = {
            $schema: "http://json-schema.org/draft-06/schema#",
            id: "schema://domain.schema#",
            properties: {
                data: {
                    oneOf: [{ $ref: "schema://library.schema#resource_identifier" }, { $ref: "schema://catalog_item.schema#resource_identifier" }]
                }
            }
        };

        it("should compile and validate schema when one ref is fragment", () => {
            const instance = new Validator();

            const librarySchema = {
                $schema: "http://json-schema.org/draft-06/schema#",
                id: "schema://library.schema#",
                properties: {
                    name: { type: "string" },
                    links: {
                        properties: {
                            catalogItems: {
                                type: "array",
                                items: { $ref: "schema://catalog_item_resource_identifier.schema#" }
                            }
                        }
                    }
                },
                definitions: {
                    resource_identifier: {
                        id: "#resource_identifier",
                        allOf: [{
                            properties: {
                                type: {
                                    type: "string",
                                    enum: ["Library"]
                                }
                            }
                        }, { $ref: "schema://api.schema#resource_identifier" }]
                    }
                }
            };

            const catalogItemSchema = {
                $schema: "http://json-schema.org/draft-06/schema#",
                id: "schema://catalog_item.schema#",
                properties: {
                    name: { type: "string" },
                    links: {
                        properties: {
                            library: { $ref: "schema://library.schema#resource_identifier" }
                        }
                    }
                },
                definitions: {
                    resource_identifier: {
                        id: "#resource_identifier",
                        allOf: [{
                            properties: {
                                type: {
                                    type: "string",
                                    enum: ["CatalogItem"]
                                }
                            }
                        }, { $ref: "schema://api.schema#resource_identifier" }]
                    }
                }
            };

            const catalogItemResourceIdentifierSchema = {
                $schema: "http://json-schema.org/draft-06/schema#",
                id: "schema://catalog_item_resource_identifier.schema#",
                allOf: [{
                    properties: {
                        type: {
                            type: "string",
                            enum: ["CatalogItem"]
                        }
                    }
                }, {
                    $ref: "schema://api.schema#resource_identifier"
                }]
            };

            instance.addSchema(librarySchema);
            instance.addSchema(catalogItemSchema);
            instance.addSchema(catalogItemResourceIdentifierSchema);
            instance.addSchema(apiSchema);

            const validate = instance.compile(domainSchema);
            testSchema(validate);
        });

        it("should compile and validate schema when both refs are fragments", () => {
            const instance = new Validator();

            const librarySchema = {
                $schema: "http://json-schema.org/draft-06/schema#",
                id: "schema://library.schema#",
                properties: {
                    name: { type: "string" },
                    links: {
                        properties: {
                            catalogItems: {
                                type: "array",
                                items: { $ref: "schema://catalog_item.schema#resource_identifier" }
                            }
                        }
                    }
                },
                definitions: {
                    resource_identifier: {
                        id: "#resource_identifier",
                        allOf: [{
                            properties: {
                                type: {
                                    type: "string",
                                    enum: ["Library"]
                                }
                            }
                        }, { $ref: "schema://api.schema#resource_identifier" }]
                    }
                }
            };

            const catalogItemSchema = {
                $schema: "http://json-schema.org/draft-06/schema#",
                id: "schema://catalog_item.schema#",
                properties: {
                    name: { type: "string" },
                    links: {
                        properties: {
                            library: { $ref: "schema://library.schema#resource_identifier" }
                        }
                    }
                },
                definitions: {
                    resource_identifier: {
                        id: "#resource_identifier",
                        allOf: [{
                            properties: {
                                type: {
                                    type: "string",
                                    enum: ["CatalogItem"]
                                }
                            }
                        }, { $ref: "schema://api.schema#resource_identifier" }]
                    }
                }
            };

            instance.addSchema(librarySchema);
            instance.addSchema(catalogItemSchema);
            instance.addSchema(apiSchema);

            const validate = instance.compile(domainSchema);
            testSchema(validate);
        });

        function testSchema(validate) {
            expect(validate({ data: { type: "Library", id: "123" } })).to.be.equal(true);
            expect(validate({ data: { type: "Library", id: 123 } })).to.be.equal(false);
            expect(validate({ data: { type: "CatalogItem", id: "123" } })).to.be.equal(true);
            expect(validate({ data: { type: "CatalogItem", id: 123 } })).to.be.equal(false);
            expect(validate({ data: { type: "Foo", id: "123" } })).to.be.equal(false);
        }
    });

    describe("issue #259, support validating [meta-]schemas against themselves", () => {
        it('should add schema before validation if "id" is the same as "$schema"', () => {
            const instance = new Validator();
            instance.addMetaSchema(refs["json-schema-draft-04"]);
            const hyperSchema = require("./remotes/hyper_schema.json");
            instance.addMetaSchema(hyperSchema);
        });
    });

    describe.skip("issue #273, schemaPath in error in referenced schema", () => {
        it("should have canonic reference with hash after file name", () => {
            test(new Validator());
            test(new Validator({ inlineRefs: false }));

            function test(instance) {
                const schema = {
                    properties: {
                        a: { $ref: "int" }
                    }
                };

                const referencedSchema = {
                    id: "int",
                    type: "integer"
                };

                instance.addSchema(referencedSchema);
                const validate = instance.compile(schema);

                expect(validate({ a: "foo" })).to.be.equal(false);
                expect(validate.errors[0].schemaPath).to.be.equal("int#/type");
            }
        });
    });

    describe("issue #342, support uniqueItems with some non-JSON objects", () => {
        let validate;

        before(() => {
            const instance = new Validator();
            validate = instance.compile({ uniqueItems: true });
        });

        it("should allow different RegExps", () => {
            expect(validate([/foo/, /bar/])).to.be.equal(true);
            expect(validate([/foo/ig, /foo/gi])).to.be.equal(false);
            expect(validate([/foo/, {}])).to.be.equal(true);
        });

        it("should allow different Dates", () => {
            expect(validate([new Date("2016-11-11"), new Date("2016-11-12")])).to.be.equal(true);
            expect(validate([new Date("2016-11-11"), new Date("2016-11-11")])).to.be.equal(false);
            expect(validate([new Date("2016-11-11"), {}])).to.be.equal(true);
        });

        it("should allow undefined properties", () => {
            expect(validate([{}, { foo: undefined }])).to.be.equal(true);
            expect(validate([{ foo: undefined }, {}])).to.be.equal(true);
            expect(validate([{ foo: undefined }, { bar: undefined }])).to.be.equal(true);
            expect(validate([{ foo: undefined }, { foo: undefined }])).to.be.equal(false);
        });
    });

    describe("issue #388, code clean-up not working", () => {
        it("should remove assignement to rootData if it is not used", () => {
            const instance = new Validator();
            const validate = instance.compile({
                type: "object",
                properties: {
                    foo: { type: "string" }
                }
            });
            const code = validate.toString();
            expect(code.match(/rootData/g).length).to.be.equal(1);
        });

        it("should remove assignement to errors if they are not used", () => {
            const instance = new Validator();
            const validate = instance.compile({
                type: "object"
            });
            const code = validate.toString();
            expect(code.match(/[^\.]errors|vErrors/g)).to.be.equal(null);
        });
    });

    describe("issue #485, order of type validation", () => {
        it("should validate types befor keywords", () => {
            const instance = new Validator({ allErrors: true });
            const validate = instance.compile({
                type: ["integer", "string"],
                required: ["foo"],
                minimum: 2
            });

            expect(validate(2)).to.be.true();
            expect(validate("foo")).to.be.true();

            const checkErrors = (expectedErrs) => {
                expect(validate.errors).to.have.lengthOf(expectedErrs.length);
                expectedErrs.forEach((keyword, i) => {
                    expect(validate.errors[i].keyword).to.be.equal(keyword);
                });
            };

            expect(validate(1.5)).to.be.false();
            checkErrors(["type", "minimum"]);

            expect(validate({})).to.be.false();
            checkErrors(["type", "required"]);

        });
    });

    describe('issue #521, incorrect warning with "id" property', () => {
        it("should not log warning", () => {
            const instance = new Validator({ schemaId: "$id" });
            const consoleWarn = console.warn;
            console.warn = function () {
                throw new Error("should not log warning");
            };

            try {
                instance.compile({
                    $id: "http://example.com/schema.json",
                    type: "object",
                    properties: {
                        id: { type: "string" }
                    },
                    required: ["id"]
                });
            } finally {
                console.warn = consoleWarn;
            }
        });
    });

    describe('issue #533, throwing missing ref error with option missingRefs: "ignore"', () => {
        const schema = {
            type: "object",
            properties: {
                foo: { $ref: "#/definitions/missing" },
                bar: { $ref: "#/definitions/missing" }
            }
        };

        it("should pass validation without throwing error", () => {
            const instance = new Validator({ missingRefs: "ignore" });
            const validate = instance.compile(schema);
            expect(validate({ foo: "anything" })).to.be.true();
            expect(validate({ foo: "anything", bar: "whatever" })).to.be.true();
        });

        it("should throw error during schema compilation with option missingRefs: true", () => {
            const instance = new Validator();
            expect(() => {
                instance.compile(schema);
            }).throw();
        });
    });

});
