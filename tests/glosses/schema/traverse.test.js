import { schema, expectedCalls } from "./fixtures/schema";

describe("schema", "traverse", () => {
    const { schema: { traverse } } = adone;

    let calls;

    beforeEach(() => {
        calls = [];
    });

    it("should traverse all keywords containing schemas recursively", () => {
        traverse(schema, callback);
        assert.deepStrictEqual(calls, expectedCalls);
    });


    describe("allKeys option", () => {
        const schema = {
            someObject: {
                minimum: 1,
                maximum: 2
            }
        };

        it("should traverse objects with allKeys: true option", () => {
            // schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex
            const expectedCalls = [
                [schema, "", schema, undefined, undefined, undefined, undefined],
                [schema.someObject, "/someObject", schema, "", "someObject", schema, undefined]
            ];

            traverse(schema, { allKeys: true }, callback);
            assert.deepStrictEqual(calls, expectedCalls);
        });


        it("should NOT traverse objects with allKeys: false option", () => {
            // schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex
            const expectedCalls = [
                [schema, "", schema, undefined, undefined, undefined, undefined]
            ];

            traverse(schema, { allKeys: false }, callback);
            assert.deepStrictEqual(calls, expectedCalls);
        });


        it("should NOT traverse objects without allKeys option", () => {
            // schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex
            const expectedCalls = [
                [schema, "", schema, undefined, undefined, undefined, undefined]
            ];

            traverse(schema, callback);
            assert.deepStrictEqual(calls, expectedCalls);
        });


        it("should NOT travers objects in standard keywords which value is not a schema", () => {
            const schema2 = {
                const: { foo: "bar" },
                enum: ["a", "b"],
                required: ["foo"],
                another: {

                },
                patternProperties: {}, // will not traverse - no properties
                dependencies: true, // will not traverse - invalid
                properties: {
                    smaller: {
                        type: "number"
                    },
                    larger: {
                        type: "number",
                        minimum: { $data: "1/smaller" }
                    }
                }
            };

            // schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex
            const expectedCalls = [
                [schema2, "", schema2, undefined, undefined, undefined, undefined],
                [schema2.another, "/another", schema2, "", "another", schema2, undefined],
                [schema2.properties.smaller, "/properties/smaller", schema2, "", "properties", schema2, "smaller"],
                [schema2.properties.larger, "/properties/larger", schema2, "", "properties", schema2, "larger"]
            ];

            traverse(schema2, { allKeys: true }, callback);
            assert.deepStrictEqual(calls, expectedCalls);
        });
    });


    function callback() {
        calls.push(Array.prototype.slice.call(arguments));
    }
});
