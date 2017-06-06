const { types } = adone.js.compiler;

describe("js", "compiler", "types", "converters", () => {
    describe("valueToNode", () => {
        it("number", () => {
            assert.deepEqual(types.valueToNode(Math.PI), types.numericLiteral(Math.PI));
            assert.deepEqual(types.valueToNode(-Infinity), types.numericLiteral(-Infinity));
            assert.deepEqual(types.valueToNode(NaN), types.numericLiteral(NaN));
        });
        it("string", () => {
            assert.deepEqual(types.valueToNode("This is a \"string\""), types.stringLiteral("This is a \"string\""));
        });
        it("boolean", () => {
            assert.deepEqual(types.valueToNode(true), types.booleanLiteral(true));
            assert.deepEqual(types.valueToNode(false), types.booleanLiteral(false));
        });
        it("null", () => {
            assert.deepEqual(types.valueToNode(null), types.nullLiteral());
        });
        it("undefined", () => {
            assert.deepEqual(types.valueToNode(undefined), types.identifier("undefined"));
        });
        it("RegExp", () => {
            assert.deepEqual(types.valueToNode(/abc.+/gm), types.regExpLiteral("abc.+", "gm"));
        });
        it("array", () => {
            assert.deepEqual(types.valueToNode([1, "a"]), types.arrayExpression([types.numericLiteral(1), types.stringLiteral("a")]));
        });
        it("object", () => {
            assert.deepEqual(types.valueToNode({
                a: 1,
                "b c": 2
            }), types.objectExpression([
                types.objectProperty(types.identifier("a"), types.numericLiteral(1)),
                types.objectProperty(types.stringLiteral("b c"), types.numericLiteral(2))
            ]));
        });
        it("throws if cannot convert", () => {
            assert.throws(() => {
                types.valueToNode(Object);
            });
            assert.throws(() => {
                types.valueToNode(Symbol());
            });
        });
    });

    describe("toKeyAlias", () => {
        beforeEach(() => {
            // make tests deterministic
            types.toKeyAlias.uid = 0;
        });
        it("doesn't change string literals", () => {
            assert.equal(types.toKeyAlias(types.objectProperty(types.stringLiteral("a"), types.nullLiteral())), "\"a\"");
        });
        it("wraps around at Number.MAX_SAFE_INTEGER", () => {
            assert.equal(types.toKeyAlias(types.objectMethod("method", types.identifier("a"), [], types.blockStatement([]))), "0");
        });
    });

    describe("toStatement", () => {
        it("noop on statements", () => {
            const node = types.emptyStatement();
            assert.equal(types.toStatement(node), node);
            types.assertEmptyStatement(node);
        });
        it("mutate class expression to declaration", () => {
            const node = types.classExpression(types.identifier("A"), null, types.classBody([]), []);
            types.toStatement(node);
            types.assertClassDeclaration(node);
        });
        it("fail if class expression has no id", () => {
            const node = types.classExpression(null, null, types.classBody([]), []);
            assert.throws(() => {
                types.toStatement(node);
            });
            assert.strictEqual(types.toStatement(node, /* ignore = */ true), false);
            types.assertClassExpression(node);
        });
        it("mutate function expression to declaration", () => {
            const node = types.functionExpression(types.identifier("A"), [], types.blockStatement([]));
            types.toStatement(node);
            types.assertFunctionDeclaration(node);
        });
        it("fail if function expression has no id", () => {
            const node = types.functionExpression(null, [], types.blockStatement([]));
            assert.throws(() => {
                types.toStatement(node);
            });
            assert.strictEqual(types.toStatement(node, /* ignore = */ true), false);
            types.assertFunctionExpression(node);
        });
        it("assignment expression", () => {
            const node = types.assignmentExpression("+=", types.identifier("x"), types.numericLiteral(1));
            types.assertExpressionStatement(types.toStatement(node));
            types.assertAssignmentExpression(node);
        });
        it("fail if cannot convert node type", () => {
            const node = types.yieldExpression(types.identifier("foo"));
            assert.throws(() => {
                types.toStatement(node);
            });
            assert.strictEqual(types.toStatement(node, /* ignore = */ true), false);
            types.assertYieldExpression(node);
        });
    });

    describe("toExpression", () => {
        it("noop on expressions", () => {
            const node = types.identifier("a");
            assert.equal(types.toExpression(node), node);
            types.assertIdentifier(node);
        });
        it("mutate class declaration to expression", () => {
            const node = types.classDeclaration(types.identifier("A"), null, types.classBody([]), []);
            types.toExpression(node);
            types.assertClassExpression(node);
        });
        it("mutate function declaration to expression", () => {
            const node = types.functionDeclaration(types.identifier("A"), [], types.blockStatement([]));
            types.toExpression(node);
            types.assertFunctionExpression(node);
        });
        it("mutate object method to expression", () => {
            const node = types.objectMethod("method", types.identifier("A"), [], types.blockStatement([]));
            types.toExpression(node);
            types.assertFunctionExpression(node);
        });
        it("mutate class method to expression", () => {
            const node = types.classMethod("constructor", types.identifier("A"), [], types.blockStatement([]));
            types.toExpression(node);
            types.assertFunctionExpression(node);
        });
        it("expression statement", () => {
            const inner = types.yieldExpression(types.identifier("foo"));
            const node = types.expressionStatement(inner);
            types.assertYieldExpression(types.toExpression(node));
            assert.equal(types.toExpression(node), inner);
            types.assertExpressionStatement(node);
        });
        it("fail if cannot convert node type", () => {
            const node = types.program([]);
            assert.throws(() => {
                types.toExpression(node);
            });
            types.assertProgram(node);
        });
    });
});
