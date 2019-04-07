import { srcPath } from "./helpers";

const types = require(srcPath("lib/types"));
const namedTypes = types.namedTypes;
const builders = types.builders;
const { parse } = require(srcPath("lib/parser"));
const { Printer } = require(srcPath("lib/printer"));
import { EOL as eol } from "os";
const lines = [
    "// file comment",
    "exports.foo({",
    "    // some comment",
    "    bar: 42,",
    "    baz: this",
    "});"
];
describe("types.visit", () => {
    it("replacement", () => {
        const source = lines.join(eol);
        const printer = new Printer();
        const ast = parse(source);
        const withThis = printer.print(ast).code;
        const thisExp = /\bthis\b/g;
        assert.ok(thisExp.test(withThis));
        types.visit(ast, {
            visitThisExpression() {
                return builders.identifier("self");
            }
        });
        assert.strictEqual(printer.print(ast).code, withThis.replace(thisExp, "self"));
        const propNames = [];
        const methods = {
            visitProperty(path) {
                const key = path.node.key;
                propNames.push(key.value || key.name);
                this.traverse(path);
            }
        };
        types.visit(ast, methods);
        assert.deepEqual(propNames, ["bar", "baz"]);
        types.visit(ast, {
            visitProperty(path) {
                if (namedTypes.Identifier.check(path.node.value) &&
                    path.node.value.name === "self") {
                    path.replace();
                    return false;
                }
                this.traverse(path);
                
            }
        });
        propNames.length = 0;
        types.visit(ast, methods);
        assert.deepEqual(propNames, ["bar"]);
    });
    it("reindent", () => {
        const lines = [
            "a(b(c({",
            "    m: d(function() {",
            "        if (e('y' + 'z'))",
            "            f(42).h()",
            "                 .i()",
            "                 .send();",
            "        g(8);",
            "    })",
            "})));"
        ];
        const altered = [
            "a(xxx(function() {",
            "    if (e('y' > 'z'))",
            "        f(42).h()",
            "             .i()",
            "             .send();",
            "    g(8);",
            "}, c(function() {",
            "    if (e('y' > 'z'))",
            "        f(42).h()",
            "             .i()",
            "             .send();",
            "    g(8);",
            "})));"
        ];
        const source = lines.join(eol);
        const ast = parse(source);
        const printer = new Printer();
        let funExpr;
        types.visit(ast, {
            visitFunctionExpression(path) {
                assert.strictEqual(typeof funExpr, "undefined");
                funExpr = path.node;
                this.traverse(path);
            },
            visitBinaryExpression(path) {
                path.node.operator = ">";
                this.traverse(path);
            }
        });
        namedTypes.FunctionExpression.assert(funExpr);
        types.visit(ast, {
            visitCallExpression(path) {
                this.traverse(path);
                const expr = path.node;
                if (namedTypes.Identifier.check(expr.callee) &&
                    expr.callee.name === "b") {
                    expr.callee.name = "xxx";
                    expr.arguments.unshift(funExpr);
                }
            },
            visitObjectExpression() {
                return funExpr;
            }
        });
        assert.strictEqual(altered.join(eol), printer.print(ast).code);
    });
});
