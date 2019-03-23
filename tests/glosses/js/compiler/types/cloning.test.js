const {
    js: { parse, compiler: { types: t } }
} = adone;

describe("cloneNode", () => {
    it("should handle undefined", () => {
        const node = undefined;
        const cloned = t.cloneNode(node);
        expect(cloned).to.be.undefined;
    });

    it("should handle null", () => {
        const node = null;
        const cloned = t.cloneNode(node);
        expect(cloned).to.be.null;
    });

    it("should handle simple cases", () => {
        const node = t.identifier("a");
        const cloned = t.cloneNode(node);
        expect(node).not.to.be.equal(cloned);
        expect(t.isNodesEquivalent(node, cloned)).to.be.equal(true);
    });

    it("should handle full programs", () => {
        const file = parse("1 + 1");
        const cloned = t.cloneNode(file);
        expect(file).not.to.be.equal(cloned);
        expect(file.program.body[0].expression.right).not.to.be.equal(
            cloned.program.body[0].expression.right,
        );
        expect(file.program.body[0].expression.left).not.to.be.equal(
            cloned.program.body[0].expression.left,
        );
        expect(t.isNodesEquivalent(file, cloned)).to.be.equal(true);
    });

    it("should handle complex programs", () => {
        const program = "'use strict'; function lol() { wow();return 1; }";
        const node = parse(program);
        const cloned = t.cloneNode(node);
        expect(node).not.to.be.equal(cloned);
        expect(t.isNodesEquivalent(node, cloned)).to.be.equal(true);
    });

    it("should handle missing array element", () => {
        const node = parse("[,0]");
        const cloned = t.cloneNode(node);
        expect(node).not.to.be.equal(cloned);
        expect(t.isNodesEquivalent(node, cloned)).to.be.equal(true);
    });

    it("should support shallow cloning", () => {
        const node = t.memberExpression(t.identifier("foo"), t.identifier("bar"));
        const cloned = t.cloneNode(node, /* deep */ false);
        expect(node).not.to.be.equal(cloned);
        expect(node.object).to.be.equal(cloned.object);
        expect(node.property).to.be.equal(cloned.property);
    });

    it("should preserve type annotations", () => {
        const node = t.variableDeclaration("let", [
            t.variableDeclarator({
                ...t.identifier("value"),
                typeAnnotation: t.anyTypeAnnotation()
            })
        ]);
        const cloned = t.cloneNode(node, /* deep */ true);
        expect(cloned.declarations[0].id.typeAnnotation).to.eql(
            node.declarations[0].id.typeAnnotation,
        );
        expect(cloned.declarations[0].id.typeAnnotation).not.to.be.equal(
            node.declarations[0].id.typeAnnotation,
        );
    });
});
