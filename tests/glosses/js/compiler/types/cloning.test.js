const { types, parse } = adone.js.compiler;

describe("cloning", () => {
    describe("clone", () => {
        it("should handle undefined", () => {
            const node = undefined;
            const cloned = types.clone(node);
            assert(cloned === undefined);
        });

        it("should handle null", () => {
            const node = null;
            const cloned = types.clone(node);
            assert(cloned === null);
        });

        it("should handle simple cases", () => {
            const node = types.arrayExpression([null, types.identifier("a")]);
            const cloned = types.clone(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });
    });

    describe("cloneDeep", () => {
        it("should handle undefined", () => {
            const node = undefined;
            const cloned = types.cloneDeep(node);
            assert(cloned === undefined);
        });

        it("should handle null", () => {
            const node = null;
            const cloned = types.cloneDeep(node);
            assert(cloned === null);
        });

        it("should handle simple cases", () => {
            const node = types.arrayExpression([null, types.identifier("a")]);
            const cloned = types.cloneDeep(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });

        it("should handle full programs", () => {
            const node = parse("1 + 1");
            const cloned = types.cloneDeep(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });

        it("should handle complex programs", () => {
            const program = "'use strict'; function lol() { wow();return 1; }";
            const node = parse(program);
            const cloned = types.cloneDeep(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });

        it("should handle missing array element", () => {
            const node = parse("[,0]");
            const cloned = types.cloneDeep(node);
            assert(node !== cloned);
            assert(types.isNodesEquivalent(node, cloned) === true);
        });
    });
});
