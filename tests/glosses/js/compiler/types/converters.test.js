const {
    js: { compiler: { types: t, parse, generate } }
} = adone;

const parseCode = function (string) {
    return parse(string, {
        allowReturnOutsideFunction: true
    }).program.body[0];
};

const generateCode = (node) => generate(node).code;

describe("js", "compiler", "types", "converters", () => {
    it("toIdentifier", () => {
        expect(t.toIdentifier("swag-lord")).to.equal("swagLord");
    });

    describe("valueToNode", () => {
        it("number", () => {
            expect(t.valueToNode(Math.PI)).to.eql(t.numericLiteral(Math.PI));
            expect(t.valueToNode(-Math.PI)).to.eql(
                t.unaryExpression("-", t.numericLiteral(Math.PI)),
            );
            expect(t.valueToNode(0)).to.eql(t.numericLiteral(0));
            expect(t.valueToNode(-0)).to.eql(
                t.unaryExpression("-", t.numericLiteral(0)),
            );
            expect(t.valueToNode(NaN)).to.eql(
                t.binaryExpression("/", t.numericLiteral(0), t.numericLiteral(0)),
            );
            expect(t.valueToNode(-NaN)).to.eql(
                t.binaryExpression("/", t.numericLiteral(0), t.numericLiteral(0)),
            );

            expect(t.valueToNode(Infinity)).to.eql(
                t.binaryExpression("/", t.numericLiteral(1), t.numericLiteral(0)),
            );
            expect(t.valueToNode(-Infinity)).to.eql(
                t.unaryExpression(
                    "-",
                    t.binaryExpression("/", t.numericLiteral(1), t.numericLiteral(0)),
                ),
            );
        });
        it("string", () => {
            expect(t.valueToNode('This is a "string"')).to.eql(
                t.stringLiteral('This is a "string"'),
            );
        });
        it("boolean", () => {
            expect(t.valueToNode(true)).to.eql(t.booleanLiteral(true));
            expect(t.valueToNode(false)).to.eql(t.booleanLiteral(false));
        });
        it("null", () => {
            expect(t.valueToNode(null)).to.eql(t.nullLiteral());
        });
        it("undefined", () => {
            expect(t.valueToNode(undefined)).to.eql(t.identifier("undefined"));
        });
        it("RegExp", () => {
            expect(t.valueToNode(/abc.+/gm)).to.eql(t.regExpLiteral("abc.+", "gm"));
        });
        it("array", () => {
            expect(t.valueToNode([1, "a"])).to.eql(
                t.arrayExpression([t.numericLiteral(1), t.stringLiteral("a")]),
            );
        });
        it("object", () => {
            expect(
                t.valueToNode({
                    a: 1,
                    "b c": 2
                }),
            ).to.eql(
                t.objectExpression([
                    t.objectProperty(t.identifier("a"), t.numericLiteral(1)),
                    t.objectProperty(t.stringLiteral("b c"), t.numericLiteral(2))
                ]),
            );
        });
        it("throws if cannot convert", () => {
            expect(() => {
                t.valueToNode(Object);
            }).throw();
            expect(() => {
                t.valueToNode(Symbol());
            }).throw();
        });
    });
    describe("toKeyAlias", () => {
        beforeEach(() => {
            // make tests deterministic
            t.toKeyAlias.uid = 0;
        });
        it("doesn't change string literals", () => {
            expect(
                t.toKeyAlias(t.objectProperty(t.stringLiteral("a"), t.nullLiteral())),
            ).to.equal('"a"');
        });
        it("wraps around at Number.MAX_SAFE_INTEGER", () => {
            expect(
                t.toKeyAlias(
                    t.objectMethod("method", t.identifier("a"), [], t.blockStatement([])),
                ),
            ).to.equal("0");
        });
    });
    describe("toStatement", () => {
        it("noop on statements", () => {
            const node = t.emptyStatement();
            expect(t.toStatement(node)).to.eql(node);
            t.assertEmptyStatement(node);
        });
        it("mutate class expression to declaration", () => {
            const node = t.classExpression(
                t.identifier("A"),
                null,
                t.classBody([]),
                [],
            );
            t.toStatement(node);
            t.assertClassDeclaration(node);
        });
        it("fail if class expression has no id", () => {
            const node = t.classExpression(null, null, t.classBody([]), []);
            expect(() => {
                t.toStatement(node);
            }).throw(Error);
            expect(t.toStatement(node, /* ignore = */ true)).to.equal(false);
            t.assertClassExpression(node);
        });
        it("mutate function expression to declaration", () => {
            const node = t.functionExpression(
                t.identifier("A"),
                [],
                t.blockStatement([]),
            );
            t.toStatement(node);
            t.assertFunctionDeclaration(node);
        });
        it("fail if function expression has no id", () => {
            const node = t.functionExpression(null, [], t.blockStatement([]));
            expect(() => {
                t.toStatement(node);
            }).throw(Error);
            expect(t.toStatement(node, /* ignore = */ true)).to.equal(false);
            t.assertFunctionExpression(node);
        });
        it("assignment expression", () => {
            const node = t.assignmentExpression(
                "+=",
                t.identifier("x"),
                t.numericLiteral(1),
            );
            t.assertExpressionStatement(t.toStatement(node));
            t.assertAssignmentExpression(node);
        });
        it("fail if cannot convert node type", () => {
            const node = t.yieldExpression(t.identifier("foo"));
            expect(() => {
                t.toStatement(node);
            }).throw(Error);
            expect(t.toStatement(node, /* ignore = */ true)).to.equal(false);
            t.assertYieldExpression(node);
        });
    });
    describe("toExpression", () => {
        it("noop on expressions", () => {
            const node = t.identifier("a");
            expect(t.toExpression(node)).to.eql(node);
            t.assertIdentifier(node);
        });
        it("mutate class declaration to expression", () => {
            const node = t.classDeclaration(
                t.identifier("A"),
                null,
                t.classBody([]),
                [],
            );
            t.toExpression(node);
            t.assertClassExpression(node);
        });
        it("mutate function declaration to expression", () => {
            const node = t.functionDeclaration(
                t.identifier("A"),
                [],
                t.blockStatement([]),
            );
            t.toExpression(node);
            t.assertFunctionExpression(node);
        });
        it("mutate object method to expression", () => {
            const node = t.objectMethod(
                "method",
                t.identifier("A"),
                [],
                t.blockStatement([]),
            );
            t.toExpression(node);
            t.assertFunctionExpression(node);
        });
        it("mutate class method to expression", () => {
            const node = t.classMethod(
                "constructor",
                t.identifier("A"),
                [],
                t.blockStatement([]),
            );
            t.toExpression(node);
            t.assertFunctionExpression(node);
        });
        it("expression statement", () => {
            const inner = t.yieldExpression(t.identifier("foo"));
            const node = t.expressionStatement(inner);
            t.assertYieldExpression(t.toExpression(node));
            expect(t.toExpression(node)).to.eql(inner);
            t.assertExpressionStatement(node);
        });
        it("fail if cannot convert node type", () => {
            const node = t.program([]);
            expect(() => {
                t.toExpression(node);
            }).throw(Error);
            t.assertProgram(node);
        });
    });
    describe("toSequenceExpression", () => {
        let scope;
        const undefinedNode = t.identifier("undefined");
        beforeEach(() => {
            scope = [];
            scope.buildUndefinedNode = function () {
                return undefinedNode;
            };
        });
        it("gathers nodes into sequence", () => {
            const node = t.identifier("a");
            const sequence = t.toSequenceExpression([undefinedNode, node], scope);
            t.assertSequenceExpression(sequence);
            expect(sequence.expressions[0]).to.equal(undefinedNode);
            expect(sequence.expressions[1]).to.equal(node);
            t.assertIdentifier(node);
        });
        it("avoids sequence for single node", () => {
            const node = t.identifier("a");
            let sequence = t.toSequenceExpression([node], scope);
            expect(sequence).to.equal(node);

            const block = t.blockStatement([t.expressionStatement(node)]);
            sequence = t.toSequenceExpression([block], scope);
            expect(sequence).to.equal(node);
        });
        it("gathers expression", () => {
            const node = t.identifier("a");
            const sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(sequence.expressions[1]).to.equal(node);
        });
        it("gathers expression statement", () => {
            const node = t.expressionStatement(t.identifier("a"));
            const sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(sequence.expressions[1]).to.equal(node.expression);
        });
        it("gathers var declarations", () => {
            const node = parseCode("var a, b = 1;");
            const sequence = t.toSequenceExpression([undefinedNode, node], scope);
            t.assertIdentifier(scope[0].id, { name: "a" });
            t.assertIdentifier(scope[1].id, { name: "b" });
            expect(generateCode(sequence.expressions[1])).to.equal("b = 1");
            expect(generateCode(sequence.expressions[2])).to.equal("undefined");
        });
        it("skips undefined if expression after var declaration", () => {
            const node = parseCode("{ var a, b = 1; true }");
            const sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(generateCode(sequence.expressions[1])).to.equal("b = 1, true");
        });
        it("bails on let and const declarations", () => {
            let node = parseCode("let a, b = 1;");
            let sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(sequence).to.undefined();

            node = parseCode("const b = 1;");
            sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(sequence).to.undefined();
        });
        it("gathers if statements", () => {
            let node = parseCode("if (true) { true }");
            let sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(generateCode(sequence.expressions[1])).to.equal(
                "true ? true : undefined",
            );

            node = parseCode("if (true) { true } else { b }");
            sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(generateCode(sequence.expressions[1])).to.equal("true ? true : b");
        });
        it("bails in if statements if recurse bails", () => {
            let node = parseCode("if (true) { return }");
            let sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(sequence).to.undefined();

            node = parseCode("if (true) { true } else { return }");
            sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(sequence).to.undefined();
        });
        it("gathers block statements", () => {
            let node = parseCode("{ a }");
            let sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(generateCode(sequence.expressions[1])).to.equal("a");

            node = parseCode("{ a; b; }");
            sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(generateCode(sequence.expressions[1])).to.equal("a, b");
        });
        it("bails in block statements if recurse bails", () => {
            const node = parseCode("{ return }");
            const sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(sequence).to.undefined();
        });
        it("gathers empty statements", () => {
            const node = parseCode(";");
            const sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(generateCode(sequence.expressions[1])).to.equal("undefined");
        });
        it("skips empty statement if expression afterwards", () => {
            const node = parseCode("{ ; true }");
            const sequence = t.toSequenceExpression([undefinedNode, node], scope);
            expect(generateCode(sequence.expressions[1])).to.equal("true");
        });
    });
});
