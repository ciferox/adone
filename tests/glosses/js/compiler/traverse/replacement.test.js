const {
    js: { compiler: { parse, traverse, types: t } }
} = adone;

describe("js", "compiler", "traverse", "path/replacement", () => {
    describe("replaceWith", () => {
        it("replaces declaration in ExportDefaultDeclaration node", () => {
            const ast = parse("export default function() {};", {
                sourceType: "module"
            });
            traverse(ast, {
                FunctionDeclaration(path) {
                    path.replaceWith(
                        t.arrayExpression([
                            t.functionExpression(
                                path.node.id,
                                path.node.params,
                                path.node.body,
                                path.node.generator,
                                path.node.async,
                            )
                        ]),
                    );
                }
            });

            assert(ast.program.body[0].declaration.type === "ArrayExpression");
        });

        it("throws error when trying to replace Program with a non-Program node", () => {
            const ast = parse("var x = 3;");
            expect(() => {
                traverse(ast, {
                    Program(path) {
                        path.replaceWith(t.identifier("a"));
                    }
                });
            }).to.throw(
                /You can only replace a Program root node with another Program node/,
            );
        });

        it("throws error when used with an array of nodes", () => {
            const ast = parse("function abc() {}; var test = 17;");
            expect(() => {
                traverse(ast, {
                    NumericLiteral(path) {
                        path.replaceWith([
                            t.identifier("should"),
                            t.identifier("never"),
                            t.identifier("happen")
                        ]);
                    }
                });
            }).to.throw(
                /Don't use `path\.replaceWith\(\)` with an array of nodes, use `path\.replaceWithMultiple\(\)`/,
            );
        });

        it("throws error when used with source string", () => {
            const ast = parse(
                "(function() { var x = 3; var y = 17; var c = x + y; })();",
            );
            expect(() => {
                traverse(ast, {
                    BinaryExpression(path) {
                        path.replaceWith("17 + 23");
                    }
                });
            }).to.throw(
                /Don't use `path\.replaceWith\(\)` with a source string, use `path\.replaceWithSourceString\(\)`/,
            );
        });

        it("throws error when trying to replace removed node", () => {
            const ast = parse("var z = 'abc';");
            expect(() => {
                traverse(ast, {
                    StringLiteral(path) {
                        path.remove();
                        path.replaceWith(t.identifier("p"));
                    }
                });
            }).to.throw(/You can't replace this node, we've already removed it/);
        });

        it("throws error when passed a falsy value", () => {
            const ast = parse("var z = 'abc';");
            expect(() => {
                traverse(ast, {
                    StringLiteral(path) {
                        path.replaceWith();
                    }
                });
            }).to.throw(
                /You passed `path\.replaceWith\(\)` a falsy node, use `path\.remove\(\)` instead/,
            );
        });
    });
});
