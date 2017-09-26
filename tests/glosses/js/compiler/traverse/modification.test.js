const {
    is,
    js: { compiler: { parse, generate, traverse, types: t } }
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

describe("js", "compiler", "traverse", "modification", () => {
    describe("pushContainer", () => {
        it("pushes identifier into params", () => {
            const rootPath = getPath("function test(a) {}");
            rootPath.pushContainer("params", t.identifier("b"));

            assert.equal(generateCode(rootPath), "function test(a, b) {}");
        });

        it("pushes identifier into block", () => {
            const rootPath = getPath("function test(a) {}");
            const path = rootPath.get("body");
            path.pushContainer("body", t.expressionStatement(t.identifier("b")));

            assert.equal(generateCode(rootPath), "function test(a) {\n  b;\n}");
        });
    });
    describe("unshiftContainer", () => {
        it("unshifts identifier into params", () => {
            const rootPath = getPath("function test(a) {}");
            rootPath.unshiftContainer("params", t.identifier("b"));

            assert.equal(generateCode(rootPath), "function test(b, a) {}");
        });

        it("unshifts identifier into block", () => {
            const rootPath = getPath("function test(a) {}");
            const path = rootPath.get("body");
            path.unshiftContainer("body", t.expressionStatement(t.identifier("b")));

            assert.equal(generateCode(rootPath), "function test(a) {\n  b;\n}");
        });
    });

    describe("insertBefore", () => {
        it("returns inserted path with BlockStatement", () => {
            const rootPath = getPath("if (x) { y; }");
            const path = rootPath.get("consequent.body.0");
            const result = path.insertBefore(t.identifier("b"));

            assert.equal(is.array(result), true);
            assert.equal(result.length, 1);
            assert.deepEqual(result[0].node, t.identifier("b"));
            assert.equal(generateCode(rootPath), "if (x) {\n  b\n  y;\n}");
        });

        it("returns inserted path without BlockStatement", () => {
            const rootPath = getPath("if (x) y;");
            const path = rootPath.get("consequent");
            const result = path.insertBefore(t.identifier("b"));

            assert.equal(is.array(result), true);
            assert.equal(result.length, 1);
            assert.deepEqual(result[0].node, t.identifier("b"));
            assert.equal(generateCode(rootPath), "if (x) {\n  b\n  y;\n}");
        });

        it("returns inserted path without BlockStatement without ExpressionStatement", () => {
            const rootPath = getPath("if (x) for (var i = 0; i < 0; i++) {}");
            const path = rootPath.get("consequent");
            const result = path.insertBefore(t.identifier("b"));

            assert.equal(is.array(result), true);
            assert.equal(result.length, 1);
            assert.deepEqual(result[result.length - 1].node, t.identifier("b"));
            assert.equal(
                generateCode(rootPath),
                "if (x) {\n  b\n\n  for (var i = 0; i < 0; i++) {}\n}",
            );
        });

        it("returns inserted path with BlockStatement without ExpressionStatement", () => {
            const rootPath = getPath("if (x) { for (var i = 0; i < 0; i++) {} }");
            const path = rootPath.get("consequent.body.0");
            const result = path.insertBefore(t.identifier("b"));

            assert.equal(is.array(result), true);
            assert.equal(result.length, 1);
            assert.deepEqual(result[result.length - 1].node, t.identifier("b"));
            assert.equal(
                generateCode(rootPath),
                "if (x) {\n  b\n\n  for (var i = 0; i < 0; i++) {}\n}",
            );
        });
    });

    describe("insertAfter", () => {
        it("returns inserted path with BlockStatement with ExpressionStatement", () => {
            const rootPath = getPath("if (x) { y; }");
            const path = rootPath.get("consequent.body.0");
            const result = path.insertAfter(t.identifier("b"));

            assert.equal(is.array(result), true);
            assert.equal(result.length, 1);
            assert.deepEqual(result[result.length - 1].node, t.identifier("b"));
            assert.equal(generateCode(rootPath), "if (x) {\n  y;\n  b\n}");
        });

        it("returns inserted path without BlockStatement with ExpressionStatement", () => {
            const rootPath = getPath("if (x) y;");
            const path = rootPath.get("consequent");
            const result = path.insertAfter(t.identifier("b"));

            assert.equal(is.array(result), true);
            assert.equal(result.length, 1);
            assert.deepEqual(result[result.length - 1].node, t.identifier("b"));
            assert.equal(generateCode(rootPath), "if (x) {\n  y;\n  b\n}");
        });

        it("returns inserted path without BlockStatement without ExpressionStatement", () => {
            const rootPath = getPath("if (x) for (var i = 0; i < 0; i++) {}");
            const path = rootPath.get("consequent");
            const result = path.insertAfter(t.identifier("b"));

            assert.equal(is.array(result), true);
            assert.equal(result.length, 1);
            assert.deepEqual(result[result.length - 1].node, t.identifier("b"));
            assert.equal(
                generateCode(rootPath),
                "if (x) {\n  for (var i = 0; i < 0; i++) {}\n\n  b\n}",
            );
        });

        it("returns inserted path with BlockStatement without ExpressionStatement", () => {
            const rootPath = getPath("if (x) { for (var i = 0; i < 0; i++) {} }");
            const path = rootPath.get("consequent.body.0");
            const result = path.insertAfter(t.identifier("b"));

            assert.equal(is.array(result), true);
            assert.equal(result.length, 1);
            assert.deepEqual(result[result.length - 1].node, t.identifier("b"));
            assert.equal(
                generateCode(rootPath),
                "if (x) {\n  for (var i = 0; i < 0; i++) {}\n\n  b\n}",
            );
        });
    });
});
