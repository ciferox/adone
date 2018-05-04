const Helper = require("../helper");

const {
    model
} = adone;

describe("binary", () => {

    it("can be called on its own", () => {

        const binary = model.binary;
        expect(() => binary()).to.throw("Must be invoked on a Joi instance.");
    });

    it("should throw an exception if arguments were passed.", () => {

        expect(
            () => model.binary("invalid argument.")
        ).to.throw("model.binary() does not allow arguments.");
    });

    it("converts a string to a buffer", async () => {

        const value = await model.binary().validate("test");
        expect(value instanceof Buffer).to.equal(true);
        expect(value.length).to.equal(4);
        expect(value.toString("utf8")).to.equal("test");
    });

    it("validates allowed buffer content", () => {

        const hello = Buffer.from("hello");
        const schema = model.binary().valid(hello);

        Helper.validate(schema, [
            ["hello", true],
            [hello, true],
            [Buffer.from("hello"), true],
            ["goodbye", false, null, {
                message: '"value" must be one of [hello]',
                details: [{
                    message: '"value" must be one of [hello]',
                    path: [],
                    type: "any.allowOnly",
                    context: { valids: [hello], label: "value", key: undefined }
                }]
            }],
            [Buffer.from("goodbye"), false, null, {
                message: '"value" must be one of [hello]',
                details: [{
                    message: '"value" must be one of [hello]',
                    path: [],
                    type: "any.allowOnly",
                    context: { valids: [hello], label: "value", key: undefined }
                }]
            }],
            [Buffer.from("HELLO"), false, null, {
                message: '"value" must be one of [hello]',
                details: [{
                    message: '"value" must be one of [hello]',
                    path: [],
                    type: "any.allowOnly",
                    context: { valids: [hello], label: "value", key: undefined }
                }]
            }]
        ]);
    });

    describe("validate()", () => {

        it("returns an error when a non-buffer or non-string is used", async () => {

            const err = await assert.throws(async () => model.binary().validate(5));
            expect(err.details).to.eql([{
                message: '"value" must be a buffer or a string',
                path: [],
                type: "binary.base",
                context: { label: "value", key: undefined }
            }]);
        });

        it("accepts a buffer object", async () => {

            const value = await model.binary().validate(Buffer.from("hello world"));
            expect(value.toString("utf8")).to.equal("hello world");
        });
    });

    describe("encoding()", () => {

        it("applies encoding", async () => {

            const schema = model.binary().encoding("base64");
            const input = Buffer.from("abcdef");
            const value = await schema.validate(input.toString("base64"));
            expect(value instanceof Buffer).to.equal(true);
            expect(value.toString()).to.equal("abcdef");
        });

        it("throws when encoding is invalid", () => {

            expect(() => {

                model.binary().encoding("base6");
            }).to.throw("Invalid encoding: base6");
        });

        it("avoids unnecessary cloning when called twice", () => {

            const schema = model.binary().encoding("base64");
            expect(schema.encoding("base64")).to.equal(schema);
        });
    });

    describe("min()", () => {

        it("validates buffer size", () => {

            const schema = model.binary().min(5);
            Helper.validate(schema, [
                [Buffer.from("testing"), true],
                [Buffer.from("test"), false, null, {
                    message: '"value" must be at least 5 bytes',
                    details: [{
                        message: '"value" must be at least 5 bytes',
                        path: [],
                        type: "binary.min",
                        context: { limit: 5, value: Buffer.from("test"), label: "value", key: undefined }
                    }]
                }]
            ]);
        });

        it("throws when min is not a number", () => {

            expect(() => {

                model.binary().min("a");
            }).to.throw("limit must be a positive integer");
        });

        it("throws when min is not an integer", () => {

            expect(() => {

                model.binary().min(1.2);
            }).to.throw("limit must be a positive integer");
        });
    });

    describe("max()", () => {

        it("validates buffer size", () => {

            const schema = model.binary().max(5);
            Helper.validate(schema, [
                [Buffer.from("testing"), false, null, {
                    message: '"value" must be less than or equal to 5 bytes',
                    details: [{
                        message: '"value" must be less than or equal to 5 bytes',
                        path: [],
                        type: "binary.max",
                        context: {
                            limit: 5,
                            value: Buffer.from("testing"),
                            label: "value",
                            key: undefined
                        }
                    }]
                }],
                [Buffer.from("test"), true]
            ]);
        });

        it("throws when max is not a number", () => {

            expect(() => {

                model.binary().max("a");
            }).to.throw("limit must be a positive integer");
        });

        it("throws when max is not an integer", () => {
            expect(() => {
                model.binary().max(1.2);
            }).to.throw("limit must be a positive integer");
        });
    });

    describe("length()", () => {

        it("validates buffer size", () => {
            const schema = model.binary().length(4);
            Helper.validate(schema, [
                [Buffer.from("test"), true],
                [Buffer.from("testing"), false, null, {
                    message: '"value" must be 4 bytes',
                    details: [{
                        message: '"value" must be 4 bytes',
                        path: [],
                        type: "binary.length",
                        context: {
                            limit: 4,
                            value: Buffer.from("testing"),
                            label: "value",
                            key: undefined
                        }
                    }]
                }]
            ]);
        });

        it("throws when length is not a number", () => {
            expect(() => {
                model.binary().length("a");
            }).to.throw("limit must be a positive integer");
        });

        it("throws when length is not an integer", () => {
            expect(() => {
                model.binary().length(1.2);
            }).to.throw("limit must be a positive integer");
        });
    });
});
