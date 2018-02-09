const {
    is,
    js: { compiler: { types: t, parse } }
} = adone;

describe("js", "compiler", "types", "cloning", () => {
    it("should handle undefined", () => {
        const node = undefined;
        const cloned = t.cloneNode(node);
        assert(is.undefined(cloned));
    });

    it("should handle null", () => {
        const node = null;
        const cloned = t.cloneNode(node);
        assert(is.null(cloned));
    });

    it("should handle simple cases", () => {
        const node = t.identifier("a");
        const cloned = t.cloneNode(node);
        assert(node !== cloned);
        assert(t.isNodesEquivalent(node, cloned) === true);
    });

    it("should handle full programs", () => {
        const file = parse("1 + 1");
        const cloned = t.cloneNode(file);
        assert(file !== cloned);
        assert(
            file.program.body[0].expression.right !==
            cloned.program.body[0].expression.right,
        );
        assert(
            file.program.body[0].expression.left !==
            cloned.program.body[0].expression.left,
        );
        assert(t.isNodesEquivalent(file, cloned) === true);
    });

    it("should handle complex programs", () => {
        const program = "'use strict'; function lol() { wow();return 1; }";
        const node = parse(program);
        const cloned = t.cloneNode(node);
        assert(node !== cloned);
        assert(t.isNodesEquivalent(node, cloned) === true);
    });

    it("should handle missing array element", () => {
        const node = parse("[,0]");
        const cloned = t.cloneNode(node);
        assert(node !== cloned);
        assert(t.isNodesEquivalent(node, cloned) === true);
    });

    it("should support shallow cloning", () => {
        const node = t.memberExpression(t.identifier("foo"), t.identifier("bar"));
        const cloned = t.cloneNode(node, /* deep */ false);
        assert.notStrictEqual(node, cloned);
        assert.strictEqual(node.object, cloned.object);
        assert.strictEqual(node.property, cloned.property);
    });
});
