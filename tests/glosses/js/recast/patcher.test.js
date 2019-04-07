import { srcPath } from "./helpers";
const {
    js: { recast}
} = adone;

const types = require(srcPath("lib/types"));
const n = types.namedTypes;
const b = types.builders;
const { getReprinter, Patcher } = require(srcPath("lib/patcher"));
const { fromString } = require(srcPath("lib/lines"));
const { parse } = require(srcPath("lib/parser"));
const FastPath = require(srcPath("lib/fast-path")).default;
import { EOL as eol } from "os";
const code = [
    "// file comment",
    "exports.foo({",
    "    // some comment",
    "    bar: 42,",
    "    baz: this",
    "});"
];
function loc(sl, sc, el, ec) {
    return {
        start: { line: sl, column: sc },
        end: { line: el, column: ec }
    };
}
describe("patcher", () => {
    it("Patcher", () => {
        const lines = fromString(code.join(eol)); let patcher = new Patcher(lines); const selfLoc = loc(5, 9, 5, 13);
        assert.strictEqual(patcher.get(selfLoc).toString(), "this");
        patcher.replace(selfLoc, "self");
        assert.strictEqual(patcher.get(selfLoc).toString(), "self");
        const got = patcher.get().toString();
        assert.strictEqual(got, code.join(eol).replace("this", "self"));
        // Make sure comments are preserved.
        assert.ok(got.indexOf("// some") >= 0);
        const oyezLoc = loc(2, 12, 6, 1); const beforeOyez = patcher.get(oyezLoc).toString();
        assert.strictEqual(beforeOyez.indexOf("exports"), -1);
        assert.ok(beforeOyez.indexOf("comment") >= 0);
        patcher.replace(oyezLoc, "oyez");
        assert.strictEqual(patcher.get().toString(), [
            "// file comment",
            "exports.foo(oyez);"
        ].join(eol));
        // "Reset" the patcher.
        patcher = new Patcher(lines);
        patcher.replace(oyezLoc, "oyez");
        patcher.replace(selfLoc, "self");
        assert.strictEqual(patcher.get().toString(), [
            "// file comment",
            "exports.foo(oyez);"
        ].join(eol));
    });
    const trickyCode = [
        "    function",
        "      foo(bar,",
        "  baz) {",
        "        qux();",
        "    }"
    ].join(eol);
    it("GetIndent", () => {
        function check(indent) {
            const lines = fromString(trickyCode).indent(indent);
            const file = parse(lines.toString());
            const reprinter = FastPath.from(file).call((bodyPath) => {
                return getReprinter(bodyPath);
            }, "program", "body", 0, "body");
            const reprintedLines = reprinter(() => {
                assert.ok(false, "should not have called print function");
            });
            assert.strictEqual(reprintedLines.length, 3);
            assert.strictEqual(reprintedLines.getIndentAt(1), 0);
            assert.strictEqual(reprintedLines.getIndentAt(2), 4);
            assert.strictEqual(reprintedLines.getIndentAt(3), 0);
            assert.strictEqual(reprintedLines.toString(), [
                "{",
                "    qux();",
                "}"
            ].join(eol));
        }
        for (let indent = -4; indent <= 4; ++indent) {
            check(indent);
        }
    });
    it("should patch return/throw/etc. arguments correctly", () => {
        const strAST = parse('return"foo"');
        const returnStmt = strAST.program.body[0];
        n.ReturnStatement.assert(returnStmt);
        assert.strictEqual(recast.print(strAST).code, 'return"foo"');
        returnStmt.argument = b.literal(null);
        assert.strictEqual(recast.print(strAST).code, "return null;" // Instead of returnnull.
        );
        const arrAST = parse("throw[1,2,3]");
        const throwStmt = arrAST.program.body[0];
        n.ThrowStatement.assert(throwStmt);
        assert.strictEqual(recast.print(arrAST).code, "throw[1,2,3]");
        throwStmt.argument = b.literal(false);
        assert.strictEqual(recast.print(arrAST).code, "throw false" // Instead of throwfalse.
        );
        const inAST = parse('"foo"in bar');
        const inExpr = inAST.program.body[0].expression;
        n.BinaryExpression.assert(inExpr);
        assert.strictEqual(inExpr.operator, "in");
        n.Literal.assert(inExpr.left);
        assert.strictEqual(inExpr.left.value, "foo");
        assert.strictEqual(recast.print(inAST).code, '"foo"in bar');
        inExpr.left = b.identifier("x");
        assert.strictEqual(recast.print(inAST).code, "x in bar" // Instead of xin bar.
        );
    });
    it("should not add spaces to the beginnings of lines", () => {
        const twoLineCode = [
            "return",
            "xxx" // parse as separate statements.
        ].join(eol);
        const twoLineAST = parse(twoLineCode);
        assert.strictEqual(twoLineAST.program.body.length, 2);
        const xxx = twoLineAST.program.body[1];
        n.ExpressionStatement.assert(xxx);
        n.Identifier.assert(xxx.expression);
        assert.strictEqual(xxx.expression.name, "xxx");
        assert.strictEqual(recast.print(twoLineAST).code, twoLineCode);
        xxx.expression = b.identifier("expression");
        const withExpression = recast.print(twoLineAST).code;
        assert.strictEqual(withExpression, [
            "return",
            "expression" // The key is that no space should be added to the
            // beginning of this line.
        ].join(eol));
        twoLineAST.program.body[1] = b.expressionStatement(b.callExpression(b.identifier("foo"), []));
        const withFooCall = recast.print(twoLineAST).code;
        assert.strictEqual(withFooCall, [
            "return",
            "foo()"
        ].join(eol));
    });
});
