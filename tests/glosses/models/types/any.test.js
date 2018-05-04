import { validate } from "../helper";

const {
    model
} = adone;

describe("any", () => {

    it("validates with a callback", () => {

        return new Promise((resolve, reject) => {

            const schema = model.any();
            schema.validate("foo", (err, value) => {

                if (err) {
                    return reject(err);
                }

                resolve(value);
            });
        }).then((value) => {

            expect(value).to.equal("foo");
        });
    });

    it("can be called on its own", () => {

        const any = model.any;
        expect(() => any()).to.throw("Must be invoked on a Joi instance.");
    });

    it("should throw an exception if arguments were passed.", () => {

        expect(
            () => model.any("invalid argument.")
        ).to.throw("model.any() does not allow arguments.");
    });

    describe("equal()", () => {

        it("validates valid values", () => {

            validate(model.equal(4), [
                [4, true],
                [5, false, null, {
                    message: '"value" must be one of [4]',
                    details: [{
                        message: '"value" must be one of [4]',
                        path: [],
                        type: "any.allowOnly",
                        context: { valids: [4], label: "value", key: undefined }
                    }]
                }]
            ]);
        });
    });

    describe("not()", () => {

        it("validates invalid values", () => {

            validate(model.not(5), [
                [4, true],
                [5, false, null, {
                    message: '"value" contains an invalid value',
                    details: [{
                        message: '"value" contains an invalid value',
                        path: [],
                        type: "any.invalid",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);
        });
    });

    describe("exist()", () => {

        it("validates required values", () => {

            validate(model.exist(), [
                [4, true],
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
    });

    describe("strict()", () => {

        it("validates without converting", () => {

            const schema = model.object({
                array: model.array().items(model.string().min(5), model.number().min(3))
            }).strict();

            validate(schema, [
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
                [{ array: ["12345", 3] }, true],
                [{ array: ["3"] }, false, null, {
                    message: 'child "array" fails because ["array" at position 0 does not match any of the allowed types]',
                    details: [{
                        message: '"array" at position 0 does not match any of the allowed types',
                        path: ["array", 0],
                        type: "array.includes",
                        context: { pos: 0, value: "3", label: "array", key: 0 }
                    }]

                }],
                [{ array: [1] }, false, null, {
                    message: 'child "array" fails because ["array" at position 0 does not match any of the allowed types]',
                    details: [{
                        message: '"array" at position 0 does not match any of the allowed types',
                        path: ["array", 0],
                        type: "array.includes",
                        context: { pos: 0, value: 1, label: "array", key: 0 }
                    }]

                }]
            ]);
        });

        it("can be disabled", () => {

            const schema = model.object({
                array: model.array().items(model.string().min(5), model.number().min(3))
            }).strict().strict(false);

            validate(schema, [
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
                [{ array: ["12345", 3] }, true],
                [{ array: ["3"] }, true],
                [{ array: [1] }, false, null, {
                    message: 'child "array" fails because ["array" at position 0 does not match any of the allowed types]',
                    details: [{
                        message: '"array" at position 0 does not match any of the allowed types',
                        path: ["array", 0],
                        type: "array.includes",
                        context: { pos: 0, value: 1, label: "array", key: 0 }
                    }]
                }]
            ]);
        });
    });

    describe("options()", () => {

        it("adds to existing options", async () => {

            const schema = model.object({ b: model.number().strict().options({ convert: true }) });
            const input = { b: "2" };
            const value = await schema.validate(input);
            expect(value.b).to.equal(2);
        });

        it("throws with an invalid option", () => {

            expect(() => {

                model.any().options({ foo: "bar" });
            }).to.throw('"foo" is not allowed');
        });

        it("throws with an invalid option type", () => {

            expect(() => {

                model.any().options({ convert: "yes" });
            }).to.throw('"convert" must be a boolean');
        });

        it("throws with an invalid option value", () => {

            expect(() => {

                model.any().options({ presence: "yes" });
            }).to.throw('"presence" must be one of [required, optional, forbidden, ignore]');
        });

        it("does not throw with multiple options including presence key", () => {

            expect(() => {

                model.any().options({ presence: "optional", raw: true });
            }).to.not.throw();
        });

        it("describes a schema with options", () => {

            const schema = model.any().options({ abortEarly: false, convert: false });
            const description = schema.describe();

            expect(description).to.eql({ type: "any", options: { abortEarly: false, convert: false } });
        });

        it("describes an alternatives schema with options", () => {

            const schema = model.number().min(10).when("a", { is: 5, then: model.number().max(20).required() }).options({ abortEarly: false, convert: false }).describe();
            expect(schema).to.eql({
                type: "alternatives",
                flags: {
                    presence: "ignore"
                },
                options: {
                    abortEarly: false,
                    convert: false
                },
                base: {
                    type: "number",
                    invalids: [
                        Infinity,
                        -Infinity
                    ],
                    rules: [
                        { arg: 10, name: "min" }
                    ]
                },
                alternatives: [{
                    ref: "ref:a",
                    is: {
                        type: "number",
                        flags: {
                            allowOnly: true,
                            presence: "required"
                        },
                        valids: [5],
                        invalids: [Infinity, -Infinity]
                    },
                    then: {
                        type: "number",
                        flags: {
                            presence: "required"
                        },
                        invalids: [Infinity, -Infinity],
                        rules: [{ name: "min", arg: 10 }, { name: "max", arg: 20 }]
                    }
                }]
            });
        });
    });

    describe("label()", () => {

        it("adds to existing options", async () => {

            const schema = model.object({ b: model.string().email().label("Custom label") });
            const input = { b: "not_a_valid_email" };
            const err = await assert.throws(async () => schema.validate(input));
            expect(err.details[0]).to.eql({
                message: '"Custom label" must be a valid email',
                path: ["b"],
                type: "string.email",
                context: { value: "not_a_valid_email", label: "Custom label", key: "b" }
            });
        });

        it("throws when label is missing", () => {

            expect(() => {

                model.label();
            }).to.throw("Label name must be a non-empty string");
        });

        it("can describe a label", () => {

            const schema = model.object().label("lbl").describe();
            expect(schema).to.eql({ type: "object", label: "lbl", flags: {} });
        });

        it("does not leak into sub objects", async () => {

            const schema = model.object({ a: model.number() }).label("foo");
            const err = await assert.throws(async () => schema.validate({ a: "a" }));
            expect(err.message).to.equal('child "a" fails because ["a" must be a number]');
            expect(err.details).to.eql([{
                message: '"a" must be a number',
                path: ["a"],
                type: "number.base",
                context: { label: "a", key: "a" }
            }]);
        });

        it("does not leak into sub objects from an array", async () => {

            const schema = model.array().items(model.object({ a: model.number() }).label("foo")).label("bar");
            const err = await assert.throws(async () => schema.validate([{ a: "a" }]));
            expect(err).to.exist();
            expect(err.message).to.equal('"bar" at position 0 fails because [child "a" fails because ["a" must be a number]]');
            expect(err.details).to.eql([{
                message: '"a" must be a number',
                path: [0, "a"],
                type: "number.base",
                context: { label: "a", key: "a" }
            }]);
        });

        it("does not leak into unknown keys", async () => {

            const schema = model.object({ a: model.number() }).label("foo");
            const err = await assert.throws(async () => schema.validate({ b: "a" }));
            expect(err).to.exist();
            expect(err.message).to.equal('"b" is not allowed');
            expect(err.details).to.eql([{
                message: '"b" is not allowed',
                path: ["b"],
                type: "object.allowUnknown",
                context: { child: "b", label: "b", key: "b" }
            }]);
        });
    });

    describe("strict()", () => {

        it("adds to existing options", async () => {

            const schema = model.object({ b: model.number().options({ convert: true }).strict() });
            const input = { b: "2" };
            const err = await assert.throws(async () => schema.validate(input));
            expect(err.message).to.equal('child "b" fails because ["b" must be a number]');
            expect(err.details).to.eql([{
                message: '"b" must be a number',
                path: ["b"],
                type: "number.base",
                context: { label: "b", key: "b" }
            }]);
        });
    });

    describe("raw()", () => {

        it("gives the raw input", async () => {

            const tests = [
                [model.array(), "[1,2,3]"],
                [model.binary(), "abc"],
                [model.boolean(), false],
                [model.date(), "1970/01/01"],
                [model.number(), "12"],
                [model.object(), '{ "a": 1 }'],
                [model.any().strict(), "abc"]
            ];

            for (const test of tests) {

                const baseSchema = test[0];
                const input = test[1];
                const schemas = [
                    baseSchema.raw(),
                    baseSchema.raw(true)
                ];

                for (const schema of schemas) {

                    const value = await schema.raw().validate(input);
                    expect(value).to.equal(input);
                }
            }
        });

        it("avoids unnecessary cloning when called twice", () => {

            const schema = model.any().raw();
            expect(schema.raw()).to.equal(schema);
        });
    });

    describe("default()", () => {

        it("sets the value", async () => {

            const schema = model.object({ foo: model.string().default("test") });
            const input = {};

            const value = await schema.validate(input);
            expect(value.foo).to.equal("test");
        });

        it("throws when value is a method and no description is provided", () => {

            expect(() => {

                model.object({
                    foo: model.string().default(() => {

                        return "test";

                    })
                });
            }).to.throw();
        });

        it("allows passing description as a property of a default method", () => {

            const defaultFn = function () {

                return "test";
            };

            defaultFn.description = "test";

            expect(() => {

                model.object({ foo: model.string().default(defaultFn) });
            }).to.not.throw();
        });

        it("sets the value when passing a method", async () => {

            const schema = model.object({
                foo: model.string().default(() => {

                    return "test";
                }, "testing")
            });
            const input = {};

            const value = await schema.validate(input);
            expect(value.foo).to.equal("test");
        });

        it("executes the default method each time validate is called", async () => {

            let count = 0;
            const schema = model.object({
                foo: model.number().default(() => {

                    return ++count;
                }, "incrementer")
            });
            const input = {};

            const value = await schema.validate(input);
            expect(value.foo).to.equal(1);

            const value2 = await schema.validate(input);
            expect(value2.foo).to.equal(2);
        });

        it("passes a clone of the context if the default method accepts an argument", async () => {

            const schema = model.object({
                foo: model.string().default((context) => {

                    return `${context.bar}ing`;
                }, "testing"),
                bar: model.string()
            });
            const input = { bar: "test" };
            const value = await schema.validate(input);
            expect(value.foo).to.equal("testing");
        });

        it("does not modify the original object when modifying the clone in a default method", async () => {

            const defaultFn = function (context) {

                context.bar = "broken";
                return "test";
            };
            defaultFn.description = "testing";

            const schema = model.object({
                foo: model.string().default(defaultFn),
                bar: model.string()
            });
            const input = { bar: "test" };
            const value = await schema.validate(input);
            expect(value.bar).to.equal("test");
            expect(value.foo).to.equal("test");
        });

        it("passes undefined as the context if the default method has no parent", async () => {

            let c;
            let methodCalled = false;
            const schema = model.string().default((context) => {

                methodCalled = true;
                c = context;
                return "test";
            }, "testing");

            const value = await schema.validate(undefined);
            expect(methodCalled).to.equal(true);
            expect(c).to.equal(undefined);
            expect(value).to.equal("test");
        });

        it("allows passing a method with no description to default when the object being validated is a function", async () => {

            const defaultFn = function () {

                return "just a function";
            };

            let schema;
            expect(() => {

                schema = model.func().default(defaultFn);
            }).to.not.throw();

            const value = await schema.validate(undefined);
            expect(value).to.equal(defaultFn);
        });

        it("allows passing a method that generates a default method when validating a function", async () => {

            const defaultFn = function () {

                return "just a function";
            };

            const defaultGeneratorFn = function () {

                return defaultFn;
            };
            defaultGeneratorFn.description = "generate a default fn";

            let schema;
            expect(() => {

                schema = model.func().default(defaultGeneratorFn);
            }).to.not.throw();

            const value = await schema.validate(undefined);
            expect(value).to.equal(defaultFn);
        });

        it("allows passing a ref as a default without a description", async () => {

            const schema = model.object({
                a: model.string(),
                b: model.string().default(model.ref("a"))
            });

            const value = await schema.validate({ a: "test" });
            expect(value.a).to.equal("test");
            expect(value.b).to.equal("test");
        });

        it("ignores description when passing a ref as a default", async () => {

            const schema = model.object({
                a: model.string(),
                b: model.string().default(model.ref("a"), "this is a ref")
            });

            const value = await schema.validate({ a: "test" });
            expect(value.a).to.equal("test");
            expect(value.b).to.equal("test");
        });

        it("catches errors in default methods", async () => {

            const error = new Error("boom");
            const defaultFn = function () {

                throw error;
            };
            defaultFn.description = "broken method";

            const schema = model.string().default(defaultFn);

            const err = await assert.throws(async () => schema.validate(undefined));
            expect(err.details).to.have.length(1);
            expect(err.details).to.eql([{
                message: '"value" threw an error when running default method',
                path: [],
                type: "any.default",
                context: { error, label: "value", key: undefined }
            }]);
        });

        it("should not overide a value when value is given", async () => {

            const schema = model.object({ foo: model.string().default("bar") });
            const input = { foo: "test" };

            const value = await schema.validate(input);
            expect(value.foo).to.equal("test");
        });

        it("sets value based on condition (outer)", async () => {

            const schema = model.object({
                a: model.boolean(),
                b: model.boolean().default(false).when("a", { is: true, then: model.required(), otherwise: model.forbidden() })
            });

            const value = await schema.validate({ a: false });
            expect(value.b).to.equal(false);
        });

        it("sets value based on condition (inner)", async () => {

            const schema = model.object({
                a: model.boolean(),
                b: model.boolean().when("a", { is: true, then: model.default(false), otherwise: model.forbidden() })
            });

            const value = await schema.validate({ a: true });
            expect(value.b).to.equal(false);
        });

        it("sets value based on multiple conditions (without otherwise)", () => {

            const schema = model.object({
                a: model.number().required(),
                b: model.number()
                    .when("a", { is: 0, then: model.valid(1) })
                    .when("a", { is: 1, then: model.valid(2) })
                    .when("a", { is: 2, then: model.valid(3) })
            });

            validate(schema, [
                [{ a: 0, b: 1 }, true],
                [{ a: 0, b: 2 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [1]]',
                    details: [{
                        message: '"b" must be one of [1]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [1], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: 2 }, true],
                [{ a: 1, b: 3 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [2]]',
                    details: [{
                        message: '"b" must be one of [2]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [2], label: "b", key: "b" }
                    }]
                }],
                [{ a: 2, b: 3 }, true],
                [{ a: 2, b: 4 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [3]]',
                    details: [{
                        message: '"b" must be one of [3]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [3], label: "b", key: "b" }
                    }]
                }],
                [{ a: 42, b: 128 }, true]
            ]);
        });

        it("sets value based on multiple conditions (with otherwise)", () => {

            const schema = model.object({
                a: model.number().required(),
                b: model.number()
                    .when("a", { is: 0, then: model.valid(1) })
                    .when("a", { is: 1, otherwise: model.valid(2) })
                    .when("a", { is: 2, then: model.valid(3) })
            });

            validate(schema, [
                [{ a: 0, b: 1 }, true],
                [{ a: 0, b: 2 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [1]]',
                    details: [{
                        message: '"b" must be one of [1]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [1], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: 2 }, true],
                [{ a: 1, b: 3 }, true],
                [{ a: 2, b: 3 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [2]]',
                    details: [{
                        message: '"b" must be one of [2]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [2], label: "b", key: "b" }
                    }]
                }],
                [{ a: 2, b: 2 }, true],
                [{ a: 42, b: 128 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [2]]',
                    details: [{
                        message: '"b" must be one of [2]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [2], label: "b", key: "b" }
                    }]
                }],
                [{ a: 42, b: 2 }, true]
            ]);
        });

        it("sets value based on multiple conditions (with base rules)", () => {

            const schema = model.object({
                a: model.number().required(),
                b: model.number().valid(10)
                    .when("a", { is: 0, then: model.valid(1) })
                    .when("a", { is: 1, then: model.valid(2) })
                    .when("a", { is: 2, then: model.valid(3) })
            });

            validate(schema, [
                [{ a: 0, b: 1 }, true],
                [{ a: 0, b: 2 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [10, 1]]',
                    details: [{
                        message: '"b" must be one of [10, 1]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [10, 1], label: "b", key: "b" }
                    }]
                }],
                [{ a: 0, b: 10 }, true],
                [{ a: 1, b: 2 }, true],
                [{ a: 1, b: 3 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [10, 2]]',
                    details: [{
                        message: '"b" must be one of [10, 2]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [10, 2], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: 10 }, true],
                [{ a: 2, b: 3 }, true],
                [{ a: 2, b: 4 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [10, 3]]',
                    details: [{
                        message: '"b" must be one of [10, 3]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [10, 3], label: "b", key: "b" }
                    }]
                }],
                [{ a: 2, b: 10 }, true],
                [{ a: 42, b: 128 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [10]]',
                    details: [{
                        message: '"b" must be one of [10]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [10], label: "b", key: "b" }
                    }]
                }],
                [{ a: 42, b: 10 }, true]
            ]);
        });

        it("creates deep defaults", () => {

            const schema = model.object({
                a: model.number().default(42),
                b: model.object({
                    c: model.boolean().default(true),
                    d: model.string()
                }).default()
            }).default();

            validate(schema, [
                [undefined, true, null, { a: 42, b: { c: true } }],
                [{ a: 24 }, true, null, { a: 24, b: { c: true } }]
            ]);
        });

        it("should not affect objects other than object when called without an argument", () => {

            const schema = model.object({
                a: model.number().default()
            }).default();

            validate(schema, [
                [undefined, true, null, {}],
                [{ a: 24 }, true, null, { a: 24 }]
            ]);
        });

        it("should set default value as a clone", async () => {

            const defaultValue = { bar: "val" };
            const schema = model.object({ foo: model.object().default(defaultValue) });
            const input = {};

            const value = await schema.validate(input);
            expect(value.foo).to.not.equal(defaultValue);
            assert.deepEqual(value.foo, { bar: "val" });

            value.foo.bar = "mutated";

            const value2 = await schema.validate(input);
            expect(value2.foo).to.not.equal(defaultValue);
            assert.deepEqual(value2.foo, { bar: "val" });
        });

        it("should not apply default values if the noDefaults option is enquire", async () => {

            const schema = model.object({
                a: model.string().default("foo"),
                b: model.number()
            });

            const input = { b: 42 };

            const value = await model.validate(input, schema, { noDefaults: true });
            expect(value.a).to.not.exist();
            expect(value.b).to.be.equal(42);
        });

        it("should not apply default values from functions if the noDefaults option is enquire", async () => {

            const func = function (context) {

                return "foo";
            };

            func.description = "test parameter";

            const schema = model.object({
                a: model.string().default(func),
                b: model.number()
            });

            const input = { b: 42 };

            const value = await model.validate(input, schema, { noDefaults: true });
            expect(value.a).to.not.exist();
            expect(value.b).to.be.equal(42);
        });

        it("should not apply default values from references if the noDefaults option is enquire", async () => {

            const schema = model.object({
                a: model.string().default(model.ref("b")),
                b: model.number()
            });

            const input = { b: 42 };

            const value = await model.validate(input, schema, { noDefaults: true });
            expect(value.a).to.not.exist();
            expect(value.b).to.be.equal(42);
        });

        it("should be able to support both empty and noDefaults", async () => {

            const schema = model.object({
                a: model.string().empty("foo").default("bar"),
                b: model.number()
            });

            const input = { a: "foo", b: 42 };

            const value = await model.validate(input, schema, { noDefaults: true });
            expect(value.a).to.not.exist();
            expect(value.b).to.be.equal(42);
        });
    });

    describe("required", () => {

        it("avoids unnecessary cloning when called twice", () => {

            const schema = model.any().required();
            expect(schema.required()).to.equal(schema);
        });
    });

    describe("optional()", () => {

        it("validates optional with default required", () => {

            const schema = model.object({
                a: model.any(),
                b: model.any(),
                c: {
                    d: model.any()
                }
            }).options({ presence: "required" });

            validate(schema, [
                [{ a: 5 }, false, null, {
                    message: 'child "b" fails because ["b" is required]',
                    details: [{
                        message: '"b" is required',
                        path: ["b"],
                        type: "any.required",
                        context: { label: "b", key: "b" }
                    }]
                }],
                [{ a: 5, b: 6 }, false, null, {
                    message: 'child "c" fails because ["c" is required]',
                    details: [{
                        message: '"c" is required',
                        path: ["c"],
                        type: "any.required",
                        context: { label: "c", key: "c" }
                    }]
                }],
                [{ a: 5, b: 6, c: {} }, false, null, {
                    message: 'child "c" fails because [child "d" fails because ["d" is required]]',
                    details: [{
                        message: '"d" is required',
                        path: ["c", "d"],
                        type: "any.required",
                        context: { label: "d", key: "d" }
                    }]
                }],
                [{ a: 5, b: 6, c: { d: 7 } }, true],
                [{}, false, null, {
                    message: 'child "a" fails because ["a" is required]',
                    details: [{
                        message: '"a" is required',
                        path: ["a"],
                        type: "any.required",
                        context: { label: "a", key: "a" }
                    }]
                }],
                [{ b: 5 }, false, null, {
                    message: 'child "a" fails because ["a" is required]',
                    details: [{
                        message: '"a" is required',
                        path: ["a"],
                        type: "any.required",
                        context: { label: "a", key: "a" }
                    }]
                }]
            ]);
        });

        it("avoids unnecessary cloning when called twice", () => {

            const schema = model.any().optional();
            expect(schema.optional()).to.eql(schema);
        });
    });

    describe("forbidden()", () => {

        it("validates forbidden", () => {

            const schema = {
                a: model.number(),
                b: model.forbidden()
            };

            validate(schema, [
                [{ a: 5 }, true],
                [{ a: 5, b: 6 }, false, null, {
                    message: 'child "b" fails because ["b" is not allowed]',
                    details: [{
                        message: '"b" is not allowed',
                        path: ["b"],
                        type: "any.unknown",
                        context: { label: "b", key: "b" }
                    }]
                }],
                [{ a: "a" }, false, null, {
                    message: 'child "a" fails because ["a" must be a number]',
                    details: [{
                        message: '"a" must be a number',
                        path: ["a"],
                        type: "number.base",
                        context: { label: "a", key: "a" }
                    }]
                }],
                [{}, true],
                [{ b: undefined }, true],
                [{ b: null }, false, null, {
                    message: 'child "b" fails because ["b" is not allowed]',
                    details: [{
                        message: '"b" is not allowed',
                        path: ["b"],
                        type: "any.unknown",
                        context: { label: "b", key: "b" }
                    }]
                }]
            ]);
        });

        it("avoids unnecessary cloning when called twice", () => {

            const schema = model.any().forbidden();
            expect(schema.forbidden()).to.equal(schema);
        });
    });

    describe("strip()", () => {

        it("validates and returns undefined", async () => {

            const schema = model.string().strip();

            const value = await schema.validate("test");
            expect(value).to.not.exist();
        });

        it("validates and returns an error", async () => {

            const schema = model.string().strip();

            const err = await assert.throws(async () => schema.validate(1));
            expect(err.message).to.equal('"value" must be a string');
            expect(err.details).to.eql([{
                message: '"value" must be a string',
                path: [],
                type: "string.base",
                context: { value: 1, label: "value", key: undefined }
            }]);
        });

        it("avoids unnecessary cloning when called twice", () => {

            const schema = model.any().strip();
            expect(schema.strip()).to.equal(schema);
        });
    });

    describe("description()", () => {

        it("sets the description", () => {

            const b = model.description("my description");
            expect(b._description).to.equal("my description");
        });

        it("throws when description is missing", () => {

            expect(() => {

                model.description();
            }).to.throw("Description must be a non-empty string");
        });
    });

    describe("notes()", () => {

        it("sets the notes", () => {

            const b = model.notes(["a"]).notes("my notes");
            expect(b._notes).to.eql(["a", "my notes"]);
        });

        it("throws when notes are missing", () => {

            expect(() => {

                model.notes();
            }).to.throw("Notes must be a non-empty string or array");
        });

        it("throws when notes are invalid", () => {

            expect(() => {

                model.notes(5);
            }).to.throw("Notes must be a non-empty string or array");
        });
    });

    describe("tags()", () => {

        it("sets the tags", () => {

            const b = model.tags(["tag1", "tag2"]).tags("tag3");
            expect(b._tags).to.include("tag1");
            expect(b._tags).to.include("tag2");
            expect(b._tags).to.include("tag3");
        });

        it("throws when tags are missing", () => {

            expect(() => {

                model.tags();
            }).to.throw("Tags must be a non-empty string or array");
        });

        it("throws when tags are invalid", () => {

            expect(() => {

                model.tags(5);
            }).to.throw("Tags must be a non-empty string or array");
        });
    });

    describe("meta()", () => {

        it("sets the meta", () => {

            const meta = { prop: "val", prop2: 3 };
            let b = model.meta(meta);
            expect(b.describe().meta).to.eql([meta]);

            b = b.meta({ other: true });
            expect(b.describe().meta).to.eql([meta, {
                other: true
            }]);

        });

        it("throws when meta is missing", () => {
            expect(() => {
                model.meta();
            }).to.throw("Meta cannot be undefined");
        });
    });

    describe("example()", () => {

        it("sets an example", () => {

            const schema = model.valid(5, 6, 7).example(5);
            expect(schema._examples).to.include(5);
            expect(schema.describe().examples).to.eql([5]);
        });

        it("does not flatten examples", () => {

            const schema = model.array().items(5, 6, 7).example([5, 6]);
            expect(schema._examples).to.eql([[5, 6]]);
            expect(schema.describe().examples).to.eql([[5, 6]]);
        });

        it("throws when tags are missing", () => {

            expect(() => {

                model.example();
            }).to.throw("Missing example");
        });

        it("does not throw when example fails own rules", () => {

            const schema = model.valid(5, 6, 7).example(4);
            expect(schema._examples).to.eql([4]);
            expect(schema.describe().examples).to.eql([4]);
        });
    });

    describe("unit()", () => {

        it("sets the unit", () => {

            const b = model.unit("milliseconds");
            expect(b._unit).to.equal("milliseconds");
            expect(b.describe().unit).to.equal("milliseconds");
        });

        it("throws when unit is missing", () => {

            expect(() => {

                model.unit();
            }).to.throw("Unit name must be a non-empty string");
        });
    });

    describe("_validate()", () => {

        it("checks value after conversion", async () => {

            const schema = model.number().invalid(2);
            const err = await assert.throws(async () => model.validate("2", schema, { abortEarly: false }));
            assert.instanceOf(err, Error, '"value" contains an invalid value');
            expect(err.details).to.eql([{
                message: '"value" contains an invalid value',
                path: [],
                type: "any.invalid",
                context: { label: "value", key: undefined }
            }]);
        });
    });

    describe("validate()", () => {

        it("accepts only value (sync way)", () => {

            const schema = model.number();
            const result = schema.validate("2");
            expect(result).to.contain({ value: 2, error: null });
        });

        it("accepts value and callback", async () => {

            const schema = model.number();
            const value = await schema.validate("2");
            expect(value).to.equal(2);
        });

        it("accepts value and options", () => {

            const schema = model.number();
            const result = schema.validate("2", { convert: false });
            assert.instanceOf(result.error, Error, '"value" must be a number');
            expect(result.error.details).to.eql([{
                message: '"value" must be a number',
                path: [],
                type: "number.base",
                context: { label: "value", key: undefined }
            }]);
        });

        it("accepts value, options and callback", async () => {

            const schema = model.number();
            const err = await assert.throws(async () => schema.validate("2", { convert: false }));
            assert.instanceOf(err, Error, '"value" must be a number');
            expect(err.details).to.eql([{
                message: '"value" must be a number',
                path: [],
                type: "number.base",
                context: { label: "value", key: undefined }
            }]);
        });
    });

    describe("concat()", () => {

        it("throws when schema is not any", () => {

            expect(() => {

                model.string().concat(model.number());
            }).to.throw("Cannot merge type string with another type: number");
        });

        it("throws when schema is missing", () => {

            expect(() => {

                model.string().concat();
            }).to.throw("Invalid schema object");
        });

        it("throws when schema is invalid", () => {

            expect(() => {

                model.string().concat(1);
            }).to.throw("Invalid schema object");
        });

        it("merges two schemas (settings)", () => {

            const a = model.number().options({ convert: true });
            const b = model.options({ convert: false });

            validate(a, [
                [1, true],
                ["1", true]
            ]);

            validate(a.concat(b), [
                [1, true],
                ["1", false, null, {
                    message: '"value" must be a number',
                    details: [{
                        message: '"value" must be a number',
                        path: [],
                        type: "number.base",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("merges two schemas (valid)", () => {

            const a = model.string().valid("a");
            const b = model.string().valid("b");

            validate(a, [
                ["a", true],
                ["b", false, null, {
                    message: '"value" must be one of [a]',
                    details: [{
                        message: '"value" must be one of [a]',
                        path: [],
                        type: "any.allowOnly",
                        context: { valids: ["a"], label: "value", key: undefined }
                    }]
                }]
            ]);

            validate(b, [
                ["b", true],
                ["a", false, null, {
                    message: '"value" must be one of [b]',
                    details: [{
                        message: '"value" must be one of [b]',
                        path: [],
                        type: "any.allowOnly",
                        context: { valids: ["b"], label: "value", key: undefined }
                    }]
                }]
            ]);

            validate(a.concat(b), [
                ["a", true],
                ["b", true]
            ]);
        });

        it("merges two schemas (invalid)", () => {

            const a = model.string().invalid("a");
            const b = model.invalid("b");

            validate(a, [
                ["b", true],
                ["a", false, null, {
                    message: '"value" contains an invalid value',
                    details: [{
                        message: '"value" contains an invalid value',
                        path: [],
                        type: "any.invalid",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);

            validate(b, [
                ["a", true],
                ["b", false, null, {
                    message: '"value" contains an invalid value',
                    details: [{
                        message: '"value" contains an invalid value',
                        path: [],
                        type: "any.invalid",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);

            validate(a.concat(b), [
                ["a", false, null, {
                    message: '"value" contains an invalid value',
                    details: [{
                        message: '"value" contains an invalid value',
                        path: [],
                        type: "any.invalid",
                        context: { label: "value", key: undefined }
                    }]
                }],
                ["b", false, null, {
                    message: '"value" contains an invalid value',
                    details: [{
                        message: '"value" contains an invalid value',
                        path: [],
                        type: "any.invalid",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("merges two schemas (valid/invalid)", () => {

            const a = model.string().valid("a").invalid("b");
            const b = model.string().valid("b").invalid("a");

            validate(a, [
                ["a", true],
                ["b", false, null, {
                    message: '"value" contains an invalid value',
                    details: [{
                        message: '"value" contains an invalid value',
                        path: [],
                        type: "any.invalid",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);

            validate(b, [
                ["b", true],
                ["a", false, null, {
                    message: '"value" contains an invalid value',
                    details: [{
                        message: '"value" contains an invalid value',
                        path: [],
                        type: "any.invalid",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);

            validate(a.concat(b), [
                ["a", false, null, {
                    message: '"value" contains an invalid value',
                    details: [{
                        message: '"value" contains an invalid value',
                        path: [],
                        type: "any.invalid",
                        context: { label: "value", key: undefined }
                    }]
                }],
                ["b", true]
            ]);
        });

        it("merges two schemas (tests)", () => {

            const a = model.number().min(5);
            const b = model.number().max(10);

            validate(a, [
                [4, false, null, {
                    message: '"value" must be larger than or equal to 5',
                    details: [{
                        message: '"value" must be larger than or equal to 5',
                        path: [],
                        type: "number.min",
                        context: { limit: 5, value: 4, label: "value", key: undefined }
                    }]
                }],
                [11, true]
            ]);

            validate(b, [
                [6, true],
                [11, false, null, {
                    message: '"value" must be less than or equal to 10',
                    details: [{
                        message: '"value" must be less than or equal to 10',
                        path: [],
                        type: "number.max",
                        context: { limit: 10, value: 11, label: "value", key: undefined }
                    }]
                }]
            ]);

            validate(a.concat(b), [
                [4, false, null, {
                    message: '"value" must be larger than or equal to 5',
                    details: [{
                        message: '"value" must be larger than or equal to 5',
                        path: [],
                        type: "number.min",
                        context: { limit: 5, value: 4, label: "value", key: undefined }
                    }]
                }],
                [6, true],
                [11, false, null, {
                    message: '"value" must be less than or equal to 10',
                    details: [{
                        message: '"value" must be less than or equal to 10',
                        path: [],
                        type: "number.max",
                        context: { limit: 10, value: 11, label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("merges two schemas (flags)", () => {

            const a = model.string().valid("a");
            const b = model.string().insensitive();

            validate(a, [
                ["a", true],
                ["A", false, null, {
                    message: '"value" must be one of [a]',
                    details: [{
                        message: '"value" must be one of [a]',
                        path: [],
                        type: "any.allowOnly",
                        context: { valids: ["a"], label: "value", key: undefined }
                    }]
                }],
                ["b", false, null, {
                    message: '"value" must be one of [a]',
                    details: [{
                        message: '"value" must be one of [a]',
                        path: [],
                        type: "any.allowOnly",
                        context: { valids: ["a"], label: "value", key: undefined }
                    }]
                }]
            ]);

            validate(a.concat(b), [
                ["a", true],
                ["A", true],
                ["b", false, null, {
                    message: '"value" must be one of [a]',
                    details: [{
                        message: '"value" must be one of [a]',
                        path: [],
                        type: "any.allowOnly",
                        context: { valids: ["a"], label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("overrides and append information", () => {

            const a = model.description("a").unit("a").tags("a").example("a");
            const b = model.description("b").unit("b").tags("b").example("b");

            const desc = a.concat(b).describe();
            expect(desc).to.eql({
                type: "any",
                description: "b",
                tags: ["a", "b"],
                examples: ["a", "b"],
                unit: "b"
            });
        });

        it("merges two objects (any key + specific key)", () => {

            const a = model.object();
            const b = model.object({ b: 1 });

            validate(a, [
                [{ b: 1 }, true],
                [{ b: 2 }, true]
            ]);

            validate(b, [
                [{ b: 1 }, true],
                [{ b: 2 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [1]]',
                    details: [{
                        message: '"b" must be one of [1]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [1], label: "b", key: "b" }
                    }]
                }]
            ]);

            validate(a.concat(b), [
                [{ b: 1 }, true],
                [{ b: 2 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [1]]',
                    details: [{
                        message: '"b" must be one of [1]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [1], label: "b", key: "b" }
                    }]
                }]
            ]);

            validate(b.concat(a), [
                [{ b: 1 }, true],
                [{ b: 2 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [1]]',
                    details: [{
                        message: '"b" must be one of [1]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [1], label: "b", key: "b" }
                    }]
                }]
            ]);
        });

        it("merges two objects (no key + any key)", () => {

            const a = model.object({});
            const b = model.object();

            validate(a, [
                [{}, true],
                [{ b: 2 }, false, null, {
                    message: '"b" is not allowed',
                    details: [{
                        message: '"b" is not allowed',
                        path: ["b"],
                        type: "object.allowUnknown",
                        context: { child: "b", label: "b", key: "b" }
                    }]
                }]
            ]);

            validate(b, [
                [{}, true],
                [{ b: 2 }, true]
            ]);

            validate(a.concat(b), [
                [{}, true],
                [{ b: 2 }, false, null, {
                    message: '"b" is not allowed',
                    details: [{
                        message: '"b" is not allowed',
                        path: ["b"],
                        type: "object.allowUnknown",
                        context: { child: "b", label: "b", key: "b" }
                    }]
                }]
            ]);

            validate(b.concat(a), [
                [{}, true],
                [{ b: 2 }, false, null, {
                    message: '"b" is not allowed',
                    details: [{
                        message: '"b" is not allowed',
                        path: ["b"],
                        type: "object.allowUnknown",
                        context: { child: "b", label: "b", key: "b" }
                    }]
                }]
            ]);
        });

        it("merges two objects (key + key)", () => {

            const a = model.object({ a: 1 });
            const b = model.object({ b: 2 });

            validate(a, [
                [{ a: 1 }, true],
                [{ b: 2 }, false, null, {
                    message: '"b" is not allowed',
                    details: [{
                        message: '"b" is not allowed',
                        path: ["b"],
                        type: "object.allowUnknown",
                        context: { child: "b", label: "b", key: "b" }
                    }]
                }]
            ]);

            validate(b, [
                [{ a: 1 }, false, null, {
                    message: '"a" is not allowed',
                    details: [{
                        message: '"a" is not allowed',
                        path: ["a"],
                        type: "object.allowUnknown",
                        context: { child: "a", label: "a", key: "a" }
                    }]
                }],
                [{ b: 2 }, true]
            ]);

            validate(a.concat(b), [
                [{ a: 1 }, true],
                [{ b: 2 }, true]
            ]);

            validate(b.concat(a), [
                [{ a: 1 }, true],
                [{ b: 2 }, true]
            ]);
        });

        it("merges two objects (renames)", async () => {

            const a = model.object({ a: 1 }).rename("c", "a");
            const b = model.object({ b: 2 }).rename("d", "b");

            const value = await a.concat(b).validate({ c: 1, d: 2 });
            expect(value).to.eql({ a: 1, b: 2 });
        });

        it("merges two objects (deps)", async () => {

            const a = model.object({ a: 1 });
            const b = model.object({ b: 2 }).and("b", "a");

            await a.concat(b).validate({ a: 1, b: 2 });
        });

        it("merges two objects (same key)", () => {

            const a = model.object({ a: 1, b: 2, c: 3 });
            const b = model.object({ b: 1, c: 2, a: 3 });

            const ab = a.concat(b);

            validate(a, [
                [{ a: 1, b: 2, c: 3 }, true],
                [{ a: 3, b: 1, c: 2 }, false, null, {
                    message: 'child "a" fails because ["a" must be one of [1]]',
                    details: [{
                        message: '"a" must be one of [1]',
                        path: ["a"],
                        type: "any.allowOnly",
                        context: { valids: [1], label: "a", key: "a" }
                    }]
                }]
            ]);

            validate(b, [
                [{ a: 1, b: 2, c: 3 }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [1]]',
                    details: [{
                        message: '"b" must be one of [1]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: [1], label: "b", key: "b" }
                    }]
                }],
                [{ a: 3, b: 1, c: 2 }, true]
            ]);

            validate(ab, [
                [{ a: 1, b: 2, c: 3 }, true],
                [{ a: 3, b: 1, c: 2 }, true],
                [{ a: 1, b: 2, c: 2 }, true],
                [{ a: 1, b: 2, c: 4 }, false, null, {
                    message: 'child "c" fails because ["c" must be one of [3, 2]]',
                    details: [{
                        message: '"c" must be one of [3, 2]',
                        path: ["c"],
                        type: "any.allowOnly",
                        context: { valids: [3, 2], label: "c", key: "c" }
                    }]
                }]
            ]);
        });

        it("throws when schema key types do not match", () => {

            const a = model.object({ a: model.number() });
            const b = model.object({ a: model.string() });

            expect(() => {

                a.concat(b);
            }).to.throw("Cannot merge type number with another type: string");
        });

        it("merges two alternatives with references", () => {

            const ref1 = model.ref("a.c");
            const ref2 = model.ref("c");
            const schema = {
                a: { c: model.number() },
                b: model.alternatives(ref1).concat(model.alternatives(ref2)),
                c: model.number()
            };

            validate(schema, [
                [{ a: {} }, true],
                [{ a: { c: "5" }, b: 5 }, true],
                [{ a: { c: "5" }, b: 6, c: "6" }, true],
                [{ a: { c: "5" }, b: 7, c: "6" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [ref:a.c], "b" must be one of [ref:c]]',
                    details: [
                        {
                            message: '"b" must be one of [ref:a.c]',
                            path: ["b"],
                            type: "any.allowOnly",
                            context: { valids: [ref1], label: "b", key: "b" }
                        },
                        {
                            message: '"b" must be one of [ref:c]',
                            path: ["b"],
                            type: "any.allowOnly",
                            context: { valids: [ref2], label: "b", key: "b" }
                        }
                    ]
                }]
            ]);
        });

        it("merges meta properly", () => {

            const metaA = { a: 1 };
            const metaB = { b: 1 };
            const a = model.any().meta(metaA);
            const b = model.any().meta(metaB);
            const c = model.any();
            const d = model.any();

            expect(a.concat(b)._meta).to.eql([{ a: 1 }, { b: 1 }]);
            expect(a.concat(c)._meta).to.eql([metaA]);
            expect(b.concat(c)._meta).to.eql([metaB]);
            expect(c.concat(d)._meta).to.eql([]);

        });

        it("merges into an any", () => {

            const a = model.any().required();
            const b = model.number().only(0);

            expect(() => {

                a.concat(b);
            }).to.not.throw();

            const schema = a.concat(b);
            expect(schema.validate().error.message).to.equal('"value" is required');
            expect(schema.validate().error.details).to.eql([{
                message: '"value" is required',
                path: [],
                type: "any.required",
                context: { label: "value", key: undefined }
            }]);
            expect(schema.validate(1).error.message).to.equal('"value" must be one of [0]');
            expect(schema.validate(1).error.details).to.eql([{
                message: '"value" must be one of [0]',
                path: [],
                type: "any.allowOnly",
                context: { valids: [0], label: "value", key: undefined }
            }]);

        });
    });

    describe("when()", () => {

        it("throws when options are invalid", () => {

            expect(() => {

                model.when("a");
            }).to.throw("Invalid options");
        });

        it("forks type into alternatives", () => {

            const schema = {
                a: model.any(),
                b: model.string().valid("x").when("a", { is: 5, then: model.valid("y"), otherwise: model.valid("z") })
            };

            validate(schema, [
                [{ a: 5, b: "x" }, true],
                [{ a: 5, b: "y" }, true],
                [{ a: 5, b: "z" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, y]]',
                    details: [{
                        message: '"b" must be one of [x, y]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "y"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: "x" }, true],
                [{ a: 1, b: "y" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, z]]',
                    details: [{
                        message: '"b" must be one of [x, z]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "z"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: "z" }, true],
                [{ a: 5, b: "a" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, y]]',
                    details: [{
                        message: '"b" must be one of [x, y]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "y"], label: "b", key: "b" }
                    }]
                }],
                [{ b: "a" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, z]]',
                    details: [{
                        message: '"b" must be one of [x, z]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "z"], label: "b", key: "b" }
                    }]
                }]
            ]);
        });

        it("forks type into alternatives (only then)", () => {

            const schema = {
                a: model.any(),
                b: model.string().valid("x").when("a", { is: 5, then: model.valid("y") })
            };

            validate(schema, [
                [{ a: 5, b: "x" }, true],
                [{ a: 5, b: "y" }, true],
                [{ a: 5, b: "z" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, y]]',
                    details: [{
                        message: '"b" must be one of [x, y]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "y"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: "x" }, true],
                [{ a: 1, b: "y" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x]]',
                    details: [{
                        message: '"b" must be one of [x]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: "z" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x]]',
                    details: [{
                        message: '"b" must be one of [x]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 5, b: "a" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, y]]',
                    details: [{
                        message: '"b" must be one of [x, y]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "y"], label: "b", key: "b" }
                    }]
                }],
                [{ b: "a" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x]]',
                    details: [{
                        message: '"b" must be one of [x]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x"], label: "b", key: "b" }
                    }]
                }]
            ]);
        });

        it("forks type into alternatives (only otherwise)", () => {

            const schema = {
                a: model.any(),
                b: model.string().valid("x").when("a", { is: 5, otherwise: model.valid("z") })
            };

            validate(schema, [
                [{ a: 5, b: "x" }, true],
                [{ a: 5, b: "y" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x]]',
                    details: [{
                        message: '"b" must be one of [x]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 5, b: "z" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x]]',
                    details: [{
                        message: '"b" must be one of [x]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: "x" }, true],
                [{ a: 1, b: "y" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, z]]',
                    details: [{
                        message: '"b" must be one of [x, z]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "z"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: "z" }, true],
                [{ a: 5, b: "a" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x]]',
                    details: [{
                        message: '"b" must be one of [x]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x"], label: "b", key: "b" }
                    }]
                }],
                [{ b: "a" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, z]]',
                    details: [{
                        message: '"b" must be one of [x, z]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "z"], label: "b", key: "b" }
                    }]
                }]
            ]);
        });

        it("forks type into alternatives (with is as a schema)", () => {

            const schema = {
                a: model.any(),
                b: model.string().valid("x").when("a", { is: model.number().only(5).required(), then: model.valid("y") })
            };

            validate(schema, [
                [{ a: 5, b: "x" }, true],
                [{ a: 5, b: "y" }, true],
                [{ a: 5, b: "z" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, y]]',
                    details: [{
                        message: '"b" must be one of [x, y]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "y"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: "x" }, true],
                [{ a: 1, b: "y" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x]]',
                    details: [{
                        message: '"b" must be one of [x]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 1, b: "z" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x]]',
                    details: [{
                        message: '"b" must be one of [x]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x"], label: "b", key: "b" }
                    }]
                }],
                [{ a: 5, b: "a" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x, y]]',
                    details: [{
                        message: '"b" must be one of [x, y]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x", "y"], label: "b", key: "b" }
                    }]
                }],
                [{ b: "a" }, false, null, {
                    message: 'child "b" fails because ["b" must be one of [x]]',
                    details: [{
                        message: '"b" must be one of [x]',
                        path: ["b"],
                        type: "any.allowOnly",
                        context: { valids: ["x"], label: "b", key: "b" }
                    }]
                }]
            ]);
        });

        it("forks type into alternatives (with a schema as condition)", () => {

            const schema = model.object({
                a: model.string(),
                b: model.number(),
                c: model.boolean()
            })
                .when(model.object({ a: model.string().min(2).required() }).unknown(), {
                    then: model.object({ b: model.required() })
                })
                .when(model.object({ b: model.number().required().min(5), c: model.only(true).required() }).unknown(), {
                    then: model.object({ a: model.string().required().min(3) })
                });

            validate(schema, [
                [{ a: 0 }, false, null, {
                    message: 'child "a" fails because ["a" must be a string]',
                    details: [{
                        message: '"a" must be a string',
                        path: ["a"],
                        type: "string.base",
                        context: { value: 0, key: "a", label: "a" }
                    }]
                }],
                [{ a: "a" }, true],
                [{ a: "a", b: "b" }, false, null, {
                    message: 'child "b" fails because ["b" must be a number]',
                    details: [{
                        message: '"b" must be a number',
                        path: ["b"],
                        type: "number.base",
                        context: { key: "b", label: "b" }
                    }]
                }],
                [{ a: "a", b: 0 }, true],
                [{ a: "a", b: 0, c: true }, true],
                [{ a: "a", b: 0, c: "c" }, false, null, {
                    message: 'child "c" fails because ["c" must be a boolean]',
                    details: [{
                        message: '"c" must be a boolean',
                        path: ["c"],
                        type: "boolean.base",
                        context: { key: "c", label: "c" }
                    }]
                }],
                [{ a: "aa" }, false, null, {
                    message: 'child "b" fails because ["b" is required]',
                    details: [{
                        message: '"b" is required',
                        path: ["b"],
                        type: "any.required",
                        context: { key: "b", label: "b" }
                    }]
                }],
                [{ a: "aa", b: 0 }, true],
                [{ a: "aa", b: 10 }, true],
                [{ a: "a", b: 10 }, true],
                [{ a: "a", b: 10, c: true }, false, null, {
                    message: 'child "a" fails because ["a" length must be at least 3 characters long]',
                    details: [{
                        message: '"a" length must be at least 3 characters long',
                        path: ["a"],
                        type: "string.min",
                        context: { encoding: undefined, limit: 3, value: "a", key: "a", label: "a" }
                    }]
                }]
            ]);
        });

        it("makes peer required", () => {

            const schema = {
                a: model.when("b", { is: 5, then: model.required() }),
                b: model.any()
            };

            validate(schema, [
                [{ b: 5 }, false, null, {
                    message: 'child "a" fails because ["a" is required]',
                    details: [{
                        message: '"a" is required',
                        path: ["a"],
                        type: "any.required",
                        context: { label: "a", key: "a" }
                    }]
                }],
                [{ b: 6 }, true],
                [{ a: "b" }, true],
                [{ b: 5, a: "x" }, true]
            ]);
        });

        it("can describe as the original object", () => {

            const schema = model.number().min(10).when("a", { is: 5, then: model.number().max(20).required() }).describe();
            expect(schema).to.eql({
                type: "alternatives",
                flags: {
                    presence: "ignore"
                },
                base: {
                    type: "number",
                    invalids: [Infinity, -Infinity],
                    rules: [
                        { arg: 10, name: "min" }
                    ]
                },
                alternatives: [{
                    ref: "ref:a",
                    is: {
                        type: "number",
                        flags: {
                            allowOnly: true,
                            presence: "required"
                        },
                        valids: [5],
                        invalids: [Infinity, -Infinity]
                    },
                    then: {
                        type: "number",
                        flags: {
                            presence: "required"
                        },
                        invalids: [Infinity, -Infinity],
                        rules: [{ name: "min", arg: 10 }, { name: "max", arg: 20 }]
                    }
                }]
            });
        });

        it("can describe as the original object (with a schema as a condition)", () => {
            const schema = model.number().min(10).when(model.number().min(5), { then: model.number().max(20).required() }).describe();
            expect(schema).to.eql({
                type: "alternatives",
                flags: { presence: "ignore" },
                base: {
                    type: "number",
                    invalids: [Infinity, -Infinity],
                    rules: [{ arg: 10, name: "min" }]
                },
                alternatives: [{
                    peek: {
                        type: "number",
                        invalids: [Infinity, -Infinity],
                        rules: [{ name: "min", arg: 5 }]
                    },
                    then: {
                        type: "number",
                        flags: { presence: "required" },
                        invalids: [Infinity, -Infinity],
                        rules: [{ name: "min", arg: 10 }, { name: "max", arg: 20 }]
                    }
                }]
            });
        });
    });

    describe("empty()", () => {

        it("should void values when considered empty", () => {

            const schema = model.string().empty("");
            validate(schema, [
                [undefined, true, null, undefined],
                ["abc", true, null, "abc"],
                ["", true, null, undefined]
            ]);
        });

        it("should void values with trim enabled", () => {

            const schema = model.string().empty("").trim();
            validate(schema, [
                [undefined, true, null, undefined],
                ["abc", true, null, "abc"],
                ["", true, null, undefined],
                [" ", true, null, undefined],
                ["       ", true, null, undefined],
                [42, false, null, {
                    message: '"value" must be a string',
                    details: [{
                        message: '"value" must be a string',
                        path: [],
                        type: "string.base",
                        context: { value: 42, label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("should override any previous empty", () => {

            const schema = model.string().empty("").empty("abc");
            validate(schema, [
                [undefined, true, null, undefined],
                ["abc", true, null, undefined],
                ["", false, null, {
                    message: '"value" is not allowed to be empty',
                    details: [{
                        message: '"value" is not allowed to be empty',
                        path: [],
                        type: "any.empty",
                        context: { label: "value", key: undefined }
                    }]
                }],
                ["def", true, null, "def"]
            ]);
        });

        it("should be possible to reset the empty value", () => {

            const schema = model.string().empty("").empty();
            validate(schema, [
                [undefined, true, null, undefined],
                ["abc", true, null, "abc"],
                ["", false, null, {
                    message: '"value" is not allowed to be empty',
                    details: [{
                        message: '"value" is not allowed to be empty',
                        path: [],
                        type: "any.empty",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("should have no effect if only reset is used", () => {

            const schema = model.string().empty();
            validate(schema, [
                [undefined, true, null, undefined],
                ["abc", true, null, "abc"],
                ["", false, null, {
                    message: '"value" is not allowed to be empty',
                    details: [{
                        message: '"value" is not allowed to be empty',
                        path: [],
                        type: "any.empty",
                        context: { label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("should remove empty flag if only reset is used", () => {

            const schema = model.string().empty("").empty();
            expect(schema._flags.empty).to.not.exist();
            expect(schema.describe().flags).to.not.exist();
        });

        it("should work with dependencies", () => {

            const schema = model.object({
                a: model.string().empty(""),
                b: model.string().empty("")
            }).or("a", "b");

            validate(schema, [
                [{}, false, null, {
                    message: '"value" must contain at least one of [a, b]',
                    details: [{
                        message: '"value" must contain at least one of [a, b]',
                        path: [],
                        type: "object.missing",
                        context: {
                            peers: ["a", "b"],
                            peersWithLabels: ["a", "b"],
                            label: "value",
                            key: undefined
                        }
                    }]
                }],
                [{ a: "" }, false, null, {
                    message: '"value" must contain at least one of [a, b]',
                    details: [{
                        message: '"value" must contain at least one of [a, b]',
                        path: [],
                        type: "object.missing",
                        context: {
                            peers: ["a", "b"],
                            peersWithLabels: ["a", "b"],
                            label: "value",
                            key: undefined
                        }
                    }]
                }],
                [{ a: "a" }, true, null, { a: "a" }],
                [{ a: "", b: "b" }, true, null, { b: "b" }]
            ]);
        });
    });

    describe("allow()", () => {

        it("allows valid values to be set", () => {

            expect(() => {

                model.any().allow(true, 1, "hello", new Date());
            }).not.to.throw();
        });

        it("throws when passed undefined", () => {

            expect(() => {

                model.any().allow(undefined);
            }).to.throw(Error, "Cannot call allow/valid/invalid with undefined");
        });
    });

    describe("valid()", () => {

        it("allows valid values to be set", () => {

            expect(() => {

                model.any().valid(true, 1, "hello", new Date(), Symbol("foo"), () => { }, {});
            }).not.to.throw();
        });

        it("throws when passed undefined", () => {

            expect(() => {

                model.any().valid(undefined);
            }).to.throw(Error, "Cannot call allow/valid/invalid with undefined");
        });

        it("validates differents types of values", () => {

            expect(model.valid(1).validate(1).error).to.be.null();
            expect(model.valid(1).validate(2).error).to.exist();

            const d = new Date();
            expect(model.valid(d).validate(new Date(d.getTime())).error).to.be.null();
            assert.instanceOf(model.valid(d).validate(new Date(d.getTime() + 1)).error, Error, `"value" must be one of [${d}]`);
            expect(model.valid(d).validate(new Date(d.getTime() + 1)).error.details).to.eql([{
                message: `"value" must be one of [${d}]`,
                path: [],
                type: "any.allowOnly",
                context: { valids: [d], label: "value", key: undefined }
            }]);

            expect(model.valid(model.ref("$a")).validate(d, { context: { a: new Date(d.getTime()) } }).error).to.be.null();
            expect(model.object({ a: model.date(), b: model.valid(model.ref("a")) }).validate({ a: d, b: d }).error).to.be.null();
            expect(model.object({ a: model.array().items(model.date()).single(), b: model.valid(model.ref("a")) }).validate({ a: d, b: d }).error).to.be.null();
            const { error } = model.object({ a: model.array().items(model.date()).single(), b: model.valid(model.ref("a")) }).validate({ a: new Date(0), b: d });
            assert.equal(error.message, "child \"b\" fails because [\"b\" must be one of [ref:a]]");

            const str = "foo";
            expect(model.valid(str).validate(str).error).to.be.null();
            assert.instanceOf(model.valid(str).validate("foobar").error, Error, '"value" must be one of [foo]');
            expect(model.valid(str).validate("foobar").error.details).to.eql([{
                message: '"value" must be one of [foo]',
                path: [],
                type: "any.allowOnly",
                context: { valids: [str], label: "value", key: undefined }
            }]);

            const s = Symbol("foo");
            expect(model.valid(s).validate(s).error).to.be.null();
            assert.instanceOf(model.valid(s).validate(Symbol("foo")).error, Error, '"value" must be one of [Symbol(foo)]');
            expect(model.valid(s).validate(Symbol("foo")).error.details).to.eql([{
                message: '"value" must be one of [Symbol(foo)]',
                path: [],
                type: "any.allowOnly",
                context: { valids: [s], label: "value", key: undefined }
            }]);

            const o = {};
            expect(model.valid(o).validate(o).error).to.be.null();
            assert.instanceOf(model.valid(o).validate({}).error, Error, '"value" must be one of [[object Object]]');
            expect(model.valid(o).validate({}).error.details).to.eql([{
                message: '"value" must be one of [[object Object]]',
                path: [],
                type: "any.allowOnly",
                context: { valids: [o], label: "value", key: undefined }
            }]);

            const f = () => { };
            expect(model.valid(f).validate(f).error).to.be.null();
            assert.instanceOf(model.valid(f).validate(() => { }).error, Error, '"value" must be one of [() => {}]');
            expect(model.valid(f).validate(() => { }).error.details).to.eql([{
                message: '"value" must be one of [() => {}]',
                path: [],
                type: "any.allowOnly",
                context: { valids: [f], label: "value", key: undefined }
            }]);

            const b = Buffer.from("foo");
            expect(model.valid(b).validate(b).error).to.be.null();
            assert.instanceOf(model.valid(b).validate(Buffer.from("foobar")).error, Error, '"value" must be one of [foo]');
            expect(model.valid(b).validate(Buffer.from("foobar")).error.details).to.eql([{
                message: '"value" must be one of [foo]',
                path: [],
                type: "any.allowOnly",
                context: { valids: [b], label: "value", key: undefined }
            }]);

        });

        it("preserves passed value when cloned", () => {

            const o = {};
            expect(model.valid(o).clone().validate(o).error).to.be.null();
            assert.instanceOf(model.valid(o).clone().validate({}).error, Error, '"value" must be one of [[object Object]]');
        });
    });

    describe("invalid()", () => {

        it("allows invalid values to be set", () => {

            expect(() => {

                model.any().valid(true, 1, "hello", new Date(), Symbol("foo"));
            }).not.to.throw();
        });

        it("throws when passed undefined", () => {

            expect(() => {

                model.any().invalid(undefined);
            }).to.throw("Cannot call allow/valid/invalid with undefined");
        });

        it("preserves passed value when cloned", () => {

            const o = {};
            assert.instanceOf(model.object().invalid(o).clone().validate(o).error, Error, '"value" contains an invalid value');
            expect(model.object().invalid(o).clone().validate({}).error).to.be.null();
        });
    });

    describe("error()", () => {

        it("returns custom error", async () => {
            const schema = model.object({
                a: model.string(),
                b: {
                    c: model.number().strict().error(new Error("Really wanted a number!"))
                }
            });

            const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: "x" } }, schema));
            expect(err.isJoi).to.not.exist();
            expect(err.message).to.equal("Really wanted a number!");
            expect(err.details).to.not.exist();
        });

        it("returns first custom error with multiple errors", async () => {

            const schema = model.object({
                a: model.string(),
                b: {
                    c: model.number().error(new Error("Really wanted a number!"))
                }
            }).options({ abortEarly: false });

            const err = await assert.throws(async () => model.validate({ a: 22, b: { c: "x" } }, schema));
            expect(err.isJoi).to.not.exist();
            expect(err.message).to.equal("Really wanted a number!");
            expect(err.details).to.not.exist();
        });

        it("returns first error with multiple errors (first not custom)", async () => {

            const schema = model.object({
                a: model.string(),
                b: {
                    c: model.number().error(new Error("Really wanted a number!"))
                }
            });

            const err = await assert.throws(async () => model.validate({ a: 22, b: { c: "x" } }, schema));
            expect(err.isJoi).to.be.true();
            expect(err.message).to.equal('child "a" fails because ["a" must be a string]');
            expect(err.details).to.eql([{
                message: '"a" must be a string',
                path: ["a"],
                type: "string.base",
                context: { value: 22, label: "a", key: "a" }
            }]);
        });

        it("errors on invalid error option", () => {

            expect(() => {

                model.object({
                    a: model.string(),
                    b: {
                        c: model.number().error("Really wanted a number!")
                    }
                });
            }).to.throw("Must provide a valid Error object or a function");

        });

        it("errors on missing error option", () => {

            expect(() => {

                model.object({
                    a: model.string(),
                    b: {
                        c: model.number().error()
                    }
                });
            }).to.throw("Must provide a valid Error object or a function");

        });

        describe("with a function", () => {

            it("should replace the error message with a string", async () => {

                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().strict().error(() => "Really wanted a number!")
                    }
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: "x" } }, schema));
                expect(err.isJoi).to.exist();
                expect(err.message).to.equal('child "b" fails because [child "c" fails because [Really wanted a number!]]');
                expect(err.details).to.eql([{
                    message: '"c" must be a number',
                    path: ["b", "c"],
                    type: "number.base",
                    context: { key: "c", label: "c" }
                }]);
            });

            it("should be able to combine several error messages", async () => {

                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().min(0).integer().strict().error((errors) => {

                            return errors.join(" and "); // Automatic toString() of each error on join
                        })
                    }
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: -1.5 } }, schema, { abortEarly: false }));
                expect(err.isJoi).to.exist();
                expect(err.message).to.equal('child "b" fails because [child "c" fails because ["c" must be larger than or equal to 0 and "c" must be an integer]]');
                expect(err.details).to.eql([
                    {
                        message: '"c" must be larger than or equal to 0',
                        path: ["b", "c"],
                        type: "number.min",
                        context: { limit: 0, value: -1.5, key: "c", label: "c" }
                    },
                    {
                        message: '"c" must be an integer',
                        path: ["b", "c"],
                        type: "number.integer",
                        context: { value: -1.5, key: "c", label: "c" }
                    }
                ]);
            });

            it("should be able to combine several error messages using context", async () => {

                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().min(0).integer().strict().error((errors) => {

                            return errors.reduce((memo, error) => {

                                let text = memo ? " && " : "";
                                switch (error.type) {
                                    case "number.base":
                                        text += `"${error.context.key}" ∈ ℝ`;
                                        break;
                                    case "number.min":
                                        text += `"${error.context.key}" > ${error.context.limit}`;
                                        break;
                                    case "number.integer":
                                        text += `"${error.context.key}" ∈ ℤ`;
                                        break;
                                }
                                return memo + text;
                            }, "");
                        })
                    }
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: -1.5 } }, schema, { abortEarly: false }));
                expect(err.isJoi).to.exist();
                expect(err.message).to.equal('child "b" fails because [child "c" fails because ["c" > 0 && "c" ∈ ℤ]]');
                expect(err.details).to.eql([
                    {
                        message: '"c" must be larger than or equal to 0',
                        path: ["b", "c"],
                        type: "number.min",
                        context: { limit: 0, value: -1.5, key: "c", label: "c" }
                    },
                    {
                        message: '"c" must be an integer',
                        path: ["b", "c"],
                        type: "number.integer",
                        context: { value: -1.5, key: "c", label: "c" }
                    }
                ]);
            });

            it("should be able to override at the root level", async () => {
                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().min(0).integer().strict()
                    }
                }).error((errors) => {

                    const getLeafs = (errs, leafs = []) => {

                        errs.forEach((err) => {

                            if (err.context.reason) {
                                getLeafs(err.context.reason, leafs);
                            } else {
                                leafs.push(err);
                            }
                        });

                        return leafs;
                    };

                    return getLeafs(errors).join(" | ");
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: -1.5 } }, schema, { abortEarly: false }));
                expect(err.isJoi).to.exist();
                expect(err.message).to.equal('"c" must be larger than or equal to 0 | "c" must be an integer');
                expect(err.details).to.eql([
                    {
                        message: '"c" must be larger than or equal to 0',
                        path: ["b", "c"],
                        type: "number.min",
                        context: { limit: 0, value: -1.5, key: "c", label: "c" }
                    },
                    {
                        message: '"c" must be an integer',
                        path: ["b", "c"],
                        type: "number.integer",
                        context: { value: -1.5, key: "c", label: "c" }
                    }
                ]);
            });

            it("should be able to override at several levels", async () => {

                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().min(0).integer().strict().error(() => '"c" must be a positive integer')
                    }
                }).error((errors) => {

                    const getLeafs = (errs, leafs = []) => {

                        errs.forEach((err) => {

                            if (err.context.reason && err.type !== "override") {
                                getLeafs(err.context.reason, leafs);
                            } else {
                                leafs.push(err);
                            }
                        });

                        return leafs;
                    };

                    return getLeafs(errors).join(" | ");
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: -1.5 } }, schema, { abortEarly: false }));
                expect(err.isJoi).to.exist();
                expect(err.message).to.equal('"c" must be a positive integer');
                expect(err.details).to.eql([
                    {
                        message: '"c" must be larger than or equal to 0',
                        path: ["b", "c"],
                        type: "number.min",
                        context: { limit: 0, value: -1.5, key: "c", label: "c" }
                    },
                    {
                        message: '"c" must be an integer',
                        path: ["b", "c"],
                        type: "number.integer",
                        context: { value: -1.5, key: "c", label: "c" }
                    }
                ]);
            });

            it("should be able to create an error out of nowhere", async () => {

                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().min(0).integer().strict().error((errors) => ({
                            type: "override",
                            message: "Moar numbers !",
                            context: {
                                value: errors[0].context.value
                            }
                        }))
                    }
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: -1.5 } }, schema, { abortEarly: false }));
                expect(err.isJoi).to.exist();
                expect(err.message).to.equal('child "b" fails because [child "c" fails because [Moar numbers !]]');
                expect(err.details).to.eql([
                    {
                        message: "Moar numbers !",
                        path: ["b", "c"],
                        type: "override",
                        context: { value: -1.5, key: "c", label: "c" }
                    }
                ]);
            });

            it("should be able to create an error out of nowhere without giving a type", async () => {

                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().min(0).integer().strict().error((errors) => ({
                            message: "Moar numbers !",
                            context: {
                                value: errors[0].context.value
                            }
                        }))
                    }
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: -1.5 } }, schema, { abortEarly: false }));
                expect(err.isJoi).to.exist();
                expect(err.message).to.equal('child "b" fails because [child "c" fails because [Moar numbers !]]');
                expect(err.details).to.eql([
                    {
                        message: "Moar numbers !",
                        path: ["b", "c"],
                        type: "override",
                        context: { value: -1.5, key: "c", label: "c" }
                    }
                ]);
            });

            it("should be able to create an error with a template", async () => {

                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().min(0).integer().strict().error((errors) => ({
                            template: "oops, I received {{value}}",
                            context: {
                                value: errors[0].context.value
                            }
                        }))
                    }
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: -1.5 } }, schema, { abortEarly: false }));
                expect(err.isJoi).to.exist();
                expect(err.message).to.equal('child "b" fails because [child "c" fails because ["c" oops, I received -1.5]]');
                expect(err.details).to.eql([
                    {
                        message: '"c" oops, I received -1.5',
                        path: ["b", "c"],
                        type: "override",
                        context: { value: -1.5, key: "c", label: "c" }
                    }
                ]);
            });

            it("should be able to do a no-op on errors", async () => {

                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().min(0).integer().strict().error((errors) => errors)
                    }
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: -1.5 } }, schema, { abortEarly: false }));
                expect(err.isJoi).to.exist();
                expect(err.message).to.equal('child "b" fails because [child "c" fails because ["c" must be larger than or equal to 0, "c" must be an integer]]');
                expect(err.details).to.eql([
                    {
                        message: '"c" must be larger than or equal to 0',
                        path: ["b", "c"],
                        type: "number.min",
                        context: { limit: 0, value: -1.5, key: "c", label: "c" }
                    },
                    {
                        message: '"c" must be an integer',
                        path: ["b", "c"],
                        type: "number.integer",
                        context: { value: -1.5, key: "c", label: "c" }
                    }
                ]);
            });

            it("should be able to throw a javascript Error", async () => {

                const schema = model.object({
                    a: model.string(),
                    b: {
                        c: model.number().min(0).integer().strict().error((errors) => new Error(`error of type ${errors[0].type}`))
                    }
                });

                const err = await assert.throws(async () => model.validate({ a: "abc", b: { c: -1.5 } }, schema, { abortEarly: false }));
                assert.instanceOf(err, Error, "error of type number.min");
                expect(err.isJoi).to.not.exist();
                expect(err.details).to.not.exist();
            });
        });
    });
});
