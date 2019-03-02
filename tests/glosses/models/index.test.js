const Helper = require("./helper");

const {
    is,
    model
} = adone;

describe("model", () => {

    it("validates with a callback", async () => {
        const value = await new Promise((resolve, reject) => {
            const schema = model.number();
            model.validate(0, schema, (err, value) => {

                if (err) {
                    return reject(err);
                }

                resolve(value);
            });
        });
        expect(value).to.equal(0);
    });

    it("validates object", async () => {

        const schema = model.object({
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c"),
            c: model.string().email().optional()
        }).without("a", "none");

        const obj = {
            a: 1,
            b: "a",
            c: "joe@example.com"
        };

        await schema.validate(obj);
    });

    it("keeps schema immutable", () => {
        const a = model.string();
        const b = a.valid("b");

        Helper.validate(a, [
            ["a", true],
            ["b", true],
            [5, false, null, {
                message: '"value" must be a string',
                details: [{
                    message: '"value" must be a string',
                    path: [],
                    type: "string.base",
                    context: { value: 5, label: "value", key: undefined }
                }]
            }]
        ]);

        Helper.validate(b, [
            ["a", false, null, {
                message: '"value" must be one of [b]',
                details: [{
                    message: '"value" must be one of [b]',
                    path: [],
                    type: "any.allowOnly",
                    context: { value: "a", valids: ["b"], label: "value", key: undefined }
                }]
            }],
            ["b", true],
            [5, false, null, {
                message: '"value" must be a string',
                details: [{
                    message: '"value" must be a string',
                    path: [],
                    type: "string.base",
                    context: { value: 5, label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("validates null", async () => {

        const err = await assert.throws(async () => model.string().validate(null));
        assert.instanceOf(err, Error);
        expect(err.details).to.eql([{
            message: '"value" must be a string',
            path: [],
            type: "string.base",
            context: { value: null, label: "value", key: undefined }
        }]);
        expect(err.annotate()).to.equal('{\n  \u001b[41m\"value\"\u001b[0m\u001b[31m [1]: -- missing --\u001b[0m\n}\n\u001b[31m\n[1] "value" must be a string\u001b[0m');
    });

    it("validates null schema", () => {

        Helper.validate(null, [
            ["a", false, null, {
                message: '"value" must be one of [null]',
                details: [{
                    message: '"value" must be one of [null]',
                    path: [],
                    type: "any.allowOnly",
                    context: { value: "a", valids: [null], label: "value", key: undefined }
                }]
            }],
            [null, true]
        ]);
    });

    it("validates number literal", () => {

        Helper.validate(5, [
            [6, false, null, {
                message: '"value" must be one of [5]',
                details: [{
                    message: '"value" must be one of [5]',
                    path: [],
                    type: "any.allowOnly",
                    context: { value: 6, valids: [5], label: "value", key: undefined }
                }]
            }],
            [5, true]
        ]);
    });

    it("validates string literal", () => {

        Helper.validate("5", [
            ["6", false, null, {
                message: '"value" must be one of [5]',
                details: [{
                    message: '"value" must be one of [5]',
                    path: [],
                    type: "any.allowOnly",
                    context: { value: "6", valids: ["5"], label: "value", key: undefined }
                }]
            }],
            ["5", true]
        ]);
    });

    it("validates boolean literal", () => {

        Helper.validate(true, [
            [false, false, null, {
                message: '"value" must be one of [true]',
                details: [{
                    message: '"value" must be one of [true]',
                    path: [],
                    type: "any.allowOnly",
                    context: { value: false, valids: [true], label: "value", key: undefined }
                }]
            }],
            [true, true]
        ]);
    });

    it("validates date literal", () => {

        const now = Date.now();
        const dnow = new Date(now);
        Helper.validate(dnow, [
            [new Date(now), true],
            [now, true],
            [now * 2, false, null, {
                message: `"value" must be one of [${dnow}]`,
                details: [{
                    message: `"value" must be one of [${dnow}]`,
                    path: [],
                    type: "any.allowOnly",
                    context: { value: new Date(now * 2), valids: [dnow], label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("validates complex literal", () => {

        const schema = ["key", 5, { a: true, b: [/^a/, "boom"] }];
        Helper.validate(schema, [
            ["key", true],
            [5, true],
            ["other", false, null, {
                message: '"value" must be one of [key], "value" must be a number, "value" must be an object',
                details: [
                    {
                        message: '"value" must be one of [key]',
                        path: [],
                        type: "any.allowOnly",
                        context: { value: "other", valids: ["key"], label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be a number',
                        path: [],
                        type: "number.base",
                        context: { label: "value", key: undefined, value: "other" }
                    },
                    {
                        message: '"value" must be an object',
                        path: [],
                        type: "object.base",
                        context: { label: "value", key: undefined }
                    }
                ]
            }],
            [6, false, null, {
                message: '"value" must be a string, "value" must be one of [5], "value" must be an object',
                details: [
                    {
                        message: '"value" must be a string',
                        path: [],
                        type: "string.base",
                        context: { value: 6, label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be one of [5]',
                        path: [],
                        type: "any.allowOnly",
                        context: { value: 6, valids: [5], label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be an object',
                        path: [],
                        type: "object.base",
                        context: { label: "value", key: undefined }
                    }
                ]
            }],
            [{ c: 5 }, false, null, {
                message: '"value" must be a string, "value" must be a number, "c" is not allowed',
                details: [
                    {
                        message: '"value" must be a string',
                        path: [],
                        type: "string.base",
                        context: { value: { c: 5 }, label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be a number',
                        path: [],
                        type: "number.base",
                        context: { label: "value", key: undefined, value: { c: 5 } }
                    },
                    {
                        message: '"c" is not allowed',
                        path: ["c"],
                        type: "object.allowUnknown",
                        context: { child: "c", label: "c", key: "c" }
                    }
                ]
            }],
            [{}, true],
            [{ b: "abc" }, true],
            [{ a: true, b: "boom" }, true],
            [{ a: 5, b: "a" }, false, null, {
                message: '"value" must be a string, "value" must be a number, child "a" fails because ["a" must be a boolean]',
                details: [
                    {
                        message: '"value" must be a string',
                        path: [],
                        type: "string.base",
                        context: { value: { a: 5, b: "a" }, label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be a number',
                        path: [],
                        type: "number.base",
                        context: { label: "value", key: undefined, value: { a: 5, b: "a" } }
                    },
                    {
                        message: '"a" must be a boolean',
                        path: ["a"],
                        type: "boolean.base",
                        context: { label: "a", key: "a" }
                    }
                ]
            }]
        ]);
    });

    it("validates a compiled complex literal", () => {

        const schema = model.compile(["key", 5, { a: true, b: [/^a/, "boom"] }]);
        Helper.validate(schema, [
            ["key", true],
            [5, true],
            ["other", false, null, {
                message: '"value" must be one of [key], "value" must be a number, "value" must be an object',
                details: [
                    {
                        message: '"value" must be one of [key]',
                        path: [],
                        type: "any.allowOnly",
                        context: { value: "other", valids: ["key"], label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be a number',
                        path: [],
                        type: "number.base",
                        context: { label: "value", key: undefined, value: "other" }
                    },
                    {
                        message: '"value" must be an object',
                        path: [],
                        type: "object.base",
                        context: { label: "value", key: undefined }
                    }
                ]
            }],
            [6, false, null, {
                message: '"value" must be a string, "value" must be one of [5], "value" must be an object',
                details: [
                    {
                        message: '"value" must be a string',
                        path: [],
                        type: "string.base",
                        context: { value: 6, label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be one of [5]',
                        path: [],
                        type: "any.allowOnly",
                        context: { value: 6, valids: [5], label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be an object',
                        path: [],
                        type: "object.base",
                        context: { label: "value", key: undefined }
                    }
                ]
            }],
            [{ c: 5 }, false, null, {
                message: '"value" must be a string, "value" must be a number, "c" is not allowed',
                details: [
                    {
                        message: '"value" must be a string',
                        path: [],
                        type: "string.base",
                        context: { value: { c: 5 }, label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be a number',
                        path: [],
                        type: "number.base",
                        context: { label: "value", key: undefined, value: { c: 5 } }
                    },
                    {
                        message: '"c" is not allowed',
                        path: ["c"],
                        type: "object.allowUnknown",
                        context: { child: "c", label: "c", key: "c" }
                    }
                ]
            }],
            [{}, true],
            [{ b: "abc" }, true],
            [{ a: true, b: "boom" }, true],
            [{ a: 5, b: "a" }, false, null, {
                message: '"value" must be a string, "value" must be a number, child "a" fails because ["a" must be a boolean]',
                details: [
                    {
                        message: '"value" must be a string',
                        path: [],
                        type: "string.base",
                        context: { value: { a: 5, b: "a" }, label: "value", key: undefined }
                    },
                    {
                        message: '"value" must be a number',
                        path: [],
                        type: "number.base",
                        context: { label: "value", key: undefined, value: { a: 5, b: "a" } }
                    },
                    {
                        message: '"a" must be a boolean',
                        path: ["a"],
                        type: "boolean.base",
                        context: { label: "a", key: "a" }
                    }
                ]
            }]
        ]);
    });

    it("validates regex directly", async () => {

        await model.compile(/^5$/).validate("5");
        const err = await assert.throws(async () => model.compile(/.{2}/).validate("6"));
        assert.instanceOf(err, Error);
        expect(err.details).to.eql([{
            message: '"value" with value "6" fails to match the required pattern: /.{2}/',
            path: [],
            type: "string.regex.base",
            context: {
                name: undefined,
                pattern: /.{2}/,
                value: "6",
                label: "value",
                key: undefined
            }
        }]);
    });

    it("validated with", async () => {

        const schema = model.object({
            txt: model.string(),
            upc: model.string()
        }).with("txt", "upc");

        const err = await assert.throws(async () => model.validate({ txt: "a" }, schema, { abortEarly: false }));
        assert.instanceOf(err, Error, '"txt" missing required peer "upc"');
        expect(err.details).to.eql([{
            message: '"txt" missing required peer "upc"',
            path: ["txt"],
            type: "object.with",
            context: {
                main: "txt",
                mainWithLabel: "txt",
                peer: "upc",
                peerWithLabel: "upc",
                label: "txt",
                key: "txt"
            }
        }]);

        Helper.validate(schema, [
            [{ upc: "test" }, true],
            [{ txt: "test" }, false, null, {
                message: '"txt" missing required peer "upc"',
                details: [{
                    message: '"txt" missing required peer "upc"',
                    path: ["txt"],
                    type: "object.with",
                    context: {
                        main: "txt",
                        mainWithLabel: "txt",
                        peer: "upc",
                        peerWithLabel: "upc",
                        label: "txt",
                        key: "txt"
                    }
                }]
            }],
            [{ txt: "test", upc: null }, false, null, {
                message: 'child "upc" fails because ["upc" must be a string]',
                details: [{
                    message: '"upc" must be a string',
                    path: ["upc"],
                    type: "string.base",
                    context: { value: null, label: "upc", key: "upc" }
                }]
            }],
            [{ txt: "test", upc: "" }, false, null, {
                message: 'child "upc" fails because ["upc" is not allowed to be empty]',
                details: [{
                    message: '"upc" is not allowed to be empty',
                    path: ["upc"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "upc", key: "upc" }
                }]
            }],
            [{ txt: "test", upc: undefined }, false, null, {
                message: '"txt" missing required peer "upc"',
                details: [{
                    message: '"txt" missing required peer "upc"',
                    path: ["txt"],
                    type: "object.with",
                    context: {
                        main: "txt",
                        mainWithLabel: "txt",
                        peer: "upc",
                        peerWithLabel: "upc",
                        label: "txt",
                        key: "txt"
                    }
                }]
            }],
            [{ txt: "test", upc: "test" }, true]
        ]);
    });

    it("validated without", async () => {

        const schema = model.object({
            txt: model.string(),
            upc: model.string()
        }).without("txt", "upc");

        const err = await assert.throws(async () => model.validate({ txt: "a", upc: "b" }, schema, { abortEarly: false }));
        assert.instanceOf(err, Error, '"txt" conflict with forbidden peer "upc"');
        expect(err.details).to.eql([{
            message: '"txt" conflict with forbidden peer "upc"',
            path: ["txt"],
            type: "object.without",
            context: {
                main: "txt",
                mainWithLabel: "txt",
                peer: "upc",
                peerWithLabel: "upc",
                label: "txt",
                key: "txt"
            }
        }]);

        Helper.validate(schema, [
            [{ upc: "test" }, true],
            [{ txt: "test" }, true],
            [{ txt: "test", upc: null }, false, null, {
                message: 'child "upc" fails because ["upc" must be a string]',
                details: [{
                    message: '"upc" must be a string',
                    path: ["upc"],
                    type: "string.base",
                    context: { value: null, label: "upc", key: "upc" }
                }]
            }],
            [{ txt: "test", upc: "" }, false, null, {
                message: 'child "upc" fails because ["upc" is not allowed to be empty]',
                details: [{
                    message: '"upc" is not allowed to be empty',
                    path: ["upc"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "upc", key: "upc" }
                }]
            }],
            [{ txt: "test", upc: undefined }, true],
            [{ txt: "test", upc: "test" }, false, null, {
                message: '"txt" conflict with forbidden peer "upc"',
                details: [{
                    message: '"txt" conflict with forbidden peer "upc"',
                    path: ["txt"],
                    type: "object.without",
                    context: {
                        main: "txt",
                        mainWithLabel: "txt",
                        peer: "upc",
                        peerWithLabel: "upc",
                        label: "txt",
                        key: "txt"
                    }
                }]
            }]
        ]);
    });

    it("validates xor", async () => {

        const schema = model.object({
            txt: model.string(),
            upc: model.string()
        }).xor("txt", "upc");

        const err = await assert.throws(async () => model.validate({}, schema, { abortEarly: false }));
        assert.instanceOf(err, Error, '"value" must contain at least one of [txt, upc]');
        expect(err.details).to.eql([{
            message: '"value" must contain at least one of [txt, upc]',
            path: [],
            type: "object.missing",
            context: {
                peers: ["txt", "upc"],
                peersWithLabels: ["txt", "upc"],
                label: "value",
                key: undefined
            }
        }]);

        Helper.validate(schema, [
            [{ upc: null }, false, null, {
                message: 'child "upc" fails because ["upc" must be a string]',
                details: [{
                    message: '"upc" must be a string',
                    path: ["upc"],
                    type: "string.base",
                    context: { value: null, label: "upc", key: "upc" }
                }]
            }],
            [{ upc: "test" }, true],
            [{ txt: null }, false, null, {
                message: 'child "txt" fails because ["txt" must be a string]',
                details: [{
                    message: '"txt" must be a string',
                    path: ["txt"],
                    type: "string.base",
                    context: { value: null, label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "test" }, true],
            [{ txt: "test", upc: null }, false, null, {
                message: 'child "upc" fails because ["upc" must be a string]',
                details: [{
                    message: '"upc" must be a string',
                    path: ["upc"],
                    type: "string.base",
                    context: { value: null, label: "upc", key: "upc" }
                }]
            }],
            [{ txt: "test", upc: "" }, false, null, {
                message: 'child "upc" fails because ["upc" is not allowed to be empty]',
                details: [{
                    message: '"upc" is not allowed to be empty',
                    path: ["upc"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "upc", key: "upc" }
                }]
            }],
            [{ txt: "", upc: "test" }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: null, upc: "test" }, false, null, {
                message: 'child "txt" fails because ["txt" must be a string]',
                details: [{
                    message: '"txt" must be a string',
                    path: ["txt"],
                    type: "string.base",
                    context: { value: null, label: "txt", key: "txt" }
                }]
            }],
            [{ txt: undefined, upc: "test" }, true],
            [{ txt: "test", upc: undefined }, true],
            [{ txt: "", upc: undefined }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "", upc: "" }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "test", upc: "test" }, false, null, {
                message: '"value" contains a conflict between exclusive peers [txt, upc]',
                details: [{
                    message: '"value" contains a conflict between exclusive peers [txt, upc]',
                    path: [],
                    type: "object.xor",
                    context: {
                        peers: ["txt", "upc"],
                        peersWithLabels: ["txt", "upc"],
                        label: "value",
                        key: undefined
                    }
                }]
            }]
        ]);
    });

    it("validates multiple peers xor", () => {

        const schema = model.object({
            txt: model.string(),
            upc: model.string(),
            code: model.string()
        }).xor("txt", "upc", "code");

        Helper.validate(schema, [
            [{ upc: "test" }, true],
            [{ txt: "test" }, true],
            [{}, false, null, {
                message: '"value" must contain at least one of [txt, upc, code]',
                details: [{
                    message: '"value" must contain at least one of [txt, upc, code]',
                    path: [],
                    type: "object.missing",
                    context: {
                        peers: ["txt", "upc", "code"],
                        peersWithLabels: ["txt", "upc", "code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }]
        ]);
    });

    it("validates xor with number types", () => {

        const schema = model.object({
            code: model.number(),
            upc: model.number()
        }).xor("code", "upc");

        Helper.validate(schema, [
            [{ upc: 123 }, true],
            [{ code: 456 }, true],
            [{ code: 456, upc: 123 }, false, null, {
                message: '"value" contains a conflict between exclusive peers [code, upc]',
                details: [{
                    message: '"value" contains a conflict between exclusive peers [code, upc]',
                    path: [],
                    type: "object.xor",
                    context: {
                        peers: ["code", "upc"],
                        peersWithLabels: ["code", "upc"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{}, false, null, {
                message: '"value" must contain at least one of [code, upc]',
                details: [{
                    message: '"value" must contain at least one of [code, upc]',
                    path: [],
                    type: "object.missing",
                    context: {
                        peers: ["code", "upc"],
                        peersWithLabels: ["code", "upc"],
                        label: "value",
                        key: undefined
                    }
                }]
            }]
        ]);
    });

    it("validates xor when empty value of peer allowed", () => {

        const schema = model.object({
            code: model.string(),
            upc: model.string().allow("")
        }).xor("code", "upc");

        Helper.validate(schema, [
            [{ upc: "" }, true],
            [{ upc: "123" }, true],
            [{ code: "456" }, true],
            [{ code: "456", upc: "" }, false, null, {
                message: '"value" contains a conflict between exclusive peers [code, upc]',
                details: [{
                    message: '"value" contains a conflict between exclusive peers [code, upc]',
                    path: [],
                    type: "object.xor",
                    context: {
                        peers: ["code", "upc"],
                        peersWithLabels: ["code", "upc"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{}, false, null, {
                message: '"value" must contain at least one of [code, upc]',
                details: [{
                    message: '"value" must contain at least one of [code, upc]',
                    path: [],
                    type: "object.missing",
                    context: {
                        peers: ["code", "upc"],
                        peersWithLabels: ["code", "upc"],
                        label: "value",
                        key: undefined
                    }
                }]
            }]
        ]);
    });

    it("validates or()", async () => {

        const schema = model.object({
            txt: model.string(),
            upc: model.string().allow(null, ""),
            code: model.number()
        }).or("txt", "upc", "code");

        const err = await assert.throws(async () => model.validate({}, schema, { abortEarly: false }));
        assert.instanceOf(err, Error, '"value" must contain at least one of [txt, upc, code]');
        expect(err.details).to.eql([{
            message: '"value" must contain at least one of [txt, upc, code]',
            path: [],
            type: "object.missing",
            context: {
                peers: ["txt", "upc", "code"],
                peersWithLabels: ["txt", "upc", "code"],
                label: "value",
                key: undefined
            }
        }]);

        Helper.validate(schema, [
            [{ upc: null }, true],
            [{ upc: "test" }, true],
            [{ txt: null }, false, null, {
                message: 'child "txt" fails because ["txt" must be a string]',
                details: [{
                    message: '"txt" must be a string',
                    path: ["txt"],
                    type: "string.base",
                    context: { value: null, label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "test" }, true],
            [{ code: null }, false, null, {
                message: 'child "code" fails because ["code" must be a number]',
                details: [{
                    message: '"code" must be a number',
                    path: ["code"],
                    type: "number.base",
                    context: { label: "code", key: "code", value: null }
                }]
            }],
            [{ code: 123 }, true],
            [{ txt: "test", upc: null }, true],
            [{ txt: "test", upc: "" }, true],
            [{ txt: "", upc: "test" }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: null, upc: "test" }, false, null, {
                message: 'child "txt" fails because ["txt" must be a string]',
                details: [{
                    message: '"txt" must be a string',
                    path: ["txt"],
                    type: "string.base",
                    context: { value: null, label: "txt", key: "txt" }
                }]
            }],
            [{ txt: undefined, upc: "test" }, true],
            [{ txt: "test", upc: undefined }, true],
            [{ txt: "test", upc: "" }, true],
            [{ txt: "test", upc: null }, true],
            [{ txt: "", upc: undefined }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "", upc: undefined, code: 999 }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "", upc: undefined, code: undefined }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "", upc: "" }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "test", upc: "test" }, true],
            [{ txt: "test", upc: "test", code: 322 }, true]
        ]);
    });

    it("validates and()", async () => {
        const schema = model.object({
            txt: model.string(),
            upc: model.string().allow(null, ""),
            code: model.number()
        }).and("txt", "upc", "code");

        const err = await assert.throws(async () => model.validate({ txt: "x" }, schema, { abortEarly: false }));
        assert.instanceOf(err, Error, '"value" contains [txt] without its required peers [upc, code]');
        expect(err.details).to.eql([{
            message: '"value" contains [txt] without its required peers [upc, code]',
            path: [],
            type: "object.and",
            context: {
                present: ["txt"],
                presentWithLabels: ["txt"],
                missing: ["upc", "code"],
                missingWithLabels: ["upc", "code"],
                label: "value",
                key: undefined
            }
        }]);

        Helper.validate(schema, [
            [{}, true],
            [{ upc: null }, false, null, {
                message: '"value" contains [upc] without its required peers [txt, code]',
                details: [{
                    message: '"value" contains [upc] without its required peers [txt, code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["upc"],
                        presentWithLabels: ["upc"],
                        missing: ["txt", "code"],
                        missingWithLabels: ["txt", "code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ upc: "test" }, false, null, {
                message: '"value" contains [upc] without its required peers [txt, code]',
                details: [{
                    message: '"value" contains [upc] without its required peers [txt, code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["upc"],
                        presentWithLabels: ["upc"],
                        missing: ["txt", "code"],
                        missingWithLabels: ["txt", "code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: null }, false, null, {
                message: 'child "txt" fails because ["txt" must be a string]',
                details: [{
                    message: '"txt" must be a string',
                    path: ["txt"],
                    type: "string.base",
                    context: { value: null, label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "test" }, false, null, {
                message: '"value" contains [txt] without its required peers [upc, code]',
                details: [{
                    message: '"value" contains [txt] without its required peers [upc, code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["txt"],
                        presentWithLabels: ["txt"],
                        missing: ["upc", "code"],
                        missingWithLabels: ["upc", "code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ code: null }, false, null, {
                message: 'child "code" fails because ["code" must be a number]',
                details: [{
                    message: '"code" must be a number',
                    path: ["code"],
                    type: "number.base",
                    context: { label: "code", key: "code", value: null }
                }]
            }],
            [{ code: 123 }, false, null, {
                message: '"value" contains [code] without its required peers [txt, upc]',
                details: [{
                    message: '"value" contains [code] without its required peers [txt, upc]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["code"],
                        presentWithLabels: ["code"],
                        missing: ["txt", "upc"],
                        missingWithLabels: ["txt", "upc"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: "test", upc: null }, false, null, {
                message: '"value" contains [txt, upc] without its required peers [code]',
                details: [{
                    message: '"value" contains [txt, upc] without its required peers [code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["txt", "upc"],
                        presentWithLabels: ["txt", "upc"],
                        missing: ["code"],
                        missingWithLabels: ["code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: "test", upc: "" }, false, null, {
                message: '"value" contains [txt, upc] without its required peers [code]',
                details: [{
                    message: '"value" contains [txt, upc] without its required peers [code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["txt", "upc"],
                        presentWithLabels: ["txt", "upc"],
                        missing: ["code"],
                        missingWithLabels: ["code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: "", upc: "test" }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: null, upc: "test" }, false, null, {
                message: 'child "txt" fails because ["txt" must be a string]',
                details: [{
                    message: '"txt" must be a string',
                    path: ["txt"],
                    type: "string.base",
                    context: { value: null, label: "txt", key: "txt" }
                }]
            }],
            [{ txt: undefined, upc: "test" }, false, null, {
                message: '"value" contains [upc] without its required peers [txt, code]',
                details: [{
                    message: '"value" contains [upc] without its required peers [txt, code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["upc"],
                        presentWithLabels: ["upc"],
                        missing: ["txt", "code"],
                        missingWithLabels: ["txt", "code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: "test", upc: undefined }, false, null, {
                message: '"value" contains [txt] without its required peers [upc, code]',
                details: [{
                    message: '"value" contains [txt] without its required peers [upc, code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["txt"],
                        presentWithLabels: ["txt"],
                        missing: ["upc", "code"],
                        missingWithLabels: ["upc", "code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: "test", upc: "" }, false, null, {
                message: '"value" contains [txt, upc] without its required peers [code]',
                details: [{
                    message: '"value" contains [txt, upc] without its required peers [code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["txt", "upc"],
                        presentWithLabels: ["txt", "upc"],
                        missing: ["code"],
                        missingWithLabels: ["code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: "test", upc: null }, false, null, {
                message: '"value" contains [txt, upc] without its required peers [code]',
                details: [{
                    message: '"value" contains [txt, upc] without its required peers [code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["txt", "upc"],
                        presentWithLabels: ["txt", "upc"],
                        missing: ["code"],
                        missingWithLabels: ["code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: "", upc: undefined }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "", upc: undefined, code: 999 }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "", upc: undefined, code: undefined }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "", upc: "" }, false, null, {
                message: 'child "txt" fails because ["txt" is not allowed to be empty]',
                details: [{
                    message: '"txt" is not allowed to be empty',
                    path: ["txt"],
                    type: "any.empty",
                    context: { value: "", invalids: [""], label: "txt", key: "txt" }
                }]
            }],
            [{ txt: "test", upc: "test" }, false, null, {
                message: '"value" contains [txt, upc] without its required peers [code]',
                details: [{
                    message: '"value" contains [txt, upc] without its required peers [code]',
                    path: [],
                    type: "object.and",
                    context: {
                        present: ["txt", "upc"],
                        presentWithLabels: ["txt", "upc"],
                        missing: ["code"],
                        missingWithLabels: ["code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: "test", upc: "test", code: 322 }, true],
            [{ txt: "test", upc: null, code: 322 }, true]
        ]);
    });

    it("validates nand()", async () => {

        const schema = model.object({
            txt: model.string(),
            upc: model.string().allow(null, ""),
            code: model.number()
        }).nand("txt", "upc", "code");

        const err = await assert.throws(async () => model.validate({ txt: "x", upc: "y", code: 123 }, schema, { abortEarly: false }));
        assert.instanceOf(err, Error, '"txt" must not exist simultaneously with [upc, code]');
        expect(err.details).to.eql([{
            message: '"txt" must not exist simultaneously with [upc, code]',
            path: [],
            type: "object.nand",
            context: {
                main: "txt",
                mainWithLabel: "txt",
                peers: ["upc", "code"],
                peersWithLabels: ["upc", "code"],
                label: "value",
                key: undefined
            }
        }]);

        Helper.validate(schema, [
            [{}, true],
            [{ upc: null }, true],
            [{ upc: "test" }, true],
            [{ txt: "test" }, true],
            [{ code: 123 }, true],
            [{ txt: "test", upc: null }, true],
            [{ txt: "test", upc: "" }, true],
            [{ txt: undefined, upc: "test" }, true],
            [{ txt: "test", upc: undefined }, true],
            [{ txt: "test", upc: "" }, true],
            [{ txt: "test", upc: null }, true],
            [{ txt: "test", upc: undefined, code: 999 }, true],
            [{ txt: "test", upc: "test" }, true],
            [{ txt: "test", upc: "test", code: 322 }, false, null, {
                message: '"txt" must not exist simultaneously with [upc, code]',
                details: [{
                    message: '"txt" must not exist simultaneously with [upc, code]',
                    path: [],
                    type: "object.nand",
                    context: {
                        main: "txt",
                        mainWithLabel: "txt",
                        peers: ["upc", "code"],
                        peersWithLabels: ["upc", "code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }],
            [{ txt: "test", upc: null, code: 322 }, false, null, {
                message: '"txt" must not exist simultaneously with [upc, code]',
                details: [{
                    message: '"txt" must not exist simultaneously with [upc, code]',
                    path: [],
                    type: "object.nand",
                    context: {
                        main: "txt",
                        mainWithLabel: "txt",
                        peers: ["upc", "code"],
                        peersWithLabels: ["upc", "code"],
                        label: "value",
                        key: undefined
                    }
                }]
            }]
        ]);
    });

    it("validates an array of valid types", async () => {

        const schema = model.object({
            auth: [
                model.object({
                    mode: model.string().valid("required", "optional", "try").allow(null)
                }).allow(null),
                model.string(),
                model.boolean()
            ]
        });

        const err = await assert.throws(async () => schema.validate({ auth: { mode: "none" } }));
        assert.instanceOf(err, Error, 'child "auth" fails because [child "mode" fails because ["mode" must be one of [required, optional, try, null]], "auth" must be a string, "auth" must be a boolean]');
        expect(err.details).to.eql([
            {
                message: '"mode" must be one of [required, optional, try, null]',
                path: ["auth", "mode"],
                type: "any.allowOnly",
                context: { value: "none", valids: ["required", "optional", "try", null], label: "mode", key: "mode" }
            },
            {
                message: '"auth" must be a string',
                path: ["auth"],
                type: "string.base",
                context: { value: { mode: "none" }, label: "auth", key: "auth" }
            },
            {
                message: '"auth" must be a boolean',
                path: ["auth"],
                type: "boolean.base",
                context: { label: "auth", key: "auth" }
            }
        ]);

        Helper.validate(schema, [
            [{ auth: { mode: "try" } }, true],
            [{ something: undefined }, false, null, {
                message: '"something" is not allowed',
                details: [{
                    message: '"something" is not allowed',
                    path: ["something"],
                    type: "object.allowUnknown",
                    context: { child: "something", label: "something", key: "something" }
                }]
            }],
            [{ auth: { something: undefined } }, false, null, {
                message: 'child "auth" fails because ["something" is not allowed, "auth" must be a string, "auth" must be a boolean]',
                details: [
                    {
                        message: '"something" is not allowed',
                        path: ["auth", "something"],
                        type: "object.allowUnknown",
                        context: { child: "something", label: "something", key: "something" }
                    },
                    {
                        message: '"auth" must be a string',
                        path: ["auth"],
                        type: "string.base",
                        context: { value: { something: undefined }, label: "auth", key: "auth" }
                    },
                    {
                        message: '"auth" must be a boolean',
                        path: ["auth"],
                        type: "boolean.base",
                        context: { label: "auth", key: "auth" }
                    }
                ]
            }],
            [{ auth: null }, true],
            [{ auth: undefined }, true],
            [{}, true],
            [{ auth: true }, true],
            [{ auth: 123 }, false, null, {
                message: 'child "auth" fails because ["auth" must be an object, "auth" must be a string, "auth" must be a boolean]',
                details: [
                    {
                        message: '"auth" must be an object',
                        path: ["auth"],
                        type: "object.base",
                        context: { label: "auth", key: "auth" }
                    },
                    {
                        message: '"auth" must be a string',
                        path: ["auth"],
                        type: "string.base",
                        context: { value: 123, label: "auth", key: "auth" }
                    },
                    {
                        message: '"auth" must be a boolean',
                        path: ["auth"],
                        type: "boolean.base",
                        context: { label: "auth", key: "auth" }
                    }
                ]
            }]
        ]);
    });

    it("validates alternatives", async () => {
        const schema = model.object({
            auth: model.alternatives(
                model.object({
                    mode: model.string().valid("required", "optional", "try").allow(null)
                }).allow(null),
                model.string(),
                model.boolean()
            )
        });

        const err = await assert.throws(async () => schema.validate({ auth: { mode: "none" } }));
        assert.instanceOf(err, Error, 'child "auth" fails because [child "mode" fails because ["mode" must be one of [required, optional, try, null]], "auth" must be a string, "auth" must be a boolean]');
        expect(err.details).to.eql([
            {
                message: '"mode" must be one of [required, optional, try, null]',
                path: ["auth", "mode"],
                type: "any.allowOnly",
                context: { value: "none", valids: ["required", "optional", "try", null], label: "mode", key: "mode" }
            },
            {
                message: '"auth" must be a string',
                path: ["auth"],
                type: "string.base",
                context: { value: { mode: "none" }, label: "auth", key: "auth" }
            },
            {
                message: '"auth" must be a boolean',
                path: ["auth"],
                type: "boolean.base",
                context: { label: "auth", key: "auth" }
            }
        ]);

        Helper.validate(schema, [
            [{ auth: { mode: "try" } }, true],
            [{ something: undefined }, false, null, {
                message: '"something" is not allowed',
                details: [{
                    message: '"something" is not allowed',
                    path: ["something"],
                    type: "object.allowUnknown",
                    context: { child: "something", label: "something", key: "something" }
                }]
            }],
            [{ auth: { something: undefined } }, false, null, {
                message: 'child "auth" fails because ["something" is not allowed, "auth" must be a string, "auth" must be a boolean]',
                details: [
                    {
                        message: '"something" is not allowed',
                        path: ["auth", "something"],
                        type: "object.allowUnknown",
                        context: { child: "something", label: "something", key: "something" }
                    },
                    {
                        message: '"auth" must be a string',
                        path: ["auth"],
                        type: "string.base",
                        context: { value: { something: undefined }, label: "auth", key: "auth" }
                    },
                    {
                        message: '"auth" must be a boolean',
                        path: ["auth"],
                        type: "boolean.base",
                        context: { label: "auth", key: "auth" }
                    }
                ]
            }],
            [{ auth: null }, true],
            [{ auth: undefined }, true],
            [{}, true],
            [{ auth: true }, true],
            [{ auth: 123 }, false, null, {
                message: 'child "auth" fails because ["auth" must be an object, "auth" must be a string, "auth" must be a boolean]',
                details: [
                    {
                        message: '"auth" must be an object',
                        path: ["auth"],
                        type: "object.base",
                        context: { label: "auth", key: "auth" }
                    },
                    {
                        message: '"auth" must be a string',
                        path: ["auth"],
                        type: "string.base",
                        context: { value: 123, label: "auth", key: "auth" }
                    },
                    {
                        message: '"auth" must be a boolean',
                        path: ["auth"],
                        type: "boolean.base",
                        context: { label: "auth", key: "auth" }
                    }
                ]
            }]
        ]);
    });

    it("validates required alternatives", () => {
        const schema = {
            a: model.alternatives(
                model.string().required(),
                model.boolean().required()
            )
        };

        Helper.validate(schema, [
            [{ a: null }, false, null, {
                message: 'child "a" fails because ["a" must be a string, "a" must be a boolean]',
                details: [
                    {
                        message: '"a" must be a string',
                        path: ["a"],
                        type: "string.base",
                        context: { value: null, label: "a", key: "a" }
                    },
                    {
                        message: '"a" must be a boolean',
                        path: ["a"],
                        type: "boolean.base",
                        context: { label: "a", key: "a" }
                    }
                ]
            }],
            [{ a: undefined }, true],
            [{}, true],
            [{ a: true }, true],
            [{ a: "true" }, true],
            [{ a: 123 }, false, null, {
                message: 'child "a" fails because ["a" must be a string, "a" must be a boolean]',
                details: [
                    {
                        message: '"a" must be a string',
                        path: ["a"],
                        type: "string.base",
                        context: { value: 123, label: "a", key: "a" }
                    },
                    {
                        message: '"a" must be a boolean',
                        path: ["a"],
                        type: "boolean.base",
                        context: { label: "a", key: "a" }
                    }
                ]
            }],
            [{ a: { c: 1 } }, false, null, {
                message: 'child "a" fails because ["a" must be a string, "a" must be a boolean]',
                details: [
                    {
                        message: '"a" must be a string',
                        path: ["a"],
                        type: "string.base",
                        context: { value: { c: 1 }, label: "a", key: "a" }
                    },
                    {
                        message: '"a" must be a boolean',
                        path: ["a"],
                        type: "boolean.base",
                        context: { label: "a", key: "a" }
                    }
                ]
            }],
            [{ b: undefined }, false, null, {
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

    it("validates required [] alternatives", () => {

        const schema = {
            a: [
                model.string().required(),
                model.boolean().required()
            ]
        };

        Helper.validate(schema, [
            [{ a: null }, false, null, {
                message: 'child "a" fails because ["a" must be a string, "a" must be a boolean]',
                details: [
                    {
                        message: '"a" must be a string',
                        path: ["a"],
                        type: "string.base",
                        context: { value: null, label: "a", key: "a" }
                    },
                    {
                        message: '"a" must be a boolean',
                        path: ["a"],
                        type: "boolean.base",
                        context: { label: "a", key: "a" }
                    }
                ]
            }],
            [{ a: undefined }, true],
            [{}, true],
            [{ a: true }, true],
            [{ a: "true" }, true],
            [{ a: 123 }, false, null, {
                message: 'child "a" fails because ["a" must be a string, "a" must be a boolean]',
                details: [
                    {
                        message: '"a" must be a string',
                        path: ["a"],
                        type: "string.base",
                        context: { value: 123, label: "a", key: "a" }
                    },
                    {
                        message: '"a" must be a boolean',
                        path: ["a"],
                        type: "boolean.base",
                        context: { label: "a", key: "a" }
                    }
                ]
            }],
            [{ a: { c: 1 } }, false, null, {
                message: 'child "a" fails because ["a" must be a string, "a" must be a boolean]',
                details: [
                    {
                        message: '"a" must be a string',
                        path: ["a"],
                        type: "string.base",
                        context: { value: { c: 1 }, label: "a", key: "a" }
                    },
                    {
                        message: '"a" must be a boolean',
                        path: ["a"],
                        type: "boolean.base",
                        context: { label: "a", key: "a" }
                    }
                ]
            }],
            [{ b: undefined }, false, null, {
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

    it("validates an array of string with valid", () => {

        const schema = {
            brand: model.array().items(model.string().valid("amex", "visa"))
        };

        Helper.validate(schema, [
            [{ brand: ["amex"] }, true],
            [{ brand: ["visa", "mc"] }, false, null, {
                message: 'child "brand" fails because ["brand" at position 1 fails because ["1" must be one of [amex, visa]]]',
                details: [{
                    message: '"1" must be one of [amex, visa]',
                    path: ["brand", 1],
                    type: "any.allowOnly",
                    context: { value: "mc", valids: ["amex", "visa"], label: 1, key: 1 }
                }]
            }]
        ]);
    });

    it("validates pre and post convert value", () => {


        const schema = model.number().valid(5);
        Helper.validate(schema, [
            [5, true],
            ["5", true]
        ]);
    });

    it("does not change object when validation fails", () => {

        const schema = model.object({
            a: model.number().valid(2)
        });

        const obj = {
            a: "5"
        };

        const { error, value } = schema.validate(obj);
        expect(error).to.exist();
        expect(value.a).to.equal("5");
    });

    it("does not set optional keys when missing", async () => {

        const schema = model.object({
            a: model.number()
        });

        const obj = {};

        const value = await schema.validate(obj);
        expect(value.hasOwnProperty("a")).to.equal(false);
    });

    it("invalidates pre and post convert value", () => {

        const schema = model.number().invalid(5);

        Helper.validate(schema, [
            [5, false, null, {
                message: '"value" contains an invalid value',
                details: [{
                    message: '"value" contains an invalid value',
                    path: [],
                    type: "any.invalid",
                    context: { value: 5, invalids: [Infinity, -Infinity, 5], label: "value", key: undefined }
                }]
            }],
            ["5", false, null, {
                message: '"value" contains an invalid value',
                details: [{
                    message: '"value" contains an invalid value',
                    path: [],
                    type: "any.invalid",
                    context: { value: 5, invalids: [Infinity, -Infinity, 5], label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("invalidates missing peers", async () => {

        const schema = model.object({
            username: model.string(),
            password: model.string()
        }).with("username", "password").without("password", "access_token");

        await assert.throws(async () => schema.validate({ username: "bob" }));
    });

    it("validates config where the root item is a joi type", async () => {

        await model.boolean().allow(null).validate(true);
        await model.object().validate({ auth: { mode: "try" } });
        await assert.throws(async () => model.object().validate(true));
        await assert.throws(async () => model.string().validate(true));
        await model.string().email().validate("test@test.com");
        await model.object({ param: model.string().required() }).validate({ param: "item" });
    });

    it("converts string to number", async () => {

        const schema = model.object({
            a: model.number()
        });

        const input = { a: "5" };
        const value = await schema.validate(input);
        expect(value.a).to.equal(5);
        expect(input.a).to.equal("5");
    });

    it("allows unknown keys in objects if no schema was given", async () => {
        await model.object().validate({ foo: "bar" });
    });

    it("fails on unknown keys in objects if a schema was given", async () => {
        const err = await assert.throws(async () => model.object({}).validate({ foo: "bar" }));
        assert.instanceOf(err, Error, '"foo" is not allowed');
        expect(err.details).to.eql([{
            message: '"foo" is not allowed',
            path: ["foo"],
            type: "object.allowUnknown",
            context: { child: "foo", label: "foo", key: "foo" }
        }]);

        const err2 = await assert.throws(async () => model.compile({}).validate({ foo: "bar" }));
        expect(err2.message).to.equal('"foo" is not allowed');

        const err3 = await assert.throws(async () => model.compile({ other: model.number() }).validate({ foo: "bar" }));
        expect(err3.message).to.equal('"foo" is not allowed');
    });

    it("validates an unknown option", async () => {

        const config = {
            auth: model.object({
                mode: model.string().valid("required", "optional", "try").allow(null)
            }).allow(null)
        };

        const err = await assert.throws(async () => model.compile(config).validate({ auth: { unknown: true } }));
        expect(err.message).to.contain('"unknown" is not allowed');

        const err2 = await assert.throws(async () => model.compile(config).validate({ something: false }));
        expect(err2.message).to.contain('"something" is not allowed');
    });

    it("validates required key with multiple options", async () => {

        const config = {
            module: model.alternatives([
                model.object({
                    compile: model.func().required(),
                    execute: model.func()
                }),
                model.string()
            ]).required()
        };

        const err = await assert.throws(async () => model.compile(config).validate({}));
        expect(err.message).to.contain('"module" is required');

        await model.compile(config).validate({ module: "test" });

        const err2 = await assert.throws(async () => model.compile(config).validate({ module: {} }));
        expect(err2.message).to.contain('"compile" is required');
        expect(err2.message).to.contain('"module" must be a string');

        await model.compile(config).validate({ module: { compile() { } } });
    });

    it("validates key with required alternatives", async () => {
        const config = {
            module: model.alt().try(
                model.object({
                    compile: model.func().required(),
                    execute: model.func()
                }).required(),
                model.string().required()
            )
        };

        await model.compile(config).validate({});
    });

    it("validates required key with alternatives", async () => {

        const config = {
            module: model.alt().try(
                model.object({
                    compile: model.func().required(),
                    execute: model.func()
                }),
                model.string()
            ).required()
        };

        const err = await assert.throws(async () => model.compile(config).validate({}));
        expect(err.message).to.contain('"module" is required');
    });

    it("does not require optional numbers", async () => {

        const config = {
            position: model.number(),
            suggestion: model.string()
        };

        await model.compile(config).validate({ suggestion: "something" });
        await model.compile(config).validate({ position: 1 });
    });

    it("does not require optional objects", async () => {

        const config = {
            position: model.number(),
            suggestion: model.object()
        };

        await model.compile(config).validate({ suggestion: {} });
        await model.compile(config).validate({ position: 1 });
    });

    it("validates object successfully when config has an array of types", async () => {

        const schema = {
            f: [model.number(), model.boolean()],
            g: [model.string(), model.object()]
        };

        const obj = {
            f: true,
            g: "test"
        };

        await model.compile(schema).validate(obj);
    });

    it("validates object successfully when config allows for optional key and key is missing", async () => {

        const schema = {
            h: model.number(),
            i: model.string(),
            j: model.object()
        };

        const obj = {
            h: 12,
            i: "test"
        };

        await model.compile(schema).validate(obj);
    });

    it("fails validation", async () => {

        const schema = {
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c"),
            c: model.string().email().optional()
        };

        const obj = {
            a: 10,
            b: "a",
            c: "joe@example.com"
        };

        await assert.throws(async () => model.compile(schema).validate(obj));
    });

    it("fails validation when the wrong types are supplied", async () => {
        const schema = {
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c"),
            c: model.string().email().optional()
        };

        const obj = {
            a: "a",
            b: "a",
            c: "joe@example.com"
        };

        await assert.throws(async () => model.compile(schema).validate(obj));
    });

    it("fails validation when missing a required parameter", async () => {

        const obj = {
            c: 10
        };

        await assert.throws(async () => model.compile({ a: model.string().required() }).validate(obj));
    });

    it("fails validation when missing a required parameter within an object config", async () => {

        const obj = {
            a: {}
        };

        await assert.throws(async () => model.compile({ a: model.object({ b: model.string().required() }) }).validate(obj));
    });

    it("fails validation when parameter is required to be an object but is given as string", async () => {

        const obj = {
            a: "a string"
        };

        await assert.throws(async () => model.compile({ a: model.object({ b: model.string().required() }) }).validate(obj));
    });

    it("validates when parameter is required to be an object and is given correctly as a json string", async () => {

        const schema = {
            a: model.object({
                b: model.string().required()
            })
        };

        const input = {
            a: '{"b":"string"}'
        };

        const value = await model.validate(input, schema);
        expect(input.a).to.equal('{"b":"string"}');
        expect(value.a.b).to.equal("string");
    });

    it("fails validation when parameter is required to be an object but is given as a json string that is incorrect (number instead of string)", async () => {

        const obj = {
            a: '{"b":2}'
        };

        await assert.throws(async () => model.object({ a: model.object({ b: model.string().required() }) }).validate(obj));
    });

    it("fails validation when parameter is required to be an Array but is given as string", async () => {

        const obj = {
            a: "an array"
        };

        await assert.throws(async () => model.object({ a: model.array() }).validate(obj));
    });

    it("validates when parameter is required to be an Array and is given correctly as a json string", async () => {

        const obj = {
            a: "[1,2]"
        };

        await model.object({ a: model.array() }).validate(obj);
    });

    it("fails validation when parameter is required to be an Array but is given as a json that is incorrect (object instead of array)", async () => {

        const obj = {
            a: '{"b":2}'
        };

        await assert.throws(async () => model.object({ a: model.object({ b: model.string().required() }) }).validate(obj));
    });

    it("fails validation when config is an array and fails", async () => {

        const schema = {
            d: [model.string(), model.boolean()],
            e: [model.number(), model.object()]
        };

        const obj = {
            d: 10,
            e: "a"
        };

        await assert.throws(async () => model.compile(schema).validate(obj));
    });

    it("fails validation when config is an array and fails with extra keys", async () => {

        const schema = {
            d: [model.string(), model.boolean()],
            e: [model.number(), model.object()]
        };

        const obj = {
            a: 10,
            b: "a"
        };

        await assert.throws(async () => model.compile(schema).validate(obj));
    });

    it("fails validation with extra keys", async () => {
        const schema = {
            a: model.number()
        };

        const obj = {
            a: 1,
            b: "a"
        };

        await assert.throws(async () => model.compile(schema).validate(obj));
    });

    it("validates missing optional key with string condition", async () => {

        const schema = {
            key: model.string().alphanum(false).min(8)
        };

        await model.compile(schema).validate({});
    });

    it("validates with extra keys and remove them when stripUnknown is set", async () => {

        const schema = {
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c"),
            c: model.string().email().optional()
        };

        const obj = {
            a: 1,
            b: "a",
            d: "c"
        };

        const value = await model.validate(obj, schema, { stripUnknown: true, allowUnknown: true });
        expect(value).to.eql({ a: 1, b: "a" });
    });

    it("validates with extra keys and remove them when stripUnknown (as an object) is set", async () => {

        const schema = {
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c"),
            c: model.string().email().optional()
        };

        const obj = {
            a: 1,
            b: "a",
            d: "c"
        };

        const value = await model.validate(obj, schema, { stripUnknown: { arrays: false, objects: true }, allowUnknown: true });
        expect(value).to.eql({ a: 1, b: "a" });
    });

    it("validates dependencies when stripUnknown is set", async () => {

        const schema = model.object({
            a: model.number(),
            b: model.string()
        }).and("a", "b");

        const obj = {
            a: 1,
            foo: "bar"
        };

        const err = await assert.throws(async () => model.validate(obj, schema, { stripUnknown: true }));
        assert.instanceOf(err, Error, '"value" contains [a] without its required peers [b]');
        expect(err.details).to.eql([{
            message: '"value" contains [a] without its required peers [b]',
            path: [],
            type: "object.and",
            context: {
                present: ["a"],
                presentWithLabels: ["a"],
                missing: ["b"],
                missingWithLabels: ["b"],
                label: "value",
                key: undefined
            }
        }]);
    });

    it("validates dependencies when stripUnknown (as an object) is set", async () => {
        const schema = model.object({
            a: model.number(),
            b: model.string()
        }).and("a", "b");

        const obj = {
            a: 1,
            foo: "bar"
        };

        const err = await assert.throws(async () => model.validate(obj, schema, { stripUnknown: { arrays: false, objects: true } }));
        assert.instanceOf(err, Error, '"value" contains [a] without its required peers [b]');
        expect(err.details).to.eql([{
            message: '"value" contains [a] without its required peers [b]',
            path: [],
            type: "object.and",
            context: {
                present: ["a"],
                presentWithLabels: ["a"],
                missing: ["b"],
                missingWithLabels: ["b"],
                label: "value",
                key: undefined
            }
        }]);
    });

    it("fails to validate with incorrect property when asked to strip unknown keys without aborting early", async () => {

        const schema = {
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c"),
            c: model.string().email().optional()
        };

        const obj = {
            a: 1,
            b: "f",
            d: "c"
        };

        await assert.throws(async () => model.validate(obj, schema, { stripUnknown: true, abortEarly: false }));
    });

    it("fails to validate with incorrect property when asked to strip unknown keys (as an object) without aborting early", async () => {

        const schema = {
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c"),
            c: model.string().email().optional()
        };

        const obj = {
            a: 1,
            b: "f",
            d: "c"
        };

        await assert.throws(async () => model.validate(obj, schema, { stripUnknown: { arrays: false, objects: true }, abortEarly: false }));
    });

    it("should pass validation with extra keys when allowUnknown is set", async () => {
        const schema = {
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c"),
            c: model.string().email().optional()
        };

        const obj = {
            a: 1,
            b: "a",
            d: "c"
        };

        const value = await model.validate(obj, schema, { allowUnknown: true });
        expect(value).to.eql({ a: 1, b: "a", d: "c" });
    });

    it("should pass validation with extra keys set", async () => {
        const localConfig = model.object({
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c")
        }).options({ allowUnknown: true });

        const obj = {
            a: 1,
            b: "a",
            d: "c"
        };

        const value = await localConfig.validate(obj);
        expect(value).to.eql({ a: 1, b: "a", d: "c" });

        const value2 = await localConfig.validate(value);
        expect(value2).to.eql({ a: 1, b: "a", d: "c" });
    });

    it("should pass validation with extra keys and remove them when stripUnknown is set locally", async () => {
        const localConfig = model.object({
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c")
        }).options({ stripUnknown: true, allowUnknown: true });

        const obj = {
            a: 1,
            b: "a",
            d: "c"
        };

        const value = await localConfig.validate(obj);
        expect(value).to.eql({ a: 1, b: "a" });

        const value2 = await localConfig.validate(value);
        expect(value2).to.eql({ a: 1, b: "a" });
    });

    it("should pass validation with extra keys and remove them when stripUnknown (as an object) is set locally", async () => {

        const localConfig = model.object({
            a: model.number().min(0).max(3),
            b: model.string().valid("a", "b", "c")
        }).options({ stripUnknown: { arrays: false, objects: true }, allowUnknown: true });

        const obj = {
            a: 1,
            b: "a",
            d: "c"
        };

        const value = await localConfig.validate(obj);
        expect(value).to.eql({ a: 1, b: "a" });

        const value2 = await localConfig.validate(value);
        expect(value2).to.eql({ a: 1, b: "a" });
    });

    it("should work when the skipFunctions setting is enabled", async () => {
        const schema = model.object({ username: model.string() }).options({ skipFunctions: true });
        const input = { username: "test", func() { } };
        await model.validate(input, schema);
    });

    it("should work when the skipFunctions setting is disabled", async () => {
        const schema = { username: model.string() };
        const input = { username: "test", func() { } };

        const err = await assert.throws(async () => model.validate(input, schema, { skipFunctions: false }));
        expect(err.message).to.contain('"func" is not allowed');
    });

    it("should not convert values when convert is false", async () => {
        const schema = {
            arr: model.array().items(model.string())
        };

        const input = { arr: "foo" };
        await assert.throws(async () => model.validate(input, schema, { convert: false }));
    });

    it("full errors when abortEarly is false", async () => {
        const schema = {
            a: model.string(),
            b: model.string()
        };

        const input = { a: 1, b: 2 };

        const errOne = await assert.throws(async () => model.validate(input, schema));
        const errFull = await assert.throws(async () => model.validate(input, schema, { abortEarly: false }));
        expect(errFull.details.length).to.be.greaterThan(errOne.details.length);
    });

    it("errors multiple times when abortEarly is false in a complex object", async () => {
        const schema = model.object({
            test: model.array().items(model.object().keys({
                foo: model.string().required().max(3),
                bar: model.string().max(5)
            })),
            test2: model.object({
                test3: model.array().items(model.object().keys({
                    foo: model.string().required().max(3),
                    bar: model.string().max(5),
                    baz: model.object({
                        test4: model.array().items(model.object().keys({
                            foo: model.string().required().max(3),
                            bar: model.string().max(5)
                        }))
                    })
                }))
            })
        });

        const input = {
            test: [{
                foo: "test1",
                bar: "testfailed"
            }],
            test2: {
                test3: [{
                    foo: "123"
                }, {
                    foo: "test1",
                    bar: "testfailed"
                }, {
                    foo: "123",
                    baz: {
                        test4: [{
                            foo: "test1",
                            baz: "123"
                        }]
                    }
                }]
            }
        };

        const err = await assert.throws(async () => model.validate(input, schema, { abortEarly: false }));
        expect(err.details).to.have.length(6);
        expect(err.details).to.eql([{
            message: '"foo" length must be less than or equal to 3 characters long',
            path: ["test", 0, "foo"],
            type: "string.max",
            context: { limit: 3, value: "test1", key: "foo", label: "foo", encoding: undefined }
        }, {
            message: '"bar" length must be less than or equal to 5 characters long',
            path: ["test", 0, "bar"],
            type: "string.max",
            context: { limit: 5, value: "testfailed", key: "bar", label: "bar", encoding: undefined }
        }, {
            message: '"foo" length must be less than or equal to 3 characters long',
            path: ["test2", "test3", 1, "foo"],
            type: "string.max",
            context: { limit: 3, value: "test1", key: "foo", label: "foo", encoding: undefined }
        }, {
            message: '"bar" length must be less than or equal to 5 characters long',
            path: ["test2", "test3", 1, "bar"],
            type: "string.max",
            context: { limit: 5, value: "testfailed", key: "bar", label: "bar", encoding: undefined }
        }, {
            message: '"foo" length must be less than or equal to 3 characters long',
            path: ["test2", "test3", 2, "baz", "test4", 0, "foo"],
            type: "string.max",
            context: { limit: 3, value: "test1", key: "foo", label: "foo", encoding: undefined }
        }, {
            message: '"baz" is not allowed',
            path: ["test2", "test3", 2, "baz", "test4", 0, "baz"],
            type: "object.allowUnknown",
            context: { key: "baz", label: "baz", child: "baz" }
        }]);
    });

    it("validates using the root any object", async () => {
        const any = model;
        await any.validate("abc");
    });

    it("validates using the root any object (no callback)", () => {
        const any = model;
        const result = any.validate("abc");
        expect(result.error).to.not.exist();
        expect(result.value).to.equal("abc");
    });

    it("accepts no options", async () => {
        await model.validate("test", model.string());
    });

    it("accepts no options (no callback)", () => {
        const result = model.validate("test", model.string());
        expect(result.error).to.not.exist();
        expect(result.value).to.equal("test");
    });

    it("accepts options", async () => {
        await assert.throws(async () => model.validate("5", model.number(), { convert: false }));
    });

    it("accepts options (no callback)", () => {
        const result = model.validate("5", model.number(), { convert: false });
        expect(result.error).to.exist();
    });

    it("accepts null options", async () => {

        await model.validate("test", model.string(), null);
    });

    it("accepts undefined options", async () => {
        await model.validate("test", model.string(), undefined);
    });

    describe("describe()", () => {
        const defaultFn = function () {

            return "test";
        };
        defaultFn.description = "testing";

        const defaultDescribedFn = function () {

            return "test";
        };

        const defaultRef = model.ref("xor");

        const schema = model.object({
            sub: {
                email: model.string().email(),
                date: model.date(),
                child: model.object({
                    alphanum: model.string().alphanum()
                })
            },
            min: [model.number(), model.string().min(3)],
            max: model.string().max(3).default(0),
            required: model.string().required(),
            xor: model.string(),
            renamed: model.string().valid("456"),
            notEmpty: model.string().required().description("a").notes("b").tags("c"),
            empty: model.string().empty("").strip(),
            defaultRef: model.string().default(defaultRef, "not here"),
            defaultFn: model.string().default(defaultFn, "not here"),
            defaultDescribedFn: model.string().default(defaultDescribedFn, "described test")
        }).options({ abortEarly: false, convert: false }).rename("renamed", "required").without("required", "xor").without("xor", "required");

        const result = {
            type: "object",
            children: {
                sub: {
                    type: "object",
                    children: {
                        email: {
                            type: "string",
                            invalids: [""],
                            rules: [{ name: "email" }]
                        },
                        date: {
                            type: "date"
                        },
                        child: {
                            type: "object",
                            children: {
                                alphanum: {
                                    type: "string",
                                    invalids: [""],
                                    rules: [{ name: "alphanum" }]
                                }
                            }
                        }
                    }
                },
                min: {
                    type: "alternatives",
                    alternatives: [
                        {
                            type: "number",
                            invalids: [Infinity, -Infinity]
                        },
                        {
                            type: "string",
                            invalids: [""],
                            rules: [{ name: "min", arg: 3 }]
                        }
                    ]
                },
                max: {
                    type: "string",
                    flags: {
                        default: 0
                    },
                    invalids: [""],
                    rules: [{ name: "max", arg: 3 }]
                },
                required: {
                    type: "string",
                    flags: {
                        presence: "required"
                    },
                    invalids: [""]
                },
                xor: {
                    type: "string",
                    invalids: [""]
                },
                renamed: {
                    type: "string",
                    flags: {
                        allowOnly: true
                    },
                    valids: ["456"],
                    invalids: [""]
                },
                notEmpty: {
                    type: "string",
                    flags: {
                        presence: "required"
                    },
                    description: "a",
                    notes: ["b"],
                    tags: ["c"],
                    invalids: [""]
                },
                empty: {
                    type: "string",
                    flags: {
                        empty: {
                            type: "string",
                            flags: {
                                allowOnly: true
                            },
                            valids: [""]
                        },
                        strip: true
                    },
                    invalids: [""]
                },
                defaultRef: {
                    type: "string",
                    flags: {
                        default: "ref:xor"
                    },
                    invalids: [""]
                },
                defaultFn: {
                    type: "string",
                    flags: {
                        default: {
                            description: "testing",
                            function: defaultFn
                        }
                    },
                    invalids: [""]
                },
                defaultDescribedFn: {
                    type: "string",
                    flags: {
                        default: {
                            description: "described test",
                            function: defaultDescribedFn
                        }
                    },
                    invalids: [""]
                }
            },
            dependencies: [
                {
                    type: "without",
                    key: "required",
                    peers: ["xor"]
                },
                {
                    type: "without",
                    key: "xor",
                    peers: ["required"]
                }
            ],
            renames: [
                {
                    from: "renamed",
                    to: "required",
                    isRegExp: false,
                    options: {
                        alias: false,
                        multiple: false,
                        override: false
                    }
                }
            ],
            options: {
                abortEarly: false,
                convert: false
            }
        };

        it("describes schema (direct)", () => {
            const description = schema.describe();
            expect(description).to.eql(result);
            expect(description.children.defaultRef.flags.default).to.equal("ref:xor");
            expect(description.children.defaultFn.flags.default.description).to.equal("testing");
            expect(description.children.defaultDescribedFn.flags.default.description).to.equal("described test");
        });

        it("describes schema (root)", () => {

            const description = model.describe(schema);
            expect(description).to.eql(result);
        });

        it("describes schema (any)", () => {

            const any = model;
            const description = any.describe();
            expect(description).to.eql({
                type: "any"
            });
        });

        it("describes schema without invalids", () => {

            const description = model.allow(null).describe();
            expect(description.invalids).to.not.exist();
        });
    });

    describe("assert()", () => {

        it("does not have a return value", () => {

            let result;
            expect(() => {

                result = model.assert("4", model.number());
            }).to.not.throw();
            expect(result).to.not.exist();
        });
    });

    describe("attempt()", () => {

        it("throws on invalid value", () => {

            expect(() => {

                model.attempt("x", model.number());
            }).to.throw('"value" must be a number');
        });

        it("does not throw on valid value", () => {

            expect(() => {

                model.attempt("4", model.number());
            }).to.not.throw();
        });

        it("returns validated structure", () => {

            let valid;
            expect(() => {

                valid = model.attempt("4", model.number());
            }).to.not.throw();
            expect(valid).to.equal(4);
        });

        it("throws on invalid value with message", () => {

            expect(() => {

                model.attempt("x", model.number(), "the reason is");
            }).to.throw('the reason is "value" must be a number');
        });

        it("throws on invalid value with message as error", () => {

            expect(() => {

                model.attempt("x", model.number(), new Error("invalid value"));
            }).to.throw("invalid value");
        });

        it("throws a validation error and not a TypeError when parameter is given as a json string with incorrect property", () => {

            const schema = {
                a: model.object({
                    b: model.string()
                })
            };

            const input = {
                a: '{"c":"string"}'
            };

            expect(() => {

                model.attempt(input, schema);
            }).to.throw(/\"c\" is not allowed/);
        });

        it("throws a custom error from the schema if provided", () => {

            expect(() => {

                model.attempt("x", model.number().error(new Error("Oh noes !")));
            }).to.throw("Oh noes !");
        });

        it("throws an error with combined messages", () => {

            const schema = model.number().error(new Error("Oh noes !"));
            expect(() => model.attempt("x", schema, "invalid value")).to.throw("Oh noes !");
            expect(() => model.attempt("x", schema, "invalid value")).to.throw("Oh noes !");
        });
    });

    describe("compile()", () => {

        it("throws an error on invalid value", () => {

            expect(() => {

                model.compile(undefined);
            }).to.throw(Error, "Invalid schema content: ");
        });

        it("shows path to errors in object", () => {

            const schema = {
                a: {
                    b: {
                        c: {
                            d: undefined
                        }
                    }
                }
            };

            expect(() => {

                model.compile(schema);
            }).to.throw(Error, "Invalid schema content: (a.b.c.d)");
        });
    });

    describe("reach()", () => {

        it("should fail without any parameter", () => {

            expect(() => model.reach()).to.throw("you must provide a joi schema");
        });

        it("should fail when schema is not a joi object", () => {

            expect(() => model.reach({ foo: "bar" }, "foo")).to.throw("you must provide a joi schema");
        });

        it("should fail without a proper path", () => {

            const schema = model.object();
            expect(() => model.reach(schema)).to.throw("path must be a string or an array of strings");
            expect(() => model.reach(schema, true)).to.throw("path must be a string or an array of strings");
        });

        it("should return undefined when no keys are defined", () => {

            const schema = model.object();
            expect(model.reach(schema, "a")).to.be.undefined();
        });

        it("should return undefined when key is not found", () => {

            const schema = model.object().keys({ a: model.number() });
            expect(model.reach(schema, "foo")).to.be.undefined();
        });

        it("should return a schema when key is found", () => {

            const a = model.number();
            const schema = model.object().keys({ a });
            expect(model.reach(schema, "a")).to.equal(a);
        });

        it("should return a schema when key as array is found", () => {

            const a = model.number();
            const schema = model.object().keys({ a });
            expect(model.reach(schema, ["a"])).to.equal(a);
        });

        it("should return undefined on a schema that does not support reach", () => {

            const schema = model.number();
            expect(model.reach(schema, "a")).to.be.undefined();
        });

        it("should return a schema when deep key is found", () => {

            const bar = model.number();
            const schema = model.object({ foo: model.object({ bar }) });
            expect(model.reach(schema, "foo.bar")).to.equal(bar);
        });

        it("should return a schema when deep key is found", () => {

            const bar = model.number();
            const schema = model.object({ foo: model.object({ bar }) });
            expect(model.reach(schema, ["foo", "bar"])).to.equal(bar);
        });

        it("should return undefined when deep key is not found", () => {

            const schema = model.object({ foo: model.object({ bar: model.number() }) });
            expect(model.reach(schema, "foo.baz")).to.be.undefined();
        });

        it("should return the same schema with an empty path", () => {
            const schema = model.object();
            expect(model.reach(schema, "")).to.equal(schema);
        });
    });

    describe("extend()", () => {

        describe("parameters", () => {

            it("must be an object or array of objects", () => {

                expect(() => model.extend(true)).to.throw(/"value" at position 0 does not match any of the allowed types/);
                expect(() => model.extend(null)).to.throw(/"value" at position 0 does not match any of the allowed types/);
                expect(() => model.extend([{ name: "foo" }, true])).to.throw(/"value" at position 1 does not match any of the allowed types/);
                expect(() => model.extend([{ name: "foo" }, null])).to.throw(/"value" at position 1 does not match any of the allowed types/);
                expect(() => model.extend()).to.throw("You need to provide at least one extension");
            });

            it("must have a valid string as name for the type", () => {

                expect(() => model.extend({ base: model.number() })).to.throw(/"name" is required/);
                expect(() => model.extend({ name: 123 })).to.throw(/"name" must be a string/);
                expect(() => model.extend({ name: "" })).to.throw(/"name" is not allowed to be empty/);
            });

            it("must have a model schema as base when present", () => {

                expect(() => model.extend({ base: true })).to.throw(/"base" must be an object/);
                expect(() => model.extend({ base: { isJoi: true } })).to.throw(/"base" must be an instance of "Joi object"/);
            });

            it("must have valid coerce function", () => {

                expect(() => model.extend({ name: "a", coerce: true })).to.throw(/"coerce" must be a Function/);
                expect(() => model.extend({ name: "a", coerce() { } })).to.throw(/"coerce" must have an arity of 3/);
                expect(() => model.extend({ name: "a", coerce(a, b) { } })).to.throw(/"coerce" must have an arity of 3/);
                expect(() => model.extend({ name: "a", coerce(a, b, c, d) { } })).to.throw(/"coerce" must have an arity of 3/);
            });

            it("must have valid pre function", () => {

                expect(() => model.extend({ name: "a", pre: true })).to.throw(/"pre" must be a Function/);
                expect(() => model.extend({ name: "a", pre() { } })).to.throw(/"pre" must have an arity of 3/);
                expect(() => model.extend({ name: "a", pre(a, b) { } })).to.throw(/"pre" must have an arity of 3/);
                expect(() => model.extend({ name: "a", pre(a, b, c, d) { } })).to.throw(/"pre" must have an arity of 3/);
            });

            it("must have valid language object", () => {

                expect(() => model.extend({ name: "a", language: true })).to.throw(/"language" must be an object/);
                expect(() => model.extend({ name: "a", language() { } })).to.throw(/"language" must be an object/);
                expect(() => model.extend({ name: "a", language: null })).to.throw(/"language" must be an object/);
            });

            it("must have valid rules", () => {

                expect(() => model.extend({ name: "a", rules: true })).to.throw(/"rules" must be an array/);
                expect(() => model.extend({ name: "a", rules: [true] })).to.throw(/"0" must be an object/);
                expect(() => model.extend({ name: "a", rules: [{}] })).to.throw(/"name" is required/);
                expect(() => model.extend({ name: "a", rules: [{ name: true }] })).to.throw(/"name" must be a string/);
                expect(() => model.extend({ name: "a", rules: [{ name: "foo" }] })).to.throw(/must contain at least one of \[setup, validate\]/);

                expect(() => {

                    model.extend({ name: "a", rules: [{ name: "foo", validate: true }] });
                }).to.throw(/"validate" must be a Function/);

                expect(() => {

                    model.extend({
                        name: "a", rules: [{
                            name: "foo",
                            validate() { }
                        }]
                    });
                }).to.throw(/"validate" must have an arity of 4/);

                expect(() => {

                    model.extend({ name: "a", rules: [{ name: "foo", setup: true }] });
                }).to.throw(/"setup" must be a Function/);

                expect(() => {

                    model.extend({
                        name: "a", rules: [{
                            name: "foo",
                            setup() { }
                        }]
                    });
                }).to.throw(/"setup" must have an arity of 1/);

                expect(() => {

                    model.extend({
                        name: "a", rules: [{
                            name: "foo",
                            validate(a, b, c, d) { },
                            params: {
                                foo: true
                            }
                        }]
                    });
                }).to.throw(/"foo" must be an object/);

                expect(() => {
                    model.extend({
                        name: "a", rules: [{
                            name: "foo",
                            validate(a, b, c, d) { },
                            params: {
                                foo: {}
                            }
                        }]
                    });
                }).to.throw(/"foo" must be an instance of "Joi object"/);

                expect(() => {

                    model.extend({
                        name: "a", rules: [{
                            name: "foo",
                            validate(a, b, c, d) { },
                            params: {
                                foo: { isJoi: true }
                            }
                        }]
                    });
                }).to.throw(/"foo" must be an instance of "Joi object"/);

                expect(() => {

                    model.extend({
                        name: "a", rules: [{
                            name: "foo",
                            validate(a, b, c, d) { },
                            params: model.number()
                        }]
                    });
                }).to.throw(/"params" must be an instance of "Joi object"/);
            });
        });

        it("defines a custom type with a default base", () => {

            const customJoi = model.extend({
                name: "myType"
            });

            expect(model.myType).to.not.exist();
            assert.isTrue(is.function(customJoi.myType));

            const schema = customJoi.myType();
            expect(schema._type).to.equal("myType");
            expect(schema.isJoi).to.be.true();
        });

        it("defines a custom type with a custom base", () => {

            const customJoi = model.extend({
                base: model.string().min(2),
                name: "myType"
            });

            expect(model.myType).to.not.exist();
            assert.isTrue(is.function(customJoi.myType));

            const schema = customJoi.myType();
            Helper.validate(schema, [
                [123, false, null, {
                    message: '"value" must be a string',
                    details: [{
                        message: '"value" must be a string',
                        path: [],
                        type: "string.base",
                        context: { value: 123, label: "value", key: undefined }
                    }]
                }],
                ["a", false, null, {
                    message: '"value" length must be at least 2 characters long',
                    details: [{
                        message: '"value" length must be at least 2 characters long',
                        path: [],
                        type: "string.min",
                        context: {
                            limit: 2,
                            value: "a",
                            encoding: undefined,
                            label: "value",
                            key: undefined
                        }
                    }]
                }],
                ["abc", true]
            ]);
        });

        it("defines a custom type with a custom base while preserving its original helper params", () => {
            const customModel = model.extend({
                base: model.object(),
                name: "myType"
            });
            expect(model.myType).to.not.exist();
            assert.isTrue(is.function(customModel.myType));
            const schema = customModel.myType({ a: customModel.number() });
            Helper.validate(schema, [
                [undefined, true],
                [{}, true],
                [{ a: 1 }, true],
                [{ a: "a" }, false, null, {
                    message: 'child "a" fails because ["a" must be a number]',
                    details: [{
                        message: '"a" must be a number',
                        path: ["a"],
                        type: "number.base",
                        context: { key: "a", label: "a", value: "a" }
                    }]
                }]
            ]);
        });

        it("defines a custom type with new rules", () => {

            const customJoi = model.extend({
                name: "myType",
                language: {
                    bar: "oh no bar !"
                },
                rules: [
                    {
                        name: "foo",
                        validate(params, value, state, options) {

                            return null; // Valid
                        }
                    },
                    {
                        name: "bar",
                        validate(params, value, state, options) {

                            return this.createError("myType.bar", null, state, options);
                        }
                    }
                ]
            });

            const original = model.any();
            expect(original.foo).to.not.exist();
            expect(original.bar).to.not.exist();

            const schema = customJoi.myType();
            const valid = schema.foo().validate({});
            const invalid = schema.bar().validate({});

            expect(valid.error).to.be.null();
            expect(invalid.error).to.be.an.instanceof(Error);
            expect(invalid.error.toString()).to.equal('ValidationError: "value" oh no bar !');
        });

        it("new rules should have the correct this", () => {

            const customJoi = model.extend({
                name: "myType",
                language: {
                    bar: "oh no bar !"
                },
                rules: [
                    {
                        name: "foo",
                        validate(params, value, state, options) {

                            return this.createError("myType.bar", { v: value }, state, options);
                        }
                    }
                ]
            });

            const schema = customJoi.myType().foo().label("baz");
            assert.instanceOf(schema.validate({}).error, Error, '"baz" oh no bar !');
        });

        it("defines a custom type with a rule with setup which return undefined", () => {

            const customJoi = model.extend({
                name: "myType",
                pre(value, state, options) {

                    return this._flags.foo;
                },
                rules: [
                    {
                        name: "foo",
                        params: {
                            first: model.string(),
                            second: model.func().ref()
                        },
                        setup(params) {

                            this._flags.foo = params;
                        }
                    }
                ]
            });

            const schema = customJoi.myType();
            expect(schema.foo("bar").validate(null).value).to.eql({ first: "bar", second: undefined });
            expect(schema.foo("bar", model.ref("a.b")).validate(null).value.first).to.equal("bar");
            expect(model.isRef(schema.foo("bar", model.ref("a.b")).validate(null).value.second)).to.be.true();
        });

        it("defines a custom type with a rule with setup which return a model object", () => {

            const customJoi = model.extend({
                name: "myType",
                pre(value, state, options) {

                    return "baz";
                },
                rules: [
                    {
                        name: "foo",
                        setup(params) {

                            return model.string();
                        }
                    }
                ]
            });

            const schema = customJoi.myType();
            expect(schema.foo().validate("bar").value).to.equal("bar");
            expect(schema.validate("baz").value).to.equal("baz");
        });

        it("defines a custom type with a rule with setup which return other value will throw error", () => {

            const customJoi = model.extend({
                name: "myType",
                pre(value, state, options) {

                    return model.number();
                },
                rules: [
                    {
                        name: "foo",
                        setup(params) {

                            return 0;
                        }
                    }, {
                        name: "bar",
                        setup(params) {

                            return null;
                        }
                    }, {
                        name: "foobar",
                        setup(params) {

                            return { isJoi: true };
                        }
                    }
                ]
            });

            const schema = customJoi.myType();
            expect(() => schema.foo()).to.throw("Setup of extension model.myType().foo() must return undefined or a Joi object");
            expect(() => schema.bar()).to.throw("Setup of extension model.myType().bar() must return undefined or a Joi object");
            expect(() => schema.foobar()).to.throw("Setup of extension model.myType().foobar() must return undefined or a Joi object");
        });

        it("defines a custom type with a rule with both setup and validate", () => {

            const customJoi = model.extend({
                name: "myType",
                pre(value, state, options) {

                    return value + this._flags.add;
                },
                rules: [
                    {
                        name: "addTwice",
                        params: {
                            factor: model.number().required()
                        },
                        setup(params) {

                            this._flags.add = params.factor;
                        },
                        validate(params, value, state, options) {

                            return value + params.factor;
                        }
                    }
                ]
            });

            const schema = customJoi.myType();
            expect(schema.addTwice(3).validate(0).value).to.equal(6);
        });

        it("defines a rule that validates its parameters", () => {

            const customJoi = model.extend({
                base: model.number(),
                name: "number",
                rules: [
                    {
                        name: "multiply",
                        params: {
                            q: model.number().required(),
                            currency: model.string()
                        },
                        validate(params, value, state, options) {

                            const v = value * params.q;
                            return params.currency ? params.currency + v : v;
                        }
                    }
                ]
            });

            const original = model.number();
            expect(original.double).to.not.exist();

            expect(customJoi.number().multiply(2).validate(3)).to.contain({ error: null, value: 6 });
            expect(customJoi.number().multiply(5, "$").validate(7)).to.contain({ error: null, value: "$35" });
            expect(() => customJoi.number().multiply(5, 5)).to.throw(/"currency" must be a string/);
            expect(() => customJoi.number().multiply(5, "$", "oops")).to.throw("Unexpected number of arguments");
        });

        it("defines a rule that validates its parameters when provided as a model schema", () => {

            const customJoi = model.extend({
                base: model.number(),
                name: "number",
                rules: [
                    {
                        name: "multiply",
                        params: model.object({
                            q: model.number().required(),
                            currency: model.string()
                        }),
                        validate(params, value, state, options) {

                            const v = value * params.q;
                            return params.currency ? params.currency + v : v;
                        }
                    }
                ]
            });

            const original = model.number();
            expect(original.double).to.not.exist();

            expect(customJoi.number().multiply(2).validate(3)).to.contain({ error: null, value: 6 });
            expect(customJoi.number().multiply(5, "$").validate(7)).to.contain({ error: null, value: "$35" });
            expect(() => customJoi.number().multiply(5, "$", "oops")).to.throw("Unexpected number of arguments");
        });

        it("defines a rule that validates its parameters with references", () => {

            const customJoi = model.extend({
                base: model.number(),
                name: "number",
                rules: [
                    {
                        name: "multiply",
                        params: {
                            q: model.func().ref(),
                            currency: model.string()
                        },
                        validate(params, value, state, options) {

                            const q = params.q(state.parent, options) || 0;
                            const v = value * q;
                            return params.currency ? params.currency + v : v;
                        }
                    }
                ]
            });

            const schema = customJoi.object({
                a: customJoi.number(),
                b: customJoi.number().multiply(customJoi.ref("a"))
            });

            Helper.validate(schema, [
                [{ a: 3, b: 5 }, true, null, { a: 3, b: 15 }],
                [{ b: 42 }, true, null, { b: 0 }]
            ]);
        });

        it("defines a rule that sets defaults for its parameters", () => {

            const customJoi = model.extend({
                base: model.number(),
                name: "number",
                rules: [
                    {
                        name: "multiply",
                        params: {
                            q: model.number().required(),
                            currency: model.string().default("$")
                        },
                        validate(params, value, state, options) {

                            const v = value * params.q;
                            return params.currency + v;
                        }
                    }
                ]
            });

            const original = model.number();
            expect(original.double).to.not.exist();

            expect(customJoi.number().multiply(5).validate(7)).to.contain({ error: null, value: "$35" });
            expect(() => customJoi.number().multiply(5, 5)).to.throw(/"currency" must be a string/);
        });

        it("defines a rule that can change the value", () => {

            const customJoi = model.extend({
                base: model.number(),
                name: "number",
                rules: [
                    {
                        name: "double",
                        validate(params, value, state, options) {

                            return value * 2;
                        }
                    }
                ]
            });

            const original = model.number();
            expect(original.double).to.not.exist();

            const schema = customJoi.number().double();
            expect(schema.validate(3)).to.contain({ error: null, value: 6 });
        });

        it("overrides a predefined language", () => {

            const base = model.any().options({
                language: {
                    myType: {
                        foo: "original"
                    }
                }
            });

            const customJoi = model.extend({
                base,
                name: "myType",
                language: {
                    foo: "modified"
                },
                rules: [
                    {
                        name: "foo",
                        validate(params, value, state, options) {

                            return this.createError("myType.foo", null, state, options);
                        }
                    }
                ]
            });

            // Checks for a language leak in the base
            expect(base._settings.language.myType.foo).to.equal("original");

            const schema = customJoi.myType().foo();
            const result = schema.validate({});
            expect(result.error).to.be.an.instanceof(Error);
            expect(result.error.toString()).to.equal('ValidationError: "value" modified');
        });

        it("defines a custom type coercing its input value", () => {

            const customJoi = model.extend({
                base: model.string(),
                coerce(value, state, options) {

                    return "foobar";
                },
                name: "myType"
            });

            const schema = customJoi.myType();
            const result = schema.validate(true);
            expect(result.error).to.be.null();
            expect(result.value).to.equal("foobar");
        });

        it("defines a custom type coercing its input value that runs early enough", () => {

            const customJoi = model.extend({
                base: model.string(),
                coerce(value, state, options) {

                    return "foobar";
                },
                name: "myType"
            });

            const schema = customJoi.myType();
            const result = schema.validate("");
            expect(result.error).to.be.null();
            expect(result.value).to.equal("foobar");
        });

        it("defines multiple levels of coercion", () => {

            const customJoi = model.extend({
                base: model.string(),
                coerce(value, state, options) {

                    return "foobar";
                },
                name: "myType"
            });

            const customJoi2 = customJoi.extend({
                base: customJoi.myType(),
                coerce(value, state, options) {

                    expect(value).to.equal("foobar");
                    return "baz";
                },
                name: "myType"
            });

            const schema = customJoi2.myType();
            const result = schema.validate("");
            expect(result.error).to.be.null();
            expect(result.value).to.equal("baz");
        });

        it("defines multiple levels of coercion where base fails", () => {

            const customJoi = model.extend({
                base: model.string(),
                coerce(value, state, options) {

                    return this.createError("any.invalid", null, state, options);
                },
                name: "myType"
            });

            const customJoi2 = customJoi.extend({
                base: customJoi.myType(),
                coerce(value, state, options) {

                    expect(value).to.equal("foobar");
                    return "baz";
                },
                name: "myType"
            });

            const schema = customJoi2.myType();
            const result = schema.validate("");
            assert.instanceOf(result.error, Error, '"value" contains an invalid value');
        });

        it("defines a custom type casting its input value", () => {

            const customJoi = model.extend({
                base: model.string(),
                pre(value, state, options) {

                    return Symbol(value);
                },
                name: "myType"
            });

            const schema = customJoi.myType();
            const result = schema.validate("foo");
            expect(result.error).to.be.null();
            expect(typeof result.value).to.equal("symbol");
            expect(result.value.toString()).to.equal("Symbol(foo)");
        });

        it("defines a custom type coercing and casting its input value", () => {

            const customJoi = model.extend({
                base: model.bool(),
                coerce(value, state, options) {

                    return true;
                },
                pre(value, state, options) {

                    return value.toString();
                },
                name: "myType"
            });

            const schema = customJoi.myType();
            const result = schema.validate("foo");
            expect(result.error).to.be.null();
            expect(result.value).to.equal("true");
        });

        it("defines a custom type with a failing coerce", () => {

            const customJoi = model.extend({
                coerce(value, state, options) {

                    return this.createError("any.invalid", null, state, options);
                },
                name: "myType"
            });

            const schema = customJoi.myType();
            const result = schema.validate("foo");
            expect(result.error).to.exist();
            expect(result.error.toString()).to.equal('ValidationError: "value" contains an invalid value');
        });

        it("defines a custom type with a failing pre", () => {

            const customJoi = model.extend({
                pre(value, state, options) {

                    return this.createError("any.invalid", null, state, options);
                },
                name: "myType"
            });

            const schema = customJoi.myType();
            const result = schema.validate("foo");
            expect(result.error).to.exist();
            expect(result.error.toString()).to.equal('ValidationError: "value" contains an invalid value');
        });

        it("defines a custom type with a non-modifying coerce", () => {

            const customJoi = model.extend({
                coerce(value, state, options) {

                    return value;
                },
                name: "myType"
            });

            const schema = customJoi.myType();
            const result = schema.validate("foo");
            expect(result.error).to.not.exist();
            expect(result.value).to.equal("foo");
        });

        it("defines a custom type with a non-modifying pre", () => {

            const customJoi = model.extend({
                pre(value, state, options) {

                    return value;
                },
                name: "myType"
            });

            const schema = customJoi.myType();
            const result = schema.validate("foo");
            expect(result.error).to.not.exist();
            expect(result.value).to.equal("foo");
        });

        it("never reaches a pre if the base is failing", () => {

            const customJoi = model.extend({
                base: model.number(),
                pre(value, state, options) {

                    throw new Error("should not reach here");
                },
                name: "myType"
            });

            const schema = customJoi.myType();
            const result = schema.validate("foo");
            expect(result.error).to.exist();
            expect(result.error.toString()).to.equal('ValidationError: "value" must be a number');
        });

        describe("describe()", () => {

            it("should describe a basic schema", () => {

                const customJoi = model.extend({
                    name: "myType"
                });

                const schema = customJoi.myType();
                expect(schema.describe()).to.eql({
                    type: "myType"
                });
            });

            it("should describe a schema with a base", () => {

                const customJoi = model.extend({
                    base: model.number(),
                    name: "myType"
                });

                const schema = customJoi.myType();
                expect(schema.describe()).to.eql({
                    type: "myType",
                    invalids: [Infinity, -Infinity]
                });
            });

            it("should describe a schema with rules", () => {

                const customJoi = model.extend({
                    name: "myType",
                    rules: [
                        {
                            name: "foo",
                            validate(params, value, state, options) { }
                        },
                        {
                            name: "bar",
                            validate(params, value, state, options) { }
                        }
                    ]
                });

                const schema = customJoi.myType().foo().bar();
                expect(schema.describe()).to.eql({
                    type: "myType",
                    rules: [
                        { name: "foo", arg: {} },
                        { name: "bar", arg: {} }
                    ]
                });
            });

            it("should describe a schema with rules and parameters", () => {

                const customJoi = model.extend({
                    name: "myType",
                    rules: [
                        {
                            name: "foo",
                            params: {
                                bar: model.string(),
                                baz: model.number(),
                                qux: model.func().ref(),
                                quux: model.func().ref()
                            },
                            validate(params, value, state, options) { }
                        }
                    ]
                });

                const schema = customJoi.myType().foo("bar", 42, model.ref("a.b"), model.ref("$c.d"));
                expect(schema.describe()).to.eql({
                    type: "myType",
                    rules: [
                        { name: "foo", arg: { bar: "bar", baz: 42, qux: "ref:a.b", quux: "context:c.d" } }
                    ]
                });
            });

            it("should describe a schema with rules and parameters with custom description", () => {

                const customJoi = model.extend({
                    name: "myType",
                    rules: [
                        {
                            name: "foo",
                            params: {
                                bar: model.string()
                            },
                            description: "something",
                            validate(params, value, state, options) { }
                        },
                        {
                            name: "bar",
                            params: {
                                baz: model.string()
                            },
                            description(params) {

                                expect(params).to.eql({ baz: "baz" });
                                return "whatever";
                            },
                            validate(params, value, state, options) { }
                        }
                    ]
                });

                const schema = customJoi.myType().foo("bar").bar("baz");
                expect(schema.describe()).to.eql({
                    type: "myType",
                    rules: [
                        { name: "foo", description: "something", arg: { bar: "bar" } },
                        { name: "bar", description: "whatever", arg: { baz: "baz" } }
                    ]
                });
            });

            it("should describe a schema with rules and parameters with custom description", () => {

                const customJoi = model.extend({
                    name: "myType",
                    describe(description) {

                        expect(description).to.eql({
                            type: "myType",
                            rules: [
                                { name: "foo", description: "something", arg: { bar: "bar" } },
                                { name: "bar", description: "whatever", arg: { baz: "baz" } }
                            ]
                        });

                        description.type = "zalgo";
                        return description;
                    },
                    rules: [
                        {
                            name: "foo",
                            params: {
                                bar: model.string()
                            },
                            description: "something",
                            validate(params, value, state, options) { }
                        },
                        {
                            name: "bar",
                            params: {
                                baz: model.string()
                            },
                            description(params) {

                                expect(params).to.eql({ baz: "baz" });
                                return "whatever";
                            },
                            validate(params, value, state, options) { }
                        }
                    ]
                });

                const schema = customJoi.myType().foo("bar").bar("baz");
                expect(schema.describe()).to.eql({
                    type: "zalgo",
                    rules: [
                        { name: "foo", description: "something", arg: { bar: "bar" } },
                        { name: "bar", description: "whatever", arg: { baz: "baz" } }
                    ]
                });
            });
        });

        it("should return a custom model as an instance of Any", () => {
            const customJoi = model.extend({
                name: "myType"
            });

            const { Any } = adone.private(adone.model);
            expect(customJoi).to.be.an.instanceof(Any);
        });

        it("should return a custom model with types not inheriting root properties", () => {

            const customJoi = model.extend({
                name: "myType"
            });

            const schema = customJoi.valid(true);
            expect(schema.isRef).to.not.exist();
        });

        it("should be able to define a type in a factory function", () => {

            const customJoi = model.extend((joi) => ({
                name: "myType"
            }));

            expect(() => customJoi.myType()).to.not.throw();
        });

        it("should be able to use types defined in the same extend call", () => {

            const customJoi = model.extend([
                {
                    name: "myType"
                },
                (joi) => ({
                    name: "mySecondType",
                    base: joi.myType()
                })
            ]);

            expect(() => customJoi.mySecondType()).to.not.throw();
        });

        it("should be able to merge rules when type is defined several times in the same extend call", () => {

            const customJoi = model.extend([
                (joi) => ({
                    name: "myType",
                    base: joi.myType ? joi.myType() : joi.number(), // Inherit an already existing implementation or number
                    rules: [
                        {
                            name: "foo",
                            validate(params, value, state, options) {

                                return 1;
                            }
                        }
                    ]
                }),
                (joi) => ({
                    name: "myType",
                    base: joi.myType ? joi.myType() : joi.number(),
                    rules: [
                        {
                            name: "bar",
                            validate(params, value, state, options) {

                                return 2;
                            }
                        }
                    ]
                })
            ]);

            expect(() => customJoi.myType().foo().bar()).to.not.throw();
            expect(customJoi.attempt({ a: 123, b: 456 }, { a: customJoi.myType().foo(), b: customJoi.myType().bar() })).to.eql({ a: 1, b: 2 });
        });

        it("should only keep last definition when type is defined several times with different bases", () => {

            const customJoi = model.extend([
                (joi) => ({
                    name: "myType",
                    base: model.number(),
                    rules: [
                        {
                            name: "foo",
                            validate(params, value, state, options) {

                                return 1;
                            }
                        }
                    ]
                }),
                (joi) => ({
                    name: "myType",
                    base: model.string(),
                    rules: [
                        {
                            name: "bar",
                            validate(params, value, state, options) {

                                return 2;
                            }
                        }
                    ]
                })
            ]);

            expect(() => customJoi.myType().foo()).to.throw();
            expect(() => customJoi.myType().bar()).to.not.throw();
        });

        it("returns a generic error when using an undefined language", () => {

            const customJoi = model.extend({
                name: "myType",
                rules: [{
                    name: "foo",
                    validate(params, value, state, options) {

                        return this.createError("myType.foo", null, state, options);
                    }
                }]
            });

            const result = customJoi.myType().foo().validate({});
            assert.instanceOf(result.error, Error, 'Error code "myType.foo" is not defined, your custom type is missing the correct language definition');
            expect(result.error.details).to.eql([{
                message: 'Error code "myType.foo" is not defined, your custom type is missing the correct language definition',
                path: [],
                type: "myType.foo",
                context: { key: undefined, label: "value" }
            }]);
        });

    });

    describe("defaults()", () => {

        it("should apply defaults to joi itself", () => {

            const defaultJoi = model.defaults((schema) => schema.required().description("defaulted"));
            const schema = defaultJoi.optional();
            expect(schema.describe()).to.eql({
                type: "any",
                description: "defaulted",
                flags: {
                    presence: "optional"
                }
            });
        });

        it("should apply defaults to standard types", () => {

            const defaultJoi = model.defaults((schema) => schema.required().description("defaulted"));
            const schema = defaultJoi.string();
            expect(schema.describe()).to.eql({
                type: "string",
                invalids: [""],
                description: "defaulted",
                flags: {
                    presence: "required"
                }
            });
        });

        it("should apply defaults to types with arguments", () => {

            const defaultJoi = model.defaults((schema) => schema.required().description("defaulted"));
            const schema = defaultJoi.object({ foo: "bar" });
            expect(schema.describe()).to.eql({
                type: "object",
                description: "defaulted",
                flags: {
                    presence: "required"
                },
                children: {
                    foo: {
                        type: "string",
                        description: "defaulted",
                        flags: {
                            presence: "required",
                            allowOnly: true
                        },
                        invalids: [""],
                        valids: ["bar"]
                    }
                }
            });
        });

        it("should keep several defaults separated", () => {

            const defaultJoi = model.defaults((schema) => schema.required().description("defaulted"));
            const defaultJoi2 = model.defaults((schema) => schema.required().description("defaulted2"));
            const schema = defaultJoi.object({
                foo: "bar",
                baz: defaultJoi2.object().keys({
                    qux: "zorg"
                })
            });
            expect(schema.describe()).to.eql({
                type: "object",
                description: "defaulted",
                flags: {
                    presence: "required"
                },
                children: {
                    foo: {
                        type: "string",
                        description: "defaulted",
                        flags: {
                            presence: "required",
                            allowOnly: true
                        },
                        invalids: [""],
                        valids: ["bar"]
                    },
                    baz: {
                        children: {
                            qux: {
                                description: "defaulted2",
                                flags: {
                                    allowOnly: true,
                                    presence: "required"
                                },
                                invalids: [""],
                                type: "string",
                                valids: ["zorg"]
                            }
                        },
                        description: "defaulted2",
                        flags: {
                            presence: "required"
                        },
                        type: "object"
                    }

                }
            });
        });

        it("should deal with inherited defaults", () => {

            const defaultJoi = model
                .defaults((schema) => schema.required().description("defaulted"))
                .defaults((schema) => schema.raw());
            const schema = defaultJoi.object({
                foo: "bar"
            });
            expect(schema.describe()).to.eql({
                type: "object",
                description: "defaulted",
                flags: {
                    presence: "required",
                    raw: true
                },
                children: {
                    foo: {
                        type: "string",
                        description: "defaulted",
                        flags: {
                            presence: "required",
                            allowOnly: true,
                            raw: true
                        },
                        invalids: [""],
                        valids: ["bar"]
                    }
                }
            });
        });

        it("should keep defaults on an extended joi", () => {

            const defaultJoi = model.defaults((schema) => schema.required().description("defaulted"));
            const extendedJoi = defaultJoi.extend({ name: "foobar" });
            const schema = extendedJoi.foobar();
            expect(schema.describe()).to.eql({
                type: "foobar",
                description: "defaulted",
                flags: {
                    presence: "required"
                }
            });
        });

        it("should apply defaults on an extended joi", () => {

            const extendedJoi = model.extend({ name: "foobar" });
            const defaultJoi = extendedJoi.defaults((schema) => schema.required().description("defaulted"));
            const schema = defaultJoi.foobar();
            expect(schema.describe()).to.eql({
                type: "foobar",
                description: "defaulted",
                flags: {
                    presence: "required"
                }
            });
        });

        it("should fail on missing return for any", () => {

            expect(() => {

                return model.defaults((schema) => {

                    switch (schema.schemaType) {
                        case "bool":
                            return schema.required();
                    }
                });
            }).to.throw("defaults() must return a schema");
        });

        it("should fail on missing return for a standard type", () => {

            const defaultJoi = model.defaults((schema) => {

                switch (schema.schemaType) {
                    case "any":
                        return schema.required();
                }
            });
            expect(() => defaultJoi.string()).to.throw("defaults() must return a schema");
        });

        it("should fail on missing return for a standard type on an inherited default", () => {

            const defaultJoi = model.defaults((schema) => {

                switch (schema.schemaType) {
                    case "any":
                        return schema.required();
                }
            });
            const defaultJoi2 = defaultJoi.defaults((schema) => schema.required());
            expect(() => defaultJoi2.string()).to.throw("defaults() must return a schema");
        });
    });

    describe("validate()", () => {

        it("should work with a successful promise", () => {

            const schema = model.string();

            const promise = model.validate("foo", schema);

            return promise.then((value) => {

                expect(value).to.equal("foo");
            }, () => {

                throw new Error("Should not go here");
            });
        });

        it("should work with a successful promise and a catch in between", () => {

            const schema = model.string();

            const promise = model.validate("foo", schema);

            return promise
                .catch(() => {

                    throw new Error("Should not go here");
                })
                .then((value) => {

                    expect(value).to.equal("foo");
                }, () => {

                    throw new Error("Should not go here");
                });
        });

        it("should work with a failing promise", () => {

            const schema = model.string();

            const promise = model.validate(0, schema);

            return promise.then((value) => {

                throw new Error("Should not go here");
            }, (err) => {

                assert.instanceOf(err, Error, '"value" must be a string');
                expect(err.details).to.eql([{
                    message: '"value" must be a string',
                    path: [],
                    type: "string.base",
                    context: { value: 0, key: undefined, label: "value" }
                }]);
            });
        });

        it("should work with a failing promise and a then in between", () => {

            const schema = model.string();

            const promise = model.validate(0, schema);

            return promise
                .then((value) => {

                    throw new Error("Should not go here");
                })
                .catch((err) => {

                    assert.instanceOf(err, Error, '"value" must be a string');
                    expect(err.details).to.eql([{
                        message: '"value" must be a string',
                        path: [],
                        type: "string.base",
                        context: { value: 0, key: undefined, label: "value" }
                    }]);
                });
        });

        it("should work with a failing promise (with catch)", () => {

            const schema = model.string();

            const promise = model.validate(0, schema);

            return promise.catch((err) => {

                assert.instanceOf(err, Error, '"value" must be a string');
                expect(err.details).to.eql([{
                    message: '"value" must be a string',
                    path: [],
                    type: "string.base",
                    context: { value: 0, key: undefined, label: "value" }
                }]);
            });
        });

        it("should catch errors in a successful promise callback", () => {

            const schema = model.string();

            const promise = model.validate("foo", schema);

            return promise.then((value) => {

                throw new Error("oops");
            }).then(() => {

                throw new Error("Should not go here");
            }, (err) => {

                assert.instanceOf(err, Error, "oops");
            });
        });

        it("should catch errors in a failing promise callback", () => {

            const schema = model.string();

            const promise = model.validate(0, schema);

            return promise.then((value) => {

                throw new Error("Should not go here");
            }, () => {

                throw new Error("oops");
            }).then(() => {

                throw new Error("Should not go here");
            }, (err) => {

                assert.instanceOf(err, Error, "oops");
            });
        });

        it("should catch errors in a failing promise callback (with catch)", () => {

            const schema = model.string();

            const promise = model.validate(0, schema);

            return promise.catch(() => {

                throw new Error("oops");
            }).then(() => {

                throw new Error("Should not go here");
            }, (err) => {

                assert.instanceOf(err, Error, "oops");
            });
        });

    });
});
