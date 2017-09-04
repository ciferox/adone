const {
    js: { compiler: { parse, traverse } }
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

            assert(programPath.isAncestor(numberPath));
        });

        it("returns false if not ancestor", () => {
            const paths = [];
            traverse(ast, {
                "Program|NumericLiteral|StringLiteral"(path) {
                    paths.push(path);
                }
            });

            const [, numberPath, stringPath] = paths;

            assert(!stringPath.isAncestor(numberPath));
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

            assert(numberPath.isDescendant(programPath));
        });

        it("returns false if not descendant", () => {
            const paths = [];
            traverse(ast, {
                "Program|NumericLiteral|StringLiteral"(path) {
                    paths.push(path);
                }
            });

            const [, numberPath, stringPath] = paths;

            assert(!numberPath.isDescendant(stringPath));
        });
    });

    describe("getStatementParent", () => {
        const ast = parse("var a = 1;");
        it("should throw", () => {
            expect(() => {
                traverse(ast, {
                    Program(path) {
                        path.getStatementParent();
                    }
                });
            }).to.throw(/File\/Program node/);
        });
    });
});
