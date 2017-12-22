import getInstances from "./get_instances";

describe("schema", "resolve", () => {
    const { schema: { Validator } } = adone;

    let instances;

    beforeEach(() => {
        instances = getInstances({
            allErrors: true,
            verbose: true,
            inlineRefs: false
        });
    });

    describe("resolve.ids method", () => {
        it("should resolve ids in schema", () => {
            // Example from http://json-schema.org/latest/json-schema-core.html#anchor29
            const schema = {
                id: "http://x.y.z/rootschema.json#",
                schema1: {
                    id: "#foo",
                    description: "schema1",
                    type: "integer"
                },
                schema2: {
                    id: "otherschema.json",
                    description: "schema2",
                    nested: {
                        id: "#bar",
                        description: "nested",
                        type: "string"
                    },
                    alsonested: {
                        id: "t/inner.json#a",
                        description: "alsonested",
                        type: "boolean"
                    }
                },
                schema3: {
                    id: "some://where.else/completely#",
                    description: "schema3",
                    type: "null"
                },
                properties: {
                    foo: { $ref: "#foo" },
                    bar: { $ref: "otherschema.json#bar" },
                    baz: { $ref: "t/inner.json#a" },
                    bax: { $ref: "some://where.else/completely#" }
                },
                required: ["foo", "bar", "baz", "bax"]
            };

            instances.forEach((instance) => {
                const validate = instance.compile(schema);
                const data = { foo: 1, bar: "abc", baz: true, bax: null };
                expect(validate(data)).to.be.true();
            });
        });


        it("should throw if the same id resolves to two different schemas", () => {
            instances.forEach((instance) => {
                instance.compile({
                    id: "http://example.com/1.json",
                    type: "integer"
                });
                expect(() => {
                    instance.compile({
                        additionalProperties: {
                            id: "http://example.com/1.json",
                            type: "string"
                        }
                    });
                }).to.throw();

                expect(() => {
                    instance.compile({
                        items: {
                            id: "#int",
                            type: "integer"
                        },
                        additionalProperties: {
                            id: "#int",
                            type: "string"
                        }
                    });
                }).to.throw();
            });
        });
    });


    describe("protocol-relative URIs", () => {
        it("should resolve fragment", () => {
            instances.forEach((instance) => {
                const schema = {
                    id: "//e.com/types",
                    definitions: {
                        int: { type: "integer" }
                    }
                };

                instance.addSchema(schema);
                const validate = instance.compile({ $ref: "//e.com/types#/definitions/int" });
                expect(validate(1)).to.be.true();
                expect(validate("foo")).to.be.false();
            });
        });
    });


    describe("missing schema error", function () {
        this.timeout(4000);

        const testMissingSchemaError = (opts) => {
            instances.forEach((instance) => {
                try {
                    instance.compile({
                        id: opts.baseId,
                        properties: { a: { $ref: opts.ref } }
                    });
                } catch (e) {
                    expect(e.missingRef).to.be.equal(opts.expectedMissingRef);
                    expect(e.missingSchema).to.be.equal(opts.expectedMissingSchema);
                }
            });
        };

        it("should contain missingRef and missingSchema", () => {
            testMissingSchemaError({
                baseId: "http://example.com/1.json",
                ref: "http://another.com/int.json",
                expectedMissingRef: "http://another.com/int.json",
                expectedMissingSchema: "http://another.com/int.json"
            });
        });

        it("should resolve missingRef and missingSchema relative to base id", () => {
            testMissingSchemaError({
                baseId: "http://example.com/folder/1.json",
                ref: "int.json",
                expectedMissingRef: "http://example.com/folder/int.json",
                expectedMissingSchema: "http://example.com/folder/int.json"
            });
        });

        it("should resolve missingRef and missingSchema relative to base id from root", () => {
            testMissingSchemaError({
                baseId: "http://example.com/folder/1.json",
                ref: "/int.json",
                expectedMissingRef: "http://example.com/int.json",
                expectedMissingSchema: "http://example.com/int.json"
            });
        });

        it("missingRef should and missingSchema should NOT include JSON path (hash fragment)", () => {
            testMissingSchemaError({
                baseId: "http://example.com/1.json",
                ref: "int.json#/definitions/positive",
                expectedMissingRef: "http://example.com/int.json#/definitions/positive",
                expectedMissingSchema: "http://example.com/int.json"
            });
        });

        it("should throw missing schema error if same path exist in the current schema but id is different (issue #220)", () => {
            testMissingSchemaError({
                baseId: "http://example.com/parent.json",
                ref: "object.json#/properties/a",
                expectedMissingRef: "http://example.com/object.json#/properties/a",
                expectedMissingSchema: "http://example.com/object.json"
            });
        });
    });


    describe("inline referenced schemas without refs in them", () => {
        const schemas = [
            {
                id: "http://e.com/obj.json#",
                properties: { a: { $ref: "int.json#" } }
            },
            {
                id: "http://e.com/int.json#",
                type: "integer", minimum: 2, maximum: 4
            },
            {
                id: "http://e.com/obj1.json#",
                definitions: { int: { type: "integer", minimum: 2, maximum: 4 } },
                properties: { a: { $ref: "#/definitions/int" } }
            },
            {
                id: "http://e.com/list.json#",
                items: { $ref: "obj.json#" }
            }
        ];

        const testObjSchema = (validate) => {
            expect(validate({ a: 3 })).to.be.true();
            expect(validate({ a: 1 })).to.be.false();
            expect(validate({ a: 5 })).to.be.false();
        };

        const testListSchema = (validate) => {
            expect(validate([{ a: 3 }])).to.be.true();
            expect(validate([{ a: 1 }])).to.be.false();
            expect(validate([{ a: 5 }])).to.be.false();
        };

        const testInlined = (validate, expectedInlined) => {
            const inlined = !(/refVal/.test(validate.toString()));
            expect(inlined).to.be.equal(expectedInlined);
        };

        const testSchemas = (instance, expectedInlined) => {
            const v1 = instance.getSchema("http://e.com/obj.json");
            const v2 = instance.getSchema("http://e.com/obj1.json");
            const vl = instance.getSchema("http://e.com/list.json");
            testObjSchema(v1);
            testObjSchema(v2);
            testListSchema(vl);
            testInlined(v1, expectedInlined);
            testInlined(v2, expectedInlined);
            testInlined(vl, false);
        };

        it("by default should inline schema if it doesn't contain refs", () => {
            const instance = new Validator({ schemas });
            testSchemas(instance, true);
        });


        it("should NOT inline schema if option inlineRefs == false", () => {
            const instance = new Validator({ schemas, inlineRefs: false });
            testSchemas(instance, false);
        });


        it("should inline schema if option inlineRefs is bigger than number of keys in referenced schema", () => {
            const instance = new Validator({ schemas, inlineRefs: 3 });
            testSchemas(instance, true);
        });


        it("should NOT inline schema if option inlineRefs is less than number of keys in referenced schema", () => {
            const instance = new Validator({ schemas, inlineRefs: 2 });
            testSchemas(instance, false);
        });


        it("should avoid schema substitution when refs are inlined (issue #77)", () => {
            const instance = new Validator({ verbose: true });

            const schemaMessage = {
                $schema: "http://json-schema.org/draft-06/schema#",
                id: "http://e.com/message.json#",
                type: "object",
                required: ["header"],
                properties: {
                    header: {
                        allOf: [
                            { $ref: "header.json" },
                            { properties: { msgType: { enum: [0] } } }
                        ]
                    }
                }
            };

            // header schema
            const schemaHeader = {
                $schema: "http://json-schema.org/draft-06/schema#",
                id: "http://e.com/header.json#",
                type: "object",
                properties: {
                    version: {
                        type: "integer",
                        maximum: 5
                    },
                    msgType: { type: "integer" }
                },
                required: ["version", "msgType"]
            };

            // a good message
            const validMessage = {
                header: {
                    version: 4,
                    msgType: 0
                }
            };

            // a bad message
            const invalidMessage = {
                header: {
                    version: 6,
                    msgType: 0
                }
            };

            // add schemas and get validator function
            instance.addSchema(schemaHeader);
            instance.addSchema(schemaMessage);
            const v = instance.getSchema("http://e.com/message.json#");

            expect(v(validMessage)).to.be.true();
            expect(v.schema.id).to.be.equal("http://e.com/message.json#");

            expect(v(invalidMessage)).to.be.false();
            expect(v.errors).to.have.lengthOf(1);
            expect(v.schema.id).to.be.equal("http://e.com/message.json#");

            expect(v(validMessage)).to.be.true();
            expect(v.schema.id).to.be.equal("http://e.com/message.json#");
        });
    });
});
