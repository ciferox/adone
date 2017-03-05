const { types, parse } = adone.js.compiler;

describe("cloning", function () {
    describe("clone", function () {
        it("should handle undefined", function () {
            let node = undefined;
            let cloned = types.clone(node);
            assert(cloned === undefined);
        });

        it("should handle null", function () {
            let node = null;
            let cloned = types.clone(node);
            assert(cloned === null);
        });

        it("should handle simple cases", function () {
            let node = types.arrayExpression([null, types.identifier("a")]);
            let cloned = types.clone(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });
    });

    describe("cloneDeep", function () {
        it("should handle undefined", function () {
            let node = undefined;
            let cloned = types.cloneDeep(node);
            assert(cloned === undefined);
        });

        it("should handle null", function () {
            let node = null;
            let cloned = types.cloneDeep(node);
            assert(cloned === null);
        });

        it("should handle simple cases", function () {
            let node = types.arrayExpression([null, types.identifier("a")]);
            let cloned = types.cloneDeep(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });

        it("should handle full programs", function () {
            let node = parse("1 + 1");
            let cloned = types.cloneDeep(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });

        it("should handle complex programs", function () {
            let program = "'use strict'; function lol() { wow();return 1; }";
            let node = parse(program);
            let cloned = types.cloneDeep(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });

        it("should handle missing array element", function () {
            let node = parse("[,0]");
            let cloned = types.cloneDeep(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });
    });
});
