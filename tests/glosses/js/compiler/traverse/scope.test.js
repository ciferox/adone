const { traverse, parse } = adone.js.compiler;

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

describe("scope", () => {
    describe("binding paths", () => {
        it("function declaration id", () => {
            assert.ok(getPath("function foo() {}").scope.getBinding("foo").path.type === "FunctionDeclaration");
        });

        it("function expression id", () => {
            assert.ok(getPath("(function foo() {})").get("body")[0].get("expression").scope.getBinding("foo").path.type === "FunctionExpression");
        });

        it("function param", () => {
            assert.ok(getPath("(function (foo) {})").get("body")[0].get("expression").scope.getBinding("foo").path.type === "Identifier");
        });

        it("variable declaration", () => {
            assert.ok(getPath("var foo = null;").scope.getBinding("foo").path.type === "VariableDeclarator");
            assert.ok(getPath("var { foo } = null;").scope.getBinding("foo").path.type === "VariableDeclarator");
            assert.ok(getPath("var [ foo ] = null;").scope.getBinding("foo").path.type === "VariableDeclarator");
            assert.ok(getPath("var { bar: [ foo ] } = null;").scope.getBinding("foo").path.type === "VariableDeclarator");
        });

        it("purity", () => {
            assert.ok(getPath("({ x: 1 })").get("body")[0].get("expression").isPure());
        });

        it("label", () => {
            assert.strictEqual(getPath("foo: { }").scope.getBinding("foo"), undefined);
            assert.strictEqual(getPath("foo: { }").scope.getLabel("foo").type, "LabeledStatement");
            assert.strictEqual(getPath("foo: { }").scope.getLabel("toString"), undefined);

            assert.strictEqual(getPath(`
        foo: { }
      `).scope.generateUid("foo"), "_foo");
        });

        it("generateUid collision check with labels", () => {
            assert.strictEqual(getPath(`
        _foo: { }
      `).scope.generateUid("foo"), "_foo2");

            assert.strictEqual(getPath(`
        _foo: { }
        _foo1: { }
        _foo2: { }
      `).scope.generateUid("foo"), "_foo3");
        });
    });
});
