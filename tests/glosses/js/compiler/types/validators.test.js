let assert = require("assert");
const { types, parse } = adone.js.compiler;

describe("validators", function () {
    describe("isNodesEquivalent", function () {
        it("should handle simple cases", function () {
            let mem = types.memberExpression(types.identifier("a"), types.identifier("b"));
            assert(types.isNodesEquivalent(mem, mem) === true);

            let mem2 = types.memberExpression(types.identifier("a"), types.identifier("c"));
            assert(types.isNodesEquivalent(mem, mem2) === false);
        });

        it("should handle full programs", function () {
            assert(types.isNodesEquivalent(parse("1 + 1"), parse("1+1")) === true);
            assert(types.isNodesEquivalent(parse("1 + 1"), parse("1+2")) === false);
        });

        it("should handle complex programs", function () {
            let program = "'use strict'; function lol() { wow();return 1; }";

            assert(types.isNodesEquivalent(parse(program), parse(program)) === true);

            let program2 = "'use strict'; function lol() { wow();return -1; }";

            assert(types.isNodesEquivalent(parse(program), parse(program2)) === false);
        });
    });
});
