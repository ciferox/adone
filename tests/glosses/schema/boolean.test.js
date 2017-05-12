describe("glosses", "schema", "boolean schemas", () => {
    const { schema: { Validator } } = adone;
    let instances;

    before(() => {
        instances = [new Validator(), new Validator({ allErrors: true }), new Validator({ inlineRefs: false })];
    });

    describe("top level schema", () => {
        describe("schema = true", () => {
            it("should validate any data as valid", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should validate any data as invalid", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                const validate = instance.compile(boolSchema);
                testSchema(validate, valid);
            };
        }
    });

    describe("in properties / sub-properties", () => {
        describe("schema = true", () => {
            it("should be valid with any property value", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any property value", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                const schema = {
                    type: "object",
                    properties: {
                        foo: boolSchema,
                        bar: {
                            type: "object",
                            properties: {
                                baz: boolSchema
                            }
                        }
                    }
                };

                const validate = instance.compile(schema);
                expect(validate({ foo: 1, bar: { baz: 1 } })).to.be.equal(valid);
                expect(validate({ foo: "1", bar: { baz: "1" } })).to.be.equal(valid);
                expect(validate({ foo: {}, bar: { baz: {} } })).to.be.equal(valid);
                expect(validate({ foo: [], bar: { baz: [] } })).to.be.equal(valid);
                expect(validate({ foo: true, bar: { baz: true } })).to.be.equal(valid);
                expect(validate({ foo: false, bar: { baz: false } })).to.be.equal(valid);
                expect(validate({ foo: null, bar: { baz: null } })).to.be.equal(valid);
                expect(validate({ bar: { quux: 1 } })).to.be.equal(true);
            };
        }
    });

    describe("in items / sub-items", () => {
        describe("schema = true", () => {
            it("should be valid with any item value", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any item value", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                let schema = {
                    type: "array",
                    items: boolSchema
                };

                let validate = instance.compile(schema);
                expect(validate([1])).to.be.equal(valid);
                expect(validate(["1"])).to.be.equal(valid);
                expect(validate([{}])).to.be.equal(valid);
                expect(validate([[]])).to.be.equal(valid);
                expect(validate([true])).to.be.equal(valid);
                expect(validate([false])).to.be.equal(valid);
                expect(validate([null])).to.be.equal(valid);
                expect(validate([])).to.be.equal(true);


                schema = {
                    type: "array",
                    items: [true, {
                        type: "array",
                        items: [true, boolSchema]
                    }, boolSchema]
                };

                validate = instance.compile(schema);
                expect(validate([1, [1, 1], 1])).to.be.equal(valid);
                expect(validate(["1", ["1", "1"], "1"])).to.be.equal(valid);
                expect(validate([{}, [{}, {}], {}])).to.be.equal(valid);
                expect(validate([[], [[], []], []])).to.be.equal(valid);
                expect(validate([true, [true, true], true])).to.be.equal(valid);
                expect(validate([false, [false, false], false])).to.be.equal(valid);
                expect(validate([null, [null, null], null])).to.be.equal(valid);
                expect(validate([1, [1]])).to.be.equal(true);
            };
        }
    });

    describe("in dependencies and sub-dependencies", () => {
        describe("schema = true", () => {
            it("should be valid with any property value", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any property value", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                const schema = {
                    type: "object",
                    dependencies: {
                        foo: boolSchema,
                        bar: {
                            type: "object",
                            dependencies: {
                                baz: boolSchema
                            }
                        }
                    }
                };

                const validate = instance.compile(schema);
                expect(validate({ foo: 1, bar: 1, baz: 1 })).to.be.equal(valid);
                expect(validate({ foo: "1", bar: "1", baz: "1" })).to.be.equal(valid);
                expect(validate({ foo: {}, bar: {}, baz: {} })).to.be.equal(valid);
                expect(validate({ foo: [], bar: [], baz: [] })).to.be.equal(valid);
                expect(validate({ foo: true, bar: true, baz: true })).to.be.equal(valid);
                expect(validate({ foo: false, bar: false, baz: false })).to.be.equal(valid);
                expect(validate({ foo: null, bar: null, baz: null })).to.be.equal(valid);
                expect(validate({ bar: 1, quux: 1 })).to.be.equal(true);
            };
        }
    });

    describe("in patternProperties", () => {
        describe("schema = true", () => {
            it("should be valid with any property matching pattern", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any property matching pattern", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                const schema = {
                    type: "object",
                    patternProperties: {
                        "^f": boolSchema,
                        r$: {
                            type: "object",
                            patternProperties: {
                                z$: boolSchema
                            }
                        }
                    }
                };

                const validate = instance.compile(schema);
                expect(validate({ foo: 1, bar: { baz: 1 } })).to.be.equal(valid);
                expect(validate({ foo: "1", bar: { baz: "1" } })).to.be.equal(valid);
                expect(validate({ foo: {}, bar: { baz: {} } })).to.be.equal(valid);
                expect(validate({ foo: [], bar: { baz: [] } })).to.be.equal(valid);
                expect(validate({ foo: true, bar: { baz: true } })).to.be.equal(valid);
                expect(validate({ foo: false, bar: { baz: false } })).to.be.equal(valid);
                expect(validate({ foo: null, bar: { baz: null } })).to.be.equal(valid);
                expect(validate({ bar: { quux: 1 } })).to.be.equal(true);
            };
        }
    });

    describe("in propertyNames", () => {
        describe("schema = true", () => {
            it("should be valid with any property", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any property", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                const schema = {
                    type: "object",
                    propertyNames: boolSchema
                };

                const validate = instance.compile(schema);
                expect(validate({ foo: 1 })).to.be.equal(valid);
                expect(validate({ bar: 1 })).to.be.equal(valid);
                expect(validate({})).to.be.equal(true);
            };
        }
    });

    describe("in contains", () => {
        describe("schema = true", () => {
            it("should be valid with any items", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any items", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                const schema = {
                    type: "array",
                    contains: boolSchema
                };

                const validate = instance.compile(schema);
                expect(validate([1])).to.be.equal(valid);
                expect(validate(["foo"])).to.be.equal(valid);
                expect(validate([{}])).to.be.equal(valid);
                expect(validate([[]])).to.be.equal(valid);
                expect(validate([true])).to.be.equal(valid);
                expect(validate([false])).to.be.equal(valid);
                expect(validate([null])).to.be.equal(valid);
                expect(validate([])).to.be.equal(false);
            };
        }
    });

    describe("in not", () => {
        describe("schema = true", () => {
            it("should be invalid with any data", () => {
                instances.forEach(test(true, false));
            });
        });

        describe("schema = false", () => {
            it("should be valid with any data", () => {
                instances.forEach(test(false, true));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                const schema = {
                    not: boolSchema
                };

                const validate = instance.compile(schema);
                testSchema(validate, valid);
            };
        }
    });

    describe("in allOf", () => {
        describe("schema = true", () => {
            it("should be valid with any data", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any data", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                let schema = {
                    allOf: [false, boolSchema]
                };

                let validate = instance.compile(schema);
                testSchema(validate, false);

                schema = {
                    allOf: [true, boolSchema]
                };

                validate = instance.compile(schema);
                testSchema(validate, valid);
            };
        }
    });

    describe("in anyOf", () => {
        describe("schema = true", () => {
            it("should be valid with any data", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any data", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                let schema = {
                    anyOf: [false, boolSchema]
                };

                let validate = instance.compile(schema);
                testSchema(validate, valid);

                schema = {
                    anyOf: [true, boolSchema]
                };

                validate = instance.compile(schema);
                testSchema(validate, true);
            };
        }
    });

    describe("in oneOf", () => {
        describe("schema = true", () => {
            it("should be valid with any data", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any data", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                let schema = {
                    oneOf: [false, boolSchema]
                };

                let validate = instance.compile(schema);
                testSchema(validate, valid);

                schema = {
                    oneOf: [true, boolSchema]
                };

                validate = instance.compile(schema);
                testSchema(validate, !valid);
            };
        }
    });

    describe("in $ref", () => {
        describe("schema = true", () => {
            it("should be valid with any data", () => {
                instances.forEach(test(true, true));
            });
        });

        describe("schema = false", () => {
            it("should be invalid with any data", () => {
                instances.forEach(test(false, false));
            });
        });

        function test(boolSchema, valid) {
            return function (instance) {
                const schema = {
                    $ref: "#/definitions/bool",
                    definitions: {
                        bool: boolSchema
                    }
                };

                const validate = instance.compile(schema);
                testSchema(validate, valid);
            };
        }
    });

    function testSchema(validate, valid) {
        expect(validate(1)).to.be.equal(valid);
        expect(validate("foo")).to.be.equal(valid);
        expect(validate({})).to.be.equal(valid);
        expect(validate([])).to.be.equal(valid);
        expect(validate(true)).to.be.equal(valid);
        expect(validate(false)).to.be.equal(valid);
        expect(validate(null)).to.be.equal(valid);
    }
});
