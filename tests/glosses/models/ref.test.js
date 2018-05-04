const Helper = require("./helper");

const {
    model
} = adone;

describe("ref", () => {

    it("detects references", () => {

        expect(model.isRef(model.ref("a.b"))).to.be.true();
    });

    it("uses ref as a valid value", async () => {

        const ref = model.ref("b");
        const schema = model.object({
            a: ref,
            b: model.any()
        });

        const err = await assert.throws(async () => schema.validate({ a: 5, b: 6 }));

        assert.instanceOf(err, Error, 'child "a" fails because ["a" must be one of [ref:b]]');
        expect(err.details).to.eql([{
            message: '"a" must be one of [ref:b]',
            path: ["a"],
            type: "any.allowOnly",
            context: { valids: [ref], label: "a", key: "a" }
        }]);

        Helper.validate(schema, [
            [{ a: 5 }, false, null, {
                message: 'child "a" fails because ["a" must be one of [ref:b]]',
                details: [{
                    message: '"a" must be one of [ref:b]',
                    path: ["a"],
                    type: "any.allowOnly",
                    context: { valids: [ref], label: "a", key: "a" }
                }]
            }],
            [{ b: 5 }, true],
            [{ a: 5, b: 5 }, true],
            [{ a: "5", b: "5" }, true]
        ]);
    });

    it("uses ref as a valid value (empty key)", async () => {

        const ref = model.ref("");
        const schema = model.object({
            a: ref,
            "": model.any()
        });

        const err = await assert.throws(async () => schema.validate({ a: 5, "": 6 }));
        assert.instanceOf(err, Error, 'child "a" fails because ["a" must be one of [ref:]]');
        expect(err.details).to.eql([{
            message: '"a" must be one of [ref:]',
            path: ["a"],
            type: "any.allowOnly",
            context: { valids: [ref], label: "a", key: "a" }
        }]);

        Helper.validate(schema, [
            [{ a: 5 }, false, null, {
                message: 'child "a" fails because ["a" must be one of [ref:]]',
                details: [{
                    message: '"a" must be one of [ref:]',
                    path: ["a"],
                    type: "any.allowOnly",
                    context: { valids: [ref], label: "a", key: "a" }
                }]
            }],
            [{ "": 5 }, true],
            [{ a: 5, "": 5 }, true],
            [{ a: "5", "": "5" }, true]
        ]);
    });

    it("uses ref with nested keys as a valid value", async () => {

        const ref = model.ref("b.c");
        const schema = model.object({
            a: ref,
            b: {
                c: model.any()
            }
        });

        const err = await assert.throws(async () => schema.validate({ a: 5, b: { c: 6 } }));

        assert.instanceOf(err, Error, 'child "a" fails because ["a" must be one of [ref:b.c]]');
        expect(err.details).to.eql([{
            message: '"a" must be one of [ref:b.c]',
            path: ["a"],
            type: "any.allowOnly",
            context: { valids: [ref], label: "a", key: "a" }
        }]);

        Helper.validate(schema, [
            [{ a: 5 }, false, null, {
                message: 'child "a" fails because ["a" must be one of [ref:b.c]]',
                details: [{
                    message: '"a" must be one of [ref:b.c]',
                    path: ["a"],
                    type: "any.allowOnly",
                    context: { valids: [ref], label: "a", key: "a" }
                }]
            }],
            [{ b: { c: 5 } }, true],
            [{ a: 5, b: 5 }, false, null, {
                message: 'child "b" fails because ["b" must be an object]',
                details: [{
                    message: '"b" must be an object',
                    path: ["b"],
                    type: "object.base",
                    context: { label: "b", key: "b" }
                }]
            }],
            [{ a: "5", b: { c: "5" } }, true]
        ]);
    });

    it("uses ref with combined nested keys in sub child", async () => {

        const ref = model.ref("b.c");
        expect(ref.root).to.equal("b");

        const schema = model.object({
            a: ref,
            b: {
                c: model.any()
            }
        });

        const input = { a: 5, b: { c: 5 } };
        await schema.validate(input);

        const parent = model.object({
            e: schema
        });

        await parent.validate({ e: input });
    });

    it("uses ref reach options", async () => {

        const ref = model.ref("b/c", { separator: "/" });
        expect(ref.root).to.equal("b");

        const schema = model.object({
            a: ref,
            b: {
                c: model.any()
            }
        });

        await schema.validate({ a: 5, b: { c: 5 } });
    });

    it("ignores the order in which keys are defined", async () => {

        const ab = model.object({
            a: {
                c: model.number()
            },
            b: model.ref("a.c")
        });

        await ab.validate({ a: { c: "5" }, b: 5 });

        const ba = model.object({
            b: model.ref("a.c"),
            a: {
                c: model.number()
            }
        });

        await ba.validate({ a: { c: "5" }, b: 5 });
    });

    it("uses ref as default value", async () => {

        const schema = model.object({
            a: model.default(model.ref("b")),
            b: model.any()
        });

        const value = await schema.validate({ b: 6 });
        expect(value).to.eql({ a: 6, b: 6 });
    });

    it("uses ref mixed with normal values", async () => {
        const schema = model.object({
            a: model.number().valid(1, model.ref("b")),
            b: model.any()
        });

        expect(await schema.validate({ a: 6, b: 6 })).to.eql({ a: 6, b: 6 });
        expect(await schema.validate({ a: 1, b: 6 })).to.eql({ a: 1, b: 6 });
        await assert.throws(async () => schema.validate({ a: 6, b: 1 }));
    });

    it("uses ref as default value regardless of order", async () => {
        const ab = model.object({
            a: model.default(model.ref("b")),
            b: model.number()
        });

        const value = await ab.validate({ b: "6" });
        expect(value).to.eql({ a: 6, b: 6 });

        const ba = model.object({
            b: model.number(),
            a: model.default(model.ref("b"))
        });

        const value2 = await ba.validate({ b: "6" });
        expect(value2).to.eql({ a: 6, b: 6 });
    });

    it("ignores the order in which keys are defined with alternatives", () => {

        const ref1 = model.ref("a.c");
        const ref2 = model.ref("c");
        const a = { c: model.number() };
        const b = [ref1, ref2];
        const c = model.number();

        Helper.validate({ a, b, c }, [
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

        Helper.validate({ b, a, c }, [
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

        Helper.validate({ b, c, a }, [
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

        Helper.validate({ a, c, b }, [
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

        Helper.validate({ c, a, b }, [
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

        Helper.validate({ c, b, a }, [
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

    it("uses context as default value", async () => {

        const schema = model.object({
            a: model.default(model.ref("$x")),
            b: model.any()
        });

        const value = await model.validate({ b: 6 }, schema, { context: { x: 22 } });
        expect(value).to.eql({ a: 22, b: 6 });
    });

    it("uses context as default value with custom prefix", async () => {

        const schema = model.object({
            a: model.default(model.ref("%x", { contextPrefix: "%" })),
            b: model.any()
        });

        const value = await model.validate({ b: 6 }, schema, { context: { x: 22 } });
        expect(value).to.eql({ a: 22, b: 6 });
    });

    it("uses context as a valid value", async () => {

        const ref = model.ref("$x");
        const schema = model.object({
            a: ref,
            b: model.any()
        });

        const err = await assert.throws(async () => model.validate({ a: 5, b: 6 }, schema, { context: { x: 22 } }));
        assert.instanceOf(err, Error, 'child "a" fails because ["a" must be one of [context:x]]');
        expect(err.details).to.eql([{
            message: '"a" must be one of [context:x]',
            path: ["a"],
            type: "any.allowOnly",
            context: { valids: [ref], label: "a", key: "a" }
        }]);

        Helper.validateOptions(schema, [
            [{ a: 5 }, false, null, {
                message: 'child "a" fails because ["a" must be one of [context:x]]',
                details: [{
                    message: '"a" must be one of [context:x]',
                    path: ["a"],
                    type: "any.allowOnly",
                    context: { valids: [ref], label: "a", key: "a" }
                }]
            }],
            [{ a: 22 }, true],
            [{ b: 5 }, true],
            [{ a: 22, b: 5 }, true],
            [{ a: "22", b: "5" }, false, null, {
                message: 'child "a" fails because ["a" must be one of [context:x]]',
                details: [{
                    message: '"a" must be one of [context:x]',
                    path: ["a"],
                    type: "any.allowOnly",
                    context: { valids: [ref], label: "a", key: "a" }
                }]
            }]
        ], { context: { x: 22 } });
    });

    it("uses context in when condition", () => {

        const schema = {
            a: model.boolean().when("$x", { is: model.exist(), otherwise: model.forbidden() })
        };

        Helper.validate(schema, [
            [{}, true],
            [{ a: "x" }, false, null, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{ a: true }, false, null, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{}, true, { context: {} }],
            [{ a: "x" }, false, { context: {} }, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{ a: true }, false, { context: {} }, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{}, true, { context: { x: 1 } }],
            [{ a: "x" }, false, { context: { x: 1 } }, {
                message: 'child "a" fails because ["a" must be a boolean]',
                details: [{
                    message: '"a" must be a boolean',
                    path: ["a"],
                    type: "boolean.base",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{ a: true }, true, { context: { x: 1 } }]
        ]);
    });

    it("uses nested context in when condition", () => {

        const schema = {
            a: model.boolean().when("$x.y", { is: model.exist(), otherwise: model.forbidden() })
        };

        Helper.validate(schema, [
            [{}, true],
            [{ a: "x" }, false, null, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{ a: true }, false, null, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{}, true, { context: {} }],
            [{ a: "x" }, false, { context: {} }, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{ a: true }, false, { context: {} }, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{}, true, { context: { x: 1 } }],
            [{ a: "x" }, false, { context: { x: 1 } }, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{ a: true }, false, { context: { x: 1 } }, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{}, true, { context: { x: {} } }],
            [{ a: "x" }, false, { context: { x: {} } }, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{ a: true }, false, { context: { x: {} } }, {
                message: 'child "a" fails because ["a" is not allowed]',
                details: [{
                    message: '"a" is not allowed',
                    path: ["a"],
                    type: "any.unknown",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{}, true, { context: { x: { y: 1 } } }],
            [{ a: "x" }, false, { context: { x: { y: 1 } } }, {
                message: 'child "a" fails because ["a" must be a boolean]',
                details: [{
                    message: '"a" must be a boolean',
                    path: ["a"],
                    type: "boolean.base",
                    context: { label: "a", key: "a" }
                }]
            }],
            [{ a: true }, true, { context: { x: { y: 1 } } }]
        ]);
    });

    it("describes schema with ref", () => {

        const desc = model
            .valid(model.ref("a.b"))
            .invalid(model.ref("$b.c"))
            .default(model.ref("a.b"))
            .when("a.b", {
                is: model.date().min(model.ref("a.b")).max(model.ref("a.b")),
                then: model.number().min(model.ref("a.b")).max(model.ref("a.b")).greater(model.ref("a.b")).less(model.ref("a.b")),
                otherwise: model.object({
                    a: model.string().min(model.ref("a.b")).max(model.ref("a.b")).length(model.ref("a.b"))
                }).with("a", "b").without("b", "c").assert("a.b", model.ref("a.b"))
            })
            .describe();

        expect(desc).to.eql({
            type: "alternatives",
            flags: { presence: "ignore" },
            base: {
                type: "any",
                flags: {
                    allowOnly: true,
                    default: "ref:a.b"
                },
                invalids: ["context:b.c"],
                valids: ["ref:a.b"]
            },
            alternatives: [{
                ref: "ref:a.b",
                is: {
                    type: "date",
                    rules: [
                        { name: "min", arg: "ref:a.b" },
                        { name: "max", arg: "ref:a.b" }
                    ]
                },
                then: {
                    type: "number",
                    flags: { allowOnly: true, default: "ref:a.b" },
                    valids: ["ref:a.b"],
                    invalids: ["context:b.c", Infinity, -Infinity],
                    rules: [
                        { name: "min", arg: "ref:a.b" },
                        { name: "max", arg: "ref:a.b" },
                        { name: "greater", arg: "ref:a.b" },
                        { name: "less", arg: "ref:a.b" }
                    ]
                },
                otherwise: {
                    type: "object",
                    flags: { allowOnly: true, default: "ref:a.b" },
                    valids: ["ref:a.b"],
                    invalids: ["context:b.c"],
                    rules: [{
                        name: "assert",
                        arg: {
                            schema: {
                                type: "any",
                                flags: { allowOnly: true },
                                valids: ["ref:a.b"]
                            },
                            ref: "ref:a.b"
                        }
                    }],
                    children: {
                        a: {
                            type: "string",
                            invalids: [""],
                            rules: [
                                { name: "min", arg: "ref:a.b" },
                                { name: "max", arg: "ref:a.b" },
                                { name: "length", arg: "ref:a.b" }
                            ]
                        }
                    },
                    dependencies: [{
                        type: "with",
                        key: "a",
                        peers: ["b"]
                    },
                    {
                        type: "without",
                        key: "b",
                        peers: ["c"]
                    }]
                }
            }]
        });
    });

    describe("create()", () => {

        it("throws when key is missing", () => {

            expect(() => {

                model.ref(5);
            }).to.throw("Invalid reference key: 5");
        });

        it("finds root with default separator", () => {

            expect(model.ref("a.b.c").root).to.equal("a");
        });

        it("finds root with default separator and options", () => {

            expect(model.ref("a.b.c", {}).root).to.equal("a");
        });

        it("finds root with custom separator", () => {

            expect(model.ref("a+b+c", { separator: "+" }).root).to.equal("a");
        });
    });
});
