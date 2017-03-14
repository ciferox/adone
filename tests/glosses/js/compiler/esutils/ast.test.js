const { esutils } = adone.js.compiler;

const EMPTY = { type: "EmptyStatement" };

describe("ast", () => {
    describe("isExpression", () => {
        it("returns false if input is not node", () => {
            expect(esutils.ast.isExpression(0)).to.be.false;
            expect(esutils.ast.isExpression(null)).to.be.false;
            expect(esutils.ast.isExpression(undefined)).to.be.false;
            expect(esutils.ast.isExpression({})).to.be.false;
            expect(esutils.ast.isExpression({ type: null })).to.be.false;
            return expect(esutils.ast.isExpression({ type: undefined })).to.be.false;
        });

        it("returns true if provided node is expression", () => {
            expect(esutils.ast.isExpression({ type: "ThisExpression" })).to.be.true;
            return expect(esutils.ast.isExpression({ type: "Literal", value: 0 })).to.be.true;
        });

        return it("returns false if provided node is not expression", () => {
            expect(esutils.ast.isExpression({ type: "ExpressionStatement" })).to.be.false;
            return expect(esutils.ast.isExpression({ type: "Program" })).to.be.false;
        });
    });


    describe("isIterationStatement", () => {
        it("returns false if input is not node", () => {
            expect(esutils.ast.isIterationStatement(0)).to.be.false;
            expect(esutils.ast.isIterationStatement(null)).to.be.false;
            expect(esutils.ast.isIterationStatement(undefined)).to.be.false;
            expect(esutils.ast.isIterationStatement({})).to.be.false;
            expect(esutils.ast.isIterationStatement({ type: null })).to.be.false;
            return expect(esutils.ast.isIterationStatement({ type: undefined })).to.be.false;
        });

        it("returns true if provided node is iteration statement", () => {
            expect(esutils.ast.isIterationStatement({ type: "ForInStatement" })).to.be.true;
            return expect(esutils.ast.isIterationStatement({ type: "DoWhileStatement" })).to.be.true;
        });

        return it("returns false if provided node is not iteration statement", () => {
            expect(esutils.ast.isIterationStatement({ type: "ExpressionStatement" })).to.be.false;
            return expect(esutils.ast.isIterationStatement({ type: "ThisExpression" })).to.be.false;
        });
    });


    describe("isStatement", () => {
        it("returns false if input is not node", () => {
            expect(esutils.ast.isStatement(0)).to.be.false;
            expect(esutils.ast.isStatement(null)).to.be.false;
            expect(esutils.ast.isStatement(undefined)).to.be.false;
            expect(esutils.ast.isStatement({})).to.be.false;
            expect(esutils.ast.isStatement({ type: null })).to.be.false;
            return expect(esutils.ast.isStatement({ type: undefined })).to.be.false;
        });

        it("returns true if provided node is statement", () => {
            expect(esutils.ast.isStatement({ type: "ExpressionStatement" })).to.be.true;
            return expect(esutils.ast.isStatement({ type: "WhileStatement" })).to.be.true;
        });

        return it("returns false if provided node is not statement", () => {
            expect(esutils.ast.isStatement({ type: "ThisExpression" })).to.be.false;
            expect(esutils.ast.isStatement({ type: "FunctionDeclaration" })).to.be.false;
            return expect(esutils.ast.isStatement({ type: "Program" })).to.be.false;
        });
    });


    describe("isSourceElement", () => {
        it("returns false if input is not node", () => {
            expect(esutils.ast.isSourceElement(0)).to.be.false;
            expect(esutils.ast.isSourceElement(null)).to.be.false;
            expect(esutils.ast.isSourceElement(undefined)).to.be.false;
            expect(esutils.ast.isSourceElement({})).to.be.false;
            expect(esutils.ast.isSourceElement({ type: null })).to.be.false;
            return expect(esutils.ast.isSourceElement({ type: undefined })).to.be.false;
        });

        it("returns true if provided node is source element", () => {
            expect(esutils.ast.isSourceElement({ type: "ExpressionStatement" })).to.be.true;
            expect(esutils.ast.isSourceElement({ type: "WhileStatement" })).to.be.true;
            return expect(esutils.ast.isSourceElement({ type: "FunctionDeclaration" })).to.be.true;
        });

        return it("returns false if provided node is not source element", () => {
            expect(esutils.ast.isSourceElement({ type: "ThisExpression" })).to.be.false;
            return expect(esutils.ast.isSourceElement({ type: "Program" })).to.be.false;
        });
    });

    describe("trailingStatement", () => {
        it("returns trailing statement if node has it", () => {
            expect(esutils.ast.trailingStatement({ type: "WhileStatement", body: EMPTY })).to.be.eq(EMPTY);
            expect(esutils.ast.trailingStatement({ type: "WithStatement", body: EMPTY })).to.be.eq(EMPTY);
            expect(esutils.ast.trailingStatement({ type: "ForStatement", body: EMPTY })).to.be.eq(EMPTY);
            expect(esutils.ast.trailingStatement({ type: "ForInStatement", body: EMPTY })).to.be.eq(EMPTY);
            expect(esutils.ast.trailingStatement({ type: "IfStatement", consequent: EMPTY })).to.be.eq(EMPTY);
            expect(esutils.ast.trailingStatement({ type: "IfStatement", consequent: { type: "EmptyStatement" }, alternate: EMPTY })).to.be.eq(EMPTY);
            return expect(esutils.ast.trailingStatement({ type: "LabeledStatement", body: EMPTY })).to.be.eq(EMPTY);
        });

        return it("returns null if node doens't have trailing statement", () => {
            expect(esutils.ast.trailingStatement({ type: "DoWhileStatement", body: EMPTY })).to.be.null;
            return expect(esutils.ast.trailingStatement({ type: "ReturnStatement" })).to.be.null;
        });
    });

    return describe("isProblematicIfStatement", () => {
        it("returns true if node is problematic if statement", () => {
            expect(esutils.ast.isProblematicIfStatement({
                type: "IfStatement",
                consequent: {
                    type: "IfStatement",
                    consequent: EMPTY
                },
                alternate: EMPTY
            })).to.be.true;

            expect(esutils.ast.isProblematicIfStatement({
                type: "IfStatement",
                consequent: {
                    type: "LabeledStatement",
                    body: {
                        type: "IfStatement",
                        consequent: EMPTY
                    }
                },
                alternate: EMPTY
            })).to.be.true;

            return expect(esutils.ast.isProblematicIfStatement({
                type: "IfStatement",
                consequent: {
                    type: "WithStatement",
                    body: {
                        type: "IfStatement",
                        consequent: EMPTY
                    }
                },
                alternate: EMPTY
            })).to.be.true;
        });

        return it("returns false if node is not problematic if statement", () => {
            expect(esutils.ast.isProblematicIfStatement({
                type: "IfStatement",
                consequent: EMPTY,
                alternate: EMPTY
            })).to.be.false;

            expect(esutils.ast.isProblematicIfStatement({
                type: "IfStatement",
                consequent: {
                    type: "BlockStatement",
                    body: [{
                        type: "IfStatement",
                        consequent: EMPTY
                    }
                    ]
                },
                alternate: EMPTY
            })).to.be.false;

            return expect(esutils.ast.isProblematicIfStatement({
                type: "IfStatement",
                consequent: {
                    type: "DoWhileStatement",
                    body: {
                        type: "IfStatement",
                        consequent: EMPTY
                    }
                },
                alternate: EMPTY
            })).to.be.false;
        });
    });
});
