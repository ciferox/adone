const {
    is,
    js: { compiler: { types: t, parse } }
} = adone;

describe("js", "compiler", "types", "cloning", () => {
    describe("clone", () => {
        it("should handle undefined", () => {
            const node = undefined;
            const cloned = t.clone(node);
            assert(is.undefined(cloned));
        });

        it("should handle null", () => {
            const node = null;
            const cloned = t.clone(node);
            assert(is.null(cloned));
        });

        it("should handle simple cases", () => {
            const node = t.arrayExpression([null, t.identifier("a")]);
            const cloned = t.clone(node);
            assert(node !== cloned);
            assert(t.isNodesEquivalent(node, cloned) === true);
        });
    });

    describe("cloneDeep", () => {
        it("should handle undefined", () => {
            const node = undefined;
            const cloned = t.cloneDeep(node);
            assert(is.undefined(cloned));
        });

        it("should handle null", () => {
            const node = null;
            const cloned = t.cloneDeep(node);
            assert(is.null(cloned));
        });

        it("should handle simple cases", () => {
            const node = t.arrayExpression([null, t.identifier("a")]);
            const cloned = t.cloneDeep(node);
            assert(node !== cloned);
            assert(t.isNodesEquivalent(node, cloned) === true);
        });

        it("should handle full programs", () => {
            const node = parse("1 + 1");
            const cloned = t.cloneDeep(node);
            assert(node !== cloned);
            assert(t.isNodesEquivalent(node, cloned) === true);
        });

        it("should handle complex programs", () => {
            const program = "'use strict'; function lol() { wow();return 1; }";
            const node = parse(program);
            const cloned = t.cloneDeep(node);
            assert(node !== cloned);
            assert(t.isNodesEquivalent(node, cloned) === true);
        });

        it("should handle missing array element", () => {
            const node = parse("[,0]");
            const cloned = t.cloneDeep(node);
            assert(node !== cloned);
            assert(t.isNodesEquivalent(node, cloned) === true);
        });
    });
});
