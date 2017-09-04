const {
    js: { compiler: { parse, generate, traverse, types: t } }
} = adone;

const getPath = (code) => {
    const ast = parse(code);
    let path;
    traverse(ast, {
        Program(_path) {
            path = _path;
            _path.stop();
        }
    });

    return path;
};

const generateCode = (path) => generate(path.node).code;

describe("js", "compiler", "traverse", "modification", () => {
    describe("pushContainer", () => {
        it("pushes identifier into params", () => {
            const rootPath = getPath("function test(a) {}");
            const path = rootPath.get("body.0");
            path.pushContainer("params", t.identifier("b"));

            assert.equal(generateCode(rootPath), "function test(a, b) {}");
        });

        it("pushes identifier into block", () => {
            const rootPath = getPath("function test(a) {}");
            const path = rootPath.get("body.0.body");
            path.pushContainer("body", t.expressionStatement(t.identifier("b")));

            assert.equal(generateCode(rootPath), "function test(a) {\n  b;\n}");
        });
    });
    describe("unshiftContainer", () => {
        it("unshifts identifier into params", () => {
            const rootPath = getPath("function test(a) {}");
            const path = rootPath.get("body.0");
            path.unshiftContainer("params", t.identifier("b"));

            assert.equal(generateCode(rootPath), "function test(b, a) {}");
        });

        it("unshifts identifier into block", () => {
            const rootPath = getPath("function test(a) {}");
            const path = rootPath.get("body.0.body");
            path.unshiftContainer("body", t.expressionStatement(t.identifier("b")));

            assert.equal(generateCode(rootPath), "function test(a) {\n  b;\n}");
        });
    });
});
