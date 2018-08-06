const Helper = require("../helper");

const {
    is,
    model
} = adone;

describe("object", () => {

    it("can be called on its own", () => {

        const object = model.object;
        expect(() => object()).to.throw("Must be invoked on a Joi instance.");
    });

    it("converts a json string to an object", async () => {

        const value = await model.object().validate('{"hi":true}');
        expect(value.hi).to.equal(true);
    });

    it("errors on non-object string", async () => {

        const err = await assert.throws(async () => model.object().validate("a string"));
        expect(err.details).to.eql([{
            message: '"value" must be an object',
            path: [],
            type: "object.base",
            context: { label: "value", key: undefined }
        }]);
    });

    it("validates an object", () => {

        const schema = model.object().required();
        Helper.validate(schema, [
            [{}, true],
            [{ hi: true }, true],
            ["", false, null, {
                message: '"value" must be an object',
                details: [{
                    message: '"value" must be an object',
                    path: [],
                    type: "object.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("return object reference when no rules specified", async () => {

        const schema = model.object({
            a: model.object()
        });

        const item = { x: 5 };
        const value = await schema.validate({ a: item });
        expect(value.a).to.equal(item);
    });

    it("retains ignored values", async () => {

        const schema = model.object();
        const value = await schema.validate({ a: 5 });
        expect(value.a).to.equal(5);
    });

    it("retains skipped values", async () => {

        const schema = model.object({ b: 5 }).unknown(true);
        const value = await schema.validate({ b: "5", a: 5 });
        expect(value.a).to.equal(5);
        expect(value.b).to.equal(5);
    });

    it("allows any key when schema is undefined", async () => {

        await model.object().validate({ a: 4 });
        await model.object(undefined).validate({ a: 4 });
    });

    it("allows any key when schema is null", async () => {

        await model.object(null).validate({ a: 4 });
    });

    it("throws on invalid object schema", () => {

        expect(() => {

            model.object(4);
        }).to.throw("Object schema must be a valid object");
    });

    it("throws on joi object schema", () => {

        expect(() => {

            model.object(model.object());
        }).to.throw("Object schema cannot be a joi schema");
    });

    it("skips conversion when value is undefined", async () => {

        const value = await model.object({ a: model.object() }).validate(undefined);
        expect(value).to.not.exist();
    });

    it("errors on array", async () => {

        const err = await assert.throws(async () => model.object().validate([1, 2, 3]));
        expect(err.details).to.eql([{
            message: '"value" must be an object',
            path: [],
            type: "object.base",
            context: { label: "value", key: undefined }
        }]);
    });

    it("should prevent extra keys from existing by default", () => {

        const schema = model.object({ item: model.string().required() }).required();
        Helper.validate(schema, [
            [{ item: "something" }, true],
            [{ item: "something", item2: "something else" }, false, null, {
                message: '"item2" is not allowed',
                details: [{
                    message: '"item2" is not allowed',
                    path: ["item2"],
                    type: "object.allowUnknown",
                    context: { child: "item2", label: "item2", key: "item2" }
                }]
            }],
            ["", false, null, {
                message: '"value" must be an object',
                details: [{
                    message: '"value" must be an object',
                    path: [],
                    type: "object.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("should validate count when min is set", () => {

        const schema = model.object().min(3);
        Helper.validate(schema, [
            [{ item: "something" }, false, null, {
                message: '"value" must have at least 3 children',
                details: [{
                    message: '"value" must have at least 3 children',
                    path: [],
                    type: "object.min",
                    context: { limit: 3, label: "value", key: undefined }
                }]
            }],
            [{ item: "something", item2: "something else" }, false, null, {
                message: '"value" must have at least 3 children',
                details: [{
                    message: '"value" must have at least 3 children',
                    path: [],
                    type: "object.min",
                    context: { limit: 3, label: "value", key: undefined }
                }]
            }],
            [{ item: "something", item2: "something else", item3: "something something else" }, true],
            ["", false, null, {
                message: '"value" must be an object',
                details: [{
                    message: '"value" must be an object',
                    path: [],
                    type: "object.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("should validate count when max is set", () => {

        const schema = model.object().max(2);
        Helper.validate(schema, [
            [{ item: "something" }, true],
            [{ item: "something", item2: "something else" }, true],
            [{ item: "something", item2: "something else", item3: "something something else" }, false, null, {
                message: '"value" must have less than or equal to 2 children',
                details: [{
                    message: '"value" must have less than or equal to 2 children',
                    path: [],
                    type: "object.max",
                    context: { limit: 2, label: "value", key: undefined }
                }]
            }],
            ["", false, null, {
                message: '"value" must be an object',
                details: [{
                    message: '"value" must be an object',
                    path: [],
                    type: "object.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("should validate count when min and max is set", () => {

        const schema = model.object().max(3).min(2);
        Helper.validate(schema, [
            [{ item: "something" }, false, null, {
                message: '"value" must have at least 2 children',
                details: [{
                    message: '"value" must have at least 2 children',
                    path: [],
                    type: "object.min",
                    context: { limit: 2, label: "value", key: undefined }
                }]
            }],
            [{ item: "something", item2: "something else" }, true],
            [{ item: "something", item2: "something else", item3: "something something else" }, true],
            [{ item: "something", item2: "something else", item3: "something something else", item4: "item4" }, false, null, {
                message: '"value" must have less than or equal to 3 children',
                details: [{
                    message: '"value" must have less than or equal to 3 children',
                    path: [],
                    type: "object.max",
                    context: { limit: 3, label: "value", key: undefined }
                }]
            }],
            ["", false, null, {
                message: '"value" must be an object',
                details: [{
                    message: '"value" must be an object',
                    path: [],
                    type: "object.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("should validate count when length is set", () => {

        const schema = model.object().length(2);
        Helper.validate(schema, [
            [{ item: "something" }, false, null, {
                message: '"value" must have 2 children',
                details: [{
                    message: '"value" must have 2 children',
                    path: [],
                    type: "object.length",
                    context: { limit: 2, label: "value", key: undefined }
                }]
            }],
            [{ item: "something", item2: "something else" }, true],
            [{ item: "something", item2: "something else", item3: "something something else" }, false, null, {
                message: '"value" must have 2 children',
                details: [{
                    message: '"value" must have 2 children',
                    path: [],
                    type: "object.length",
                    context: { limit: 2, label: "value", key: undefined }
                }]
            }],
            ["", false, null, {
                message: '"value" must be an object',
                details: [{
                    message: '"value" must be an object',
                    path: [],
                    type: "object.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("should validate constructor when type is set", () => {

        const schema = model.object().type(RegExp);
        Helper.validate(schema, [
            [{ item: "something" }, false, null, {
                message: '"value" must be an instance of "RegExp"',
                details: [{
                    message: '"value" must be an instance of "RegExp"',
                    path: [],
                    type: "object.type",
                    context: { type: "RegExp", label: "value", key: undefined }
                }]
            }],
            ["", false, null, {
                message: '"value" must be an object',
                details: [{
                    message: '"value" must be an object',
                    path: [],
                    type: "object.base",
                    context: { label: "value", key: undefined }
                }]
            }],
            [new Date(), false, null, {
                message: '"value" must be an instance of "RegExp"',
                details: [{
                    message: '"value" must be an instance of "RegExp"',
                    path: [],
                    type: "object.type",
                    context: { type: "RegExp", label: "value", key: undefined }
                }]
            }],
            [/abcd/, true],
            [new RegExp(), true]
        ]);
    });

    it("should traverse an object and validate all properties in the top level", () => {

        const schema = model.object({
            num: model.number()
        });

        Helper.validate(schema, [
            [{ num: 1 }, true],
            [{ num: [1, 2, 3] }, false, null, {
                message: 'child "num" fails because ["num" must be a number]',
                details: [{
                    message: '"num" must be a number',
                    path: ["num"],
                    type: "number.base",
                    context: { label: "num", key: "num", value: [1, 2, 3] }
                }]
            }]
        ]);
    });

    it("should traverse an object and child objects and validate all properties", () => {

        const schema = model.object({
            num: model.number(),
            obj: model.object({
                item: model.string()
            })
        });

        Helper.validate(schema, [
            [{ num: 1 }, true],
            [{ num: [1, 2, 3] }, false, null, {
                message: 'child "num" fails because ["num" must be a number]',
                details: [{
                    message: '"num" must be a number',
                    path: ["num"],
                    type: "number.base",
                    context: { label: "num", key: "num", value: [1, 2, 3] }
                }]
            }],
            [{ num: 1, obj: { item: "something" } }, true],
            [{ num: 1, obj: { item: 123 } }, false, null, {
                message: 'child "obj" fails because [child "item" fails because ["item" must be a string]]',
                details: [{
                    message: '"item" must be a string',
                    path: ["obj", "item"],
                    type: "string.base",
                    context: { value: 123, label: "item", key: "item" }
                }]
            }]
        ]);
    });

    it("should traverse an object several levels", () => {

        const schema = model.object({
            obj: model.object({
                obj: model.object({
                    obj: model.object({
                        item: model.boolean()
                    })
                })
            })
        });

        Helper.validate(schema, [
            [{ num: 1 }, false, null, {
                message: '"num" is not allowed',
                details: [{
                    message: '"num" is not allowed',
                    path: ["num"],
                    type: "object.allowUnknown",
                    context: { child: "num", label: "num", key: "num" }
                }]
            }],
            [{ obj: {} }, true],
            [{ obj: { obj: {} } }, true],
            [{ obj: { obj: { obj: {} } } }, true],
            [{ obj: { obj: { obj: { item: true } } } }, true],
            [{ obj: { obj: { obj: { item: 10 } } } }, false, null, {
                message: 'child "obj" fails because [child "obj" fails because [child "obj" fails because [child "item" fails because ["item" must be a boolean]]]]',
                details: [{
                    message: '"item" must be a boolean',
                    path: ["obj", "obj", "obj", "item"],
                    type: "boolean.base",
                    context: { label: "item", key: "item" }
                }]
            }]
        ]);
    });

    it("should traverse an object several levels with required levels", () => {

        const schema = model.object({
            obj: model.object({
                obj: model.object({
                    obj: model.object({
                        item: model.boolean()
                    })
                }).required()
            })
        });

        Helper.validate(schema, [
            [null, false, null, {
                message: '"value" must be an object',
                details: [{
                    message: '"value" must be an object',
                    path: [],
                    type: "object.base",
                    context: { label: "value", key: undefined }
                }]
            }],
            [undefined, true],
            [{}, true],
            [{ obj: {} }, false, null, {
                message: 'child "obj" fails because [child "obj" fails because ["obj" is required]]',
                details: [{
                    message: '"obj" is required',
                    path: ["obj", "obj"],
                    type: "any.required",
                    context: { label: "obj", key: "obj" }
                }]
            }],
            [{ obj: { obj: {} } }, true],
            [{ obj: { obj: { obj: {} } } }, true],
            [{ obj: { obj: { obj: { item: true } } } }, true],
            [{ obj: { obj: { obj: { item: 10 } } } }, false, null, {
                message: 'child "obj" fails because [child "obj" fails because [child "obj" fails because [child "item" fails because ["item" must be a boolean]]]]',
                details: [{
                    message: '"item" must be a boolean',
                    path: ["obj", "obj", "obj", "item"],
                    type: "boolean.base",
                    context: { label: "item", key: "item" }
                }]
            }]
        ]);
    });

    it("should traverse an object several levels with required levels (without model.obj())", () => {

        const schema = {
            obj: {
                obj: {
                    obj: {
                        item: model.boolean().required()
                    }
                }
            }
        };

        Helper.validate(schema, [
            [null, false, null, {
                message: '"value" must be an object',
                details: [{
                    message: '"value" must be an object',
                    path: [],
                    type: "object.base",
                    context: { label: "value", key: undefined }
                }]
            }],
            [undefined, true],
            [{}, true],
            [{ obj: {} }, true],
            [{ obj: { obj: {} } }, true],
            [{ obj: { obj: { obj: {} } } }, false, null, {
                message: 'child "obj" fails because [child "obj" fails because [child "obj" fails because [child "item" fails because ["item" is required]]]]',
                details: [{
                    message: '"item" is required',
                    path: ["obj", "obj", "obj", "item"],
                    type: "any.required",
                    context: { label: "item", key: "item" }
                }]
            }],
            [{ obj: { obj: { obj: { item: true } } } }, true],
            [{ obj: { obj: { obj: { item: 10 } } } }, false, null, {
                message: 'child "obj" fails because [child "obj" fails because [child "obj" fails because [child "item" fails because ["item" must be a boolean]]]]',
                details: [{
                    message: '"item" must be a boolean',
                    path: ["obj", "obj", "obj", "item"],
                    type: "boolean.base",
                    context: { label: "item", key: "item" }
                }]
            }]
        ]);
    });

    it("errors on unknown keys when functions allows", async () => {

        const schema = model.object({ a: model.number() }).options({ skipFunctions: true });
        const obj = { a: 5, b: "value" };
        const err = await assert.throws(async () => schema.validate(obj));
        expect(err.details).to.eql([{
            message: '"b" is not allowed',
            path: ["b"],
            type: "object.allowUnknown",
            context: { child: "b", label: "b", key: "b" }
        }]);
    });

    it("validates both valid() and with()", () => {

        const schema = model.object({
            first: model.valid("value"),
            second: model.any()
        }).with("first", "second");

        Helper.validate(schema, [
            [{ first: "value" }, false, null, {
                message: '"first" missing required peer "second"',
                details: [{
                    message: '"first" missing required peer "second"',
                    path: ["first"],
                    type: "object.with",
                    context: {
                        main: "first",
                        mainWithLabel: "first",
                        peer: "second",
                        peerWithLabel: "second",
                        label: "first",
                        key: "first"
                    }
                }]
            }]
        ]);
    });

    it("validates referenced arrays in valid()", () => {

        const ref = model.ref("$x");
        const schema = model.object({
            foo: model.valid(ref)
        });

        Helper.validate(schema, [
            [{ foo: "bar" }, true, { context: { x: "bar" } }],
            [{ foo: "bar" }, true, { context: { x: ["baz", "bar"] } }],
            [{ foo: "bar" }, false, { context: { x: "baz" } }, {
                message: 'child "foo" fails because ["foo" must be one of [context:x]]',
                details: [{
                    message: '"foo" must be one of [context:x]',
                    path: ["foo"],
                    type: "any.allowOnly",
                    context: { value: "bar", valids: [ref], label: "foo", key: "foo" }
                }]
            }],
            [{ foo: "bar" }, false, { context: { x: ["baz", "qux"] } }, {
                message: 'child "foo" fails because ["foo" must be one of [context:x]]',
                details: [{
                    message: '"foo" must be one of [context:x]',
                    path: ["foo"],
                    type: "any.allowOnly",
                    context: { value: "bar", valids: [ref], label: "foo", key: "foo" }
                }]
            }],
            [{ foo: "bar" }, false, null, {
                message: 'child "foo" fails because ["foo" must be one of [context:x]]',
                details: [{
                    message: '"foo" must be one of [context:x]',
                    path: ["foo"],
                    type: "any.allowOnly",
                    context: { value: "bar", valids: [ref], label: "foo", key: "foo" }
                }]
            }]
        ]);
    });

    it("errors on unknown nested keys with the correct path", async () => {

        const schema = model.object({ a: model.object().keys({}) });
        const obj = { a: { b: "value" } };
        const err = await assert.throws(async () => schema.validate(obj));
        expect(err.details).to.eql([{
            message: '"b" is not allowed',
            path: ["a", "b"],
            type: "object.allowUnknown",
            context: { child: "b", label: "b", key: "b" }
        }]);
    });

    it("errors on unknown nested keys with the correct path at the root level", async () => {

        const schema = model.object({ a: model.object().keys({}) });
        const obj = { c: "hello" };
        const err = await assert.throws(async () => schema.validate(obj));
        expect(err.details).to.eql([{
            message: '"c" is not allowed',
            path: ["c"],
            type: "object.allowUnknown",
            context: { child: "c", label: "c", key: "c" }
        }]);
    });

    it("should work on prototype-less objects", async () => {

        const input = Object.create(null);
        const schema = model.object().keys({
            a: model.number()
        });

        input.a = 1337;

        await model.validate(input, schema);
    });

    it("should be able to use rename safely with a fake hasOwnProperty", async () => {

        const input = { a: 1, hasOwnProperty: "foo" };
        const schema = model.object().rename("b", "a");

        const err = await assert.throws(async () => model.validate(input, schema));
        assert.instanceOf(err, Error, '"value" cannot rename child "b" because override is disabled and target "a" exists');
        expect(err.details).to.eql([{
            message: '"value" cannot rename child "b" because override is disabled and target "a" exists',
            path: [],
            type: "object.rename.override",
            context: { from: "b", to: "a", label: "value", key: undefined }
        }]);
    });

    it("should be able to use object.with() safely with a fake hasOwnProperty", async () => {

        const input = { a: 1, hasOwnProperty: "foo" };
        const schema = model.object({ a: 1 }).with("a", "b");

        const err = await assert.throws(async () => model.validate(input, schema));
        assert.instanceOf(err, Error, '"hasOwnProperty" is not allowed. "a" missing required peer "b"');
        expect(err.details).to.eql([
            {
                message: '"hasOwnProperty" is not allowed',
                path: ["hasOwnProperty"],
                type: "object.allowUnknown",
                context:
                {
                    child: "hasOwnProperty",
                    label: "hasOwnProperty",
                    key: "hasOwnProperty"
                }
            },
            {
                message: '"a" missing required peer "b"',
                path: ["a"],
                type: "object.with",
                context:
                {
                    main: "a",
                    mainWithLabel: "a",
                    peer: "b",
                    peerWithLabel: "b",
                    label: "a",
                    key: "a"
                }
            }
        ]);
    });

    describe("keys()", () => {

        it("allows any key", async () => {
            const a = model.object({ a: 4 });
            const b = a.keys();
            const err = await assert.throws(async () => a.validate({ b: 3 }));
            expect(err.details).to.eql([{
                message: '"b" is not allowed',
                path: ["b"],
                type: "object.allowUnknown",
                context: { child: "b", label: "b", key: "b" }
            }]);

            await b.validate({ b: 3 });
        });

        it("forbids all keys", async () => {
            const a = model.object();
            const b = a.keys({});
            await a.validate({ b: 3 });
            const err = await assert.throws(async () => b.validate({ b: 3 }));
            expect(err.details).to.eql([{
                message: '"b" is not allowed',
                path: ["b"],
                type: "object.allowUnknown",
                context: { child: "b", label: "b", key: "b" }
            }]);
        });

        it("adds to existing keys", async () => {

            const a = model.object({ a: 1 });
            const b = a.keys({ b: 2 });
            const err = await assert.throws(async () => a.validate({ a: 1, b: 2 }));
            expect(err.details).to.eql([{
                message: '"b" is not allowed',
                path: ["b"],
                type: "object.allowUnknown",
                context: { child: "b", label: "b", key: "b" }
            }]);

            await b.validate({ a: 1, b: 2 });
        });

        it("overrides existing keys", () => {

            const a = model.object({ a: 1 });
            const b = a.keys({ a: model.string() });

            Helper.validate(a, [
                [{ a: 1 }, true, null, { a: 1 }],
                [{ a: "1" }, true, null, { a: 1 }],
                [{ a: "2" }, false, null, {
                    message: 'child "a" fails because ["a" must be one of [1]]',
                    details: [{
                        message: '"a" must be one of [1]',
                        path: ["a"],
                        type: "any.allowOnly",
                        context: { value: 2, valids: [1], label: "a", key: "a" }
                    }]
                }]
            ]);

            Helper.validate(b, [
                [{ a: 1 }, false, null, {
                    message: 'child "a" fails because ["a" must be a string]',
                    details: [{
                        message: '"a" must be a string',
                        path: ["a"],
                        type: "string.base",
                        context: { value: 1, label: "a", key: "a" }
                    }]
                }],
                [{ a: "1" }, true, null, { a: "1" }]
            ]);
        });

        it("strips keys flagged with strip", async () => {

            const schema = model.object({
                a: model.string().strip(),
                b: model.string()
            });
            const value = await schema.validate({ a: "test", b: "test" });
            expect(value.a).to.not.exist();
            expect(value.b).to.equal("test");
        });

        it("strips keys after validation", async () => {

            const schema = model.object({
                a: model.string().strip(),
                b: model.string().default(model.ref("a"))
            });
            const value = await schema.validate({ a: "test" });
            expect(value.a).to.not.exist();
            expect(value.b).to.equal("test");
        });

        it("strips keys while preserving transformed values", () => {
            const schema = model.object({
                a: model.number().strip(),
                b: model.number().min(model.ref("a"))
            });

            const result = schema.validate({ a: "1", b: "2" });
            expect(result.error).to.not.exist();
            expect(result.value.a).to.not.exist();
            expect(result.value.b).to.equal(2);

            const result2 = schema.validate({ a: "1", b: "0" });
            assert.instanceOf(result2.error, Error, 'child "b" fails because ["b" must be larger than or equal to 1]');
            expect(result2.error.details).to.eql([{
                message: '"b" must be larger than or equal to 1',
                path: ["b"],
                type: "number.min",
                context: { limit: 1, value: 0, label: "b", key: "b" }
            }]);
        });

        it("does not alter the original object when stripping keys", async () => {

            const schema = model.object({
                a: model.string().strip(),
                b: model.string()
            });

            const valid = {
                a: "test",
                b: "test"
            };

            const value = await schema.validate(valid);
            expect(value.a).to.not.exist();
            expect(valid.a).to.equal("test");
            expect(value.b).to.equal("test");
            expect(valid.b).to.equal("test");
        });

        it("should strip from an alternative", async () => {

            const schema = model.object({
                a: [model.boolean().strip()]
            });

            const valid = {
                a: true
            };

            const value = await schema.validate(valid);
            expect(value).to.eql({});
        });
    });

    describe("append()", () => {

        it("should append schema", async () => {

            const schema = model.object()
                .keys({ a: model.string() })
                .append({ b: model.string() });

            await schema.validate({ a: "x", b: "y" });
        });

        it("should not change schema if it is null", async () => {

            const schema = model.object()
                .keys({ a: model.string() })
                .append(null);

            await schema.validate({ a: "x" });
        });

        it("should not change schema if it is undefined", async () => {

            const schema = model.object()
                .keys({ a: model.string() })
                .append(undefined);

            await schema.validate({ a: "x" });
        });

        it("should not change schema if it is empty-object", async () => {

            const schema = model.object()
                .keys({ a: model.string() })
                .append({});

            await schema.validate({ a: "x" });
        });
    });

    describe("unknown()", () => {

        it("avoids unnecessary cloning when called twice", () => {

            const schema = model.object().unknown();
            expect(schema.unknown()).to.equal(schema);
        });

        it("allows local unknown without applying to children", () => {

            const schema = model.object({
                a: {
                    b: model.number()
                }
            }).unknown();

            Helper.validate(schema, [
                [{ a: { b: 5 } }, true],
                [{ a: { b: "x" } }, false, null, {
                    message: 'child "a" fails because [child "b" fails because ["b" must be a number]]',
                    details: [{
                        message: '"b" must be a number',
                        path: ["a", "b"],
                        type: "number.base",
                        context: { label: "b", key: "b", value: "x" }
                    }]
                }],
                [{ a: { b: 5 }, c: "ignore" }, true],
                [{ a: { b: 5, c: "ignore" } }, false, null, {
                    message: 'child "a" fails because ["c" is not allowed]',
                    details: [{
                        message: '"c" is not allowed',
                        path: ["a", "c"],
                        type: "object.allowUnknown",
                        context: { child: "c", label: "c", key: "c" }
                    }]
                }]
            ]);
        });

        it("forbids local unknown without applying to children", () => {

            const schema = model.object({
                a: model.object({
                    b: model.number()
                }).unknown()
            }).options({ allowUnknown: false });

            Helper.validate(schema, [
                [{ a: { b: 5 } }, true],
                [{ a: { b: "x" } }, false, null, {
                    message: 'child "a" fails because [child "b" fails because ["b" must be a number]]',
                    details: [{
                        message: '"b" must be a number',
                        path: ["a", "b"],
                        type: "number.base",
                        context: { label: "b", key: "b", value: "x" }
                    }]
                }],
                [{ a: { b: 5 }, c: "ignore" }, false, null, {
                    message: '"c" is not allowed',
                    details: [{
                        message: '"c" is not allowed',
                        path: ["c"],
                        type: "object.allowUnknown",
                        context: { child: "c", label: "c", key: "c" }
                    }]
                }],
                [{ a: { b: 5, c: "ignore" } }, true]
            ]);
        });

        it("overrides stripUnknown at a local level", () => {

            const schema = model.object({
                a: model.object({
                    b: model.number(),
                    c: model.object({
                        d: model.number()
                    })
                }).unknown()
            }).options({ allowUnknown: false, stripUnknown: true });

            Helper.validate(schema, [
                [{ a: { b: 5 } }, true, null, { a: { b: 5 } }],
                [{ a: { b: "x" } }, false, null, {
                    message: 'child "a" fails because [child "b" fails because ["b" must be a number]]',
                    details: [{
                        message: '"b" must be a number',
                        path: ["a", "b"],
                        type: "number.base",
                        context: { label: "b", key: "b", value: "x" }
                    }]
                }],
                [{ a: { b: 5 }, d: "ignore" }, true, null, { a: { b: 5 } }],
                [{ a: { b: 5, d: "ignore" } }, true, null, { a: { b: 5, d: "ignore" } }],
                [{ a: { b: 5, c: { e: "ignore" } } }, true, null, { a: { b: 5, c: {} } }]
            ]);
        });
    });

    describe("rename()", () => {

        describe("using regex", () => {

            it("renames using a regular expression", async () => {

                const regex = /foobar/i;

                const schema = model.object({
                    fooBar: model.string()
                }).rename(regex, "fooBar");

                await model.compile(schema).validate({ FOOBAR: "a" });
            });

            it("aliases a key", async () => {

                const regex = /^a$/i;

                const schema = model.object({
                    other: model.any(),
                    A: model.number(),
                    b: model.number(),
                    c: model.number()
                }).rename(regex, "b", { alias: true });

                const value = await model.compile(schema).validate({ other: "here", A: 100, c: 50 });
                expect(value.A).to.equal(100);
                expect(value.b).to.equal(100);
                expect(value.c).to.equal(50);
            });

            it("with override disabled it should not allow overwriting existing value", async () => {

                const regex = /^test1$/i;
                const schema = model.object({
                    test1: model.string()
                }).rename(regex, "test1");

                const err = await assert.throws(async () => model.compile(schema).validate({ test: "b", test1: "a" }));
                expect(err.message).to.equal('"value" cannot rename children [test1] because override is disabled and target "test1" exists');
                expect(err.details).to.eql([{
                    message: '"value" cannot rename children [test1] because override is disabled and target "test1" exists',
                    path: [],
                    type: "object.rename.regex.override",
                    context: { from: ["test1"], to: "test1", key: undefined, label: "value" }
                }]);
            });

            it("with override enabled should allow overwriting existing value", async () => {

                const regex = /^test$/i;

                const schema = model.object({
                    test1: model.string()
                }).rename(regex, "test1", { override: true });

                await schema.validate({ test: "b", test1: "a" });
            });

            it("renames when data is nested in an array via items", async () => {

                const regex1 = /^uno$/i;
                const regex2 = /^dos$/i;

                const schema = {
                    arr: model.array().items(model.object({
                        one: model.string(),
                        two: model.string()
                    }).rename(regex1, "one").rename(regex2, "two"))
                };

                const data = { arr: [{ uno: "1", dos: "2" }] };
                const value = await model.object(schema).validate(data);
                expect(value.arr[0].one).to.equal("1");
                expect(value.arr[0].two).to.equal("2");
            });

            it("applies rename and validation in the correct order regardless of key order", async () => {

                const regex = /^b$/i;

                const schema1 = model.object({
                    a: model.number()
                }).rename(regex, "a");

                const input1 = { b: "5" };

                const value1 = await schema1.validate(input1);
                expect(value1.b).to.not.exist();
                expect(value1.a).to.equal(5);

                const schema2 = model.object({ a: model.number(), b: model.any() }).rename("b", "a");
                const input2 = { b: "5" };

                const value2 = await schema2.validate(input2);
                expect(value2.b).to.not.exist();
                expect(value2.a).to.equal(5);
            });

            it("sets the default value after key is renamed", async () => {

                const regex = /^foo$/i;

                const schema = model.object({
                    foo2: model.string().default("test")
                }).rename(regex, "foo2");

                const input = {};

                const value = await model.validate(input, schema);
                expect(value.foo2).to.equal("test");
            });

            it("should not create new keys when they key in question does not exist", async () => {

                const regex = /^b$/i;

                const schema = model.object().rename(regex, "_b");

                const input = {
                    a: "something"
                };

                const value = await schema.validate(input);
                expect(Object.keys(value)).to.include("a");
                expect(value.a).to.equal("something");
            });

            it("should remove a key with override if from does not exist", async () => {

                const regex = /^b$/i;

                const schema = model.object().rename(regex, "a", { override: true });

                const input = {
                    a: "something"
                };

                const value = await schema.validate(input);
                expect(value).to.eql({});
            });

            it("shouldn't delete a key with override and ignoredUndefined if from does not exist", async () => {

                const regex = /^b$/i;

                const schema = model.object().keys({
                    c: model.any(),
                    a: model.any()
                }).rename(regex, "a", { ignoreUndefined: true, override: true });

                const input = {
                    a: "something"
                };

                const value = await schema.validate(input);
                expect(value).to.eql({ a: "something" });
            });

            it("should fulfill describe() with non-defaults", () => {

                const regex = /^b$/i;

                const schema = model.object().rename(regex, "a", { alias: true, multiple: true, override: true });
                const desc = schema.describe();

                expect(desc).to.eql({
                    type: "object",
                    renames: [{
                        from: regex,
                        to: "a",
                        isRegExp: true,
                        options: {
                            alias: true,
                            multiple: true,
                            override: true
                        }
                    }]
                });
            });

            it("should fulfill describe() with defaults", () => {

                const regex = /^b$/i;

                const schema = model.object().rename(regex, "a");
                const desc = schema.describe();

                expect(desc).to.eql({
                    type: "object",
                    renames: [{
                        from: regex,
                        to: "a",
                        isRegExp: true,
                        options: {
                            alias: false,
                            multiple: false,
                            override: false
                        }
                    }]
                });
            });

            it("allows renaming multiple times with multiple enabled", async () => {
                const regex = /foobar/i;

                const schema = model.object({
                    fooBar: model.string()
                }).rename(regex, "fooBar", { multiple: true });

                const value = await model.compile(schema).validate({ FOOBAR: "a", FooBar: "b" });
                expect(value.fooBar).to.equal("b");
            });

            it("errors renaming multiple times with multiple disabled", async () => {
                const regex = /foobar/i;

                const schema = model.object({
                    fooBar: model.string()
                }).rename(regex, "fooBar").rename(/foobar/i, "fooBar");

                const err = await assert.throws(async () => model.compile(schema).validate({ FOOBAR: "a", FooBar: "b" }));
                expect(err.message).to.equal('"value" cannot rename children [fooBar] because multiple renames are disabled and another key was already renamed to "fooBar"');
                expect(err.details).to.eql([{
                    message: '"value" cannot rename children [fooBar] because multiple renames are disabled and another key was already renamed to "fooBar"',
                    path: [],
                    type: "object.rename.regex.multiple",
                    context: { from: ["fooBar"], to: "fooBar", key: undefined, label: "value" }
                }]);
            });

            it("errors multiple times when abortEarly is false", async () => {
                const schema = model.object().keys({ z: model.string() }).rename(/a/i, "b").rename(/c/i, "b").rename(/z/i, "z").options({ abortEarly: false });
                const err = await assert.throws(async () => schema.validate({ a: 1, c: 1, d: 1, z: 1 }));
                expect(err.message).to.equal('"value" cannot rename children [c] because multiple renames are disabled and another key was already renamed to "b". "value" cannot rename children [z] because override is disabled and target "z" exists. "d" is not allowed. "b" is not allowed');
                expect(err.details).to.eql([
                    {
                        message: '"value" cannot rename children [c] because multiple renames are disabled and another key was already renamed to "b"',
                        path: [],
                        type: "object.rename.regex.multiple",
                        context: { from: ["c"], to: "b", key: undefined, label: "value" }
                    },
                    {
                        message: '"value" cannot rename children [z] because override is disabled and target "z" exists',
                        path: [],
                        type: "object.rename.regex.override",
                        context: { from: ["z"], to: "z", key: undefined, label: "value" }
                    },
                    {
                        message: '"d" is not allowed',
                        path: ["d"],
                        type: "object.allowUnknown",
                        context: { child: "d", key: "d", label: "d" }
                    },
                    {
                        message: '"b" is not allowed',
                        path: ["b"],
                        type: "object.allowUnknown",
                        context: { child: "b", key: "b", label: "b" }
                    }
                ]);
            });
        });

        it("allows renaming multiple times with multiple enabled", async () => {
            const schema = model.object({
                test: model.string()
            }).rename("test1", "test").rename("test2", "test", { multiple: true });

            await model.compile(schema).validate({ test1: "a", test2: "b" });
        });

        it("errors renaming multiple times with multiple disabled", async () => {
            const schema = model.object({
                test: model.string()
            }).rename("test1", "test").rename("test2", "test");

            const err = await assert.throws(async () => model.compile(schema).validate({ test1: "a", test2: "b" }));
            assert.instanceOf(err, Error, '"value" cannot rename child "test2" because multiple renames are disabled and another key was already renamed to "test"');
            expect(err.details).to.eql([{
                message: '"value" cannot rename child "test2" because multiple renames are disabled and another key was already renamed to "test"',
                path: [],
                type: "object.rename.multiple",
                context: { from: "test2", to: "test", label: "value", key: undefined }
            }]);
        });

        it("errors multiple times when abortEarly is false", async () => {
            const schema = model.object().rename("a", "b").rename("c", "b").rename("d", "b").options({ abortEarly: false });
            const err = await assert.throws(async () => schema.validate({ a: 1, c: 1, d: 1 }));
            assert.instanceOf(err, Error, '"value" cannot rename child "c" because multiple renames are disabled and another key was already renamed to "b". "value" cannot rename child "d" because multiple renames are disabled and another key was already renamed to "b"');
            expect(err.details).to.eql([
                {
                    message: '"value" cannot rename child "c" because multiple renames are disabled and another key was already renamed to "b"',
                    path: [],
                    type: "object.rename.multiple",
                    context: { from: "c", to: "b", label: "value", key: undefined }
                },
                {
                    message: '"value" cannot rename child "d" because multiple renames are disabled and another key was already renamed to "b"',
                    path: [],
                    type: "object.rename.multiple",
                    context: { from: "d", to: "b", label: "value", key: undefined }
                }
            ]);
        });

        it("aliases a key", async () => {
            const schema = model.object({
                a: model.number(),
                b: model.number()
            }).rename("a", "b", { alias: true });

            const obj = { a: 10 };

            const value = await model.compile(schema).validate(obj);
            expect(value.a).to.equal(10);
            expect(value.b).to.equal(10);
        });

        it("with override disabled should not allow overwriting existing value", async () => {
            const schema = model.object({
                test1: model.string()
            }).rename("test", "test1");

            const err = await assert.throws(async () => schema.validate({ test: "b", test1: "a" }));
            assert.instanceOf(err, Error, '"value" cannot rename child "test" because override is disabled and target "test1" exists');
            expect(err.details).to.eql([{
                message: '"value" cannot rename child "test" because override is disabled and target "test1" exists',
                path: [],
                type: "object.rename.override",
                context: { from: "test", to: "test1", label: "value", key: undefined }
            }]);
        });

        it("with override enabled should allow overwriting existing value", async () => {

            const schema = model.object({
                test1: model.string()
            }).rename("test", "test1", { override: true });

            await schema.validate({ test: "b", test1: "a" });
        });

        it("renames when data is nested in an array via items", async () => {

            const schema = {
                arr: model.array().items(model.object({
                    one: model.string(),
                    two: model.string()
                }).rename("uno", "one").rename("dos", "two"))
            };

            const data = { arr: [{ uno: "1", dos: "2" }] };
            const value = await model.object(schema).validate(data);
            expect(value.arr[0].one).to.equal("1");
            expect(value.arr[0].two).to.equal("2");
        });

        it("applies rename and validation in the correct order regardless of key order", async () => {

            const schema1 = model.object({
                a: model.number()
            }).rename("b", "a");

            const input1 = { b: "5" };

            const value1 = await schema1.validate(input1);
            expect(value1.b).to.not.exist();
            expect(value1.a).to.equal(5);

            const schema2 = model.object({ a: model.number(), b: model.any() }).rename("b", "a");
            const input2 = { b: "5" };

            const value2 = await schema2.validate(input2);
            expect(value2.b).to.not.exist();
            expect(value2.a).to.equal(5);
        });

        it("sets the default value after key is renamed", async () => {

            const schema = model.object({
                foo2: model.string().default("test")
            }).rename("foo", "foo2");

            const input = {};

            const value = await model.validate(input, schema);
            expect(value.foo2).to.equal("test");
        });

        it("should be able to rename keys that are empty strings", async () => {

            const schema = model.object().rename("", "notEmpty");
            const input = {
                "": "something"
            };

            const value = await schema.validate(input);
            expect(value[""]).to.not.exist();
            expect(value.notEmpty).to.equal("something");
        });

        it("should not create new keys when they key in question does not exist", async () => {

            const schema = model.object().rename("b", "_b");

            const input = {
                a: "something"
            };

            const value = await schema.validate(input);
            expect(Object.keys(value)).to.include("a");
            expect(value.a).to.equal("something");
        });

        it("should remove a key with override if from does not exist", async () => {

            const schema = model.object().rename("b", "a", { override: true });

            const input = {
                a: "something"
            };

            const value = await schema.validate(input);
            expect(value).to.eql({});
        });

        it("should ignore a key with ignoredUndefined if from does not exist", async () => {

            const schema = model.object().rename("b", "a", { ignoreUndefined: true });

            const input = {
                a: "something"
            };

            const value = await schema.validate(input);
            expect(value).to.eql({ a: "something" });
        });

        it("using regex it should ignore a key with ignoredUndefined if from does not exist", async () => {

            const regex = /^b$/i;

            const schema = model.object().rename(regex, "a", { ignoreUndefined: true });

            const input = {
                a: "something"
            };

            const value = await schema.validate(input);
            expect(value).to.eql({ a: "something" });
        });

        it("shouldn't delete a key with override and ignoredUndefined if from does not exist", async () => {

            const schema = model.object().rename("b", "a", { ignoreUndefined: true, override: true });

            const input = {
                a: "something"
            };

            const value = await schema.validate(input);
            expect(value).to.eql({ a: "something" });
        });

        it("should fulfill describe() with defaults", () => {

            const schema = model.object().rename("b", "a");
            const desc = schema.describe();

            expect(desc).to.eql({
                type: "object",
                renames: [{
                    from: "b",
                    to: "a",
                    isRegExp: false,
                    options: {
                        alias: false,
                        multiple: false,
                        override: false
                    }
                }]
            });
        });

        it("should fulfill describe() with non-defaults", () => {

            const schema = model.object().rename("b", "a", { alias: true, multiple: true, override: true });
            const desc = schema.describe();

            expect(desc).to.eql({
                type: "object",
                renames: [{
                    from: "b",
                    to: "a",
                    isRegExp: false,
                    options: {
                        alias: true,
                        multiple: true,
                        override: true
                    }
                }]
            });
        });
    });

    describe("describe()", () => {

        it("return empty description when no schema defined", () => {

            const schema = model.object();
            const desc = schema.describe();
            expect(desc).to.eql({
                type: "object"
            });
        });

        it("respects the shallow parameter", () => {

            const schema = model.object({
                name: model.string(),
                child: model.object({
                    name: model.string()
                })
            });

            expect(Object.keys(schema.describe(true))).to.not.include("children");
            expect(Object.keys(schema.describe())).to.include("children");

        });

        it("describes patterns", () => {
            const schema = model.object({
                a: model.string()
            }).pattern(/\w\d/i, model.boolean());

            expect(schema.describe()).to.eql({
                type: "object",
                children: {
                    a: {
                        type: "string",
                        invalids: [""]
                    }
                },
                patterns: [
                    {
                        regex: "/\\w\\d/i",
                        rule: {
                            type: "boolean",
                            truthy: [true],
                            falsy: [false],
                            flags: {
                                insensitive: true
                            }
                        }
                    }
                ]
            });
        });
        it("describes patterns with schema", () => {
            const schema = model.object({
                a: model.string()
            }).pattern(model.string().uuid("uuidv4"), model.boolean());
            expect(schema.describe()).to.eql({
                type: "object",
                children: {
                    a: {
                        type: "string",
                        invalids: [""]
                    }
                },
                patterns: [
                    {
                        schema: {
                            invalids: [""],
                            rules: [{
                                arg: "uuidv4",
                                name: "guid"
                            }],
                            type: "string"
                        },
                        rule: {
                            type: "boolean",
                            truthy: [true],
                            falsy: [false],
                            flags: {
                                insensitive: true
                            }
                        }
                    }
                ]
            });
        });
    });

    describe("length()", () => {

        it("throws when length is not a number", () => {

            expect(() => {

                model.object().length("a");
            }).to.throw("limit must be a positive integer");
        });
    });

    describe("min()", () => {

        it("throws when limit is not a number", () => {

            expect(() => {

                model.object().min("a");
            }).to.throw("limit must be a positive integer");
        });
    });

    describe("max()", () => {

        it("throws when limit is not a number", () => {

            expect(() => {

                model.object().max("a");
            }).to.throw("limit must be a positive integer");
        });
    });

    describe("pattern()", () => {

        it("shows path to errors in schema", () => {
            expect(() => {
                model.object().pattern(/.*/, {
                    a: {
                        b: {
                            c: {
                                d: undefined
                            }
                        }
                    }
                });
            }).to.throw(Error, "Invalid schema content: (a.b.c.d)");

            expect(() => {
                model.object().pattern(/.*/, () => {

                });
            }).to.throw(Error, "Invalid schema content: ");
        });

        it("validates unknown keys using a regex pattern", async () => {
            const schema = model.object({
                a: model.number()
            }).pattern(/\d+/, model.boolean()).pattern(/\w\w+/, "x");

            const err = await assert.throws(async () => model.validate({ bb: "y", 5: "x" }, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "5" fails because ["5" must be a boolean]. child "bb" fails because ["bb" must be one of [x]]');
            expect(err.details).to.eql([
                {
                    message: '"5" must be a boolean',
                    path: ["5"],
                    type: "boolean.base",
                    context: { label: "5", key: "5" }
                },
                {
                    message: '"bb" must be one of [x]',
                    path: ["bb"],
                    type: "any.allowOnly",
                    context: { value: "y", valids: ["x"], label: "bb", key: "bb" }
                }
            ]);

            Helper.validate(schema, [
                [{ a: 5 }, true],
                [{ a: "x" }, false, null, {
                    message: 'child "a" fails because ["a" must be a number]',
                    details: [{
                        message: '"a" must be a number',
                        path: ["a"],
                        type: "number.base",
                        context: { label: "a", key: "a", value: "x" }
                    }]
                }],
                [{ b: "x" }, false, null, {
                    message: '"b" is not allowed',
                    details: [{
                        message: '"b" is not allowed',
                        path: ["b"],
                        type: "object.allowUnknown",
                        context: { child: "b", label: "b", key: "b" }
                    }]
                }],
                [{ bb: "x" }, true],
                [{ 5: "x" }, false, null, {
                    message: 'child "5" fails because ["5" must be a boolean]',
                    details: [{
                        message: '"5" must be a boolean',
                        path: ["5"],
                        type: "boolean.base",
                        context: { label: "5", key: "5" }
                    }]
                }],
                [{ 5: false }, true],
                [{ 5: undefined }, true]
            ]);
        });

        it("validates unknown keys using a schema pattern", async () => {
            const schema = model.object({
                a: model.number()
            }).pattern(model.number().positive(), model.boolean())
                .pattern(model.string().length(2), "x");
            const err = await assert.throws(async () => model.validate({ bb: "y", 5: "x" }, schema, { abortEarly: false }));
            assert.strictEqual(err.message, 'child "5" fails because ["5" must be a boolean]. child "bb" fails because ["bb" must be one of [x]]');
            expect(err.details).to.eql([
                {
                    message: '"5" must be a boolean',
                    path: ["5"],
                    type: "boolean.base",
                    context: { label: "5", key: "5" }
                },
                {
                    message: '"bb" must be one of [x]',
                    path: ["bb"],
                    type: "any.allowOnly",
                    context: { value: "y", valids: ["x"], label: "bb", key: "bb" }
                }
            ]);
            Helper.validate(schema, [
                [{ a: 5 }, true],
                [{ a: "x" }, false, null, {
                    message: 'child "a" fails because ["a" must be a number]',
                    details: [{
                        message: '"a" must be a number',
                        path: ["a"],
                        type: "number.base",
                        context: { label: "a", key: "a", value: "x" }
                    }]
                }],
                [{ b: "x" }, false, null, {
                    message: '"b" is not allowed',
                    details: [{
                        message: '"b" is not allowed',
                        path: ["b"],
                        type: "object.allowUnknown",
                        context: { child: "b", label: "b", key: "b" }
                    }]
                }],
                [{ bb: "x" }, true],
                [{ 5: "x" }, false, null, {
                    message: 'child "5" fails because ["5" must be a boolean]',
                    details: [{
                        message: '"5" must be a boolean',
                        path: ["5"],
                        type: "boolean.base",
                        context: { label: "5", key: "5" }
                    }]
                }],
                [{ 5: false }, true],
                [{ 5: undefined }, true]
            ]);
        });

        it("validates unknown keys using a pattern (nested)", async () => {

            const schema = {
                x: model.object({
                    a: model.number()
                }).pattern(/\d+/, model.boolean()).pattern(/\w\w+/, "x")
            };

            const err = await assert.throws(async () => model.validate({ x: { bb: "y", 5: "x" } }, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "x" fails because [child "5" fails because ["5" must be a boolean], child "bb" fails because ["bb" must be one of [x]]]');
            expect(err.details).to.eql([
                {
                    message: '"5" must be a boolean',
                    path: ["x", "5"],
                    type: "boolean.base",
                    context: { label: "5", key: "5" }
                },
                {
                    message: '"bb" must be one of [x]',
                    path: ["x", "bb"],
                    type: "any.allowOnly",
                    context: { value: "y", valids: ["x"], label: "bb", key: "bb" }
                }
            ]);
        });

        it("validates unknown keys using a pattern (nested)", async () => {
            const schema = {
                x: model.object({
                    a: model.number()
                }).pattern(model.number().positive(), model.boolean()).pattern(model.string().length(2), "x")
            };
            const err = await assert.throws(async () => model.validate({ x: { bb: "y", 5: "x" } }, schema, { abortEarly: false }));
            assert.strictEqual(err.message, 'child "x" fails because [child "5" fails because ["5" must be a boolean], child "bb" fails because ["bb" must be one of [x]]]');
            expect(err.details).to.eql([
                {
                    message: '"5" must be a boolean',
                    path: ["x", "5"],
                    type: "boolean.base",
                    context: { label: "5", key: "5" }
                },
                {
                    message: '"bb" must be one of [x]',
                    path: ["x", "bb"],
                    type: "any.allowOnly",
                    context: { value: "y", valids: ["x"], label: "bb", key: "bb" }
                }
            ]);
        });

        it("errors when using a pattern on empty schema with unknown(false) and regex pattern mismatch", async () => {

            const schema = model.object().pattern(/\d/, model.number()).unknown(false);

            const err = await assert.throws(async () => model.validate({ a: 5 }, schema, { abortEarly: false }));
            expect(err.details).to.eql([{
                message: '"a" is not allowed',
                path: ["a"],
                type: "object.allowUnknown",
                context: { child: "a", label: "a", key: "a" }
            }]);
        });

        it("errors when using a pattern on empty schema with unknown(false) and schema pattern mismatch", async () => {
            const schema = model.object().pattern(model.number().positive(), model.number()).unknown(false);
            const err = await assert.throws(async () => model.validate({ a: 5 }, schema, { abortEarly: false }));
            assert.strictEqual(err.message, '"a" is not allowed');

            expect(err.details).to.eql([{
                message: '"a" is not allowed',
                path: ["a"],
                type: "object.allowUnknown",
                context: { child: "a", label: "a", key: "a" }
            }]);
        });

        it("removes global flag from patterns", async () => {

            const schema = model.object().pattern(/a/g, model.number());
            await model.validate({ a1: 5, a2: 6 }, schema);
        });

        it("allows using empty() on values", async () => {

            const schema = model.object().pattern(/a/g, model.any().empty(null));

            const value = await model.validate({ a1: undefined, a2: null, a3: "test" }, schema);
            expect(value).to.eql({ a1: undefined, a2: undefined, a3: "test" });
        });

        it("should throw an error if pattern is not regex or instance of Any", () => {
            let error;
            try {
                model.object().pattern(17, model.boolean());
                error = false;
            } catch (e) {
                error = true;
            }
            expect(error).to.equal(true);
        });
    });

    describe("with()", () => {

        it("should throw an error when a parameter is not a string", () => {

            let error;
            try {
                model.object().with({});
                error = false;
            } catch (e) {
                error = true;
            }
            expect(error).to.equal(true);

            try {
                model.object().with(123);
                error = false;
            } catch (e) {
                error = true;
            }
            expect(error).to.equal(true);
        });

        it("should throw an error unless 2 parameters are passed", () => {
            const message = "Invalid number of arguments, expected 2.";

            expect(() => model.object().with()).to.throw(message);
            expect(() => model.object().with("a")).to.throw(message);
            expect(() => model.object().with("a", "b", "c")).to.throw(message);

            const res = model.object().with("a", "b");
            assert.true(is.object(res));
            assert.true(res.isJoi === true);
        });

        it("should validate correctly when key is an empty string", () => {
            const schema = model.object().with("", "b");
            Helper.validate(schema, [
                [{ c: "hi", d: "there" }, true]
            ]);
        });

        it("should apply labels", () => {

            const schema = model.object({
                a: model.number().label("first"),
                b: model.string().label("second")
            }).with("a", ["b"]);
            const error = schema.validate({ a: 1 }).error;
            assert.instanceOf(error, Error, '"first" missing required peer "second"');
            expect(error.details).to.eql([{
                message: '"first" missing required peer "second"',
                path: ["a"],
                type: "object.with",
                context: {
                    main: "a",
                    mainWithLabel: "first",
                    peer: "b",
                    peerWithLabel: "second",
                    label: "a",
                    key: "a"
                }
            }]);
        });
    });

    describe("without()", () => {

        it("should throw an error when a parameter is not a string", () => {

            let error;
            try {
                model.object().without({});
                error = false;
            } catch (e) {
                error = true;
            }
            expect(error).to.equal(true);

            try {
                model.object().without(123);
                error = false;
            } catch (e) {
                error = true;
            }
            expect(error).to.equal(true);


        });

        it("should throw an error unless 2 parameters are passed", () => {
            const message = "Invalid number of arguments, expected 2.";

            expect(() => model.object().without()).to.throw(message);
            expect(() => model.object().without("a")).to.throw(message);
            expect(() => model.object().without("a", "b", "c")).to.throw(message);

            const res = model.object().without("a", "b");
            assert.true(is.object(res));
            assert.true(res.isJoi === true);
        });

        it("should validate correctly when key is an empty string", () => {

            const schema = model.object().without("", "b");
            Helper.validate(schema, [
                [{ a: "hi", b: "there" }, true]
            ]);
        });

        it("should validate correctly when key is stripped", () => {

            const schema = model.object({
                a: model.any().strip(),
                b: model.any()
            }).without("a", "b");
            Helper.validate(schema, [
                [{ a: "hi", b: "there" }, true]
            ]);
        });

        it("should apply labels", () => {

            const schema = model.object({
                a: model.number().label("first"),
                b: model.string().label("second")
            }).without("a", ["b"]);
            const error = schema.validate({ a: 1, b: "b" }).error;
            assert.instanceOf(error, Error, '"first" conflict with forbidden peer "second"');
            expect(error.details).to.eql([{
                message: '"first" conflict with forbidden peer "second"',
                path: ["a"],
                type: "object.without",
                context: {
                    main: "a",
                    mainWithLabel: "first",
                    peer: "b",
                    peerWithLabel: "second",
                    label: "a",
                    key: "a"
                }
            }]);
        });
    });

    describe("xor()", () => {

        it("should throw an error when a parameter is not a string", () => {
            let error;
            try {
                model.object().xor({});
                error = false;
            } catch (e) {
                error = true;
            }
            expect(error).to.equal(true);

            try {
                model.object().xor(123);
                error = false;
            } catch (e) {
                error = true;
            }
            expect(error).to.equal(true);
        });

        it("should apply labels without any peer", () => {
            const schema = model.object({
                a: model.number().label("first"),
                b: model.string().label("second")
            }).xor("a", "b");
            const error = schema.validate({}).error;
            assert.instanceOf(error, Error, '"value" must contain at least one of [first, second]');
            expect(error.details).to.eql([{
                message: '"value" must contain at least one of [first, second]',
                path: [],
                type: "object.missing",
                context: {
                    peers: ["a", "b"],
                    peersWithLabels: ["first", "second"],
                    label: "value",
                    key: undefined
                }
            }]);
        });

        it("should apply labels with too many peers", () => {
            const schema = model.object({
                a: model.number().label("first"),
                b: model.string().label("second")
            }).xor("a", "b");
            const error = schema.validate({ a: 1, b: "b" }).error;
            assert.instanceOf(error, Error, '"value" contains a conflict between exclusive peers [first, second]');
            expect(error.details).to.eql([{
                message: '"value" contains a conflict between exclusive peers [first, second]',
                path: [],
                type: "object.xor",
                context: {
                    peers: ["a", "b"],
                    peersWithLabels: ["first", "second"],
                    label: "value",
                    key: undefined
                }
            }]);
        });
    });

    describe("or()", () => {

        it("should throw an error when a parameter is not a string", () => {
            let error;
            try {
                model.object().or({});
                error = false;
            } catch (e) {
                error = true;
            }
            expect(error).to.equal(true);

            try {
                model.object().or(123);
                error = false;
            } catch (e) {
                error = true;
            }
            expect(error).to.equal(true);
        });

        it("errors multiple levels deep", async () => {
            const schema = model.object({
                a: {
                    b: model.object().or("x", "y")
                }
            });
            const err = await assert.throws(async () => schema.validate({ a: { b: { c: 1 } } }));
            assert.instanceOf(err, Error, 'child "a" fails because [child "b" fails because ["value" must contain at least one of [x, y]]]');
            expect(err.details).to.eql([{
                message: '"value" must contain at least one of [x, y]',
                path: ["a", "b"],
                type: "object.missing",
                context: {
                    peers: ["x", "y"],
                    peersWithLabels: ["x", "y"],
                    label: "value",
                    key: "b"
                }
            }]);
        });

        it("should apply labels", () => {

            const schema = model.object({
                a: model.number().label("first"),
                b: model.string().label("second")
            }).or("a", "b");
            const error = schema.validate({}).error;
            assert.instanceOf(error, Error, '"value" must contain at least one of [first, second]');
            expect(error.details).to.eql([{
                message: '"value" must contain at least one of [first, second]',
                path: [],
                type: "object.missing",
                context:
                {
                    peers: ["a", "b"],
                    peersWithLabels: ["first", "second"],
                    label: "value",
                    key: undefined
                }
            }]);
        });
    });

    describe("and()", () => {

        it("should apply labels", () => {

            const schema = model.object({
                a: model.number().label("first"),
                b: model.string().label("second")
            }).and("a", "b");
            const error = schema.validate({ a: 1 }).error;
            assert.instanceOf(error, Error, '"value" contains [first] without its required peers [second]');
            expect(error.details).to.eql([{
                message: '"value" contains [first] without its required peers [second]',
                path: [],
                type: "object.and",
                context:
                {
                    present: ["a"],
                    presentWithLabels: ["first"],
                    missing: ["b"],
                    missingWithLabels: ["second"],
                    label: "value",
                    key: undefined
                }
            }]);
        });
    });

    describe("nand()", () => {

        it("should apply labels", () => {
            const schema = model.object({
                a: model.number().label("first"),
                b: model.string().label("second")
            }).nand("a", "b");
            const error = schema.validate({ a: 1, b: "b" }).error;
            assert.instanceOf(error, Error, '"first" must not exist simultaneously with [second]');
            expect(error.details).to.eql([{
                message: '"first" must not exist simultaneously with [second]',
                path: [],
                type: "object.nand",
                context: {
                    main: "a",
                    mainWithLabel: "first",
                    peers: ["b"],
                    peersWithLabels: ["second"],
                    label: "value",
                    key: undefined
                }
            }]);
        });
    });

    describe("assert()", () => {

        it("shows path to errors in schema", () => {

            expect(() => {

                model.object().assert("a.b", {
                    a: {
                        b: {
                            c: {
                                d: undefined
                            }
                        }
                    }
                });
            }).to.throw(Error, "Invalid schema content: (a.b.c.d)");
        });

        it("shows errors in schema", () => {

            expect(() => {

                model.object().assert("a.b", undefined);
            }).to.throw(Error, "Invalid schema content: ");
        });

        it("validates upwards reference", async () => {
            const schema = model.object({
                a: {
                    b: model.string(),
                    c: model.number()
                },
                d: {
                    e: model.any()
                }
            }).assert(model.ref("d/e", { separator: "/" }), model.ref("a.c"), "equal to a.c");

            const err = await assert.throws(async () => schema.validate({ a: { b: "x", c: 5 }, d: { e: 6 } }));
            expect(err.message).to.equal('"d.e" validation failed because "d.e" failed to equal to a.c');

            Helper.validate(schema, [
                [{ a: { b: "x", c: 5 }, d: { e: 5 } }, true]
            ]);
        });

        it("validates upwards reference with implicit context", async () => {
            const schema = model.object({
                a: {
                    b: model.string(),
                    c: model.number()
                },
                d: {
                    e: model.any()
                }
            }).assert("d.e", model.ref("a.c"), "equal to a.c");

            const err = await assert.throws(async () => schema.validate({ a: { b: "x", c: 5 }, d: { e: 6 } }));
            assert.instanceOf(err, Error, '"d.e" validation failed because "d.e" failed to equal to a.c');
            expect(err.details).to.eql([{
                message: '"d.e" validation failed because "d.e" failed to equal to a.c',
                path: ["d", "e"],
                type: "object.assert",
                context: { ref: "d.e", message: "equal to a.c", label: "e", key: "e" }
            }]);

            Helper.validate(schema, [
                [{ a: { b: "x", c: 5 }, d: { e: 5 } }, true]
            ]);
        });

        it("throws when context is at root level", () => {

            expect(() => {

                model.object({
                    a: {
                        b: model.string(),
                        c: model.number()
                    },
                    d: {
                        e: model.any()
                    }
                }).assert("a", model.ref("d.e"), "equal to d.e");
            }).to.throw("Cannot use assertions for root level references - use direct key rules instead");
        });

        it("allows root level context ref", () => {

            expect(() => {

                model.object({
                    a: {
                        b: model.string(),
                        c: model.number()
                    },
                    d: {
                        e: model.any()
                    }
                }).assert("$a", model.ref("d.e"), "equal to d.e");
            }).to.not.throw();
        });

        it("provides a default message for failed assertions", async () => {
            const schema = model.object({
                a: {
                    b: model.string(),
                    c: model.number()
                },
                d: {
                    e: model.any()
                }
            }).assert("d.e", model.boolean());

            const err = await assert.throws(async () => schema.validate({ d: { e: [] } }));
            assert.instanceOf(err, Error, '"d.e" validation failed because "d.e" failed to pass the assertion test');
            expect(err.details).to.eql([{
                message: '"d.e" validation failed because "d.e" failed to pass the assertion test',
                path: ["d", "e"],
                type: "object.assert",
                context: {
                    ref: "d.e",
                    message: "pass the assertion test",
                    label: "e",
                    key: "e"
                }
            }]);
        });
    });

    describe("type()", () => {

        it("uses constructor name for default type name", async () => {
            const Foo = function Foo() { };

            const schema = model.object().type(Foo);
            const err = await assert.throws(async () => schema.validate({}));
            expect(err.details).to.eql([{
                message: '"value" must be an instance of "Foo"',
                path: [],
                type: "object.type",
                context: { type: "Foo", label: "value", key: undefined }
            }]);
        });

        it("uses custom type name if supplied", async () => {
            const Foo = function () { };

            const schema = model.object().type(Foo, "Bar");
            const err = await assert.throws(async () => schema.validate({}));
            expect(err.details).to.eql([{
                message: '"value" must be an instance of "Bar"',
                path: [],
                type: "object.type",
                context: { type: "Bar", label: "value", key: undefined }
            }]);
        });

        it("overrides constructor name with custom name", async () => {
            const Foo = function Foo() { };

            const schema = model.object().type(Foo, "Bar");
            const err = await assert.throws(async () => schema.validate({}));
            expect(err.details).to.eql([{
                message: '"value" must be an instance of "Bar"',
                path: [],
                type: "object.type",
                context: { type: "Bar", label: "value", key: undefined }
            }]);
        });

        it("throws when constructor is not a function", () => {

            expect(() => {

                model.object().type("");
            }).to.throw("type must be a constructor function");
        });

        it("uses the constructor name in the schema description", () => {

            const description = model.object().type(RegExp).describe();

            assert.includeDeepMembers(description.rules, [{ name: "type", arg: { name: "RegExp", ctor: RegExp } }]);
        });

        it("uses the constructor reference in the schema description", () => {

            const Foo = function Foo() { };
            const description = model.object().type(Foo).describe();

            expect(new Foo()).to.be.an.instanceof(description.rules[0].arg.ctor);
        });
    });

    describe("schema()", () => {

        it("should detect joi instances", () => {

            const schema = model.object().schema();
            Helper.validate(schema, [
                [{}, false, null, {
                    message: '"value" must be a Joi instance',
                    details: [{
                        message: '"value" must be a Joi instance',
                        path: [],
                        type: "object.schema",
                        context: { label: "value", key: undefined }
                    }]
                }],
                [{ isJoi: true }, false, null, {
                    message: '"value" must be a Joi instance',
                    details: [{
                        message: '"value" must be a Joi instance',
                        path: [],
                        type: "object.schema",
                        context: { label: "value", key: undefined }
                    }]
                }],
                [model.number().max(2), true]
            ]);
        });

    });

    describe("requiredKeys()", () => {

        it("should set keys as required", () => {

            const schema = model.object({ a: 0, b: 0, c: { d: 0, e: { f: 0 } }, g: { h: 0 } })
                .requiredKeys("a", "b", "c.d", "c.e.f", "g");
            Helper.validate(schema, [
                [{}, false, null, {
                    message: 'child "a" fails because ["a" is required]',
                    details: [{
                        message: '"a" is required',
                        path: ["a"],
                        type: "any.required",
                        context: { label: "a", key: "a" }
                    }]
                }],
                [{ a: 0 }, false, null, {
                    message: 'child "b" fails because ["b" is required]',
                    details: [{
                        message: '"b" is required',
                        path: ["b"],
                        type: "any.required",
                        context: { label: "b", key: "b" }
                    }]
                }],
                [{ a: 0, b: 0 }, false, null, {
                    message: 'child "g" fails because ["g" is required]',
                    details: [{
                        message: '"g" is required',
                        path: ["g"],
                        type: "any.required",
                        context: { label: "g", key: "g" }
                    }]
                }],
                [{ a: 0, b: 0, g: {} }, true],
                [{ a: 0, b: 0, c: {}, g: {} }, false, null, {
                    message: 'child "c" fails because [child "d" fails because ["d" is required]]',
                    details: [{
                        message: '"d" is required',
                        path: ["c", "d"],
                        type: "any.required",
                        context: { label: "d", key: "d" }
                    }]
                }],
                [{ a: 0, b: 0, c: { d: 0 }, g: {} }, true],
                [{ a: 0, b: 0, c: { d: 0, e: {} }, g: {} }, false, null, {
                    message: 'child "c" fails because [child "e" fails because [child "f" fails because ["f" is required]]]',
                    details: [{
                        message: '"f" is required',
                        path: ["c", "e", "f"],
                        type: "any.required",
                        context: { label: "f", key: "f" }
                    }]
                }],
                [{ a: 0, b: 0, c: { d: 0, e: { f: 0 } }, g: {} }, true]
            ]);
        });

        it("should work on types other than objects", () => {

            const schemas = [model.array(), model.binary(), model.boolean(), model.date(), model.func(), model.number(), model.string()];
            schemas.forEach((schema) => {

                expect(() => {

                    schema.applyFunctionToChildren([""], "required");
                }).to.not.throw();

                expect(() => {

                    schema.applyFunctionToChildren(["", "a"], "required");
                }).to.throw();

                expect(() => {

                    schema.applyFunctionToChildren(["a"], "required");
                }).to.throw();
            });

        });

        it("should throw on unknown key", () => {

            expect(() => {

                model.object({ a: 0, b: 0 }).requiredKeys("a", "c", "b", "d", "d.e.f");
            }).to.throw(Error, "unknown key(s) c, d");

            expect(() => {

                model.object({ a: 0, b: 0 }).requiredKeys("a", "b", "a.c.d");
            }).to.throw(Error, "unknown key(s) a.c.d");

        });

        it("should throw on empty object", () => {

            expect(() => {

                model.object().requiredKeys("a", "c", "b", "d");
            }).to.throw(Error, "unknown key(s) a, b, c, d");
        });

        it("should not modify original object", async () => {

            const schema = model.object({ a: 0 });
            const requiredSchema = schema.requiredKeys("a");
            await schema.validate({});

            const err = await assert.throws(async () => requiredSchema.validate({}));
            expect(err.details).to.eql([{
                message: '"a" is required',
                path: ["a"],
                type: "any.required",
                context: { label: "a", key: "a" }
            }]);
        });
    });

    describe("optionalKeys()", () => {

        it("should set keys as optional", () => {

            const schema = model.object({ a: model.number().required(), b: model.number().required() }).optionalKeys("a", "b");
            Helper.validate(schema, [
                [{}, true],
                [{ a: 0 }, true],
                [{ a: 0, b: 0 }, true]
            ]);
        });
    });

    describe("forbiddenKeys()", () => {

        it("should set keys as forbidden", () => {

            const schema = model.object({ a: model.number().required(), b: model.number().required() }).forbiddenKeys("a", "b");
            Helper.validate(schema, [
                [{}, true],
                [{ a: undefined }, true],
                [{ a: undefined, b: undefined }, true],
                [{ a: 0 }, false, null, {
                    message: 'child "a" fails because ["a" is not allowed]',
                    details: [{
                        message: '"a" is not allowed',
                        path: ["a"],
                        type: "any.unknown",
                        context: { label: "a", key: "a" }
                    }]
                }],
                [{ b: 0 }, false, null, {
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
    });
});
