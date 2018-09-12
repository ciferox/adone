const {
    is,
    js: { compiler: { types: t, generate, parse, traverse } }
} = adone;

const getPath = function (code, parserOpts) {
    const ast = parse(code, parserOpts);
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

describe("js", "compiler", "traverse", "modification", () => {
    describe("pushContainer", () => {
        it("pushes identifier into params", () => {
            const rootPath = getPath("function test(a) {}");
            rootPath.pushContainer("params", t.identifier("b"));

            expect(generateCode(rootPath)).to.equal("function test(a, b) {}");
        });

        it("pushes identifier into block", () => {
            const rootPath = getPath("function test(a) {}");
            const path = rootPath.get("body");
            path.pushContainer("body", t.expressionStatement(t.identifier("b")));

            expect(generateCode(rootPath)).to.equal("function test(a) {\n  b;\n}");
        });
    });
    describe("unshiftContainer", () => {
        it("unshifts identifier into params", () => {
            const rootPath = getPath("function test(a) {}");
            rootPath.unshiftContainer("params", t.identifier("b"));

            expect(generateCode(rootPath)).to.equal("function test(b, a) {}");
        });

        it("unshifts identifier into block", () => {
            const rootPath = getPath("function test(a) {}");
            const path = rootPath.get("body");
            path.unshiftContainer("body", t.expressionStatement(t.identifier("b")));

            expect(generateCode(rootPath)).to.equal("function test(a) {\n  b;\n}");
        });

        it("properly handles more than one arguments", () => {
            const code = "foo(a, b);";
            const ast = parse(code);
            traverse(ast, {
                CallExpression (path) {
                    path.unshiftContainer("arguments", t.identifier("d"));
                    expect(generateCode(path)).to.equal("foo(d, a, b);");
                    path.unshiftContainer("arguments", t.stringLiteral("s"));
                    expect(generateCode(path)).to.equal(`foo("s", d, a, b);`);
                }
            });
        });
    });

    describe("insertBefore", () => {
        it("returns inserted path with BlockStatement", () => {
            const rootPath = getPath("if (x) { y; }");
            const path = rootPath.get("consequent.body.0");
            const result = path.insertBefore(t.identifier("b"));

            expect(is.array(result)).to.equal(true);
            expect(result).to.lengthOf(1);
            expect(result[0].node).to.eql(t.identifier("b"));
            expect(generateCode(rootPath)).to.equal("if (x) {\n  b\n  y;\n}");
        });

        it("returns inserted path without BlockStatement", () => {
            const rootPath = getPath("if (x) y;");
            const path = rootPath.get("consequent");
            const result = path.insertBefore(t.identifier("b"));

            expect(is.array(result)).to.equal(true);
            expect(result).to.lengthOf(1);
            expect(result[0].node).to.eql(t.identifier("b"));
            expect(generateCode(rootPath)).to.equal("if (x) {\n  b\n  y;\n}");
        });

        it("returns inserted path without BlockStatement without ExpressionStatement", () => {
            const rootPath = getPath("if (x) for (var i = 0; i < 0; i++) {}");
            const path = rootPath.get("consequent");
            const result = path.insertBefore(t.identifier("b"));

            expect(is.array(result)).to.equal(true);
            expect(result).to.lengthOf(1);
            expect(result[result.length - 1].node).to.eql(t.identifier("b"));
            expect(generateCode(rootPath)).to.equal(
                "if (x) {\n  b\n\n  for (var i = 0; i < 0; i++) {}\n}",
            );
        });

        it("returns inserted path with BlockStatement without ExpressionStatement", () => {
            const rootPath = getPath("if (x) { for (var i = 0; i < 0; i++) {} }");
            const path = rootPath.get("consequent.body.0");
            const result = path.insertBefore(t.identifier("b"));

            expect(is.array(result)).to.equal(true);
            expect(result).to.lengthOf(1);
            expect(result[result.length - 1].node).to.eql(t.identifier("b"));
            expect(generateCode(rootPath)).to.equal(
                "if (x) {\n  b\n\n  for (var i = 0; i < 0; i++) {}\n}",
            );
        });

        describe("when the parent is an export declaration inserts the node before", () => {
            it("the ExportNamedDeclaration", () => {
                const bodyPath = getPath("export function a() {}", {
                    sourceType: "module",
                }).parentPath;
                const fnPath = bodyPath.get("body.0.declaration");
                fnPath.insertBefore(t.identifier("x"));

                expect(bodyPath.get("body")).to.lengthOf(2);
                expect(bodyPath.get("body.0").node).to.eql(t.identifier("x"));
            });

            it("the ExportDefaultDeclaration, if a declaration is exported", () => {
                const bodyPath = getPath("export default function () {}", {
                    sourceType: "module",
                }).parentPath;
                const fnPath = bodyPath.get("body.0.declaration");
                fnPath.insertBefore(t.identifier("x"));

                expect(bodyPath.get("body")).to.lengthOf(2);
                expect(bodyPath.get("body.0").node).to.eql(t.identifier("x"));
            });

            it("the exported expression", () => {
                const declPath = getPath("export default 2;", {
                    sourceType: "module",
                });
                const path = declPath.get("declaration");
                path.insertBefore(t.identifier("x"));

                expect(generateCode(declPath)).to.equal("export default (x, 2);");
            });
        });
    });

    describe("insertAfter", () => {
        it("returns inserted path with BlockStatement with ExpressionStatement", () => {
            const rootPath = getPath("if (x) { y; }");
            const path = rootPath.get("consequent.body.0");
            const result = path.insertAfter(t.identifier("b"));

            expect(is.array(result)).to.equal(true);
            expect(result).to.lengthOf(1);
            expect(result[result.length - 1].node).to.eql(t.identifier("b"));
            expect(generateCode(rootPath)).to.equal("if (x) {\n  y;\n  b\n}");
        });

        it("returns inserted path without BlockStatement with ExpressionStatement", () => {
            const rootPath = getPath("if (x) y;");
            const path = rootPath.get("consequent");
            const result = path.insertAfter(t.identifier("b"));

            expect(is.array(result)).to.equal(true);
            expect(result).to.lengthOf(1);
            expect(result[result.length - 1].node).to.eql(t.identifier("b"));
            expect(generateCode(rootPath)).to.equal("if (x) {\n  y;\n  b\n}");
        });

        it("returns inserted path without BlockStatement without ExpressionStatement", () => {
            const rootPath = getPath("if (x) for (var i = 0; i < 0; i++) {}");
            const path = rootPath.get("consequent");
            const result = path.insertAfter(t.identifier("b"));

            expect(is.array(result)).to.equal(true);
            expect(result).to.lengthOf(1);
            expect(result[result.length - 1].node).to.eql(t.identifier("b"));
            expect(generateCode(rootPath)).to.equal(
                "if (x) {\n  for (var i = 0; i < 0; i++) {}\n\n  b\n}",
            );
        });

        it("returns inserted path with BlockStatement without ExpressionStatement", () => {
            const rootPath = getPath("if (x) { for (var i = 0; i < 0; i++) {} }");
            const path = rootPath.get("consequent.body.0");
            const result = path.insertAfter(t.identifier("b"));

            expect(is.array(result)).to.equal(true);
            expect(result).to.lengthOf(1);
            expect(result[result.length - 1].node).to.eql(t.identifier("b"));
            expect(generateCode(rootPath)).to.equal(
                "if (x) {\n  for (var i = 0; i < 0; i++) {}\n\n  b\n}",
            );
        });

        describe("when the parent is an export declaration inserts the node after", () => {
            it("the ExportNamedDeclaration", () => {
                const bodyPath = getPath("export function a() {}", {
                    sourceType: "module",
                }).parentPath;
                const fnPath = bodyPath.get("body.0.declaration");
                fnPath.insertAfter(t.identifier("x"));

                expect(bodyPath.get("body")).to.lengthOf(2);
                expect(bodyPath.get("body.1").node).to.eql(t.identifier("x"));
            });

            it("the ExportDefaultDeclaration, if a declaration is exported", () => {
                const bodyPath = getPath("export default function () {}", {
                    sourceType: "module",
                }).parentPath;
                const fnPath = bodyPath.get("body.0.declaration");
                fnPath.insertAfter(t.identifier("x"));

                expect(bodyPath.get("body")).to.lengthOf(2);
                expect(bodyPath.get("body.1").node).to.eql(t.identifier("x"));
            });

            it("the exported expression", () => {
                const bodyPath = getPath("export default 2;", {
                    sourceType: "module",
                }).parentPath;
                const path = bodyPath.get("body.0.declaration");
                path.insertAfter(t.identifier("x"));

                expect(generateCode({ parentPath: bodyPath })).to.equal(
                    "var _temp;\n\nexport default (_temp = 2, x, _temp);",
                );
            });
        });
    });
});
