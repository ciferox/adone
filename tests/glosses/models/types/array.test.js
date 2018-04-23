const Helper = require("../helper");

const {
    model
} = adone;

describe("array", () => {

    it("can be called on its own", () => {

        const array = model.array;
        expect(() => array()).to.throw("Must be invoked on a Joi instance.");
    });

    it("should throw an exception if arguments were passed.", () => {

        expect(
            () => model.array("invalid argument.")
        ).to.throw("Joi.array() does not allow arguments.");
    });

    it("converts a string to an array", async () => {

        const value = await model.array().validate("[1,2,3]");
        expect(value.length).to.equal(3);
    });

    it("errors on non-array string", async () => {

        const err = await assert.throws(async () => model.array().validate('{ "something": false }'));
        expect(err.details).to.eql([{
            message: '"value" must be an array',
            path: [],
            type: "array.base",
            context: { label: "value", key: undefined }
        }]);
    });

    it("errors on number", async () => {

        const err = await assert.throws(async () => model.array().validate(3));
        expect(err.details).to.eql([{
            message: '"value" must be an array',
            path: [],
            type: "array.base",
            context: { label: "value", key: undefined }
        }]);
    });

    it("converts a non-array string with number type", async () => {

        const err = await assert.throws(async () => model.array().validate("3"));
        expect(err.details).to.eql([{
            message: '"value" must be an array',
            path: [],
            type: "array.base",
            context: { label: "value", key: undefined }
        }]);
    });

    it("errors on a non-array string", async () => {

        const err = await assert.throws(async () => model.array().validate("asdf"));
        expect(err.details).to.eql([{
            message: '"value" must be an array',
            path: [],
            type: "array.base",
            context: { label: "value", key: undefined }
        }]);
    });

    describe("items()", () => {

        it("converts members", async () => {
            const schema = model.array().items(model.number());
            const input = ["1", "2", "3"];
            const value = await schema.validate(input);
            expect(value).to.eql([1, 2, 3]);
        });

        it("shows path to errors in array items", () => {
            expect(() => {
                model.array().items({
                    a: {
                        b: {
                            c: {
                                d: undefined
                            }
                        }
                    }
                });
            }).to.throw(Error, "Invalid schema content: (0.a.b.c.d)");

            expect(() => {
                model.array().items({ foo: "bar" }, undefined);
            }).to.throw(Error, "Invalid schema content: (1)");
        });

        it("allows zero size", async () => {
            const schema = model.object({
                test: model.array().items(model.object({
                    foo: model.string().required()
                }))
            });
            const input = { test: [] };

            await schema.validate(input);
        });

        it("returns the first error when only one inclusion", async () => {
            const schema = model.object({
                test: model.array().items(model.object({
                    foo: model.string().required()
                }))
            });
            const input = { test: [{ foo: "a" }, { bar: 2 }] };

            const err = await assert.throws(async () => schema.validate(input));
            expect(err.message).to.equal('child "test" fails because ["test" at position 1 fails because [child "foo" fails because ["foo" is required]]]');
            expect(err.details).to.eql([{
                message: '"foo" is required',
                path: ["test", 1, "foo"],
                type: "any.required",
                context: { label: "foo", key: "foo" }
            }]);
        });

        it("validates multiple types added in two calls", () => {
            const schema = model.array()
                .items(model.number())
                .items(model.string());

            Helper.validate(schema, [
                [[1, 2, 3], true],
                [[50, 100, 1000], true],
                [[1, "a", 5, 10], true],
                [["joi", "everydaylowprices", 5000], true]
            ]);
        });

        it("validates multiple types with stripUnknown", () => {
            const schema = model.array().items(model.number(), model.string()).options({ stripUnknown: true });

            Helper.validate(schema, [
                [[1, 2, "a"], true, null, [1, 2, "a"]],
                [[1, { foo: "bar" }, "a", 2], true, null, [1, "a", 2]]
            ]);
        });

        it("validates multiple types with stripUnknown (as an object)", () => {
            const schema = model.array().items(model.number(), model.string()).options({ stripUnknown: { arrays: true, objects: false } });

            Helper.validate(schema, [
                [[1, 2, "a"], true, null, [1, 2, "a"]],
                [[1, { foo: "bar" }, "a", 2], true, null, [1, "a", 2]]
            ]);
        });

        it("allows forbidden to restrict values", async () => {
            const schema = model.array().items(model.string().valid("four").forbidden(), model.string());
            const input = ["one", "two", "three", "four"];

            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"value" at position 3 contains an excluded value',
                path: [3],
                type: "array.excludes",
                context: { pos: 3, value: "four", label: "value", key: 3 }
            }]);
        });

        it("allows forbidden to restrict values (ref)", async () => {
            const schema = model.object({
                array: model.array().items(model.valid(model.ref("value")).forbidden(), model.string()),
                value: model.string().required()
            });

            const input = {
                array: ["one", "two", "three", "four"],
                value: "four"
            };

            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"array" at position 3 contains an excluded value',
                path: ["array", 3],
                type: "array.excludes",
                context: { pos: 3, value: "four", label: "array", key: 3 }
            }]);
        });

        it("validates that a required value exists", async () => {
            const schema = model.array().items(model.string().valid("four").required(), model.string());
            const input = ["one", "two", "three"];

            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"value" does not contain 1 required value(s)',
                path: [],
                type: "array.includesRequiredUnknowns",
                context: { unknownMisses: 1, label: "value", key: undefined }
            }]);
        });

        it("validates that a required value exists with abortEarly = false", async () => {

            const schema = model.array().items(model.string().valid("four").required(), model.string()).options({ abortEarly: false });
            const input = ["one", "two", "three"];

            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"value" does not contain 1 required value(s)',
                path: [],
                type: "array.includesRequiredUnknowns",
                context: { unknownMisses: 1, label: "value", key: undefined }
            }]);
        });

        it("does not re-run required tests that have already been matched", async () => {

            const schema = model.array().items(model.string().valid("four").required(), model.string());
            const input = ["one", "two", "three", "four", "four", "four"];

            const value = await schema.validate(input);
            expect(value).to.eql(input);
        });

        it("does not re-run required tests that have already failed", async () => {

            const schema = model.array().items(model.string().valid("four").required(), model.boolean().required(), model.number());
            const input = ["one", "two", "three", "four", "four", "four"];

            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"value" at position 0 does not match any of the allowed types',
                path: [0],
                type: "array.includes",
                context: { pos: 0, value: "one", label: "value", key: 0 }
            }]);
        });

        it("can require duplicates of the same schema and fail", async () => {

            const schema = model.array().items(model.string().valid("four").required(), model.string().valid("four").required(), model.string());
            const input = ["one", "two", "three", "four"];

            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"value" does not contain 1 required value(s)',
                path: [],
                type: "array.includesRequiredUnknowns",
                context: { unknownMisses: 1, label: "value", key: undefined }
            }]);
        });

        it("can require duplicates of the same schema and pass", async () => {
            const schema = model.array().items(model.string().valid("four").required(), model.string().valid("four").required(), model.string());
            const input = ["one", "two", "three", "four", "four"];

            const value = await schema.validate(input);
            expect(value).to.eql(input);
        });

        it("continues to validate after a required match", async () => {
            const schema = model.array().items(model.string().required(), model.boolean());
            const input = [true, "one", false, "two"];

            const value = await schema.validate(input);
            expect(value).to.eql(input);
        });

        it("can use a label on a required parameter", async () => {
            const schema = model.array().items(model.string().required().label("required string"), model.boolean());
            const input = [true, false];

            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"value" does not contain [required string]',
                path: [],
                type: "array.includesRequiredKnowns",
                context: { knownMisses: ["required string"], label: "value", key: undefined }
            }]);
        });

        it("can use a label on one required parameter, and no label on another", async () => {

            const schema = model.array().items(model.string().required().label("required string"), model.string().required(), model.boolean());
            const input = [true, false];

            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"value" does not contain [required string] and 1 other required value(s)',
                path: [],
                type: "array.includesRequiredBoth",
                context: {
                    knownMisses: ["required string"],
                    unknownMisses: 1,
                    label: "value",
                    key: undefined
                }
            }]);
        });

        it("can strip matching items", async () => {

            const schema = model.array().items(model.string(), model.any().strip());
            const value = await schema.validate(["one", "two", 3, 4]);
            expect(value).to.eql(["one", "two"]);
        });
    });

    describe("min()", () => {

        it("validates array size", () => {

            const schema = model.array().min(2);
            Helper.validate(schema, [
                [[1, 2], true],
                [[1], false, null, {
                    message: '"value" must contain at least 2 items',
                    details: [{
                        message: '"value" must contain at least 2 items',
                        path: [],
                        type: "array.min",
                        context: { limit: 2, value: [1], label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("throws when limit is not a number", () => {

            expect(() => {

                model.array().min("a");
            }).to.throw("limit must be a positive integer or reference");
        });

        it("throws when limit is not an integer", () => {

            expect(() => {

                model.array().min(1.2);
            }).to.throw("limit must be a positive integer or reference");
        });

        it("throws when limit is negative", () => {

            expect(() => {

                model.array().min(-1);
            }).to.throw("limit must be a positive integer or reference");
        });

        it("validates array size when a reference", () => {

            const ref = model.ref("limit");
            const schema = model.object().keys({
                limit: model.any(),
                arr: model.array().min(ref)
            });
            Helper.validate(schema, [
                [{
                    limit: 2,
                    arr: [1, 2]
                }, true],
                [{
                    limit: 2,
                    arr: [1]
                }, false, null, {
                    message: 'child "arr" fails because ["arr" must contain at least ref:limit items]',
                    details: [{
                        message: '"arr" must contain at least ref:limit items',
                        path: ["arr"],
                        type: "array.min",
                        context: { limit: ref, value: [1], label: "arr", key: "arr" }
                    }]
                }]
            ]);
        });

        it("handles references within a when", () => {

            const schema = model.object({
                limit: model.any(),
                arr: model.array(),
                arr2: model.when("arr", {
                    is: model.array().min(model.ref("limit")),
                    then: model.array()
                })
            });

            Helper.validate(schema, [
                [{
                    limit: 2,
                    arr: [1, 2],
                    arr2: [1, 2]
                }, true]
            ]);
        });

        it("validates reference is a safe integer", () => {

            const schema = model.object().keys({
                limit: model.any(),
                arr: model.array().min(model.ref("limit"))
            });
            Helper.validate(schema, [
                [{
                    limit: Math.pow(2, 53),
                    arr: [1, 2]
                }, false, null, {
                    message: 'child "arr" fails because ["arr" references "limit" which is not a positive integer]',
                    details: [{
                        message: '"arr" references "limit" which is not a positive integer',
                        path: ["arr"],
                        type: "array.ref",
                        context: { ref: "limit", label: "arr", key: "arr" }
                    }]
                }],
                [{
                    limit: "I like turtles",
                    arr: [1]
                }, false, null, {
                    message: 'child "arr" fails because ["arr" references "limit" which is not a positive integer]',
                    details: [{
                        message: '"arr" references "limit" which is not a positive integer',
                        path: ["arr"],
                        type: "array.ref",
                        context: { ref: "limit", label: "arr", key: "arr" }
                    }]
                }]
            ]);
        });
    });

    describe("max()", () => {

        it("validates array size", () => {

            const schema = model.array().max(1);
            Helper.validate(schema, [
                [[1, 2], false, null, {
                    message: '"value" must contain less than or equal to 1 items',
                    details: [{
                        message: '"value" must contain less than or equal to 1 items',
                        path: [],
                        type: "array.max",
                        context: { limit: 1, value: [1, 2], label: "value", key: undefined }
                    }]
                }],
                [[1], true]
            ]);
        });

        it("throws when limit is not a number", () => {

            expect(() => {

                model.array().max("a");
            }).to.throw("limit must be a positive integer or reference");
        });

        it("throws when limit is not an integer", () => {

            expect(() => {

                model.array().max(1.2);
            }).to.throw("limit must be a positive integer or reference");
        });

        it("throws when limit is negative", () => {

            expect(() => {

                model.array().max(-1);
            }).to.throw("limit must be a positive integer or reference");
        });

        it("validates array size when a reference", () => {

            const ref = model.ref("limit");
            const schema = model.object().keys({
                limit: model.any(),
                arr: model.array().max(ref)
            });
            Helper.validate(schema, [
                [{
                    limit: 2,
                    arr: [1, 2]
                }, true],
                [{
                    limit: 2,
                    arr: [1, 2, 3]
                }, false, null, {
                    message: 'child "arr" fails because ["arr" must contain less than or equal to ref:limit items]',
                    details: [{
                        message: '"arr" must contain less than or equal to ref:limit items',
                        path: ["arr"],
                        type: "array.max",
                        context: { limit: ref, value: [1, 2, 3], label: "arr", key: "arr" }
                    }]
                }]
            ]);
        });

        it("handles references within a when", () => {

            const schema = model.object({
                limit: model.any(),
                arr: model.array(),
                arr2: model.when("arr", {
                    is: model.array().max(model.ref("limit")),
                    then: model.array()
                })
            });

            Helper.validate(schema, [
                [{
                    limit: 2,
                    arr: [1, 2],
                    arr2: [1, 2]
                }, true]
            ]);
        });

        it("validates reference is a safe integer", () => {

            const schema = model.object().keys({
                limit: model.any(),
                arr: model.array().max(model.ref("limit"))
            });
            Helper.validate(schema, [
                [{
                    limit: Math.pow(2, 53),
                    arr: [1, 2]
                }, false, null, {
                    message: 'child "arr" fails because ["arr" references "limit" which is not a positive integer]',
                    details: [{
                        message: '"arr" references "limit" which is not a positive integer',
                        path: ["arr"],
                        type: "array.ref",
                        context: { ref: "limit", label: "arr", key: "arr" }
                    }]
                }],
                [{
                    limit: "I like turtles",
                    arr: [1]
                }, false, null, {
                    message: 'child "arr" fails because ["arr" references "limit" which is not a positive integer]',
                    details: [{
                        message: '"arr" references "limit" which is not a positive integer',
                        path: ["arr"],
                        type: "array.ref",
                        context: { ref: "limit", label: "arr", key: "arr" }
                    }]
                }]
            ]);
        });

    });

    describe("length()", () => {

        it("validates array size", () => {

            const schema = model.array().length(2);
            Helper.validate(schema, [
                [[1, 2], true],
                [[1], false, null, {
                    message: '"value" must contain 2 items',
                    details: [{
                        message: '"value" must contain 2 items',
                        path: [],
                        type: "array.length",
                        context: { limit: 2, value: [1], label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("throws when limit is not a number", () => {

            expect(() => {

                model.array().length("a");
            }).to.throw("limit must be a positive integer or reference");
        });

        it("throws when limit is not an integer", () => {

            expect(() => {

                model.array().length(1.2);
            }).to.throw("limit must be a positive integer or reference");
        });

        it("throws when limit is negative", () => {

            expect(() => {

                model.array().length(-1);
            }).to.throw("limit must be a positive integer or reference");
        });

        it("validates array size when a reference", () => {

            const ref = model.ref("limit");
            const schema = model.object().keys({
                limit: model.any(),
                arr: model.array().length(ref)
            });
            Helper.validate(schema, [
                [{
                    limit: 2,
                    arr: [1, 2]
                }, true],
                [{
                    limit: 2,
                    arr: [1]
                }, false, null, {
                    message: 'child "arr" fails because ["arr" must contain ref:limit items]',
                    details: [{
                        message: '"arr" must contain ref:limit items',
                        path: ["arr"],
                        type: "array.length",
                        context: { limit: ref, value: [1], label: "arr", key: "arr" }
                    }]
                }]
            ]);
        });

        it("handles references within a when", () => {

            const schema = model.object({
                limit: model.any(),
                arr: model.array(),
                arr2: model.when("arr", {
                    is: model.array().length(model.ref("limit")),
                    then: model.array()
                })
            });

            Helper.validate(schema, [
                [{
                    limit: 2,
                    arr: [1, 2],
                    arr2: [1, 2]
                }, true]
            ]);
        });

        it("validates reference is a safe integer", () => {

            const schema = model.object().keys({
                limit: model.any(),
                arr: model.array().length(model.ref("limit"))
            });
            Helper.validate(schema, [
                [{
                    limit: Math.pow(2, 53),
                    arr: [1, 2]
                }, false, null, {
                    message: 'child "arr" fails because ["arr" references "limit" which is not a positive integer]',
                    details: [{
                        message: '"arr" references "limit" which is not a positive integer',
                        path: ["arr"],
                        type: "array.ref",
                        context: { ref: "limit", label: "arr", key: "arr" }
                    }]
                }],
                [{
                    limit: "I like turtles",
                    arr: [1]
                }, false, null, {
                    message: 'child "arr" fails because ["arr" references "limit" which is not a positive integer]',
                    details: [{
                        message: '"arr" references "limit" which is not a positive integer',
                        path: ["arr"],
                        type: "array.ref",
                        context: { ref: "limit", label: "arr", key: "arr" }
                    }]
                }]
            ]);
        });
    });

    describe("validate()", () => {

        it("should, by default, allow undefined, allow empty array", () => {

            Helper.validate(model.array(), [
                [undefined, true],
                [[], true]
            ]);
        });

        it("should, when .required(), deny undefined", () => {

            Helper.validate(model.array().required(), [
                [undefined, false, null, {
                    message: '"value" is required',
                    details: [{
                        message: '"value" is required',
                        path: [],
                        type: "any.required",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("allows empty arrays", () => {

            Helper.validate(model.array(), [
                [undefined, true],
                [[], true]
            ]);
        });

        it("excludes values when items are forbidden", () => {

            Helper.validate(model.array().items(model.string().forbidden()), [
                [["2", "1"], false, null, {
                    message: '"value" at position 0 contains an excluded value',
                    details: [{
                        message: '"value" at position 0 contains an excluded value',
                        path: [0],
                        type: "array.excludes",
                        context: { pos: 0, value: "2", label: "value", key: 0 }
                    }]
                }],
                [["1"], false, null, {
                    message: '"value" at position 0 contains an excluded value',
                    details: [{
                        message: '"value" at position 0 contains an excluded value',
                        path: [0],
                        type: "array.excludes",
                        context: { pos: 0, value: "1", label: "value", key: 0 }
                    }]
                }],
                [[2], true]
            ]);
        });

        it("allows types to be forbidden", async () => {

            const schema = model.array().items(model.number().forbidden());

            const n = [1, 2, "hippo"];
            const err = await assert.throws(async () => schema.validate(n));
            expect(err.details).to.eql([{
                message: '"value" at position 0 contains an excluded value',
                path: [0],
                type: "array.excludes",
                context: { pos: 0, value: 1, label: "value", key: 0 }
            }]);

            const m = ["x", "y", "z"];
            await schema.validate(m);
        });

        it("validates array of Numbers", () => {

            Helper.validate(model.array().items(model.number()), [
                [[1, 2, 3], true],
                [[50, 100, 1000], true],
                [["a", 1, 2], false, null, {
                    message: '"value" at position 0 fails because ["0" must be a number]',
                    details: [{
                        message: '"0" must be a number',
                        path: [0],
                        type: "number.base",
                        context: { label: 0, key: 0 }
                    }]
                }],
                [["1", "2", 4], true]
            ]);
        });

        it("validates array of mixed Numbers & Strings", () => {

            Helper.validate(model.array().items(model.number(), model.string()), [
                [[1, 2, 3], true],
                [[50, 100, 1000], true],
                [[1, "a", 5, 10], true],
                [["joi", "everydaylowprices", 5000], true]
            ]);
        });

        it("validates array of objects with schema", () => {

            Helper.validate(model.array().items(model.object({ h1: model.number().required() })), [
                [[{ h1: 1 }, { h1: 2 }, { h1: 3 }], true],
                [[{ h2: 1, h3: "somestring" }, { h1: 2 }, { h1: 3 }], false, null, {
                    message: '"value" at position 0 fails because [child "h1" fails because ["h1" is required]]',
                    details: [{
                        message: '"h1" is required',
                        path: [0, "h1"],
                        type: "any.required",
                        context: { label: "h1", key: "h1" }
                    }]
                }],
                [[1, 2, [1]], false, null, {
                    message: '"value" at position 0 fails because ["0" must be an object]',
                    details: [{
                        message: '"0" must be an object',
                        path: [0],
                        type: "object.base",
                        context: { label: 0, key: 0 }
                    }]
                }]
            ]);
        });

        it("errors on array of unallowed mixed types (Array)", () => {

            Helper.validate(model.array().items(model.number()), [
                [[1, 2, 3], true],
                [[1, 2, [1]], false, null, {
                    message: '"value" at position 2 fails because ["2" must be a number]',
                    details: [{
                        message: '"2" must be a number',
                        path: [2],
                        type: "number.base",
                        context: { label: 2, key: 2 }
                    }]
                }]
            ]);
        });

        it("errors on invalid number rule using includes", async () => {

            const schema = model.object({
                arr: model.array().items(model.number().integer())
            });

            const input = { arr: [1, 2, 2.1] };
            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"2" must be an integer',
                path: ["arr", 2],
                type: "number.integer",
                context: { value: 2.1, label: 2, key: 2 }
            }]);
        });

        it("validates an array within an object", () => {

            const schema = model.object({
                array: model.array().items(model.string().min(5), model.number().min(3))
            }).options({ convert: false });

            Helper.validate(schema, [
                [{ array: ["12345"] }, true],
                [{ array: ["1"] }, false, null, {
                    message: 'child "array" fails because ["array" at position 0 does not match any of the allowed types]',
                    details: [{
                        message: '"array" at position 0 does not match any of the allowed types',
                        path: ["array", 0],
                        type: "array.includes",
                        context: { pos: 0, value: "1", label: "array", key: 0 }
                    }]
                }],
                [{ array: [3] }, true],
                [{ array: ["12345", 3] }, true]
            ]);
        });

        it("should not change original value", async () => {

            const schema = model.array().items(model.number()).unique();
            const input = ["1", "2"];

            const value = await schema.validate(input);
            expect(value).to.eql([1, 2]);
            expect(input).to.eql(["1", "2"]);
        });

        it("should have multiple errors if abort early is false", async () => {

            const schema = model.array().items(model.number(), model.object()).items(model.boolean().forbidden());
            const input = [1, undefined, true, "a"];

            const err = await assert.throws(async () => model.validate(input, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, '"value" must not be a sparse array. "value" at position 2 contains an excluded value. "value" at position 3 does not match any of the allowed types');
            expect(err.details).to.eql([{
                message: '"value" must not be a sparse array',
                path: [1],
                type: "array.sparse",
                context: {
                    key: 1,
                    label: "value"
                }
            }, {
                message: '"value" at position 2 contains an excluded value',
                path: [2],
                type: "array.excludes",
                context: {
                    pos: 2,
                    key: 2,
                    label: "value",
                    value: true
                }
            }, {
                message: '"value" at position 3 does not match any of the allowed types',
                path: [3],
                type: "array.includes",
                context: {
                    pos: 3,
                    key: 3,
                    label: "value",
                    value: "a"
                }
            }]);
        });
    });

    describe("describe()", () => {

        it("returns an empty description when no rules are applied", () => {

            const schema = model.array();
            const desc = schema.describe();
            expect(desc).to.eql({
                type: "array",
                flags: { sparse: false }
            });
        });

        it("returns an updated description when sparse rule is applied", () => {

            const schema = model.array().sparse();
            const desc = schema.describe();
            expect(desc).to.eql({
                type: "array",
                flags: { sparse: true }
            });
        });

        it("returns an items array only if items are specified", () => {

            const schema = model.array().items().max(5);
            const desc = schema.describe();
            expect(desc.items).to.not.exist();
        });

        it("returns a recursively defined array of items when specified", () => {

            const schema = model.array()
                .items(model.number(), model.string())
                .items(model.boolean().forbidden())
                .ordered(model.number(), model.string())
                .ordered(model.string().required());
            const desc = schema.describe();
            expect(desc.items).to.have.length(3);
            expect(desc).to.eql({
                type: "array",
                flags: { sparse: false },
                orderedItems: [
                    { type: "number", invalids: [Infinity, -Infinity] },
                    { type: "string", invalids: [""] },
                    { type: "string", invalids: [""], flags: { presence: "required" } }
                ],
                items: [
                    { type: "number", invalids: [Infinity, -Infinity] },
                    { type: "string", invalids: [""] },
                    { type: "boolean", flags: { presence: "forbidden", insensitive: true }, truthy: [true], falsy: [false] }
                ]
            });
        });
    });

    describe("unique()", () => {

        it("errors if duplicate numbers, strings, objects, binaries, functions, dates and booleans", () => {
            const buffer = Buffer.from("hello world");
            const func = function () { };
            const now = new Date();
            const schema = model.array().sparse().unique();

            Helper.validate(schema, [
                [[2, 2], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: 2,
                            dupePos: 0,
                            dupeValue: 2,
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [[0x2, 2], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: 2,
                            dupePos: 0,
                            dupeValue: 0x2,
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [["duplicate", "duplicate"], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: "duplicate",
                            dupePos: 0,
                            dupeValue: "duplicate",
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [[{ a: "b" }, { a: "b" }], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: { a: "b" },
                            dupePos: 0,
                            dupeValue: { a: "b" },
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [[buffer, buffer], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: buffer,
                            dupePos: 0,
                            dupeValue: buffer,
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [[func, func], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: func,
                            dupePos: 0,
                            dupeValue: func,
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [[now, now], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: now,
                            dupePos: 0,
                            dupeValue: now,
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [[true, true], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: true,
                            dupePos: 0,
                            dupeValue: true,
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [[undefined, undefined], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: undefined,
                            dupePos: 0,
                            dupeValue: undefined,
                            label: "value",
                            key: 1
                        }
                    }]
                }]
            ]);
        });

        it("errors with the correct details", () => {
            let error = model.array().items(model.number()).unique().validate([1, 2, 3, 1, 4]).error;
            assert.instanceOf(error, Error, '"value" position 3 contains a duplicate value');
            expect(error.details).to.eql([{
                context: {
                    key: 3,
                    label: "value",
                    pos: 3,
                    value: 1,
                    dupePos: 0,
                    dupeValue: 1
                },
                message: '"value" position 3 contains a duplicate value',
                path: [3],
                type: "array.unique"
            }]);

            error = model.array().items(model.number()).unique((a, b) => a === b).validate([1, 2, 3, 1, 4]).error;
            assert.instanceOf(error, Error, '"value" position 3 contains a duplicate value');
            expect(error.details).to.eql([{
                context: {
                    key: 3,
                    label: "value",
                    pos: 3,
                    value: 1,
                    dupePos: 0,
                    dupeValue: 1
                },
                message: '"value" position 3 contains a duplicate value',
                path: [3],
                type: "array.unique"
            }]);

            error = model.object({ a: model.array().items(model.number()).unique() }).validate({ a: [1, 2, 3, 1, 4] }).error;
            assert.instanceOf(error, Error, 'child "a" fails because ["a" position 3 contains a duplicate value]');
            expect(error.details).to.eql([{
                context: {
                    key: 3,
                    label: "a",
                    pos: 3,
                    value: 1,
                    dupePos: 0,
                    dupeValue: 1
                },
                message: '"a" position 3 contains a duplicate value',
                path: ["a", 3],
                type: "array.unique"
            }]);

            error = model.object({ a: model.array().items(model.number()).unique((a, b) => a === b) }).validate({ a: [1, 2, 3, 1, 4] }).error;
            assert.instanceOf(error, Error, 'child "a" fails because ["a" position 3 contains a duplicate value]');
            expect(error.details).to.eql([{
                context: {
                    key: 3,
                    label: "a",
                    pos: 3,
                    value: 1,
                    dupePos: 0,
                    dupeValue: 1
                },
                message: '"a" position 3 contains a duplicate value',
                path: ["a", 3],
                type: "array.unique"
            }]);
        });

        it("ignores duplicates if they are of different types", () => {

            const schema = model.array().unique();

            Helper.validate(schema, [
                [[2, "2"], true]
            ]);
        });

        it("validates without duplicates", () => {

            const buffer = Buffer.from("hello world");
            const buffer2 = Buffer.from("Hello world");
            const func = function () { };
            const func2 = function () { };
            const now = new Date();
            const now2 = new Date(Number(now) + 100);
            const schema = model.array().unique();

            Helper.validate(schema, [
                [[1, 2], true],
                [["s1", "s2"], true],
                [[{ a: "b" }, { a: "c" }], true],
                [[buffer, buffer2], true],
                [[func, func2], true],
                [[now, now2], true],
                [[true, false], true]
            ]);
        });

        it("validates using a comparator", () => {

            const schema = model.array().unique((left, right) => left.a === right.a);

            Helper.validate(schema, [
                [[{ a: "b" }, { a: "c" }], true],
                [[{ a: "b", c: "d" }, { a: "c", c: "d" }], true],
                [[{ a: "b", c: "d" }, { a: "b", c: "d" }], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: { a: "b", c: "d" },
                            dupePos: 0,
                            dupeValue: { a: "b", c: "d" },
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [[{ a: "b", c: "c" }, { a: "b", c: "d" }], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: { a: "b", c: "d" },
                            dupePos: 0,
                            dupeValue: { a: "b", c: "c" },
                            label: "value",
                            key: 1
                        }
                    }]
                }]
            ]);
        });

        it("validates using a comparator with different types", () => {

            const schema = model.array().items(model.string(), model.object({ a: model.string() })).unique((left, right) => {

                if (typeof left === "object") {
                    if (typeof right === "object") {
                        return left.a === right.a;
                    }

                    return left.a === right;
                }

                if (typeof right === "object") {
                    return left === right.a;
                }

                return left === right;
            });

            Helper.validate(schema, [
                [[{ a: "b" }, { a: "c" }], true],
                [[{ a: "b" }, "c"], true],
                [[{ a: "b" }, "c", { a: "d" }, "e"], true],
                [[{ a: "b" }, { a: "b" }], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: { a: "b" },
                            dupePos: 0,
                            dupeValue: { a: "b" },
                            label: "value",
                            key: 1
                        }
                    }]
                }],
                [[{ a: "b" }, "b"], false, null, {
                    message: '"value" position 1 contains a duplicate value',
                    details: [{
                        message: '"value" position 1 contains a duplicate value',
                        path: [1],
                        type: "array.unique",
                        context: {
                            pos: 1,
                            value: "b",
                            dupePos: 0,
                            dupeValue: { a: "b" },
                            label: "value",
                            key: 1
                        }
                    }]
                }]
            ]);
        });

        it("validates using a path comparator", () => {

            let schema = model.array().items(model.object({ id: model.number() })).unique("id");

            Helper.validate(schema, [
                [[{ id: 1 }, { id: 2 }, { id: 3 }], true],
                [[{ id: 1 }, { id: 2 }, {}], true],
                [[{ id: 1 }, { id: 2 }, { id: 1 }], false, null, {
                    message: '"value" position 2 contains a duplicate value',
                    details: [{
                        context: {
                            dupePos: 0,
                            dupeValue: { id: 1 },
                            key: 2,
                            label: "value",
                            path: "id",
                            pos: 2,
                            value: { id: 1 }
                        },
                        message: '"value" position 2 contains a duplicate value',
                        path: [2],
                        type: "array.unique"
                    }]
                }],
                [[{ id: 1 }, { id: 2 }, {}, { id: 3 }, {}], false, null, {
                    message: '"value" position 4 contains a duplicate value',
                    details: [{
                        context: {
                            dupePos: 2,
                            dupeValue: {},
                            key: 4,
                            label: "value",
                            path: "id",
                            pos: 4,
                            value: {}
                        },
                        message: '"value" position 4 contains a duplicate value',
                        path: [4],
                        type: "array.unique"
                    }]
                }]
            ]);

            schema = model.array().items(model.object({ nested: { id: model.number() } })).unique("nested.id");

            Helper.validate(schema, [
                [[{ nested: { id: 1 } }, { nested: { id: 2 } }, { nested: { id: 3 } }], true],
                [[{ nested: { id: 1 } }, { nested: { id: 2 } }, {}], true],
                [[{ nested: { id: 1 } }, { nested: { id: 2 } }, { nested: { id: 1 } }], false, null, {
                    message: '"value" position 2 contains a duplicate value',
                    details: [{
                        context: {
                            dupePos: 0,
                            dupeValue: { nested: { id: 1 } },
                            key: 2,
                            label: "value",
                            path: "nested.id",
                            pos: 2,
                            value: { nested: { id: 1 } }
                        },
                        message: '"value" position 2 contains a duplicate value',
                        path: [2],
                        type: "array.unique"
                    }]
                }],
                [[{ nested: { id: 1 } }, { nested: { id: 2 } }, {}, { nested: { id: 3 } }, {}], false, null, {
                    message: '"value" position 4 contains a duplicate value',
                    details: [{
                        context: {
                            dupePos: 2,
                            dupeValue: {},
                            key: 4,
                            label: "value",
                            path: "nested.id",
                            pos: 4,
                            value: {}
                        },
                        message: '"value" position 4 contains a duplicate value',
                        path: [4],
                        type: "array.unique"
                    }]
                }]
            ]);

            schema = model.array().items(model.object({ nested: { id: model.number() } })).unique("nested");

            Helper.validate(schema, [
                [[{ nested: { id: 1 } }, { nested: { id: 2 } }, { nested: { id: 3 } }], true],
                [[{ nested: { id: 1 } }, { nested: { id: 2 } }, {}], true],
                [[{ nested: { id: 1 } }, { nested: { id: 2 } }, { nested: { id: 1 } }], false, null, {
                    message: '"value" position 2 contains a duplicate value',
                    details: [{
                        context: {
                            dupePos: 0,
                            dupeValue: { nested: { id: 1 } },
                            key: 2,
                            label: "value",
                            path: "nested",
                            pos: 2,
                            value: { nested: { id: 1 } }
                        },
                        message: '"value" position 2 contains a duplicate value',
                        path: [2],
                        type: "array.unique"
                    }]
                }],
                [[{ nested: { id: 1 } }, { nested: { id: 2 } }, {}, { nested: { id: 3 } }, {}], false, null, {
                    message: '"value" position 4 contains a duplicate value',
                    details: [{
                        context: {
                            dupePos: 2,
                            dupeValue: {},
                            key: 4,
                            label: "value",
                            path: "nested",
                            pos: 4,
                            value: {}
                        },
                        message: '"value" position 4 contains a duplicate value',
                        path: [4],
                        type: "array.unique"
                    }]
                }]
            ]);
        });

        it("fails with invalid comparator", () => {

            expect(() => {

                model.array().unique({});
            }).to.throw(Error, "comparator must be a function or a string");
        });
    });

    describe("sparse()", () => {

        it("errors on undefined value", () => {

            const schema = model.array().items(model.number());

            Helper.validate(schema, [
                [[undefined], false, null, {
                    message: '"value" must not be a sparse array',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [0],
                        type: "array.sparse",
                        context: { label: "value", key: 0 }
                    }]
                }],
                [[2, undefined], false, null, {
                    message: '"value" must not be a sparse array',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [1],
                        type: "array.sparse",
                        context: { label: "value", key: 1 }
                    }]
                }]
            ]);
        });

        it("errors on undefined value after validation", () => {

            const schema = model.array().items(model.object().empty({}));

            Helper.validate(schema, [
                [[{ a: 1 }, {}, { c: 3 }], false, null, {
                    message: '"value" must not be a sparse array',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [1],
                        type: "array.sparse",
                        context: { label: "value", key: 1 }
                    }]
                }]
            ]);
        });

        it("errors on undefined value after validation with abortEarly false", () => {

            const schema = model.array().items(model.object().empty({})).options({ abortEarly: false });

            Helper.validate(schema, [
                [[{ a: 1 }, {}, 3], false, null, {
                    message: '"value" must not be a sparse array. "value" at position 2 fails because ["2" must be an object]',
                    details: [
                        {
                            message: '"value" must not be a sparse array',
                            path: [1],
                            type: "array.sparse",
                            context: { label: "value", key: 1 }
                        },
                        {
                            message: '"2" must be an object',
                            path: [2],
                            type: "object.base",
                            context: { label: 2, key: 2 }
                        }
                    ]
                }]
            ]);
        });

        it("errors on undefined value after validation with required", () => {

            const schema = model.array().items(model.object().empty({}).required());

            Helper.validate(schema, [
                [[{}, { c: 3 }], false, null, {
                    message: '"value" at position 0 fails because ["0" is required]',
                    details: [{
                        message: '"0" is required',
                        path: [0],
                        type: "any.required",
                        context: { label: 0, key: 0 }
                    }]
                }]
            ]);
        });

        it("errors on undefined value after custom validation with required", () => {

            const customJoi = model.extend({
                name: "myType",
                rules: [
                    {
                        name: "foo",
                        validate(params, value, state, options) {

                            return undefined;
                        }
                    }
                ]
            });

            const schema = model.array().items(customJoi.myType().foo().required());

            Helper.validate(schema, [
                [[{}, { c: 3 }], false, null, {
                    message: '"value" must not be a sparse array',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [0],
                        type: "array.sparse",
                        context: { label: "value", key: 0 }
                    }]
                }]
            ]);
        });

        it("errors on undefined value after custom validation with required and abortEarly false", () => {

            const customJoi = model.extend({
                name: "myType",
                rules: [
                    {
                        name: "foo",
                        validate(params, value, state, options) {

                            return undefined;
                        }
                    }
                ]
            });

            const schema = model.array().items(customJoi.myType().foo().required()).options({ abortEarly: false });

            Helper.validate(schema, [
                [[{}, { c: 3 }], false, null, {
                    message: '"value" must not be a sparse array. "value" must not be a sparse array',
                    details: [
                        {
                            message: '"value" must not be a sparse array',
                            path: [0],
                            type: "array.sparse",
                            context: { label: "value", key: 0 }
                        },
                        {
                            message: '"value" must not be a sparse array',
                            path: [1],
                            type: "array.sparse",
                            context: { label: "value", key: 1 }
                        }
                    ]
                }]
            ]);
        });

        it("errors on undefined value after validation with required and abortEarly false", () => {

            const schema = model.array().items(model.object().empty({}).required()).options({ abortEarly: false });

            Helper.validate(schema, [
                [[{}, 3], false, null, {
                    message: '"value" at position 0 fails because ["0" is required]. "value" at position 1 fails because ["1" must be an object]. "value" does not contain 1 required value(s)',
                    details: [
                        {
                            message: '"0" is required',
                            path: [0],
                            type: "any.required",
                            context: { label: 0, key: 0 }
                        },
                        {
                            message: '"1" must be an object',
                            path: [1],
                            type: "object.base",
                            context: { label: 1, key: 1 }
                        },
                        {
                            message: '"value" does not contain 1 required value(s)',
                            path: [],
                            type: "array.includesRequiredUnknowns",
                            context: { unknownMisses: 1, label: "value", key: undefined }
                        }
                    ]
                }]
            ]);
        });

        it("errors on undefined value after validation with ordered", () => {

            const schema = model.array().ordered(model.object().empty({}));

            Helper.validate(schema, [
                [[{}], false, null, {
                    message: '"value" must not be a sparse array',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [0],
                        type: "array.sparse",
                        context: { label: "value", key: 0 }
                    }]
                }]
            ]);
        });

        it("errors on undefined value after validation with ordered and abortEarly false", () => {

            const schema = model.array().ordered(model.object().empty({})).options({ abortEarly: false });

            Helper.validate(schema, [
                [[{}, 3], false, null, {
                    message: '"value" must not be a sparse array. "value" at position 1 fails because array must contain at most 1 items',
                    details: [
                        {
                            message: '"value" must not be a sparse array',
                            path: [0],
                            type: "array.sparse",
                            context: { label: "value", key: 0 }
                        },
                        {
                            message: '"value" at position 1 fails because array must contain at most 1 items',
                            path: [1],
                            type: "array.orderedLength",
                            context: { pos: 1, limit: 1, label: "value", key: 1 }
                        }
                    ]
                }]
            ]);
        });

        it("validates on undefined value with sparse", () => {

            const schema = model.array().items(model.number()).sparse();

            Helper.validate(schema, [
                [[undefined], true],
                [[2, undefined], true]
            ]);
        });

        it("validates on undefined value after validation", () => {

            const schema = model.array().items(model.object().empty({})).sparse();

            Helper.validate(schema, [
                [[{ a: 1 }, {}, { c: 3 }], true, null, [{ a: 1 }, undefined, { c: 3 }]]
            ]);
        });

        it("validates on undefined value after validation with required", () => {

            const schema = model.array().items(model.object().empty({}).required()).sparse();

            Helper.validate(schema, [
                [[{ a: 1 }, {}, { c: 3 }], false, null, {
                    message: '"value" at position 1 fails because ["1" is required]',
                    details: [{
                        message: '"1" is required',
                        path: [1],
                        type: "any.required",
                        context: { label: 1, key: 1 }
                    }]
                }]
            ]);
        });

        it("validates on undefined value after validation with ordered", () => {

            const schema = model.array().ordered(model.object().empty({})).sparse();

            Helper.validate(schema, [
                [[{}], true, null, [undefined]]
            ]);
        });

        it("switches the sparse flag", () => {

            const schema = model.array().sparse();
            const desc = schema.describe();
            expect(desc).to.eql({
                type: "array",
                flags: { sparse: true }
            });
        });

        it("switches the sparse flag with explicit value", () => {

            const schema = model.array().sparse(true);
            const desc = schema.describe();
            expect(desc).to.eql({
                type: "array",
                flags: { sparse: true }
            });
        });

        it("switches the sparse flag back", () => {

            const schema = model.array().sparse().sparse(false);
            const desc = schema.describe();
            expect(desc).to.eql({
                type: "array",
                flags: { sparse: false }
            });
        });

        it("avoids unnecessary cloning when called twice", () => {

            const schema = model.array().sparse();
            expect(schema.sparse()).to.equal(schema);
        });
    });

    describe("single()", () => {

        it("should allow a single element", () => {

            const schema = model.array().items(model.number()).items(model.boolean().forbidden()).single();

            Helper.validate(schema, [
                [[1, 2, 3], true],
                [1, true],
                [["a"], false, null, {
                    message: '"value" at position 0 fails because ["0" must be a number]',
                    details: [{
                        message: '"0" must be a number',
                        path: [0],
                        type: "number.base",
                        context: { label: 0, key: 0 }
                    }]
                }],
                ["a", false, null, {
                    message: 'single value of "value" fails because ["value" must be a number]',
                    details: [{
                        message: '"value" must be a number',
                        path: [],
                        type: "number.base",
                        context: { label: "value", key: undefined }
                    }]
                }],
                [true, false, null, {
                    message: 'single value of "value" contains an excluded value',
                    details: [{
                        message: 'single value of "value" contains an excluded value',
                        path: [],
                        type: "array.excludesSingle",
                        context: { pos: 0, value: true, label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("should allow a single element with multiple types", () => {

            const schema = model.array().items(model.number(), model.string()).single();

            Helper.validate(schema, [
                [[1, 2, 3], true],
                [1, true],
                [[1, "a"], true],
                ["a", true],
                [true, false, null, {
                    message: 'single value of "value" does not match any of the allowed types',
                    details: [{
                        message: 'single value of "value" does not match any of the allowed types',
                        path: [],
                        type: "array.includesSingle",
                        context: { pos: 0, value: true, label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("should allow nested arrays", () => {

            const schema = model.array().items(model.array().items(model.number())).single();

            Helper.validate(schema, [
                [[[1], [2], [3]], true],
                [[1, 2, 3], true],
                [[["a"]], false, null, {
                    message: '"value" at position 0 fails because ["0" at position 0 fails because ["0" must be a number]]',
                    details: [{
                        message: '"0" must be a number',
                        path: [0, 0],
                        type: "number.base",
                        context: { label: 0, key: 0 }
                    }]
                }],
                [["a"], false, null, {
                    message: '"value" at position 0 fails because ["0" must be an array]',
                    details: [{
                        message: '"0" must be an array',
                        path: [0],
                        type: "array.base",
                        context: { label: 0, key: 0 }
                    }]
                }],
                ["a", false, null, {
                    message: 'single value of "value" fails because ["value" must be an array]',
                    details: [{
                        message: '"value" must be an array',
                        path: [],
                        type: "array.base",
                        context: { label: "value", key: undefined }
                    }]
                }],
                [1, false, null, {
                    message: 'single value of "value" fails because ["value" must be an array]',
                    details: [{
                        message: '"value" must be an array',
                        path: [],
                        type: "array.base",
                        context: { label: "value", key: undefined }
                    }]
                }],
                [true, false, null, {
                    message: 'single value of "value" fails because ["value" must be an array]',
                    details: [{
                        message: '"value" must be an array',
                        path: [],
                        type: "array.base",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("should allow nested arrays with multiple types", () => {
            const schema = model.array().items(model.array().items(model.number(), model.boolean())).single();

            Helper.validate(schema, [
                [[[1, true]], true],
                [[1, true], true],
                [[[1, "a"]], false, null, {
                    message: '"value" at position 0 fails because ["0" at position 1 does not match any of the allowed types]',
                    details: [{
                        message: '"0" at position 1 does not match any of the allowed types',
                        path: [0, 1],
                        type: "array.includes",
                        context: { pos: 1, value: "a", label: 0, key: 1 }
                    }]
                }],
                [[1, "a"], false, null, {
                    message: '"value" at position 0 fails because ["0" must be an array]',
                    details: [{
                        message: '"0" must be an array',
                        path: [0],
                        type: "array.base",
                        context: { label: 0, key: 0 }
                    }]
                }]
            ]);
        });

        it("switches the single flag with explicit value", () => {
            const schema = model.array().single(true);
            const desc = schema.describe();
            expect(desc).to.eql({
                type: "array",
                flags: { sparse: false, single: true }
            });
        });

        it("switches the single flag back", () => {
            const schema = model.array().single().single(false);
            const desc = schema.describe();
            expect(desc).to.eql({
                type: "array",
                flags: { sparse: false, single: false }
            });
        });

        it("avoids unnecessary cloning when called twice", () => {
            const schema = model.array().single();
            expect(schema.single()).to.equal(schema);
        });
    });

    describe("options()", () => {

        it("respects stripUnknown", async () => {
            const schema = model.array().items(model.string()).options({ stripUnknown: true });
            const value = await schema.validate(["one", "two", 3, 4, true, false]);
            expect(value).to.eql(["one", "two"]);
        });

        it("respects stripUnknown (as an object)", async () => {

            const schema = model.array().items(model.string()).options({ stripUnknown: { arrays: true, objects: false } });
            const value = await schema.validate(["one", "two", 3, 4, true, false]);
            expect(value).to.eql(["one", "two"]);
        });
    });

    describe("ordered()", () => {

        it("shows path to errors in array ordered items", () => {
            expect(() => {
                model.array().ordered({
                    a: {
                        b: {
                            c: {
                                d: undefined
                            }
                        }
                    }
                });
            }).to.throw(Error, "Invalid schema content: (0.a.b.c.d)");

            expect(() => {
                model.array().ordered({ foo: "bar" }, undefined);
            }).to.throw(Error, "Invalid schema content: (1)");
        });

        it("validates input against items in order", async () => {

            const schema = model.array().ordered([model.string().required(), model.number().required()]);
            const input = ["s1", 2];
            const value = await schema.validate(input);
            expect(value).to.eql(["s1", 2]);
        });

        it("validates input with optional item", async () => {

            const schema = model.array().ordered([model.string().required(), model.number().required(), model.number()]);
            const input = ["s1", 2, 3];

            const value = await schema.validate(input);
            expect(value).to.eql(["s1", 2, 3]);
        });

        it("validates input without optional item", async () => {

            const schema = model.array().ordered([model.string().required(), model.number().required(), model.number()]);
            const input = ["s1", 2];

            const value = await schema.validate(input);
            expect(value).to.eql(["s1", 2]);
        });

        it("validates input without optional item", async () => {

            const schema = model.array().ordered([model.string().required(), model.number().required(), model.number()]).sparse(true);
            const input = ["s1", 2, undefined];

            const value = await schema.validate(input);
            expect(value).to.eql(["s1", 2, undefined]);
        });

        it("validates input without optional item in a sparse array", async () => {

            const schema = model.array().ordered([model.string().required(), model.number(), model.number().required()]).sparse(true);
            const input = ["s1", undefined, 3];

            const value = await schema.validate(input);
            expect(value).to.eql(["s1", undefined, 3]);
        });

        it("validates when input matches ordered items and matches regular items", async () => {

            const schema = model.array().ordered([model.string().required(), model.number().required()]).items(model.number());
            const input = ["s1", 2, 3, 4, 5];
            const value = await schema.validate(input);
            expect(value).to.eql(["s1", 2, 3, 4, 5]);
        });

        it("errors when input does not match ordered items", async () => {

            const schema = model.array().ordered([model.number().required(), model.string().required()]);
            const input = ["s1", 2];
            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"0" must be a number',
                path: [0],
                type: "number.base",
                context: { label: 0, key: 0 }
            }]);
        });

        it("errors when input has more items than ordered items", async () => {

            const schema = model.array().ordered([model.number().required(), model.string().required()]);
            const input = [1, "s2", 3];
            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"value" at position 2 fails because array must contain at most 2 items',
                path: [2],
                type: "array.orderedLength",
                context: { pos: 2, limit: 2, label: "value", key: 2 }
            }]);
        });

        it("errors when input has more items than ordered items with abortEarly = false", async () => {

            const schema = model.array().ordered([model.string(), model.number()]).options({ abortEarly: false });
            const input = [1, 2, 3, 4, 5];
            const err = await assert.throws(async () => schema.validate(input));
            assert.instanceOf(err, Error, '"value" at position 0 fails because ["0" must be a string]. "value" at position 2 fails because array must contain at most 2 items. "value" at position 3 fails because array must contain at most 2 items. "value" at position 4 fails because array must contain at most 2 items');
            expect(err.details).to.have.length(4);
            expect(err.details).to.eql([
                {
                    message: '"0" must be a string',
                    path: [0],
                    type: "string.base",
                    context: { value: 1, label: 0, key: 0 }
                },
                {
                    message: '"value" at position 2 fails because array must contain at most 2 items',
                    path: [2],
                    type: "array.orderedLength",
                    context: { pos: 2, limit: 2, label: "value", key: 2 }
                },
                {
                    message: '"value" at position 3 fails because array must contain at most 2 items',
                    path: [3],
                    type: "array.orderedLength",
                    context: { pos: 3, limit: 2, label: "value", key: 3 }
                },
                {
                    message: '"value" at position 4 fails because array must contain at most 2 items',
                    path: [4],
                    type: "array.orderedLength",
                    context: { pos: 4, limit: 2, label: "value", key: 4 }
                }
            ]);
        });

        it("errors when input has less items than ordered items", async () => {

            const schema = model.array().ordered([model.number().required(), model.string().required()]);
            const input = [1];
            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"value" does not contain 1 required value(s)',
                path: [],
                type: "array.includesRequiredUnknowns",
                context: { unknownMisses: 1, label: "value", key: undefined }
            }]);
        });

        it("errors when input matches ordered items but not matches regular items", async () => {

            const schema = model.array().ordered([model.string().required(), model.number().required()]).items(model.number()).options({ abortEarly: false });
            const input = ["s1", 2, 3, 4, "s5"];
            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"4" must be a number',
                path: [4],
                type: "number.base",
                context: { label: 4, key: 4 }
            }]);
        });

        it("errors when input does not match ordered items but matches regular items", async () => {
            const schema = model.array().ordered([model.string(), model.number()]).items(model.number()).options({ abortEarly: false });
            const input = [1, 2, 3, 4, 5];
            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details).to.eql([{
                message: '"0" must be a string',
                path: [0],
                type: "string.base",
                context: { value: 1, label: 0, key: 0 }
            }]);
        });

        it("errors when input does not match ordered items not matches regular items", async () => {
            const schema = model.array().ordered([model.string(), model.number()]).items(model.string()).options({ abortEarly: false });
            const input = [1, 2, 3, 4, 5];
            const err = await assert.throws(async () => schema.validate(input));
            assert.instanceOf(err, Error, '"value" at position 0 fails because ["0" must be a string]. "value" at position 2 fails because ["2" must be a string]. "value" at position 3 fails because ["3" must be a string]. "value" at position 4 fails because ["4" must be a string]');
            expect(err.details).to.have.length(4);
            expect(err.details).to.eql([
                {
                    message: '"0" must be a string',
                    path: [0],
                    type: "string.base",
                    context: { value: 1, label: 0, key: 0 }
                },
                {
                    message: '"2" must be a string',
                    path: [2],
                    type: "string.base",
                    context: { value: 3, label: 2, key: 2 }
                },
                {
                    message: '"3" must be a string',
                    path: [3],
                    type: "string.base",
                    context: { value: 4, label: 3, key: 3 }
                },
                {
                    message: '"4" must be a string',
                    path: [4],
                    type: "string.base",
                    context: { value: 5, label: 4, key: 4 }
                }
            ]);
        });

        it("errors but continues when abortEarly is set to false", async () => {

            const schema = model.array().ordered([model.number().required(), model.string().required()]).options({ abortEarly: false });
            const input = ["s1", 2];
            const err = await assert.throws(async () => schema.validate(input));
            assert.instanceOf(err, Error, '"value" at position 0 fails because ["0" must be a number]. "value" at position 1 fails because ["1" must be a string]');
            expect(err.details).to.have.length(2);
            expect(err.details).to.eql([
                {
                    message: '"0" must be a number',
                    path: [0],
                    type: "number.base",
                    context: { label: 0, key: 0 }
                },
                {
                    message: '"1" must be a string',
                    path: [1],
                    type: "string.base",
                    context: { value: 2, label: 1, key: 1 }
                }
            ]);
        });

        it("errors on sparse arrays and continues when abortEarly is set to false", () => {

            const schema = model.array().ordered(
                model.number().min(0),
                model.string().min(2),
                model.number().max(0),
                model.string().max(3)
            ).options({ abortEarly: false });

            Helper.validate(schema, [
                [[0, "ab", 0, "ab"], true],
                [[undefined, "foo", 2, "bar"], false, null, {
                    message: '"value" must not be a sparse array. "value" at position 2 fails because ["2" must be less than or equal to 0]',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [0],
                        type: "array.sparse",
                        context: { key: 0, label: "value" }
                    }, {
                        message: '"2" must be less than or equal to 0',
                        path: [2],
                        type: "number.max",
                        context: { key: 2, label: 2, limit: 0, value: 2 }
                    }]
                }],
                [[undefined, "foo", 2, undefined], false, null, {
                    message: '"value" must not be a sparse array. "value" at position 2 fails because ["2" must be less than or equal to 0]. "value" must not be a sparse array',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [0],
                        type: "array.sparse",
                        context: { key: 0, label: "value" }
                    }, {
                        message: '"2" must be less than or equal to 0',
                        path: [2],
                        type: "number.max",
                        context: { key: 2, label: 2, limit: 0, value: 2 }
                    }, {
                        message: '"value" must not be a sparse array',
                        path: [3],
                        type: "array.sparse",
                        context: { key: 3, label: "value" }
                    }]
                }]
            ]);
        });

        it("errors on forbidden items and continues when abortEarly is set to false", () => {

            const schema = model.array().items(model.bool().forbidden()).ordered(
                model.number().min(0),
                model.string().min(2),
                model.number().max(0),
                model.string().max(3)
            ).options({ abortEarly: false });

            Helper.validate(schema, [
                [[0, "ab", 0, "ab"], true],
                [[undefined, "foo", 2, "bar"], false, null, {
                    message: '"value" must not be a sparse array. "value" at position 2 fails because ["2" must be less than or equal to 0]',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [0],
                        type: "array.sparse",
                        context: { key: 0, label: "value" }
                    }, {
                        message: '"2" must be less than or equal to 0',
                        path: [2],
                        type: "number.max",
                        context: { key: 2, label: 2, limit: 0, value: 2 }
                    }]
                }],
                [[undefined, "foo", 2, undefined], false, null, {
                    message: '"value" must not be a sparse array. "value" at position 2 fails because ["2" must be less than or equal to 0]. "value" must not be a sparse array',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [0],
                        type: "array.sparse",
                        context: { key: 0, label: "value" }
                    }, {
                        message: '"2" must be less than or equal to 0',
                        path: [2],
                        type: "number.max",
                        context: { key: 2, label: 2, limit: 0, value: 2 }
                    }, {
                        message: '"value" must not be a sparse array',
                        path: [3],
                        type: "array.sparse",
                        context: { key: 3, label: "value" }
                    }]
                }],
                [[undefined, false, 2, undefined], false, null, {
                    message: '"value" must not be a sparse array. "value" at position 1 contains an excluded value. "value" at position 2 fails because ["2" must be less than or equal to 0]. "value" must not be a sparse array',
                    details: [{
                        message: '"value" must not be a sparse array',
                        path: [0],
                        type: "array.sparse",
                        context: { key: 0, label: "value" }
                    }, {
                        message: '"value" at position 1 contains an excluded value',
                        path: [1],
                        type: "array.excludes",
                        context: { key: 1, label: "value", pos: 1, value: false }
                    }, {
                        message: '"2" must be less than or equal to 0',
                        path: [2],
                        type: "number.max",
                        context: { key: 2, label: 2, limit: 0, value: 2 }
                    }, {
                        message: '"value" must not be a sparse array',
                        path: [3],
                        type: "array.sparse",
                        context: { key: 3, label: "value" }
                    }]
                }]
            ]);
        });

        it("strips item", async () => {

            const schema = model.array().ordered([model.string().required(), model.number().strip(), model.number().required()]);
            const input = ["s1", 2, 3];
            const value = await schema.validate(input);
            expect(value).to.eql(["s1", 3]);
        });

        it("strips multiple items", async () => {

            const schema = model.array().ordered([model.string().strip(), model.number(), model.number().strip()]);
            const input = ["s1", 2, 3];
            const value = await schema.validate(input);
            expect(value).to.eql([2]);
        });
    });
});
