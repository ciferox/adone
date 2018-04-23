const {
    model
} = adone;

describe("errors", () => {

    it("has an isJoi property", async () => {

        const err = await assert.throws(async () => model.validate("bar", model.valid("foo")));
        assert.instanceOf(err, Error);
        expect(err.isJoi).to.be.true();
    });

    it("supports custom errors when validating types", async () => {

        const schema = model.object({
            email: model.string().email(),
            date: model.date(),
            alphanum: model.string().alphanum(),
            min: model.string().min(3),
            max: model.string().max(3),
            required: model.string().required(),
            xor: model.string(),
            renamed: model.string().valid("456"),
            notEmpty: model.string().required()
        }).rename("renamed", "required").without("required", "xor").without("xor", "required");

        const input = {
            email: "invalid-email",
            date: "invalid-date",
            alphanum: "\b\n\f\r\t",
            min: "ab",
            max: "abcd",
            required: "hello",
            xor: "123",
            renamed: "456",
            notEmpty: ""
        };

        const lang = {
            any: {
                empty: "3"
            },
            date: {
                base: "18"
            },
            string: {
                base: "13",
                min: "14",
                max: "15",
                alphanum: "16",
                email: "19"
            },
            object: {
                without: "7",
                rename: {
                    override: "11"
                }
            }
        };

        const error = await assert.throws(async () => model.validate(input, schema, { abortEarly: false, language: lang }));
        assert.instanceOf(error, Error, '"value" 11. child "email" fails because ["email" 19]. child "date" fails because ["date" 18]. child "alphanum" fails because ["alphanum" 16]. child "min" fails because ["min" 14]. child "max" fails because ["max" 15]. child "notEmpty" fails because ["notEmpty" 3]. "required" 7. "xor" 7');
        expect(error.name).to.equal("ValidationError");
        expect(error.details).to.eql([
            {
                message: '"value" 11',
                path: [],
                type: "object.rename.override",
                context: { from: "renamed", to: "required", label: "value", key: undefined }
            },
            {
                message: '"email" 19',
                path: ["email"],
                type: "string.email",
                context: { value: "invalid-email", label: "email", key: "email" }
            },
            {
                message: '"date" 18',
                path: ["date"],
                type: "date.base",
                context: { label: "date", key: "date" }
            },
            {
                message: '"alphanum" 16',
                path: ["alphanum"],
                type: "string.alphanum",
                context: { value: "\b\n\f\r\t", label: "alphanum", key: "alphanum" }
            },
            {
                message: '"min" 14',
                path: ["min"],
                type: "string.min",
                context: {
                    limit: 3,
                    value: "ab",
                    encoding: undefined,
                    label: "min",
                    key: "min"
                }
            },
            {
                message: '"max" 15',
                path: ["max"],
                type: "string.max",
                context: {
                    limit: 3,
                    value: "abcd",
                    encoding: undefined,
                    label: "max",
                    key: "max"
                }
            },
            {
                message: '"notEmpty" 3',
                path: ["notEmpty"],
                type: "any.empty",
                context: { label: "notEmpty", key: "notEmpty" }
            },
            {
                message: '"required" 7',
                path: ["required"],
                type: "object.without",
                context: {
                    main: "required",
                    mainWithLabel: "required",
                    peer: "xor",
                    peerWithLabel: "xor",
                    label: "required",
                    key: "required"
                }
            },
            {
                message: '"xor" 7',
                path: ["xor"],
                type: "object.without",
                context: {
                    main: "xor",
                    mainWithLabel: "xor",
                    peer: "required",
                    peerWithLabel: "required",
                    label: "xor",
                    key: "xor"
                }
            }
        ]);
    });

    it("does not prefix with key when language uses context.key", async () => {
        const schema = model.valid("sad").options({ language: { any: { allowOnly: 'my hero "{{label}}" is not {{valids}}' } } });
        const err = await assert.throws(async () => schema.validate(5));
        assert.instanceOf(err, Error, 'my hero "value" is not [sad]');
        expect(err.details).to.eql([{
            message: 'my hero "value" is not [sad]',
            path: [],
            type: "any.allowOnly",
            context: { valids: ["sad"], label: "value", key: undefined }
        }]);
    });

    it("accepts an empty key", async () => {
        const schema = model.valid("sad").options({ language: { key: "" } });
        const err = await assert.throws(async () => schema.validate(5));
        assert.instanceOf(err, Error, "must be one of [sad]");
        expect(err.details).to.eql([{
            message: "must be one of [sad]",
            path: [],
            type: "any.allowOnly",
            context: { valids: ["sad"], label: "value", key: undefined }
        }]);
    });

    it("escapes unsafe keys", async () => {

        const schema = {
            "a()": model.number()
        };

        const err = await assert.throws(async () => model.validate({ "a()": "x" }, schema, { escapeHtml: true }));
        assert.instanceOf(err, Error, 'child "a&#x28;&#x29;" fails because ["a&#x28;&#x29;" must be a number]');
        expect(err.details).to.eql([{
            message: '"a&#x28;&#x29;" must be a number',
            path: ["a()"],
            type: "number.base",
            context: { label: "a()", key: "a()" }
        }]);

        const err2 = await assert.throws(async () => model.validate({ "b()": "x" }, schema, { escapeHtml: true }));
        assert.instanceOf(err2, Error, '"b&#x28;&#x29;" is not allowed');
        expect(err2.details).to.eql([{
            message: '"b&#x28;&#x29;" is not allowed',
            path: ["b()"],
            type: "object.allowUnknown",
            context: { child: "b()", label: "b()", key: "b()" }
        }]);
    });

    it("does not escape unsafe keys by default", async () => {

        const schema = {
            "a()": model.number()
        };

        const err = await assert.throws(async () => model.validate({ "a()": "x" }, schema));
        assert.instanceOf(err, Error, 'child "a()" fails because ["a()" must be a number]');
        expect(err.details).to.eql([{
            message: '"a()" must be a number',
            path: ["a()"],
            type: "number.base",
            context: { label: "a()", key: "a()" }
        }]);

        const err2 = await assert.throws(async () => model.validate({ "b()": "x" }, schema));
        assert.instanceOf(err2, Error, '"b()" is not allowed');
        expect(err2.details).to.eql([{
            message: '"b()" is not allowed',
            path: ["b()"],
            type: "object.allowUnknown",
            context: { child: "b()", label: "b()", key: "b()" }
        }]);
    });

    it("returns error type in validation error", async () => {

        const input = {
            notNumber: "",
            notString: true,
            notBoolean: 9
        };

        const schema = {
            notNumber: model.number().required(),
            notString: model.string().required(),
            notBoolean: model.boolean().required()
        };

        const err = await assert.throws(async () => model.validate(input, schema, { abortEarly: false }));
        assert.instanceOf(err, Error, 'child "notNumber" fails because ["notNumber" must be a number]. child "notString" fails because ["notString" must be a string]. child "notBoolean" fails because ["notBoolean" must be a boolean]');
        expect(err.details).to.eql([
            {
                message: '"notNumber" must be a number',
                path: ["notNumber"],
                type: "number.base",
                context: { label: "notNumber", key: "notNumber" }
            },
            {
                message: '"notString" must be a string',
                path: ["notString"],
                type: "string.base",
                context: { value: true, label: "notString", key: "notString" }
            },
            {
                message: '"notBoolean" must be a boolean',
                path: ["notBoolean"],
                type: "boolean.base",
                context: { label: "notBoolean", key: "notBoolean" }
            }
        ]);
    });

    it("returns a full path to an error value on an array (items)", async () => {

        const schema = model.array().items(model.array().items({ x: model.number() }));
        const input = [
            [{ x: 1 }],
            [{ x: 1 }, { x: "a" }]
        ];

        const err = await assert.throws(async () => schema.validate(input));
        assert.instanceOf(err, Error, '"value" at position 1 fails because ["1" at position 1 fails because [child "x" fails because ["x" must be a number]]]');
        expect(err.details).to.eql([{
            message: '"x" must be a number',
            path: [1, 1, "x"],
            type: "number.base",
            context: { label: "x", key: "x" }
        }]);
    });

    it("returns a full path to an error value on an array (items forbidden)", async () => {

        const schema = model.array().items(model.array().items(model.object({ x: model.string() }).forbidden()));
        const input = [
            [{ x: 1 }],
            [{ x: 1 }, { x: "a" }]
        ];

        const err = await assert.throws(async () => schema.validate(input));
        assert.instanceOf(err, Error, '"value" at position 1 fails because ["1" at position 1 contains an excluded value]');
        expect(err.details).to.eql([{
            message: '"1" at position 1 contains an excluded value',
            path: [1, 1],
            type: "array.excludes",
            context: { pos: 1, value: { x: "a" }, label: 1, key: 1 }
        }]);
    });

    it("returns a full path to an error value on an object", async () => {

        const schema = {
            x: model.array().items({ x: model.number() })
        };

        const input = {
            x: [{ x: 1 }, { x: "a" }]
        };

        const err = await assert.throws(async () => model.validate(input, schema));
        assert.instanceOf(err, Error, 'child "x" fails because ["x" at position 1 fails because [child "x" fails because ["x" must be a number]]]');
        expect(err.details).to.eql([{
            message: '"x" must be a number',
            path: ["x", 1, "x"],
            type: "number.base",
            context: { label: "x", key: "x" }
        }]);
    });

    it("overrides root key language", async () => {

        const schema = model.string().options({ language: { root: "blah" } });
        const err = await assert.throws(async () => schema.validate(4));
        assert.instanceOf(err, Error, '"blah" must be a string');
        expect(err.details).to.eql([{
            message: '"blah" must be a string',
            path: [],
            type: "string.base",
            context: { value: 4, label: "blah", key: undefined }
        }]);
    });

    it("overrides label key language", async () => {

        const schema = model.string().options({ language: { key: "my own {{!label}} " } });
        const err = await assert.throws(async () => schema.validate(4));
        assert.instanceOf(err, Error, "my own value must be a string");
        expect(err.details).to.eql([{
            message: "my own value must be a string",
            path: [],
            type: "string.base",
            context: { value: 4, label: "value", key: undefined }
        }]);
    });

    it("overrides wrapArrays", async () => {

        const schema = model.array().items(model.boolean()).options({ language: { messages: { wrapArrays: false } } });
        const err = await assert.throws(async () => schema.validate([4]));
        assert.instanceOf(err, Error, '"value" at position 0 fails because "0" must be a boolean');
        expect(err.details).to.eql([{
            message: '"0" must be a boolean',
            path: [0],
            type: "boolean.base",
            context: { label: 0, key: 0 }
        }]);
    });

    it("allows html escaping", async () => {

        const schema = model.string().options({ language: { root: "blah" } }).label("bleh");
        const err = await assert.throws(async () => schema.validate(4));
        assert.instanceOf(err, Error, '"bleh" must be a string');
        expect(err.details).to.eql([{
            message: '"bleh" must be a string',
            path: [],
            type: "string.base",
            context: { value: 4, label: "bleh", key: undefined }
        }]);
    });

    it("provides context with the error", async () => {

        const schema = model.object({ length: model.number().min(3).required() });
        const err = await assert.throws(async () => schema.validate({ length: 1 }));
        expect(err.details).to.eql([{
            message: '"length" must be larger than or equal to 3',
            path: ["length"],
            type: "number.min",
            context: {
                limit: 3,
                key: "length",
                label: "length",
                value: 1
            }
        }]);
    });

    it("has a name that is ValidationError", async () => {

        const schema = model.number();
        const validateErr = await assert.throws(async () => schema.validate("a"));
        expect(validateErr.name).to.be.equal("ValidationError");

        try {
            model.assert("a", schema);
            throw new Error("should not reach that");
        } catch (assertErr) {
            expect(assertErr.name).to.be.equal("ValidationError");
        }

        try {
            model.assert("a", schema, "foo");
            throw new Error("should not reach that");
        } catch (assertErr) {
            expect(assertErr.name).to.be.equal("ValidationError");
        }

        try {
            model.assert("a", schema, new Error("foo"));
            throw new Error("should not reach that");
        } catch (assertErr) {
            expect(assertErr.name).to.equal("Error");
        }
    });

    describe("annotate()", () => {

        it("annotates error", async () => {

            const object = {
                a: "m",
                y: {
                    b: {
                        c: 10
                    }
                }
            };

            const schema = {
                a: model.string().valid("a", "b", "c", "d"),
                y: model.object({
                    u: model.string().valid(["e", "f", "g", "h"]).required(),
                    b: model.string().valid("i", "j").allow(false),
                    d: model.object({
                        x: model.string().valid("k", "l").required(),
                        c: model.number()
                    })
                })
            };

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "a" fails because ["a" must be one of [a, b, c, d]]. child "y" fails because [child "u" fails because ["u" is required], child "b" fails because ["b" must be a string]]');
            expect(err.details).to.eql([
                {
                    message: '"a" must be one of [a, b, c, d]',
                    path: ["a"],
                    type: "any.allowOnly",
                    context: { valids: ["a", "b", "c", "d"], label: "a", key: "a" }
                },
                {
                    message: '"u" is required',
                    path: ["y", "u"],
                    type: "any.required",
                    context: { label: "u", key: "u" }
                },
                {
                    message: '"b" must be a string',
                    path: ["y", "b"],
                    type: "string.base",
                    context: { value: { c: 10 }, label: "b", key: "b" }
                }
            ]);
            expect(err.annotate()).to.equal('{\n  \"y\": {\n    \"b\" \u001b[31m[3]\u001b[0m: {\n      \"c\": 10\n    },\n    \u001b[41m\"u\"\u001b[0m\u001b[31m [2]: -- missing --\u001b[0m\n  },\n  "a" \u001b[31m[1]\u001b[0m: \"m\"\n}\n\u001b[31m\n[1] "a" must be one of [a, b, c, d]\n[2] "u" is required\n[3] "b" must be a string\u001b[0m');
        });

        it("annotates error without colors if requested", async () => {

            const object = {
                a: "m"
            };

            const schema = {
                a: model.string().valid("a", "b", "c", "d")
            };

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "a" fails because ["a" must be one of [a, b, c, d]]');
            expect(err.details).to.eql([{
                message: '"a" must be one of [a, b, c, d]',
                path: ["a"],
                type: "any.allowOnly",
                context: { valids: ["a", "b", "c", "d"], label: "a", key: "a" }
            }]);
            expect(err.annotate(true)).to.equal('{\n  "a" [1]: \"m\"\n}\n\n[1] "a" must be one of [a, b, c, d]');
        });

        it("annotates error within array", async () => {

            const object = {
                a: [1, 2, 3, 4, 2, 5]
            };

            const schema = {
                a: model.array().items(model.valid(1, 2))
            };

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "a" fails because ["a" at position 2 fails because ["2" must be one of [1, 2]], "a" at position 3 fails because ["3" must be one of [1, 2]], "a" at position 5 fails because ["5" must be one of [1, 2]]]');
            expect(err.details).to.eql([
                {
                    message: '"2" must be one of [1, 2]',
                    path: ["a", 2],
                    type: "any.allowOnly",
                    context: { valids: [1, 2], label: 2, key: 2 }
                },
                {
                    message: '"3" must be one of [1, 2]',
                    path: ["a", 3],
                    type: "any.allowOnly",
                    context: { valids: [1, 2], label: 3, key: 3 }
                },
                {
                    message: '"5" must be one of [1, 2]',
                    path: ["a", 5],
                    type: "any.allowOnly",
                    context: { valids: [1, 2], label: 5, key: 5 }
                }
            ]);
            expect(err.annotate()).to.equal('{\n  \"a\": [\n    1,\n    2,\n    3, \u001b[31m[1]\u001b[0m\n    4, \u001b[31m[2]\u001b[0m\n    2,\n    5 \u001b[31m[3]\u001b[0m\n  ]\n}\n\u001b[31m\n[1] \"2\" must be one of [1, 2]\n[2] \"3\" must be one of [1, 2]\n[3] \"5\" must be one of [1, 2]\u001b[0m');
        });

        it("annotates error within array multiple times on the same element", async () => {

            const object = {
                a: [2, 3, 4]
            };

            const schema = {
                a: model.array().items(model.number().min(4).max(2))
            };

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "a" fails because ["a" at position 0 fails because ["0" must be larger than or equal to 4], "a" at position 1 fails because ["1" must be larger than or equal to 4, "1" must be less than or equal to 2], "a" at position 2 fails because ["2" must be less than or equal to 2]]');
            expect(err.details).to.eql([
                {
                    message: '"0" must be larger than or equal to 4',
                    path: ["a", 0],
                    type: "number.min",
                    context: { limit: 4, value: 2, label: 0, key: 0 }
                },
                {
                    message: '"1" must be larger than or equal to 4',
                    path: ["a", 1],
                    type: "number.min",
                    context: { limit: 4, value: 3, label: 1, key: 1 }
                },
                {
                    message: '"1" must be less than or equal to 2',
                    path: ["a", 1],
                    type: "number.max",
                    context: { limit: 2, value: 3, label: 1, key: 1 }
                },
                {
                    message: '"2" must be less than or equal to 2',
                    path: ["a", 2],
                    type: "number.max",
                    context: { limit: 2, value: 4, label: 2, key: 2 }
                }
            ]);
            expect(err.annotate()).to.equal('{\n  \"a\": [\n    2, \u001b[31m[1]\u001b[0m\n    3, \u001b[31m[2, 3]\u001b[0m\n    4 \u001b[31m[4]\u001b[0m\n  ]\n}\n\u001b[31m\n[1] \"0\" must be larger than or equal to 4\n[2] \"1\" must be larger than or equal to 4\n[3] \"1\" must be less than or equal to 2\n[4] \"2\" must be less than or equal to 2\u001b[0m');
        });

        it("annotates error within array when it is an object", async () => {

            const object = {
                a: [{ b: 2 }]
            };

            const schema = {
                a: model.array().items(model.number())
            };

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "a" fails because ["a" at position 0 fails because ["0" must be a number]]');
            expect(err.details).to.eql([{
                message: '"0" must be a number',
                path: ["a", 0],
                type: "number.base",
                context: { label: 0, key: 0 }
            }]);
            expect(err.annotate()).to.equal('{\n  \"a\": [\n    { \u001b[31m[1]\u001b[0m\n      \"b\": 2\n    }\n  ]\n}\n\u001b[31m\n[1] \"0\" must be a number\u001b[0m');
        });

        it("annotates error within multiple arrays and multiple times on the same element", async () => {

            const object = {
                a: [2, 3, 4],
                b: [2, 3, 4]
            };

            const schema = {
                a: model.array().items(model.number().min(4).max(2)),
                b: model.array().items(model.number().min(4).max(2))
            };

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "a" fails because ["a" at position 0 fails because ["0" must be larger than or equal to 4], "a" at position 1 fails because ["1" must be larger than or equal to 4, "1" must be less than or equal to 2], "a" at position 2 fails because ["2" must be less than or equal to 2]]. child "b" fails because ["b" at position 0 fails because ["0" must be larger than or equal to 4], "b" at position 1 fails because ["1" must be larger than or equal to 4, "1" must be less than or equal to 2], "b" at position 2 fails because ["2" must be less than or equal to 2]]');
            expect(err.details).to.eql([
                {
                    message: '"0" must be larger than or equal to 4',
                    path: ["a", 0],
                    type: "number.min",
                    context: { limit: 4, value: 2, label: 0, key: 0 }
                },
                {
                    message: '"1" must be larger than or equal to 4',
                    path: ["a", 1],
                    type: "number.min",
                    context: { limit: 4, value: 3, label: 1, key: 1 }
                },
                {
                    message: '"1" must be less than or equal to 2',
                    path: ["a", 1],
                    type: "number.max",
                    context: { limit: 2, value: 3, label: 1, key: 1 }
                },
                {
                    message: '"2" must be less than or equal to 2',
                    path: ["a", 2],
                    type: "number.max",
                    context: { limit: 2, value: 4, label: 2, key: 2 }
                },
                {
                    message: '"0" must be larger than or equal to 4',
                    path: ["b", 0],
                    type: "number.min",
                    context: { limit: 4, value: 2, label: 0, key: 0 }
                },
                {
                    message: '"1" must be larger than or equal to 4',
                    path: ["b", 1],
                    type: "number.min",
                    context: { limit: 4, value: 3, label: 1, key: 1 }
                },
                {
                    message: '"1" must be less than or equal to 2',
                    path: ["b", 1],
                    type: "number.max",
                    context: { limit: 2, value: 3, label: 1, key: 1 }
                },
                {
                    message: '"2" must be less than or equal to 2',
                    path: ["b", 2],
                    type: "number.max",
                    context: { limit: 2, value: 4, label: 2, key: 2 }
                }
            ]);
            expect(err.annotate()).to.equal('{\n  \"a\": [\n    2, \u001b[31m[1]\u001b[0m\n    3, \u001b[31m[2, 3]\u001b[0m\n    4 \u001b[31m[4]\u001b[0m\n  ],\n  \"b\": [\n    2, \u001b[31m[5]\u001b[0m\n    3, \u001b[31m[6, 7]\u001b[0m\n    4 \u001b[31m[8]\u001b[0m\n  ]\n}\n\u001b[31m\n[1] \"0\" must be larger than or equal to 4\n[2] \"1\" must be larger than or equal to 4\n[3] \"1\" must be less than or equal to 2\n[4] \"2\" must be less than or equal to 2\n[5] \"0\" must be larger than or equal to 4\n[6] \"1\" must be larger than or equal to 4\n[7] \"1\" must be less than or equal to 2\n[8] \"2\" must be less than or equal to 2\u001b[0m');
        });

        it("displays alternatives fail as a single line", async () => {

            const schema = {
                x: [
                    model.string(),
                    model.number(),
                    model.date()
                ]
            };

            const err = await assert.throws(async () => model.validate({ x: true }, schema));
            assert.instanceOf(err, Error, 'child "x" fails because ["x" must be a string, "x" must be a number, "x" must be a number of milliseconds or valid date string]');
            expect(err.details).to.eql([
                {
                    message: '"x" must be a string',
                    path: ["x"],
                    type: "string.base",
                    context: { value: true, label: "x", key: "x" }
                },
                {
                    message: '"x" must be a number',
                    path: ["x"],
                    type: "number.base",
                    context: { label: "x", key: "x" }
                },
                {
                    message: '"x" must be a number of milliseconds or valid date string',
                    path: ["x"],
                    type: "date.base",
                    context: { label: "x", key: "x" }
                }
            ]);
            expect(err.annotate()).to.equal('{\n  \"x\" \u001b[31m[1, 2, 3]\u001b[0m: true\n}\n\u001b[31m\n[1] "x" must be a string\n[2] "x" must be a number\n[3] "x" must be a number of milliseconds or valid date string\u001b[0m');
        });

        it("annotates circular input", async () => {

            const schema = {
                x: model.object({
                    y: model.object({
                        z: model.number()
                    })
                })
            };

            const input = {};
            input.x = input;

            const err = await assert.throws(async () => model.validate(input, schema));
            assert.instanceOf(err, Error, 'child "x" fails because ["x" is not allowed]');
            expect(err.details).to.eql([{
                message: '"x" is not allowed',
                path: ["x", "x"],
                type: "object.allowUnknown",
                context: { child: "x", label: "x", key: "x" }
            }]);
            expect(err.annotate()).to.equal('{\n  \"x\" \u001b[31m[1]\u001b[0m: \"[Circular ~]\"\n}\n\u001b[31m\n[1] \"x\" is not allowed\u001b[0m');
        });

        it("annotates deep circular input", async () => {

            const schema = {
                x: model.object({
                    y: model.object({
                        z: model.number()
                    })
                })
            };

            const input = { x: { y: {} } };
            input.x.y.z = input.x.y;

            const err = await assert.throws(async () => model.validate(input, schema));
            assert.instanceOf(err, Error, 'child "x" fails because [child "y" fails because [child "z" fails because ["z" must be a number]]]');
            expect(err.details).to.eql([{
                message: '"z" must be a number',
                path: ["x", "y", "z"],
                type: "number.base",
                context: { label: "z", key: "z" }
            }]);
            expect(err.annotate()).to.equal('{\n  \"x\": {\n    \"y\": {\n      \"z\" \u001b[31m[1]\u001b[0m: \"[Circular ~.x.y]\"\n    }\n  }\n}\n\u001b[31m\n[1] \"z\" must be a number\u001b[0m');
        });

        it("annotates deep circular input with extra keys", async () => {

            const schema = {
                x: model.object({
                    y: model.object({
                        z: model.number()
                    })
                })
            };

            const input = { x: { y: { z: 1, foo: {} } } };
            input.x.y.foo = input.x.y;

            const err = await assert.throws(async () => model.validate(input, schema));
            assert.instanceOf(err, Error, 'child "x" fails because [child "y" fails because ["foo" is not allowed]]');
            expect(err.details).to.eql([{
                message: '"foo" is not allowed',
                path: ["x", "y", "foo"],
                type: "object.allowUnknown",
                context: { child: "foo", label: "foo", key: "foo" }
            }]);
            expect(err.annotate()).to.equal('{\n  \"x\": {\n    \"y\": {\n      \"z\": 1,\n      \"foo\" \u001b[31m[1]\u001b[0m: \"[Circular ~.x.y]\"\n    }\n  }\n}\n\u001b[31m\n[1] \"foo\" is not allowed\u001b[0m');
        });

        it("prints NaN, Infinity and -Infinity correctly in errors", async () => {
            const schema = {
                x: model.object({
                    y: model.date().allow(null),
                    z: model.date().allow(null),
                    u: model.date().allow(null),
                    g: model.date().allow(null),
                    h: model.date().allow(null),
                    i: model.date().allow(null),
                    k: model.date().allow(null),
                    p: model.date().allow(null),
                    f: model.date().allow(null)
                })
            };

            const input = {
                x: {
                    y: NaN,
                    z: Infinity,
                    u: -Infinity,
                    g: Symbol("foo"),
                    h: -Infinity,
                    i: Infinity,
                    k: (a) => a,
                    p: Symbol("bar"),
                    f(x) {

                        return [{ y: 2 }];
                    }
                }
            };

            const err = await assert.throws(async () => model.validate(input, schema));
            assert.instanceOf(err, Error, 'child "x" fails because [child "y" fails because ["y" must be a number of milliseconds or valid date string]]');
            expect(err.details).to.eql([{
                message: '"y" must be a number of milliseconds or valid date string',
                path: ["x", "y"],
                type: "date.base",
                context: { label: "y", key: "y" }
            }]);
            expect(err.annotate()).to.equal('{\n  \"x\": {\n    \"z\": Infinity,\n    \"u\": -Infinity,\n    \"g\": Symbol(foo),\n    \"h\": -Infinity,\n    \"i\": Infinity,\n    \"k\": \"[a => a]\",\n    \"p\": Symbol(bar),\n    \"f\": \"[f(x) {\\n            return [{\\n              y: 2\\n            }];\\n          }]\",\n    \"y\" \u001b[31m[1]\u001b[0m: NaN\n  }\n}\n\u001b[31m\n[1] \"y\" must be a number of milliseconds or valid date string\u001b[0m');
        });

        it("pinpoints an error in a stringified JSON object", async () => {

            const object = {
                a: '{"c":"string"}'
            };

            const schema = {
                a: model.object({
                    b: model.string()
                })
            };

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "a" fails because ["c" is not allowed]');
            expect(err.details).to.eql([{
                message: '"c" is not allowed',
                path: ["a", "c"],
                type: "object.allowUnknown",
                context: { child: "c", label: "c", key: "c" }
            }]);
            expect(err.annotate(true)).to.equal('{\n  \"a\" [1]: \"{\\\"c\\\":\\\"string\\\"}\"\n}\n\n[1] \"c\" is not allowed');
        });

        it("pinpoints several errors in a stringified JSON object", async () => {

            const object = {
                a: '{"b":-1.5}'
            };

            const schema = {
                a: model.object({
                    b: model.number().integer().positive()
                })
            };

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "a" fails because [child "b" fails because ["b" must be an integer, "b" must be a positive number]]');
            expect(err.details).to.eql([
                {
                    message: '"b" must be an integer',
                    path: ["a", "b"],
                    type: "number.integer",
                    context: { value: -1.5, label: "b", key: "b" }
                },
                {
                    message: '"b" must be a positive number',
                    path: ["a", "b"],
                    type: "number.positive",
                    context: { value: -1.5, label: "b", key: "b" }
                }
            ]);
            expect(err.annotate(true)).to.equal('{\n  "a" [1, 2]: "{\\"b\\":-1.5}"\n}\n\n[1] "b" must be an integer\n[2] "b" must be a positive number');
        });

        it("pinpoints an error in a stringified JSON object (deep)", async () => {

            const object = {
                a: '{"b":{"c":{"d":1}}}'
            };

            const schema = model.object({
                a: model.object({
                    b: model.object({
                        c: {
                            d: model.string()
                        }
                    })
                })
            });

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "a" fails because [child "b" fails because [child "c" fails because [child "d" fails because ["d" must be a string]]]]');
            expect(err.details).to.eql([{
                message: '"d" must be a string',
                path: ["a", "b", "c", "d"],
                type: "string.base",
                context: { value: 1, label: "d", key: "d" }
            }]);
            expect(err.annotate(true)).to.equal('{\n  "a" [1]: "{\\"b\\":{\\"c\\":{\\"d\\":1}}}"\n}\n\n[1] "d" must be a string');
        });

        it("handles child to uncle relationship inside a child", async () => {

            const object = {
                response: {
                    options: {
                        stripUnknown: true
                    }
                }
            };

            const schema = model.object({
                response: model.object({
                    modify: model.boolean(),
                    options: model.object()
                })
                    .assert("options.stripUnknown", model.ref("modify"), "meet requirement of having peer modify set to true")
            });

            const err = await assert.throws(async () => model.validate(object, schema, { abortEarly: false }));
            assert.instanceOf(err, Error, 'child "response" fails because ["options.stripUnknown" validation failed because "options.stripUnknown" failed to meet requirement of having peer modify set to true]');
            expect(err.details).to.eql([{
                message: '"options.stripUnknown" validation failed because "options.stripUnknown" failed to meet requirement of having peer modify set to true',
                path: ["options", "stripUnknown"],
                type: "object.assert",
                context: {
                    ref: "options.stripUnknown",
                    message: "meet requirement of having peer modify set to true",
                    label: "stripUnknown",
                    key: "stripUnknown"
                }
            }]);
            expect(() => {

                err.annotate(true);
            }).to.not.throw();
        });
    });
});
