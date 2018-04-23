const Helper = require("../helper");

const {
    model
} = adone;

const { Lazy } = adone.private(adone.model);

describe("lazy", () => {

    describe("set()", () => {

        it("should require a function", () => {
            expect(() => model.lazy()).to.throw("You must provide a function as first argument");
            expect(() => model.lazy(true)).to.throw("You must provide a function as first argument");
        });

        it("should validate a schema is set", async () => {
            const schema = Lazy;
            const err = await assert.throws(async () => schema.validate("bar"));
            expect(err.details).to.eql([{
                message: "schema error: lazy schema must be set",
                path: [],
                type: "lazy.base",
                context: { label: "value", key: undefined }
            }]);
        });

        it("should validate a schema is returned", async () => {
            const schema = model.lazy(() => true, "foo");
            const err = await assert.throws(async () => schema.validate("bar"));
            expect(err.details).to.eql([{
                message: "schema error: lazy schema function must return a schema",
                path: [],
                type: "lazy.schema",
                context: { label: "value", key: undefined }
            }]);
        });

    });

    describe("validate()", () => {

        it("should validate a recursive schema", () => {

            const schema = model.object({
                name: model.string().required(),
                children: model.array().items(model.lazy(() => schema))
            });

            Helper.validate(schema, [
                [{ name: "foo" }, true],
                [{ name: "foo", children: [] }, true],
                [{ name: "foo", children: [{ name: "bar" }] }, true],
                [{ name: "foo", children: [{ name: "bar", children: [{ name: "baz" }] }] }, true],
                [{ name: "foo", children: [{ name: "bar", children: [{ name: "baz", children: [{ name: "qux" }] }] }] }, true],
                [{ name: "foo", children: [{ name: "bar", children: [{ name: "baz", children: [{ name: 42 }] }] }] }, false, null, {
                    message: 'child "children" fails because ["children" at position 0 fails because [child "children" fails because ["children" at position 0 fails because [child "children" fails because ["children" at position 0 fails because [child "name" fails because ["name" must be a string]]]]]]]',
                    details: [{
                        message: '"name" must be a string',
                        path: ["children", 0, "children", 0, "children", 0, "name"],
                        type: "string.base",
                        context: { value: 42, label: "name", key: "name" }
                    }]
                }]
            ]);
        });
    });

    describe("describe()", () => {

        it("should be able to describe with description", () => {

            const schema = model.object({
                name: model.string().required(),
                children: model.array().items(model.lazy(() => schema).description("person"))
            });

            expect(schema.describe()).to.eql({
                type: "object",
                children: {
                    children: {
                        type: "array",
                        flags: {
                            sparse: false
                        },
                        items: [
                            {
                                type: "lazy",
                                description: "person",
                                flags: {}
                            }
                        ]
                    },
                    name: {
                        type: "string",
                        flags: { presence: "required" },
                        invalids: [""]
                    }
                }
            });
        });

    });
});
