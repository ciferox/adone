const { types, parse } = adone.js.compiler;

describe("validators", () => {
    describe("isNodesEquivalent", () => {
        it("should handle simple cases", () => {
            const mem = types.memberExpression(types.identifier("a"), types.identifier("b"));
            assert(types.isNodesEquivalent(mem, mem) === true);

            const mem2 = types.memberExpression(types.identifier("a"), types.identifier("c"));
            assert(types.isNodesEquivalent(mem, mem2) === false);
        });

        it("should handle full programs", () => {
            assert(types.isNodesEquivalent(parse("1 + 1"), parse("1+1")) === true);
            assert(types.isNodesEquivalent(parse("1 + 1"), parse("1+2")) === false);
        });

        it("should handle complex programs", () => {
            const program = "'use strict'; function lol() { wow();return 1; }";

            assert(types.isNodesEquivalent(parse(program), parse(program)) === true);

            const program2 = "'use strict'; function lol() { wow();return -1; }";

            assert(types.isNodesEquivalent(parse(program), parse(program2)) === false);
        });
    });
});
