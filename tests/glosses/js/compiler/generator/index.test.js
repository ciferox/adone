const { types, parse, generate, Printer, Whitespace } = adone.js.compiler;
const { fs, path } = adone.std;
import helperFixture from "../helper_fixture";

describe("generation", function() {
    it("completeness", function() {
        Object.keys(types.VISITOR_KEYS).forEach(function(type) {
            assert.isOk(!!Printer.prototype[type], type + " should exist");
        });

        Object.keys(Printer.prototype).forEach(function(type) {
            if (!/[A-Z]/.test(type[0])) {
                return;
            }
            assert.isOk(types.VISITOR_KEYS[type], type + " should not exist");
        });
    });

    it("multiple sources", function() {
        const sources = {
            "a.js": "function hi (msg) { console.log(msg); }\n",
            "b.js": "hi('hello');\n"
        };
        const parsed = Object.keys(sources).reduce(function(_parsed, filename) {
            _parsed[filename] = parse(sources[filename], { sourceFilename: filename });
            return _parsed;
        }, {});

        const combinedAst = {
            "type": "File",
            "program": {
                "type": "Program",
                "sourceType": "module",
                "body": [].concat(parsed["a.js"].program.body, parsed["b.js"].program.body)
            }
        };

        const generated = generate(combinedAst, { sourceMaps: true }, sources);

        expect(generated.map).to.deep.equal({
            version: 3,
            sources: ["a.js", "b.js"],
            mappings: "AAAA,SAASA,EAAT,CAAaC,GAAb,EAAkB;AAAEC,UAAQC,GAAR,CAAYF,GAAZ;AAAmB;;ACAvCD,GAAG,OAAH",
            names: [
                "hi",
                "msg",
                "console",
                "log"
            ],
            sourcesContent: [
                "function hi (msg) { console.log(msg); }\n",
                "hi('hello');\n"
            ]
        }, "sourcemap was incorrectly generated");

        expect(generated.rawMappings).to.deep.equal([
            {
                name: undefined,
                generated: { line: 1, column: 0 },
                source: "a.js",
                original: { line: 1, column: 0 }
            },
            {
                name: "hi",
                generated: { line: 1, column: 9 },
                source: "a.js",
                original: { line: 1, column: 9 }
            },
            {
                name: undefined,
                generated: { line: 1, column: 11 },
                source: "a.js",
                original: { line: 1, column: 0 }
            },
            {
                name: "msg",
                generated: { line: 1, column: 12 },
                source: "a.js",
                original: { line: 1, column: 13 }
            },
            {
                name: undefined,
                generated: { line: 1, column: 15 },
                source: "a.js",
                original: { line: 1, column: 0 }
            },
            {
                name: undefined,
                generated: { line: 1, column: 17 },
                source: "a.js",
                original: { line: 1, column: 18 }
            },
            {
                name: "console",
                generated: { line: 2, column: 0 },
                source: "a.js",
                original: { line: 1, column: 20 }
            },
            {
                name: "log",
                generated: { line: 2, column: 10 },
                source: "a.js",
                original: { line: 1, column: 28 }
            },
            {
                name: undefined,
                generated: { line: 2, column: 13 },
                source: "a.js",
                original: { line: 1, column: 20 }
            },
            {
                name: "msg",
                generated: { line: 2, column: 14 },
                source: "a.js",
                original: { line: 1, column: 32 }
            },
            {
                name: undefined,
                generated: { line: 2, column: 17 },
                source: "a.js",
                original: { line: 1, column: 20 }
            },
            {
                name: undefined,
                generated: { line: 3, column: 0 },
                source: "a.js",
                original: { line: 1, column: 39 }
            },
            {
                name: "hi",
                generated: { line: 5, column: 0 },
                source: "b.js",
                original: { line: 1, column: 0 }
            },
            {
                name: undefined,
                generated: { line: 5, column: 3 },
                source: "b.js",
                original: { line: 1, column: 3 }
            },
            {
                name: undefined,
                generated: { line: 5, column: 10 },
                source: "b.js",
                original: { line: 1, column: 0 }
            }
        ], "raw mappings were incorrectly generated");

        expect(generated.code).to.equal(
            "function hi(msg) {\n  console.log(msg);\n}\n\nhi('hello');",
            "code was incorrectly generated"
        );
    });

    it("identifierName", function() {
        const code = "function foo() { bar; }\n";

        const ast = parse(code, { filename: "inline" }).program;
        const fn = ast.body[0];

        const id = fn.id;
        id.name += "2";
        id.loc.identifierName = "foo";

        const id2 = fn.body.body[0].expression;
        id2.name += "2";
        id2.loc.identiferName = "bar";

        const generated = generate(ast, {
            filename: "inline",
            sourceFileName: "inline",
            sourceMaps: true
        }, code);

        expect(generated.map).to.deep.equal({
            version: 3,
            sources: ["inline"],
            names: ["foo", "bar"],
            mappings: "AAAA,SAASA,IAAT,GAAe;AAAEC;AAAM",
            sourcesContent: ["function foo() { bar; }\n"]
        }, "sourcemap was incorrectly generated");

        expect(generated.rawMappings).to.deep.equal([
            {
                name: undefined,
                generated: { line: 1, column: 0 },
                source: "inline",
                original: { line: 1, column: 0 }
            },
            {
                name: "foo",
                generated: { line: 1, column: 9 },
                source: "inline",
                original: { line: 1, column: 9 }
            },
            {
                name: undefined,
                generated: { line: 1, column: 13 },
                source: "inline",
                original: { line: 1, column: 0 }
            },
            {
                name: undefined,
                generated: { line: 1, column: 16 },
                source: "inline",
                original: { line: 1, column: 15 }
            },
            {
                name: "bar",
                generated: { line: 2, column: 0 },
                source: "inline",
                original: { line: 1, column: 17 }
            },
            {
                name: undefined,
                generated: { line: 3, column: 0 },
                source: "inline",
                original: { line: 1, column: 23 }
            }
        ], "raw mappings were incorrectly generated");

        expect(generated.code).to.equal(
            "function foo2() {\n  bar2;\n}",
            "code was incorrectly generated"
        );
    });
});

it("lazy source map generation", function() {
    const code = "function hi (msg) { console.log(msg); }\n";

    const ast = parse(code, { filename: "a.js" }).program;
    const generated = generate(ast, {
        sourceFileName: "a.js",
        sourceMaps: true
    });

    expect(generated.rawMappings).to.be.an("array");

    expect(generated).ownPropertyDescriptor("map").not.to.have.property("value");

    expect(generated.map).to.be.an("object");
});


describe("programmatic generation", function() {
    it("numeric member expression", function() {
        // Should not generate `0.foo`
        const mem = types.memberExpression(types.numericLiteral(60702), types.identifier("foo"));
        new Function(generate(mem).code);
    });

    it("nested if statements needs block", function() {
        const ifStatement = types.ifStatement(
            types.stringLiteral("top cond"),
            types.whileStatement(
                types.stringLiteral("while cond"),
                types.ifStatement(
                    types.stringLiteral("nested"),
                    types.expressionStatement(types.numericLiteral(1))
                )
            ),
            types.expressionStatement(types.stringLiteral("alt"))
        );

        const ast = parse(generate(ifStatement).code);
        assert.equal(ast.program.body[0].consequent.type, "BlockStatement");
    });

    it("prints directives in block with empty body", function() {
        const blockStatement = types.blockStatement(
            [],
            [types.directive(types.directiveLiteral("use strict"))]
        );

        const output = generate(blockStatement).code;
        assert.equal(output, [
            "{",
            "  \"use strict\";",
            "}"
        ].join("\n"));
    });

    it("flow object indentation", function() {
        const objectStatement = types.objectTypeAnnotation(
            [
                types.objectTypeProperty(
                    types.identifier("bar"),
                    types.stringTypeAnnotation()
                )
            ],
            null,
            null
        );

        const output = generate(objectStatement).code;
        assert.equal(output, [
            "{",
            "  bar: string;",
            "}"
        ].join("\n"));
    });

    it("flow object indentation with empty leading ObjectTypeProperty", function() {
        const objectStatement = types.objectTypeAnnotation(
            [], [
                types.objectTypeIndexer(
                    types.identifier("key"),
                    types.anyTypeAnnotation(),
                    types.identifier("Test"),
                )
            ]
        );

        const output = generate(objectStatement).code;

        assert.equal(output, [
            "{",
            "  [key: any]: Test;",
            "}"
        ].join("\n"));
    });
});

describe("whitespace", function() {
    it("empty token list", function() {
        const w = new Whitespace([]);
        assert.equal(w.getNewlinesBefore(types.stringLiteral("1")), 0);
    });
});

const suites = helperFixture(__dirname + "/fixtures");

suites.forEach(function(testSuite) {
    describe("generation/" + testSuite.title, function() {
        testSuite.tests.forEach(function(task) {
            it(task.title, !task.disabled && function() {
                const taskExpect = task.expect;
                const actual = task.actual;
                const actualCode = actual.code;

                if (actualCode) {
                    const actualAst = parse(actualCode, {
                        filename: actual.loc,
                        plugins: ["*"],
                        strictMode: false,
                        sourceType: "module"
                    });
                    const result = generate(actualAst, task.options, actualCode);

                    if (
                        !taskExpect.code && result.code &&    fs.statSync(path.dirname(taskExpect.loc)).isDirectory() &&
                        !process.env.CI
                    ) {
                        console.log(`New test file created: ${taskExpect.loc}`);
                        fs.writeFileSync(taskExpect.loc, result.code);
                    } else {
                        expect(result.code).to.be.equal(taskExpect.code, actual.loc + " !== " + taskExpect.loc);
                    }
                }
            });
        });
    });
});
