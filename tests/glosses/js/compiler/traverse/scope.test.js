const {
    js: { compiler: { parse, traverse } }
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

const getIdentifierPath = (code) => {
    const ast = parse(code);
    let nodePath;
    traverse(ast, {
        Identifier(path) {
            nodePath = path;
            path.stop();
        }
    });

    return nodePath;
};

describe("js", "compiler", "traverse", "scope", () => {
    describe("binding paths", () => {
        it("function declaration id", () => {
            assert.ok(
                getPath("function foo() {}").scope.getBinding("foo").path.type ===
                "FunctionDeclaration",
            );
        });

        it("function expression id", () => {
            assert.ok(
                getPath("(function foo() {})")
                    .get("body")[0]
                    .get("expression")
                    .scope.getBinding("foo").path.type === "FunctionExpression",
            );
        });

        it("function param", () => {
            assert.ok(
                getPath("(function (foo) {})")
                    .get("body")[0]
                    .get("expression")
                    .scope.getBinding("foo").path.type === "Identifier",
            );
        });

        it("variable declaration", () => {
            assert.ok(
                getPath("var foo = null;").scope.getBinding("foo").path.type ===
                "VariableDeclarator",
            );
            assert.ok(
                getPath("var { foo } = null;").scope.getBinding("foo").path.type ===
                "VariableDeclarator",
            );
            assert.ok(
                getPath("var [ foo ] = null;").scope.getBinding("foo").path.type ===
                "VariableDeclarator",
            );
            assert.ok(
                getPath("var { bar: [ foo ] } = null;").scope.getBinding("foo").path
                    .type === "VariableDeclarator",
            );
        });

        it("variable constantness", () => {
            assert.ok(getPath("var a = 1;").scope.getBinding("a").constant === true);
            assert.ok(
                getPath("var a = 1; a = 2;").scope.getBinding("a").constant === false,
            );
            assert.ok(
                getPath("var a = 1, a = 2;").scope.getBinding("a").constant === false,
            );
            assert.ok(
                getPath("var a = 1; var a = 2;").scope.getBinding("a").constant ===
                false,
            );
        });

        it("purity", () => {
            assert.ok(
                getPath("({ x: 1 })").get("body")[0].get("expression").isPure(),
            );
            assert.ok(!getPath("`${a}`").get("body")[0].get("expression").isPure());
            assert.ok(
                getPath("let a = 1; `${a}`").get("body")[1].get("expression").isPure(),
            );
            assert.ok(
                !getPath("let a = 1; `${a++}`")
                    .get("body")[1]
                    .get("expression")
                    .isPure(),
            );
            assert.ok(
                !getPath("tagged`foo`").get("body")[0].get("expression").isPure(),
            );
            assert.ok(
                getPath("String.raw`foo`").get("body")[0].get("expression").isPure(),
            );
        });

        it("label", () => {
            assert.strictEqual(
                getPath("foo: { }").scope.getBinding("foo"),
                undefined,
            );
            assert.strictEqual(
                getPath("foo: { }").scope.getLabel("foo").type,
                "LabeledStatement",
            );
            assert.strictEqual(
                getPath("foo: { }").scope.getLabel("toString"),
                undefined,
            );

            assert.strictEqual(
                getPath(
                    `
        foo: { }
      `,
                ).scope.generateUid("foo"),
                "_foo",
            );
        });

        it("generateUid collision check with labels", () => {
            assert.strictEqual(
                getPath(
                    `
        _foo: { }
      `,
                ).scope.generateUid("foo"),
                "_foo2",
            );

            assert.strictEqual(
                getPath(
                    `
        _foo: { }
        _foo1: { }
        _foo2: { }
      `,
                ).scope.generateUid("foo"),
                "_foo3",
            );
        });

        it("reference paths", () => {
            const path = getIdentifierPath("function square(n) { return n * n}");
            const referencePaths = path.context.scope.bindings.n.referencePaths;
            assert.equal(referencePaths.length, 2);
            assert.deepEqual(referencePaths[0].node.loc.start, {
                line: 1,
                column: 28
            });
            assert.deepEqual(referencePaths[1].node.loc.start, {
                line: 1,
                column: 32
            });
        });
    });
});
