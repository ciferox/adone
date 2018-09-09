const {
    js: { compiler: { types: t, parse } }
} = adone;

describe("js", "compiler", "types", "cloning", () => {
    it("should handle undefined", () => {
        const node = undefined;
        const cloned = t.cloneNode(node);
        expect(cloned).to.undefined();
    });

    it("should handle null", () => {
        const node = null;
        const cloned = t.cloneNode(node);
        expect(cloned).to.null();
    });

    it("should handle simple cases", () => {
        const node = t.identifier("a");
        const cloned = t.cloneNode(node);
        expect(node).not.equal(cloned);
        expect(t.isNodesEquivalent(node, cloned)).to.equal(true);
    });

    it("should handle full programs", () => {
        const file = parse("1 + 1");
        const cloned = t.cloneNode(file);
        expect(file).not.equal(cloned);
        expect(file.program.body[0].expression.right).not.equal(
            cloned.program.body[0].expression.right,
        );
        expect(file.program.body[0].expression.left).not.equal(
            cloned.program.body[0].expression.left,
        );
        expect(t.isNodesEquivalent(file, cloned)).to.equal(true);
    });

    it("should handle complex programs", () => {
        const program = "'use strict'; function lol() { wow();return 1; }";
        const node = parse(program);
        const cloned = t.cloneNode(node);
        expect(node).not.equal(cloned);
        expect(t.isNodesEquivalent(node, cloned)).to.equal(true);
    });

    it("should handle missing array element", () => {
        const node = parse("[,0]");
        const cloned = t.cloneNode(node);
        expect(node).not.equal(cloned);
        expect(t.isNodesEquivalent(node, cloned)).to.equal(true);
    });

    it("should support shallow cloning", () => {
        const node = t.memberExpression(t.identifier("foo"), t.identifier("bar"));
        const cloned = t.cloneNode(node, /* deep */ false);
        expect(node).not.equal(cloned);
        expect(node.object).to.equal(cloned.object);
        expect(node.property).to.equal(cloned.property);
    });
});
