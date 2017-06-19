describe("schema", "type coercion", () => {
    const { schema: { Validator } } = adone;

    const coercionRules = {
        string: {
            number: [{ from: 1, to: "1" }, { from: 1.5, to: "1.5" }, { from: 2e100, to: "2e+100" }],
            boolean: [{ from: false, to: "false" }, { from: true, to: "true" }],
            null: [{ from: null, to: "" }],
            object: [{ from: {}, to: undefined }],
            array: [{ from: [], to: undefined }, { from: [1], to: undefined }]
        },
        number: {
            string: [{ from: "1", to: 1 }, { from: "1.5", to: 1.5 }, { from: "2e10", to: 2e10 }, { from: "1a", to: undefined }, { from: "abc", to: undefined }, { from: "", to: undefined }],
            boolean: [{ from: false, to: 0 }, { from: true, to: 1 }],
            null: [{ from: null, to: 0 }],
            object: [{ from: {}, to: undefined }],
            array: [{ from: [], to: undefined }, { from: [true], to: undefined }]
        },
        integer: {
            string: [{ from: "1", to: 1 }, { from: "1.5", to: undefined }, { from: "2e10", to: 2e10 }, { from: "1a", to: undefined }, { from: "abc", to: undefined }, { from: "", to: undefined }],
            boolean: [{ from: false, to: 0 }, { from: true, to: 1 }],
            null: [{ from: null, to: 0 }],
            object: [{ from: {}, to: undefined }],
            array: [{ from: [], to: undefined }, { from: ["1"], to: undefined }]
        },
        boolean: {
            string: [{ from: "false", to: false }, { from: "true", to: true }, { from: "", to: undefined }, { from: "abc", to: undefined }],
            number: [{ from: 0, to: false }, { from: 1, to: true }, { from: 2, to: undefined }, { from: 2.5, to: undefined }],
            null: [{ from: null, to: false }],
            object: [{ from: {}, to: undefined }],
            array: [{ from: [], to: undefined }, { from: [0], to: undefined }]
        },
        null: {
            string: [{ from: "", to: null }, { from: "abc", to: undefined }, { from: "null", to: undefined }],
            number: [{ from: 0, to: null }, { from: 1, to: undefined }],
            boolean: [{ from: false, to: null }, { from: true, to: undefined }],
            object: [{ from: {}, to: undefined }],
            array: [{ from: [], to: undefined }, { from: [null], to: undefined }]
        },
        array: {
            all: [{ type: "string", from: "abc", to: undefined }, { type: "number", from: 1, to: undefined }, { type: "boolean", from: true, to: undefined }, { type: "null", from: null, to: undefined }, { type: "object", from: {}, to: undefined }]
        },
        object: {
            all: [{ type: "string", from: "abc", to: undefined }, { type: "number", from: 1, to: undefined }, { type: "boolean", from: true, to: undefined }, { type: "null", from: null, to: undefined }, { type: "array", from: [], to: undefined }]
        }
    };

    const coercionArrayRules = JSON.parse(JSON.stringify(coercionRules));
    coercionArrayRules.string.array = [{ from: ["abc"], to: "abc" }, { from: [123], to: "123" }, { from: ["abc", "def"], to: undefined }, { from: [], to: undefined }];
    coercionArrayRules.number.array = [{ from: [1.5], to: 1.5 }, { from: ["1.5"], to: 1.5 }];
    coercionArrayRules.integer.array = [{ from: [1], to: 1 }, { from: ["1"], to: 1 }, { from: [true], to: 1 }, { from: [null], to: 0 }];
    coercionArrayRules.boolean.array = [{ from: [true], to: true }, { from: ["true"], to: true }, { from: [1], to: true }];
    coercionArrayRules.null.array = [{ from: [null], to: null }, { from: [""], to: null }, { from: [0], to: null }, { from: [false], to: null }];
    coercionArrayRules.object.array = [{ from: [{}], to: undefined }];

    coercionArrayRules.array = {
        string: [{ from: "abc", to: ["abc"] }],
        number: [{ from: 1, to: [1] }],
        boolean: [{ from: true, to: [true] }],
        null: [{ from: null, to: [null] }],
        object: [{ from: {}, to: undefined }]
    };

    let instance;
    let fullInstance;
    let instances;

    beforeEach(() => {
        instance = new Validator({ coerceTypes: true, verbose: true });
        fullInstance = new Validator({ coerceTypes: true, verbose: true, allErrors: true });
        instances = [instance, fullInstance];
    });

    it("should coerce scalar values", () => {
        testRules(coercionRules, (test, schema, canCoerce /*, toType, fromType*/) => {
            instances.forEach((_instance) => {
                const valid = _instance.validate(schema, test.from);
                //if (valid !== canCoerce) console.log('true', toType, fromType, test, instance.errors);
                expect(valid).to.be.equal(canCoerce);
            });
        });
    });

    it("should coerce scalar values (coerceTypes = array)", () => {
        instance = new Validator({ coerceTypes: "array", verbose: true });
        fullInstance = new Validator({ coerceTypes: "array", verbose: true, allErrors: true });
        instances = [instance, fullInstance];

        testRules(coercionArrayRules, (test, schema, canCoerce, toType, fromType) => {
            instances.forEach((_instance) => {
                const valid = _instance.validate(schema, test.from);
                if (valid !== canCoerce) {
                    console.log(toType, ".", fromType, test, schema, instance.errors);
                }
                expect(valid).to.be.equal(canCoerce);
            });
        });
    });

    it("should coerce values in objects/arrays and update properties/items", () => {
        testRules(coercionRules, (test, schema, canCoerce /*, toType, fromType*/) => {
            const schemaObject = {
                type: "object",
                properties: {
                    foo: schema
                }
            };

            const schemaArray = {
                type: "array",
                items: schema
            };

            const schemaArrObj = {
                type: "array",
                items: schemaObject
            };

            instances.forEach((_instance) => {
                testCoercion(_instance, schemaArray, [test.from], [test.to]);
                testCoercion(_instance, schemaObject, { foo: test.from }, { foo: test.to });
                testCoercion(_instance, schemaArrObj, [{ foo: test.from }], [{ foo: test.to }]);
            });

            function testCoercion(_instance, _schema, fromData, toData) {
                const valid = _instance.validate(_schema, fromData);
                //if (valid !== canCoerce) console.log(schema, fromData, toData);
                expect(valid).to.be.equal(canCoerce);

                if (valid) {
                    expect(fromData).to.be.deep.equal(toData);
                }
            }
        });
    });

    it("should coerce to multiple types in order", () => {
        const schema = {
            type: "object",
            properties: {
                foo: {
                    type: ["number", "boolean", "null"]
                }
            }
        };

        instances.forEach((_instance) => {
            let data;

            expect(_instance.validate(schema, data = { foo: "1" })).to.be.equal(true);
            expect(data).to.be.deep.equal({ foo: 1 });
            expect(_instance.validate(schema, data = { foo: "1.5" })).to.be.equal(true);
            expect(data).to.be.deep.equal({ foo: 1.5 });
            expect(_instance.validate(schema, data = { foo: "false" })).to.be.equal(true);
            expect(data).to.be.deep.equal({ foo: false });
            expect(_instance.validate(schema, data = { foo: 1 })).to.be.equal(true);
            expect(data).to.be.deep.equal({ foo: 1 }); // no coercion

            expect(_instance.validate(schema, data = { foo: true })).to.be.equal(true);
            expect(data).to.be.deep.equal({ foo: true }); // no coercion

            expect(_instance.validate(schema, data = { foo: null })).to.be.equal(true);
            expect(data).to.be.deep.equal({ foo: null }); // no coercion

            expect(_instance.validate(schema, data = { foo: "abc" })).to.be.equal(false);
            expect(data).to.be.deep.equal({ foo: "abc" }); // can't coerce

            expect(_instance.validate(schema, data = { foo: {} })).to.be.equal(false);
            expect(data).to.be.deep.equal({ foo: {} }); // can't coerce

            expect(_instance.validate(schema, data = { foo: [] })).to.be.equal(false);
            expect(data).to.be.deep.equal({ foo: [] }); // can't coerce
        });
    });

    it("should fail to coerce non-number if multiple properties/items are coerced (issue #152)", () => {
        const schema = {
            type: "object",
            properties: {
                foo: { type: "number" },
                bar: { type: "number" }
            }
        };

        const schema2 = {
            type: "array",
            items: { type: "number" }
        };

        instances.forEach((_instance) => {
            const data = { foo: "123", bar: "bar" };
            expect(_instance.validate(schema, data)).to.be.equal(false);
            expect(data).to.be.deep.equal({ foo: 123, bar: "bar" });


            const data2 = ["123", "bar"];
            expect(_instance.validate(schema2, data2)).to.be.equal(false);
            expect(data2).to.be.deep.equal([123, "bar"]);
        });
    });

    it("should update data if the schema is in ref that is not inlined", () => {
        instances.push(new Validator({ coerceTypes: true, inlineRefs: false }));

        const schema = {
            type: "object",
            definitions: {
                foo: { type: "number" }
            },
            properties: {
                foo: { $ref: "#/definitions/foo" }
            }
        };

        const schema2 = {
            type: "object",
            definitions: {
                foo: {
                    // allOf is needed to make sure that "foo" is compiled to a separate function
                    // and not simply passed through (as it would be if it were only $ref)
                    allOf: [{ $ref: "#/definitions/bar" }]
                },
                bar: { type: "number" }
            },
            properties: {
                foo: { $ref: "#/definitions/foo" }
            }
        };

        const schemaRecursive = {
            type: ["object", "number"],
            properties: {
                foo: { $ref: "#" }
            }
        };

        const schemaRecursive2 = {
            id: "http://e.com/schema.json#",
            definitions: {
                foo: {
                    id: "http://e.com/foo.json#",
                    type: ["object", "number"],
                    properties: {
                        foo: { $ref: "#" }
                    }
                }
            },
            properties: {
                foo: { $ref: "http://e.com/foo.json#" }
            }
        };

        instances.forEach((_instance) => {
            testCoercion(schema, { foo: "1" }, { foo: 1 });
            testCoercion(schema2, { foo: "1" }, { foo: 1 });
            testCoercion(schemaRecursive, { foo: { foo: "1" } }, { foo: { foo: 1 } });
            testCoercion(schemaRecursive2, { foo: { foo: { foo: "1" } } }, { foo: { foo: { foo: 1 } } });

            function testCoercion(_schema, fromData, toData) {
                const valid = _instance.validate(_schema, fromData);
                // if (!valid) console.log(schema, fromData, toData);
                expect(valid).to.be.equal(true);
                expect(fromData).to.be.deep.equal(toData);
            }
        });
    });

    it("should generate one error for type with coerceTypes option (issue #469)", () => {
        const schema = {
            type: "number",
            minimum: 10
        };

        instances.forEach((_instance) => {
            const validate = _instance.compile(schema);
            expect(validate(9)).to.be.equal(false);
            expect(validate.errors.length).to.be.equal(1);
            expect(validate(11)).to.be.equal(true);
            expect(validate("foo")).to.be.equal(false);
            expect(validate.errors.length).to.be.equal(1);
        });
    });

    function testRules(rules, cb) {
        for (var toType in rules) {
            for (var fromType in rules[toType]) {
                const tests = rules[toType][fromType];
                tests.forEach((test) => {
                    const canCoerce = test.to !== undefined;
                    const schema = canCoerce ? Array.isArray(test.to) ? { type: toType, items: { type: fromType, enum: [test.to[0]] } } : { type: toType, enum: [test.to] } : { type: toType };
                    cb(test, schema, canCoerce, toType, fromType);
                });
            }
        }
    }
});
