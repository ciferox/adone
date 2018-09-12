const {
    js: { compiler: { traverse, parse } }
} = adone;

const getPath = function (code, options) {
    const ast = parse(code, options);
    let path;
    traverse(ast, {
        Program(_path) {
            path = _path;
            _path.stop();
        }
    });
    return path;
};

const getIdentifierPath = function (code) {
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
            expect(
                getPath("function foo() {}").scope.getBinding("foo").path.type,
            ).to.equal("FunctionDeclaration");
        });

        it("function expression id", () => {
            expect(
                getPath("(function foo() {})")
                    .get("body")[0]
                    .get("expression")
                    .scope.getBinding("foo").path.type,
            ).to.equal("FunctionExpression");
        });

        it("function param", () => {
            expect(
                getPath("(function (foo) {})")
                    .get("body")[0]
                    .get("expression")
                    .scope.getBinding("foo").path.type,
            ).to.equal("Identifier");
        });

        it("variable declaration", () => {
            expect(getPath("var foo = null;").scope.getBinding("foo").path.type).to.equal(
                "VariableDeclarator",
            );
            expect(
                getPath("var { foo } = null;").scope.getBinding("foo").path.type,
            ).to.equal("VariableDeclarator");
            expect(
                getPath("var [ foo ] = null;").scope.getBinding("foo").path.type,
            ).to.equal("VariableDeclarator");
            expect(
                getPath("var { bar: [ foo ] } = null;").scope.getBinding("foo").path
                    .type,
            ).to.equal("VariableDeclarator");
        });

        it("declare var", () => {
            expect(
                getPath("declare var foo;", { plugins: ["flow"] }).scope.getBinding(
                    "foo",
                ).path.type,
            ).to.equal("DeclareVariable");
        });

        it("declare function", () => {
            expect(
                getPath("declare function foo(): void;", {
                    plugins: ["flow"]
                }).scope.getBinding("foo").path.type,
            ).to.equal("DeclareFunction");
        });

        it("declare module", () => {
            expect(
                getPath("declare module foo {};", {
                    plugins: ["flow"]
                }).scope.getBinding("foo").path.type,
            ).to.equal("DeclareModule");
        });

        it("declare type alias", () => {
            expect(
                getPath("declare type foo = string;", {
                    plugins: ["flow"]
                }).scope.getBinding("foo").path.type,
            ).to.equal("DeclareTypeAlias");
        });

        it("declare opaque type", () => {
            expect(
                getPath("declare opaque type foo;", {
                    plugins: ["flow"]
                }).scope.getBinding("foo").path.type,
            ).to.equal("DeclareOpaqueType");
        });

        it("declare interface", () => {
            expect(
                getPath("declare interface Foo {};", {
                    plugins: ["flow"]
                }).scope.getBinding("Foo").path.type,
            ).to.equal("DeclareInterface");
        });

        it("type alias", () => {
            expect(
                getPath("type foo = string;", {
                    plugins: ["flow"]
                }).scope.getBinding("foo").path.type,
            ).to.equal("TypeAlias");
        });

        it("opaque type alias", () => {
            expect(
                getPath("opaque type foo = string;", {
                    plugins: ["flow"]
                }).scope.getBinding("foo").path.type,
            ).to.equal("OpaqueType");
        });

        it("interface", () => {
            expect(
                getPath("interface Foo {};", {
                    plugins: ["flow"]
                }).scope.getBinding("Foo").path.type,
            ).to.equal("InterfaceDeclaration");
        });

        it("import type", () => {
            expect(
                getPath("import type {Foo} from 'foo';", {
                    plugins: ["flow"]
                }).scope.getBinding("Foo").path.type,
            ).to.equal("ImportSpecifier");
        });

        it("variable constantness", () => {
            expect(getPath("var a = 1;").scope.getBinding("a").constant).to.equal(true);
            expect(getPath("var a = 1; a = 2;").scope.getBinding("a").constant).to.equal(
                false,
            );
            expect(getPath("var a = 1, a = 2;").scope.getBinding("a").constant).to.equal(
                false,
            );
            expect(
                getPath("var a = 1; var a = 2;").scope.getBinding("a").constant,
            ).to.equal(false);
        });

        it("purity", () => {
            expect(
                getPath("({ x: 1 })")
                    .get("body")[0]
                    .get("expression")
                    .isPure(),
            ).to.true();
            expect(
                getPath("`${a}`")
                    .get("body")[0]
                    .get("expression")
                    .isPure(),
            ).to.false();
            expect(
                getPath("let a = 1; `${a}`")
                    .get("body")[1]
                    .get("expression")
                    .isPure(),
            ).to.true();
            expect(
                getPath("let a = 1; `${a++}`")
                    .get("body")[1]
                    .get("expression")
                    .isPure(),
            ).to.false();
            expect(
                getPath("tagged`foo`")
                    .get("body")[0]
                    .get("expression")
                    .isPure(),
            ).to.false();
            expect(
                getPath("String.raw`foo`")
                    .get("body")[0]
                    .get("expression")
                    .isPure(),
            ).to.true();
        });

        it("label", () => {
            expect(getPath("foo: { }").scope.getBinding("foo")).to.undefined();
            expect(getPath("foo: { }").scope.getLabel("foo").type).to.equal(
                "LabeledStatement",
            );
            expect(getPath("foo: { }").scope.getLabel("toString")).to.undefined();

            expect(
                getPath(
                    `
      foo: { }
    `,
                ).scope.generateUid("foo"),
            ).to.equal("_foo");
        });

        it("generateUid collision check with labels", () => {
            expect(
                getPath(
                    `
      _foo: { }
    `,
                ).scope.generateUid("foo"),
            ).to.equal("_foo2");

            expect(
                getPath(
                    `
      _foo: { }
      _foo1: { }
      _foo2: { }
    `,
                ).scope.generateUid("foo"),
            ).to.equal("_foo3");
        });

        it("reference paths", () => {
            const path = getIdentifierPath("function square(n) { return n * n}");
            const referencePaths = path.context.scope.bindings.n.referencePaths;
            expect(referencePaths).to.lengthOf(2);
            expect(referencePaths[0].node.loc.start).to.eql({
                line: 1,
                column: 28
            });
            expect(referencePaths[1].node.loc.start).to.eql({
                line: 1,
                column: 32
            });
        });
    });
});
