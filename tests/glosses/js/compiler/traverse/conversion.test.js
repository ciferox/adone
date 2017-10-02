
const {
    js: { compiler: { types: t, generate, parse, traverse } }
} = adone;

const getPath = (code) => {
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

const generateCode = (path) => generate(path.parentPath.node).code;

describe("conversion", () => {
    describe("ensureBlock", () => {
        it("throws converting node without body to block", () => {
            const rootPath = getPath("true;");

            assert.throws(() => {
                rootPath.ensureBlock();
            }, /Can't convert node without a body/);
        });

        it("throws converting already block array", () => {
            const rootPath = getPath("function test() { true; }").get("body");
            assert.throws(() => {
                rootPath.ensureBlock();
            }, /Can't convert array path to a block statement/);
        });

        it("converts arrow function with expression body to block", () => {
            const rootPath = getPath("() => true").get("expression");
            rootPath.ensureBlock();
            assert.equal(generateCode(rootPath), "() => {\n  return true;\n};");
        });

        it("preserves arrow function body's context", () => {
            const rootPath = getPath("() => true").get("expression");
            const body = rootPath.get("body");
            rootPath.ensureBlock();
            body.replaceWith(t.booleanLiteral(false));
            assert.equal(generateCode(rootPath), "() => {\n  return false;\n};");
        });

        it("converts for loop with statement body to block", () => {
            const rootPath = getPath("for (;;) true;");
            rootPath.ensureBlock();
            assert.equal(generateCode(rootPath), "for (;;) {\n  true;\n}");
        });

        it("preserves for loop body's context", () => {
            const rootPath = getPath("for (;;) true;");
            const body = rootPath.get("body");
            rootPath.ensureBlock();
            body.replaceWith(t.booleanLiteral(false));
            assert.equal(generateCode(rootPath), "for (;;) {\n  false;\n}");
        });
    });
});
