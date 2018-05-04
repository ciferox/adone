const Helper = require("../helper");

const {
    is,
    model
} = adone;

describe("func", () => {

    it("can be called on its own", () => {
        const func = model.func;
        expect(() => func()).to.throw("Must be invoked on a Joi instance.");
    });

    it("should throw an exception if arguments were passed.", () => {
        expect(
            () => model.func("invalid argument.")
        ).to.throw("model.func() does not allow arguments.");
    });

    it("validates a function", () => {
        Helper.validate(model.func().required(), [
            [function () { }, true],
            ["", false, null, {
                message: '"value" must be a Function',
                details: [{
                    message: '"value" must be a Function',
                    path: [],
                    type: "function.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("validates a function arity", () => {
        Helper.validate(model.func().arity(2).required(), [
            [function (a, b) { }, true],
            [function (a, b, c) { }, false, null, {
                message: '"value" must have an arity of 2',
                details: [{
                    message: '"value" must have an arity of 2',
                    path: [],
                    type: "function.arity",
                    context: { n: 2, label: "value", key: undefined }
                }]
            }],
            [function (a) { }, false, null, {
                message: '"value" must have an arity of 2',
                details: [{
                    message: '"value" must have an arity of 2',
                    path: [],
                    type: "function.arity",
                    context: { n: 2, label: "value", key: undefined }
                }]
            }],
            [(a, b) => { }, true],
            [(a, b, c) => { }, false, null, {
                message: '"value" must have an arity of 2',
                details: [{
                    message: '"value" must have an arity of 2',
                    path: [],
                    type: "function.arity",
                    context: { n: 2, label: "value", key: undefined }
                }]
            }],
            [(a) => { }, false, null, {
                message: '"value" must have an arity of 2',
                details: [{
                    message: '"value" must have an arity of 2',
                    path: [],
                    type: "function.arity",
                    context: { n: 2, label: "value", key: undefined }
                }]
            }],
            ["", false, null, {
                message: '"value" must be a Function',
                details: [{
                    message: '"value" must be a Function',
                    path: [],
                    type: "function.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("validates a function arity unless values are illegal", () => {

        const schemaWithStringArity = function () {

            return model.func().arity("deux");
        };

        const schemaWithNegativeArity = function () {

            return model.func().arity(-2);
        };

        expect(schemaWithStringArity).to.throw(Error, "n must be a positive integer");
        expect(schemaWithNegativeArity).to.throw(Error, "n must be a positive integer");
    });

    it("validates a function min arity", () => {

        Helper.validate(model.func().minArity(2).required(), [
            [function (a, b) { }, true],
            [function (a, b, c) { }, true],
            [function (a) { }, false, null, {
                message: '"value" must have an arity greater or equal to 2',
                details: [{
                    message: '"value" must have an arity greater or equal to 2',
                    path: [],
                    type: "function.minArity",
                    context: { n: 2, label: "value", key: undefined }
                }]
            }],
            [(a, b) => { }, true],
            [(a, b, c) => { }, true],
            [(a) => { }, false, null, {
                message: '"value" must have an arity greater or equal to 2',
                details: [{
                    message: '"value" must have an arity greater or equal to 2',
                    path: [],
                    type: "function.minArity",
                    context: { n: 2, label: "value", key: undefined }
                }]
            }],
            ["", false, null, {
                message: '"value" must be a Function',
                details: [{
                    message: '"value" must be a Function',
                    path: [],
                    type: "function.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("validates a function arity unless values are illegal", () => {

        const schemaWithStringMinArity = function () {

            return model.func().minArity("deux");
        };

        const schemaWithNegativeMinArity = function () {

            return model.func().minArity(-2);
        };

        const schemaWithZeroArity = function () {

            return model.func().minArity(0);
        };

        expect(schemaWithStringMinArity).to.throw(Error, "n must be a strict positive integer");
        expect(schemaWithNegativeMinArity).to.throw(Error, "n must be a strict positive integer");
        expect(schemaWithZeroArity).to.throw(Error, "n must be a strict positive integer");
    });

    it("validates a function max arity", () => {

        Helper.validate(model.func().maxArity(2).required(), [
            [function (a, b) { }, true],
            [function (a, b, c) { }, false, null, {
                message: '"value" must have an arity lesser or equal to 2',
                details: [{
                    message: '"value" must have an arity lesser or equal to 2',
                    path: [],
                    type: "function.maxArity",
                    context: { n: 2, label: "value", key: undefined }
                }]
            }],
            [function (a) { }, true],
            [(a, b) => { }, true],
            [(a, b, c) => { }, false, null, {
                message: '"value" must have an arity lesser or equal to 2',
                details: [{
                    message: '"value" must have an arity lesser or equal to 2',
                    path: [],
                    type: "function.maxArity",
                    context: { n: 2, label: "value", key: undefined }
                }]
            }],
            [(a) => { }, true],
            ["", false, null, {
                message: '"value" must be a Function',
                details: [{
                    message: '"value" must be a Function',
                    path: [],
                    type: "function.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("validates a function arity unless values are illegal", () => {

        const schemaWithStringMaxArity = function () {

            return model.func().maxArity("deux");
        };

        const schemaWithNegativeMaxArity = function () {

            return model.func().maxArity(-2);
        };
        expect(schemaWithStringMaxArity).to.throw("n must be a positive integer");
        expect(schemaWithNegativeMaxArity).to.throw("n must be a positive integer");
    });

    it("validates a function with keys", () => {

        const a = function () { };
        a.a = "abc";

        const b = function () { };
        b.a = 123;

        Helper.validate(model.func().keys({ a: model.string().required() }).required(), [
            [function () { }, false, null, {
                message: 'child "a" fails because ["a" is required]',
                details: [{
                    message: '"a" is required',
                    path: ["a"],
                    type: "any.required",
                    context: { label: "a", key: "a" }
                }]
            }],
            [a, true],
            [b, false, null, {
                message: 'child "a" fails because ["a" must be a string]',
                details: [{
                    message: '"a" must be a string',
                    path: ["a"],
                    type: "string.base",
                    context: { value: 123, label: "a", key: "a" }
                }]
            }],
            ["", false, null, {
                message: '"value" must be a Function',
                details: [{
                    message: '"value" must be a Function',
                    path: [],
                    type: "function.base",
                    context: { label: "value", key: undefined }
                }]
            }]
        ]);
    });

    it("keeps validated value as a function", async () => {

        const schema = model.func().keys({ a: model.number() });

        const b = "abc";
        const value = function () {

            return b;
        };

        value.a = "123";

        const validated = await schema.validate(value);
        assert.true(is.function(validated));
        expect(validated()).to.equal("abc");
        expect(validated).to.not.equal(value);
    });

    it("retains validated value prototype", async () => {

        const schema = model.func().keys({ a: model.number() });

        const value = function () {

            this.x = "o";
        };

        value.prototype.get = function () {

            return this.x;
        };

        const validated = await schema.validate(value);
        assert.true(is.function(validated));
        const p = new validated();
        expect(p.get()).to.equal("o");
        expect(validated).to.not.equal(value);
    });

    it("keeps validated value as a function (no clone)", async () => {

        const schema = model.func();

        const b = "abc";
        const value = function () {

            return b;
        };

        value.a = "123";

        const validated = await schema.validate(value);
        assert.true(is.function(validated));
        expect(validated()).to.equal("abc");
        expect(validated).to.equal(value);
    });

    it("validates references", () => {

        const schema = model.func().ref();

        Helper.validate(schema, [
            [() => { }, false, null, {  
                message: '"value" must be a Joi reference',
                details: [{
                    message: '"value" must be a Joi reference',
                    path: [],
                    type: "function.ref",
                    context: { label: "value", key: undefined }
                }]
            }],
            [{}, false, null, {
                message: '"value" must be a Function',
                details: [{
                    message: '"value" must be a Function',
                    path: [],
                    type: "function.base",
                    context: { label: "value", key: undefined }
                }]
            }],
            [model.ref("a.b"), true]
        ]);
    });
});

describe("func().class()", () => {

    it("should differentiate between classes and functions", () => {

        const classSchema = model.object({
            _class: model.func().class()
        });

        const testFunc = function () { };
        const testClass = class MyClass { };

        Helper.validate(classSchema, [
            [{ _class: testClass }, true],
            [{ _class: testFunc }, false, null, {
                message: 'child "_class" fails because ["_class" must be a class]',
                details: [{
                    message: '"_class" must be a class',
                    path: ["_class"],
                    type: "function.class",
                    context: { key: "_class", label: "_class" }
                }]
            }]
        ]);
    });

    it("refuses class look-alikes and bad values", () => {

        const classSchema = model.object({
            _class: model.func().class()
        });

        Helper.validate(classSchema, [
            [{ _class: ["class "] }, false, null, {
                message: 'child "_class" fails because ["_class" must be a Function]',
                details: [{
                    message: '"_class" must be a Function',
                    path: ["_class"],
                    type: "function.base",
                    context: { key: "_class", label: "_class" }
                }]
            }],
            [{ _class: null }, false, null, {
                message: 'child "_class" fails because ["_class" must be a Function]',
                details: [{
                    message: '"_class" must be a Function',
                    path: ["_class"],
                    type: "function.base",
                    context: { key: "_class", label: "_class" }
                }]
            }]
        ]);
    });
});
