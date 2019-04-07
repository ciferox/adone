import { srcPath } from "./helpers";
const { parse } = require(srcPath("lib/parser"));
const { getReprinter } = require(srcPath("lib/patcher"));
const { Printer } = require(srcPath("lib/printer"));
const { fromString } = require(srcPath("lib/lines"));
const types = require(srcPath("lib/types"));
const namedTypes = types.namedTypes;
const FastPath = require(srcPath("lib/fast-path")).default;
import { EOL as eol } from "os";
const nodeMajorVersion = parseInt(process.versions.node, 10);
// Esprima seems unable to handle unnamed top-level functions, so declare
// test functions with names and then export them later.
describe("parser", () => {
    [srcPath("parsers/acorn"),
    srcPath("parsers/babel"),
    srcPath("parsers/esprima"),
    srcPath("parsers/flow"),
    srcPath("parsers/typescript")
    ].forEach(runTestsForParser);
    it("AlternateParser", () => {
        const types = require(srcPath("lib/types"));
        const b = types.builders;
        const parser = {
            parse() {
                const program = b.program([
                    b.expressionStatement(b.identifier("surprise"))
                ]);
                program.comments = [];
                return program;
            }
        };
        function check(options) {
            const ast = parse("ignored", options);
            const printer = new Printer();
            types.namedTypes.File.assert(ast, true);
            assert.strictEqual(printer.printGenerically(ast).code, "surprise;");
        }
        check({ esprima: parser });
        check({ parser });
    });
});
function runTestsForParser(parserId) {
    const parserName = parserId.split("/").pop();
    if (nodeMajorVersion < 6 &&
        (parserName === "babel" ||
            parserName === "flow" ||
            parserName === "typescript")) {
        // Babel 7 no longer supports Node 4 or 5.
        return;
    }
    if (!parserName) {
        return;
    }
    const parser = require(parserId);
    it(`[${parserName}] empty source`, () => {
        const printer = new Printer();
        function check(code) {
            const ast = parse(code, { parser });
            assert.strictEqual(printer.print(ast).code, code);
        }
        check("");
        check("/* block comment */");
        check("// line comment");
        check("\t\t\t");
        check(eol);
        check(eol + eol);
        check("    ");
    });
    const lineCommentTypes = {
        acorn: "Line",
        babel: "CommentLine",
        esprima: "Line",
        flow: "CommentLine",
        typescript: "CommentLine"
    };
    it.todo(`[${parserName}] parser basics`, function testParser(done) {
        const code = `${testParser}`;
        const ast = parse(code, { parser });
        namedTypes.File.assert(ast);
        assert.ok(getReprinter(FastPath.from(ast)));
        const funDecl = ast.program.body[0];
        const funBody = funDecl.body;
        namedTypes.FunctionDeclaration.assert(funDecl);
        namedTypes.BlockStatement.assert(funBody);
        assert.ok(getReprinter(FastPath.from(funBody)));
        const lastStatement = funBody.body.pop();
        const doneCall = lastStatement.expression;
        assert.ok(!getReprinter(FastPath.from(funBody)));
        assert.ok(getReprinter(FastPath.from(ast)));
        funBody.body.push(lastStatement);
        assert.ok(getReprinter(FastPath.from(funBody)));
        assert.strictEqual(doneCall.callee.name, "done");
        assert.strictEqual(lastStatement.comments.length, 2);
        const firstComment = lastStatement.comments[0];
        assert.strictEqual(firstComment.type, lineCommentTypes[parserName]);
        assert.strictEqual(firstComment.leading, true);
        assert.strictEqual(firstComment.trailing, false);
        assert.strictEqual(firstComment.value, " Make sure done() remains the final statement in this function,");
        const secondComment = lastStatement.comments[1];
        assert.strictEqual(secondComment.type, lineCommentTypes[parserName]);
        assert.strictEqual(secondComment.leading, true);
        assert.strictEqual(secondComment.trailing, false);
        assert.strictEqual(secondComment.value, " or the above assertions will probably fail.");
        // Make sure done() remains the final statement in this function,
        // or the above assertions will probably fail.
        done();
    });
    it(`[${parserName}] LocationFixer`, () => {
        const code = [
            "function foo() {",
            "    a()",
            "    b()",
            "}"
        ].join(eol);
        const ast = parse(code, { parser });
        const printer = new Printer();
        types.visit(ast, {
            visitFunctionDeclaration(path) {
                if (namedTypes.BlockStatement.check(path.node.body)) {
                    path.node.body.body.reverse();
                }
                this.traverse(path);
            }
        });
        const altered = code
            .replace("a()", "xxx")
            .replace("b()", "a()")
            .replace("xxx", "b()");
        assert.strictEqual(altered, printer.print(ast).code);
    });
    it(`[${parserName}] TabHandling`, () => {
        function check(code, tabWidth) {
            const lines = fromString(code, { tabWidth });
            assert.strictEqual(lines.length, 1);
            types.visit(parse(code, {
                tabWidth,
                parser
            }), {
                check(s, loc) {
                    const sliced = lines.slice(loc.start, loc.end);
                    assert.strictEqual(`${s}`, sliced.toString());
                },
                visitIdentifier(path) {
                    const ident = path.node;
                    this.check(ident.name, ident.loc);
                    this.traverse(path);
                },
                visitLiteral(path) {
                    const lit = path.node;
                    this.check(lit.value, lit.loc);
                    this.traverse(path);
                }
            });
        }
        for (let tabWidth = 1; tabWidth <= 8; ++tabWidth) {
            check("\t\ti = 10;", tabWidth);
            check("\t\ti \t= 10;", tabWidth);
            check("\t\ti \t=\t 10;", tabWidth);
            check("\t \ti \t=\t 10;", tabWidth);
            check("\t \ti \t=\t 10;\t", tabWidth);
            check("\t \ti \t=\t 10;\t ", tabWidth);
        }
    });
    it(`[${parserName}] Only comment followed by space`, () => {
        const printer = new Printer();
        function check(code) {
            const ast = parse(code, { parser });
            assert.strictEqual(printer.print(ast).code, code);
        }
        check("// comment");
        check("// comment ");
        check("// comment\n");
        check("// comment\n\n");
        check(" // comment\n");
        check(" // comment\n ");
        check(" // comment \n ");
        check("/* comment */");
        check("/* comment */ ");
        check(" /* comment */");
        check("\n/* comment */");
        check("\n/* comment */\n");
        check("\n /* comment */\n ");
        check("/* comment */\n ");
        check("/* com\n\nment */");
        check("/* com\n\nment */ ");
        check(" /* com\n\nment */ ");
    });
}
