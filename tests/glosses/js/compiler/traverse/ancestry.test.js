const {
    js: { compiler: { traverse, parse } }
} = adone;

describe("js", "compiler", "traverse", "path/ancestry", () => {
    describe("isAncestor", () => {
        const ast = parse("var a = 1; 'a';");

        it("returns true if ancestor", () => {
            const paths = [];
            traverse(ast, {
                "Program|NumericLiteral"(path) {
                    paths.push(path);
                }
            });

            const [programPath, numberPath] = paths;

            expect(programPath.isAncestor(numberPath)).to.true();
        });

        it("returns false if not ancestor", () => {
            const paths = [];
            traverse(ast, {
                "Program|NumericLiteral|StringLiteral"(path) {
                    paths.push(path);
                }
            });

            const [, numberPath, stringPath] = paths;

            expect(stringPath.isAncestor(numberPath)).to.false();
        });
    });

    describe("isDescendant", () => {
        const ast = parse("var a = 1; 'a';");

        it("returns true if descendant", () => {
            const paths = [];
            traverse(ast, {
                "Program|NumericLiteral"(path) {
                    paths.push(path);
                }
            });

            const [programPath, numberPath] = paths;

            expect(numberPath.isDescendant(programPath)).to.true();
        });

        it("returns false if not descendant", () => {
            const paths = [];
            traverse(ast, {
                "Program|NumericLiteral|StringLiteral"(path) {
                    paths.push(path);
                }
            });

            const [, numberPath, stringPath] = paths;

            expect(numberPath.isDescendant(stringPath)).to.false();
        });
    });

    describe("getStatementParent", () => {
        const ast = parse("var a = 1;");
        it("should throw", () => {
            expect(() => {
                traverse(ast, {
                    Program(path) {
                        path.getStatementParent();
                    },
                });
            }).throw(/File\/Program node/);
        });
    });
});
