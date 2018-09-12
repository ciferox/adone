const {
    js: { compiler: { traverse, parse } },
    lodash: { cloneDeep }
} = adone;


describe("js", "compiler", "traverse", "traverse", () => {
    const code = `
    var foo = "bar";
    this.test = "wow";
  `;
    const ast = parse(code);
    const program = ast.program;
    const body = program.body;

    it("traverse replace", () => {
        const replacement = {
            type: "StringLiteral",
            value: "foo"
        };
        const ast2 = cloneDeep(program);

        traverse(ast2, {
            enter(path) {
                if (path.node.type === "ThisExpression") {
                    path.replaceWith(replacement);
                }
            }
        });

        expect(ast2.body[1].expression.left.object).to.equal(replacement);
    });

    it("traverse", () => {
        const expected = [
            body[0],
            body[0].declarations[0],
            body[0].declarations[0].id,
            body[0].declarations[0].init,
            body[1],
            body[1].expression,
            body[1].expression.left,
            body[1].expression.left.object,
            body[1].expression.left.property,
            body[1].expression.right
        ];

        const actual = [];

        traverse(program, {
            enter(path) {
                actual.push(path.node);
            }
        });

        expect(actual).to.eql(expected);
    });

    it("traverse falsy parent", () => {
        traverse(null, {
            enter() {
                throw new Error("should not be ran");
            }
        });
    });

    it("traverse blacklistTypes", () => {
        const expected = [
            body[0],
            body[0].declarations[0],
            body[0].declarations[0].id,
            body[0].declarations[0].init,
            body[1],
            body[1].expression,
            body[1].expression.right
        ];

        const actual = [];

        traverse(program, {
            blacklist: ["MemberExpression"],
            enter(path) {
                actual.push(path.node);
            }
        });

        expect(actual).to.eql(expected);
    });

    it("hasType", () => {
        expect(traverse.hasType(ast, "ThisExpression")).to.true();
        expect(
            traverse.hasType(ast, "ThisExpression", ["AssignmentExpression"]),
        ).to.false();

        expect(traverse.hasType(ast, "ThisExpression")).to.true();
        expect(traverse.hasType(ast, "Program")).to.true();

        expect(
            traverse.hasType(ast, "ThisExpression", ["MemberExpression"]),
        ).to.false();
        expect(traverse.hasType(ast, "ThisExpression", ["Program"])).to.false();

        expect(traverse.hasType(ast, "ArrowFunctionExpression")).to.false();
    });

    it("clearCache", () => {
        const paths = [];
        const scopes = [];
        traverse(ast, {
            enter(path) {
                scopes.push(path.scope);
                paths.push(path);
                path.stop();
            }
        });

        traverse.cache.clear();

        const paths2 = [];
        const scopes2 = [];
        traverse(ast, {
            enter(path) {
                scopes2.push(path.scope);
                paths2.push(path);
                path.stop();
            }
        });

        scopes2.forEach((_, i) => {
            expect(scopes[i]).not.to.equal(scopes2[i]);
            expect(paths[i]).not.to.equal(paths2[i]);
        });
    });

    it("clearPath", () => {
        const paths = [];
        traverse(ast, {
            enter(path) {
                paths.push(path);
            }
        });

        traverse.cache.clearPath();

        const paths2 = [];
        traverse(ast, {
            enter(path) {
                paths2.push(path);
            }
        });

        paths2.forEach((p, i) => {
            expect(p).not.to.equal(paths[i]);
        });
    });

    it("clearScope", () => {
        const scopes = [];
        traverse(ast, {
            enter(path) {
                scopes.push(path.scope);
                path.stop();
            }
        });

        traverse.cache.clearScope();

        const scopes2 = [];
        traverse(ast, {
            enter(path) {
                scopes2.push(path.scope);
                path.stop();
            }
        });

        scopes2.forEach((p, i) => {
            expect(p).not.to.equal(scopes[i]);
        });
    });
});
