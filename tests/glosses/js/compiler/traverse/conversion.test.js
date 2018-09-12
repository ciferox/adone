const {
    js: { compiler: { types: t, generate, parse, traverse } }
} = adone;

const getPath = function (code) {
    const ast = parse(code);
    let path;
    traverse(ast, {
        Program(_path) {
            path = _path.get("body.0");
            _path.stop();
        }
    });

    return path;
};

const generateCode = function (path) {
    return generate(path.parentPath.node).code;
};

describe("js", "compiler", "traverse", "conversion", () => {
    describe("ensureBlock", () => {
        it("throws converting node without body to block", () => {
            const rootPath = getPath("true;");

            expect(() => {
                rootPath.ensureBlock();
            }).throw();
        });

        it("throws converting already block array", () => {
            const rootPath = getPath("function test() { true; }").get("body");
            expect(() => {
                rootPath.ensureBlock();
            }).throw();
        });

        it("converts arrow function with expression body to block", () => {
            const rootPath = getPath("() => true").get("expression");
            rootPath.ensureBlock();
            expect(generateCode(rootPath)).to.equal("() => {\n  return true;\n};");
        });

        it("preserves arrow function body's context", () => {
            const rootPath = getPath("() => true").get("expression");
            const body = rootPath.get("body");
            rootPath.ensureBlock();
            body.replaceWith(t.booleanLiteral(false));
            expect(generateCode(rootPath)).to.equal("() => {\n  return false;\n};");
        });

        it("converts for loop with statement body to block", () => {
            const rootPath = getPath("for (;;) true;");
            rootPath.ensureBlock();
            expect(generateCode(rootPath)).to.equal("for (;;) {\n  true;\n}");
        });

        it("preserves for loop body's context", () => {
            const rootPath = getPath("for (;;) true;");
            const body = rootPath.get("body");
            rootPath.ensureBlock();
            body.replaceWith(t.booleanLiteral(false));
            expect(generateCode(rootPath)).to.equal("for (;;) {\n  false;\n}");
        });
    });
});
