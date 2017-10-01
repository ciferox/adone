const { is, util: { braces } } = adone;

describe("util", "braces", ".parse", () => {
    it("should return an AST object", () => {
        const ast = braces.parse("a/{b,c}/d");
        assert(ast);
        assert.equal(typeof ast, "object");
    });

    it("should have an array of nodes", () => {
        const ast = braces.parse("a/{b,c}/d");
        assert(is.array(ast.nodes));
    });
});
