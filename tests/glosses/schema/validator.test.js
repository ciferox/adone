describe("glosses", "schema", "Validator", () => {
    const { schema: { Validator } } = adone;

    let instance;

    beforeEach(() => {
        instance = new Validator();
    });

    it("should create instance", () => {
        expect(instance).to.be.instanceof(Validator);
    });

    describe("compile method", () => {
        it("should compile schema and return validating function", () => {
            const validate = instance.compile({ type: "integer" });
            expect(validate).to.be.a("function");
            expect(validate(1)).to.be.equal(true);
            expect(validate(1.1)).to.be.equal(false);
            expect(validate("1")).to.be.equal(false);
        });

        it("should cache compiled functions for the same schema", () => {
            const v1 = instance.compile({ id: "//e.com/int.json", type: "integer", minimum: 1 });
            const v2 = instance.compile({ id: "//e.com/int.json", minimum: 1, type: "integer" });
            expect(v1).to.be.equal(v2);
        });

        it("should throw if different schema has the same id", () => {
            instance.compile({ id: "//e.com/int.json", type: "integer" });
            expect(() => {
                instance.compile({ id: "//e.com/int.json", type: "integer", minimum: 1 });
            }).to.throw();
        });

        it("should throw if invalid schema is compiled", () => {
            expect(() => {
                instance.compile({ type: null });
            }).to.throw();
        });

        it("should throw if compiled schema has an invalid JavaScript code", () => {
            instance.addKeyword("even", { inline: badEvenCode });
            let schema = { even: true };
            const validate = instance.compile(schema);
            expect(validate(2)).to.be.equal(true);
            expect(validate(3)).to.be.equal(false);


            schema = { even: false };
            expect(() => {
                instance.compile(schema);
            }).to.throw();

            function badEvenCode(it, keyword, _schema) {
                const op = _schema ? "===" : "!==="; // invalid on purpose
                return `data${it.dataLevel || ""} % 2 ${op} 0`;
            }
        });
    });

    describe("validate method", () => {
        it("should compile schema and validate data against it", () => {
            expect(instance.validate({ type: "integer" }, 1)).to.be.equal(true);
            expect(instance.validate({ type: "integer" }, "1")).to.be.equal(false);
            expect(instance.validate({ type: "string" }, "a")).to.be.equal(true);
            expect(instance.validate({ type: "string" }, 1)).to.be.equal(false);
        });

        it("should validate against previously compiled schema by id (also see addSchema)", () => {
            expect(instance.validate({ id: "//e.com/int.json", type: "integer" }, 1)).to.be.equal(true);
            expect(instance.validate("//e.com/int.json", 1)).to.be.equal(true);
            expect(instance.validate("//e.com/int.json", "1")).to.be.equal(false);


            expect(instance.compile({ id: "//e.com/str.json", type: "string" })).to.be.a("function");
            expect(instance.validate("//e.com/str.json", "a")).to.be.equal(true);
            expect(instance.validate("//e.com/str.json", 1)).to.be.equal(false);
        });

        it("should throw exception if no schema with ref", () => {
            expect(instance.validate({ id: "integer", type: "integer" }, 1)).to.be.equal(true);
            expect(instance.validate("integer", 1)).to.be.equal(true);

            expect(() => {
                instance.validate("string", "foo");
            }).to.throw();
        });

        it("should validate schema fragment by ref", () => {
            instance.addSchema({
                id: "http://e.com/types.json",
                definitions: {
                    int: { type: "integer" },
                    str: { type: "string" }
                }
            });

            expect(instance.validate("http://e.com/types.json#/definitions/int", 1)).to.be.equal(true);
            expect(instance.validate("http://e.com/types.json#/definitions/int", "1")).to.be.equal(false);
        });

        it("should return schema fragment by id", () => {
            instance.addSchema({
                id: "http://e.com/types.json",
                definitions: {
                    int: { id: "#int", type: "integer" },
                    str: { id: "#str", type: "string" }
                }
            });

            expect(instance.validate("http://e.com/types.json#int", 1)).to.be.equal(true);
            expect(instance.validate("http://e.com/types.json#int", "1")).to.be.equal(false);
        });
    });

    describe("addSchema method", () => {
        it("should add and compile schema with key", () => {
            const res = instance.addSchema({ type: "integer" }, "int");
            expect(res).not.to.be.ok;
            const validate = instance.getSchema("int");
            expect(validate).to.be.a("function");

            expect(validate(1)).to.be.equal(true);
            expect(validate(1.1)).to.be.equal(false);
            expect(validate("1")).to.be.equal(false);
            expect(instance.validate("int", 1)).to.be.equal(true);
            expect(instance.validate("int", "1")).to.be.equal(false);
        });

        it("should add and compile schema without key", () => {
            instance.addSchema({ type: "integer" });
            expect(instance.validate("", 1)).to.be.equal(true);
            expect(instance.validate("", "1")).to.be.equal(false);
        });

        it("should add and compile schema with id", () => {
            instance.addSchema({ id: "//e.com/int.json", type: "integer" });
            expect(instance.validate("//e.com/int.json", 1)).to.be.equal(true);
            expect(instance.validate("//e.com/int.json", "1")).to.be.equal(false);
        });

        it("should normalize schema keys and ids", () => {
            instance.addSchema({ id: "//e.com/int.json#", type: "integer" }, "int#");
            expect(instance.validate("int", 1)).to.be.equal(true);
            expect(instance.validate("int", "1")).to.be.equal(false);
            expect(instance.validate("//e.com/int.json", 1)).to.be.equal(true);
            expect(instance.validate("//e.com/int.json", "1")).to.be.equal(false);
            expect(instance.validate("int#/", 1)).to.be.equal(true);
            expect(instance.validate("int#/", "1")).to.be.equal(false);
            expect(instance.validate("//e.com/int.json#/", 1)).to.be.equal(true);
            expect(instance.validate("//e.com/int.json#/", "1")).to.be.equal(false);
        });

        it("should add and compile array of schemas with ids", () => {
            instance.addSchema([{ id: "//e.com/int.json", type: "integer" }, { id: "//e.com/str.json", type: "string" }]);

            const validate0 = instance.getSchema("//e.com/int.json");
            const validate1 = instance.getSchema("//e.com/str.json");

            expect(validate0(1)).to.be.equal(true);
            expect(validate0("1")).to.be.equal(false);
            expect(validate1("a")).to.be.equal(true);
            expect(validate1(1)).to.be.equal(false);
            expect(instance.validate("//e.com/int.json", 1)).to.be.equal(true);
            expect(instance.validate("//e.com/int.json", "1")).to.be.equal(false);
            expect(instance.validate("//e.com/str.json", "a")).to.be.equal(true);
            expect(instance.validate("//e.com/str.json", 1)).to.be.equal(false);
        });

        it("should throw on duplicate key", () => {
            instance.addSchema({ type: "integer" }, "int");
            expect(() => {
                instance.addSchema({ type: "integer", minimum: 1 }, "int");
            }).to.throw();
        });

        it("should throw on duplicate normalized key", () => {
            instance.addSchema({ type: "number" }, "num");
            expect(() => {
                instance.addSchema({ type: "integer" }, "num#");
            }).to.throw();
            expect(() => {
                instance.addSchema({ type: "integer" }, "num#/");
            }).to.throw();
        });

        it("should allow only one schema without key and id", () => {
            instance.addSchema({ type: "number" });
            expect(() => {
                instance.addSchema({ type: "integer" });
            }).to.throw();
            expect(() => {
                instance.addSchema({ type: "integer" }, "");
            }).to.throw();
            expect(() => {
                instance.addSchema({ type: "integer" }, "#");
            }).to.throw();
        });

        it("should throw if schema is not an object", () => {
            expect(() => {
                instance.addSchema("foo");
            }).to.throw();
        });

        it("should throw if schema id is not a string", () => {
            try {
                instance.addSchema({ id: 1, type: "integer" });
                throw new Error("should have throw exception");
            } catch (e) {
                expect(e.message).to.be.equal("schema id must be string");
            }
        });
    });

    describe("getSchema method", () => {
        it("should return compiled schema by key", () => {
            instance.addSchema({ type: "integer" }, "int");
            const validate = instance.getSchema("int");
            expect(validate(1)).to.be.equal(true);
            expect(validate("1")).to.be.equal(false);
        });

        it("should return compiled schema by id or ref", () => {
            instance.addSchema({ id: "//e.com/int.json", type: "integer" });
            const validate = instance.getSchema("//e.com/int.json");
            expect(validate(1)).to.be.equal(true);
            expect(validate("1")).to.be.equal(false);
        });

        it("should return compiled schema without key or with empty key", () => {
            instance.addSchema({ type: "integer" });
            const validate = instance.getSchema("");
            expect(validate(1)).to.be.equal(true);
            expect(validate("1")).to.be.equal(false);


            const v = instance.getSchema();
            expect(v(1)).to.be.equal(true);
            expect(v("1")).to.be.equal(false);
        });

        it("should return schema fragment by ref", () => {
            instance.addSchema({
                id: "http://e.com/types.json",
                definitions: {
                    int: { type: "integer" },
                    str: { type: "string" }
                }
            });

            const vInt = instance.getSchema("http://e.com/types.json#/definitions/int");
            expect(vInt(1)).to.be.equal(true);
            expect(vInt("1")).to.be.equal(false);
        });

        it("should return schema fragment by ref with protocol-relative URIs", () => {
            instance.addSchema({
                id: "//e.com/types.json",
                definitions: {
                    int: { type: "integer" },
                    str: { type: "string" }
                }
            });

            const vInt = instance.getSchema("//e.com/types.json#/definitions/int");
            expect(vInt(1)).to.be.equal(true);
            expect(vInt("1")).to.be.equal(false);
        });

        it("should return schema fragment by id", () => {
            instance.addSchema({
                id: "http://e.com/types.json",
                definitions: {
                    int: { id: "#int", type: "integer" },
                    str: { id: "#str", type: "string" }
                }
            });

            const vInt = instance.getSchema("http://e.com/types.json#int");
            expect(vInt(1)).to.be.equal(true);
            expect(vInt("1")).to.be.equal(false);
        });
    });

    describe("removeSchema method", () => {
        it("should remove schema by key", () => {
            let schema = { type: "integer" },
                str = JSON.stringify(schema);
            instance.addSchema(schema, "int");
            const v = instance.getSchema("int");

            expect(v).to.be.a("function");
            expect(instance._cache.get(str).validate).to.be.equal(v);


            instance.removeSchema("int");
            expect(instance.getSchema("int")).not.to.be.ok;
            expect(instance._cache.get(str)).not.to.be.ok;
        });

        it("should remove schema by id", () => {
            let schema = { id: "//e.com/int.json", type: "integer" },
                str = JSON.stringify(schema);
            instance.addSchema(schema);

            const v = instance.getSchema("//e.com/int.json");
            expect(v).to.be.a("function");
            expect(instance._cache.get(str).validate).to.be.equal(v);


            instance.removeSchema("//e.com/int.json");
            expect(instance.getSchema("//e.com/int.json")).not.to.be.ok;
            expect(instance._cache.get(str)).not.to.be.ok;
        });

        it("should remove schema by schema object", () => {
            let schema = { type: "integer" },
                str = JSON.stringify(schema);
            instance.addSchema(schema);
            expect(instance._cache.get(str)).to.be.an("object");
            instance.removeSchema({ type: "integer" });
            expect(instance._cache.get(str)).not.to.be.ok;
        });

        it("should remove schema with id by schema object", () => {
            let schema = { id: "//e.com/int.json", type: "integer" },
                str = JSON.stringify(schema);
            instance.addSchema(schema);
            expect(instance._cache.get(str)).to.be.an("object");
            instance.removeSchema({ id: "//e.com/int.json", type: "integer" });
            expect(instance._cache.get(str)).not.to.be.ok;
        });

        it("should not throw if there is no schema with passed id", () => {
            expect(instance.getSchema("//e.com/int.json")).not.to.be.ok;
            expect(() => {
                instance.removeSchema("//e.com/int.json");
            }).not.to.throw();
        });

        it("should remove all schemas but meta-schemas if called without an arguments", () => {
            let schema1 = { id: "//e.com/int.json", type: "integer" },
                str1 = JSON.stringify(schema1);
            instance.addSchema(schema1);
            expect(instance._cache.get(str1)).to.be.an("object");

            let schema2 = { type: "integer" },
                str2 = JSON.stringify(schema2);
            instance.addSchema(schema2);
            expect(instance._cache.get(str2)).to.be.an("object");

            instance.removeSchema();
            expect(instance._cache.get(str1)).not.to.be.ok;
            expect(instance._cache.get(str2)).not.to.be.ok;
        });

        it("should remove all schemas but meta-schemas with key/id matching pattern", () => {
            let schema1 = { id: "//e.com/int.json", type: "integer" },
                str1 = JSON.stringify(schema1);
            instance.addSchema(schema1);
            expect(instance._cache.get(str1)).to.be.an("object");

            let schema2 = { id: "str.json", type: "string" },
                str2 = JSON.stringify(schema2);
            instance.addSchema(schema2, "//e.com/str.json");
            expect(instance._cache.get(str2)).to.be.an("object");

            let schema3 = { type: "integer" },
                str3 = JSON.stringify(schema3);
            instance.addSchema(schema3);
            expect(instance._cache.get(str3)).to.be.an("object");

            instance.removeSchema(/e\.com/);
            expect(instance._cache.get(str1)).not.to.be.ok;
            expect(instance._cache.get(str2)).not.to.be.ok;
            expect(instance._cache.get(str3)).to.be.an("object");
        });
    });

    describe("addFormat method", () => {
        it("should add format as regular expression", () => {
            instance.addFormat("identifier", /^[a-z_$][a-z0-9_$]*$/i);
            testFormat();
        });

        it("should add format as string", () => {
            instance.addFormat("identifier", "^[A-Za-z_$][A-Za-z0-9_$]*$");
            testFormat();
        });

        it("should add format as function", () => {
            instance.addFormat("identifier", (str) => {
                return (/^[a-z_$][a-z0-9_$]*$/i.test(str)
                );
            });
            testFormat();
        });

        it("should add format as object", () => {
            instance.addFormat("identifier", {
                validate(str) {
                    return (/^[a-z_$][a-z0-9_$]*$/i.test(str)
                    );
                }
            });
            testFormat();
        });

        function testFormat() {
            const validate = instance.compile({ format: "identifier" });
            expect(validate("Abc1")).to.be.equal(true);
            expect(validate("123")).to.be.equal(false);
            expect(validate(123)).to.be.equal(true);
        }

        describe("formats for number", () => {
            it("should validate only numbers", () => {
                instance.addFormat("positive", {
                    type: "number",
                    validate(x) {
                        return x > 0;
                    }
                });

                const validate = instance.compile({
                    format: "positive"
                });
                expect(validate(-2)).to.be.equal(false);
                expect(validate(0)).to.be.equal(false);
                expect(validate(2)).to.be.equal(true);
                expect(validate("abc")).to.be.equal(true);
            });

            it("should validate numbers with format via $data", () => {
                instance = new Validator({ $data: true });
                instance.addFormat("positive", {
                    type: "number",
                    validate(x) {
                        return x > 0;
                    }
                });

                const validate = instance.compile({
                    properties: {
                        data: { format: { $data: "1/frmt" } },
                        frmt: { type: "string" }
                    }
                });
                expect(validate({ data: -2, frmt: "positive" })).to.be.equal(false);
                expect(validate({ data: 0, frmt: "positive" })).to.be.equal(false);
                expect(validate({ data: 2, frmt: "positive" })).to.be.equal(true);
                expect(validate({ data: "abc", frmt: "positive" })).to.be.equal(true);
            });
        });
    });

    describe("validateSchema method", () => {
        it("should validate schema against meta-schema", () => {
            let valid = instance.validateSchema({
                $schema: "http://json-schema.org/draft-06/schema#",
                type: "number"
            });

            expect(valid).to.be.equal(true);

            expect(instance.errors).to.be.equal(null);

            valid = instance.validateSchema({
                $schema: "http://json-schema.org/draft-06/schema#",
                type: "wrong_type"
            });

            expect(valid).to.be.equal(false);
            expect(instance.errors.length).to.be.equal(3);
            expect(instance.errors[0].keyword).to.be.equal("enum");
            expect(instance.errors[1].keyword).to.be.equal("type");
            expect(instance.errors[2].keyword).to.be.equal("anyOf");
        });

        it("should throw exception if meta-schema is unknown", () => {
            expect(() => {
                instance.validateSchema({
                    $schema: "http://example.com/unknown/schema#",
                    type: "number"
                });
            }).to.throw();
        });

        it("should throw exception if $schema is not a string", () => {
            expect(() => {
                instance.validateSchema({
                    $schema: {},
                    type: "number"
                });
            }).to.throw();
        });
    });
});
