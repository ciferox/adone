const {
    js: { compiler: { core: { transform, Plugin } } }
} = adone;

describe("js", "compiler", "core", "traversal path", () => {
    it("replaceWithSourceString", () => {
        const expectCode = "function foo() {}";

        const actualCode = transform(expectCode, {
            plugins: [
                new Plugin({
                    visitor: {
                        FunctionDeclaration(path) {
                            path.replaceWithSourceString("console.whatever()");
                        }
                    }
                })
            ]
        }).code;

        expect(actualCode).to.be.equal("console.whatever();");
    });

    it("replaceWith (arrow expression body to block statement body)", () => {
        const expectCode = "var fn = () => true;";

        const actualCode = transform(expectCode, {
            plugins: [
                new Plugin({
                    visitor: {
                        ArrowFunctionExpression(path) {
                            path.get("body").replaceWith({
                                type: "BlockStatement",
                                body: [
                                    {
                                        type: "ReturnStatement",
                                        argument: {
                                            type: "BooleanLiteral",
                                            value: true
                                        }
                                    }
                                ]
                            });
                        }
                    }
                })
            ]
        }).code;

        expect(actualCode).to.be.equal("var fn = () => {\n  return true;\n};");
    });

    it("replaceWith (arrow block statement body to expression body)", () => {
        const expectCode = "var fn = () => { return true; }";

        const actualCode = transform(expectCode, {
            plugins: [
                new Plugin({
                    visitor: {
                        ArrowFunctionExpression(path) {
                            path.get("body").replaceWith({
                                type: "BooleanLiteral",
                                value: true
                            });
                        }
                    }
                })
            ]
        }).code;

        expect(actualCode).to.be.equal("var fn = () => true;");
    });

    it("replaceWith (for-in left expression to variable declaration)", () => {
        const expectCode = "for (KEY in right);";

        const actualCode = transform(expectCode, {
            plugins: [
                new Plugin({
                    visitor: {
                        ForInStatement(path) {
                            path.get("left").replaceWith({
                                type: "VariableDeclaration",
                                kind: "var",
                                declarations: [
                                    {
                                        type: "VariableDeclarator",
                                        id: {
                                            type: "Identifier",
                                            name: "KEY"
                                        }
                                    }
                                ]
                            });
                        }
                    }
                })
            ]
        }).code;

        expect(actualCode).to.be.equal("for (var KEY in right);");
    });

    it("replaceWith (for-in left variable declaration to expression)", () => {
        const expectCode = "for (var KEY in right);";

        const actualCode = transform(expectCode, {
            plugins: [
                new Plugin({
                    visitor: {
                        ForInStatement(path) {
                            path.get("left").replaceWith({
                                type: "Identifier",
                                name: "KEY"
                            });
                        }
                    }
                })
            ]
        }).code;

        expect(actualCode).to.be.equal("for (KEY in right);");
    });

    it("replaceWith (for-loop left expression to variable declaration)", () => {
        const expectCode = "for (KEY;;);";

        const actualCode = transform(expectCode, {
            plugins: [
                new Plugin({
                    visitor: {
                        ForStatement(path) {
                            path.get("init").replaceWith({
                                type: "VariableDeclaration",
                                kind: "var",
                                declarations: [
                                    {
                                        type: "VariableDeclarator",
                                        id: {
                                            type: "Identifier",
                                            name: "KEY"
                                        }
                                    }
                                ]
                            });
                        }
                    }
                })
            ]
        }).code;

        expect(actualCode).to.be.equal("for (var KEY;;);");
    });

    it("replaceWith (for-loop left variable declaration to expression)", () => {
        const expectCode = "for (var KEY;;);";

        const actualCode = transform(expectCode, {
            plugins: [
                new Plugin({
                    visitor: {
                        ForStatement(path) {
                            path.get("init").replaceWith({
                                type: "Identifier",
                                name: "KEY"
                            });
                        }
                    }
                })
            ]
        }).code;

        expect(actualCode).to.be.equal("for (KEY;;);");
    });
});
