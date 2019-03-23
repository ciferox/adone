const {
    cli: { chalk },
    text: { stripAnsi },
    js: { compiler: { codeFrame, codeFrameColumns } }
} = adone;

describe("js", "compiler", "codeFrame/codeFrameColumns", () => {
    it("basic usage", () => {
        const rawLines = ["class Foo {", "  constructor()", "};"].join("\n");
        expect(codeFrame(rawLines, 2, 16)).to.be.equal(
            [
                "  1 | class Foo {",
                "> 2 |   constructor()",
                "    |                ^",
                "  3 | };",
            ].join("\n"),
        );
    });

    it("optional column number", () => {
        const rawLines = ["class Foo {", "  constructor()", "};"].join("\n");
        expect(codeFrame(rawLines, 2, null)).to.be.equal(
            ["  1 | class Foo {", "> 2 |   constructor()", "  3 | };"].join("\n"),
        );
    });

    it("maximum context lines and padding", () => {
        const rawLines = [
            "/**",
            " * Sums two numbers.",
            " *",
            " * @param a Number",
            " * @param b Number",
            " * @returns Number",
            " */",
            "",
            "function sum(a, b) {",
            "  return a + b",
            "}",
        ].join("\n");
        expect(codeFrame(rawLines, 7, 2)).to.be.equal(
            [
                "   5 |  * @param b Number",
                "   6 |  * @returns Number",
                ">  7 |  */",
                "     |  ^",
                "   8 | ",
                "   9 | function sum(a, b) {",
                "  10 |   return a + b",
            ].join("\n"),
        );
    });

    it("no unnecessary padding due to one-off errors", () => {
        const rawLines = [
            "/**",
            " * Sums two numbers.",
            " *",
            " * @param a Number",
            " * @param b Number",
            " * @returns Number",
            " */",
            "",
            "function sum(a, b) {",
            "  return a + b",
            "}",
        ].join("\n");
        expect(codeFrame(rawLines, 6, 2)).to.be.equal(
            [
                "  4 |  * @param a Number",
                "  5 |  * @param b Number",
                "> 6 |  * @returns Number",
                "    |  ^",
                "  7 |  */",
                "  8 | ",
                "  9 | function sum(a, b) {",
            ].join("\n"),
        );
    });

    it("tabs", () => {
        const rawLines = [
            "\tclass Foo {",
            "\t  \t\t    constructor\t(\t)",
            "\t};",
        ].join("\n");
        expect(codeFrame(rawLines, 2, 25)).to.be.equal(
            [
                "  1 | \tclass Foo {",
                "> 2 | \t  \t\t    constructor\t(\t)",
                "    | \t  \t\t               \t \t ^",
                "  3 | \t};",
            ].join("\n"),
        );
    });

    it("opts.highlightCode", () => {
        const rawLines = "console.log('babel')";
        const result = codeFrame(rawLines, 1, 9, { highlightCode: true });
        const stripped = stripAnsi(result);
        expect(result.length).to.be.greaterThan(stripped.length);
        expect(stripped).to.be.equal(
            ["> 1 | console.log('babel')", "    |         ^"].join("\n"),
        );
    });

    it("opts.linesAbove", () => {
        const rawLines = [
            "/**",
            " * Sums two numbers.",
            " *",
            " * @param a Number",
            " * @param b Number",
            " * @returns Number",
            " */",
            "",
            "function sum(a, b) {",
            "  return a + b",
            "}",
        ].join("\n");
        expect(codeFrame(rawLines, 7, 2, { linesAbove: 1 })).to.be.equal(
            [
                "   6 |  * @returns Number",
                ">  7 |  */",
                "     |  ^",
                "   8 | ",
                "   9 | function sum(a, b) {",
                "  10 |   return a + b",
            ].join("\n"),
        );
    });

    it("opts.linesBelow", () => {
        const rawLines = [
            "/**",
            " * Sums two numbers.",
            " *",
            " * @param a Number",
            " * @param b Number",
            " * @returns Number",
            " */",
            "",
            "function sum(a, b) {",
            "  return a + b",
            "}",
        ].join("\n");
        expect(codeFrame(rawLines, 7, 2, { linesBelow: 1 })).to.be.equal(
            [
                "  5 |  * @param b Number",
                "  6 |  * @returns Number",
                "> 7 |  */",
                "    |  ^",
                "  8 | ",
            ].join("\n"),
        );
    });

    it("opts.linesAbove and opts.linesBelow", () => {
        const rawLines = [
            "/**",
            " * Sums two numbers.",
            " *",
            " * @param a Number",
            " * @param b Number",
            " * @returns Number",
            " */",
            "",
            "function sum(a, b) {",
            "  return a + b",
            "}",
        ].join("\n");
        expect(codeFrame(rawLines, 7, 2, { linesAbove: 1, linesBelow: 1 })).to.be.equal(
            ["  6 |  * @returns Number", "> 7 |  */", "    |  ^", "  8 | "].join(
                "\n",
            ),
        );
    });

    it("opts.linesAbove no lines above", () => {
        const rawLines = [
            "class Foo {",
            "  constructor() {",
            "    console.log(arguments);",
            "  }",
            "};",
        ].join("\n");
        expect(
            codeFrameColumns(rawLines, { start: { line: 2 } }, { linesAbove: 0 }),
        ).to.be.equal(
            [
                "> 2 |   constructor() {",
                "  3 |     console.log(arguments);",
                "  4 |   }",
                "  5 | };",
            ].join("\n"),
        );
    });

    it("opts.linesBelow no lines below", () => {
        const rawLines = [
            "class Foo {",
            "  constructor() {",
            "    console.log(arguments);",
            "  }",
            "};",
        ].join("\n");
        expect(
            codeFrameColumns(rawLines, { start: { line: 2 } }, { linesBelow: 0 }),
        ).to.be.equal(["  1 | class Foo {", "> 2 |   constructor() {"].join("\n"));
    });

    it("opts.linesBelow single line", () => {
        const rawLines = [
            "class Foo {",
            "  constructor() {",
            "    console.log(arguments);",
            "  }",
            "};",
        ].join("\n");
        expect(
            codeFrameColumns(
                rawLines,
                { start: { line: 2 } },
                { linesAbove: 0, linesBelow: 0 },
            ),
        ).to.be.equal(["> 2 |   constructor() {"].join("\n"));
    });

    it("opts.forceColor", () => {
        const marker = chalk.red.bold;
        const gutter = chalk.grey;

        const rawLines = ["", "", "", ""].join("\n");
        expect(
            codeFrame(rawLines, 3, null, {
                linesAbove: 1,
                linesBelow: 1,
                forceColor: true,
            }),
        ).to.be.equal(
            chalk.reset(
                [
                    " " + gutter(" 2 | "),
                    marker(">") + gutter(" 3 | "),
                    " " + gutter(" 4 | "),
                ].join("\n"),
            ),
        );
    });

    it("basic usage, new API", () => {
        const rawLines = ["class Foo {", "  constructor()", "};"].join("\n");
        expect(
            codeFrameColumns(rawLines, { start: { line: 2, column: 16 } }),
        ).to.be.equal(
            [
                "  1 | class Foo {",
                "> 2 |   constructor()",
                "    |                ^",
                "  3 | };",
            ].join("\n"),
        );
    });

    it("mark multiple columns", () => {
        const rawLines = ["class Foo {", "  constructor()", "};"].join("\n");
        expect(
            codeFrameColumns(rawLines, {
                start: { line: 2, column: 3 },
                end: { line: 2, column: 16 },
            }),
        ).to.be.equal(
            [
                "  1 | class Foo {",
                "> 2 |   constructor()",
                "    |   ^^^^^^^^^^^^^",
                "  3 | };",
            ].join("\n"),
        );
    });

    it("mark multiple columns across lines", () => {
        const rawLines = ["class Foo {", "  constructor() {", "  }", "};"].join(
            "\n",
        );
        expect(
            codeFrameColumns(rawLines, {
                start: { line: 2, column: 17 },
                end: { line: 3, column: 3 },
            }),
        ).to.be.equal(
            [
                "  1 | class Foo {",
                "> 2 |   constructor() {",
                "    |                 ^",
                "> 3 |   }",
                "    | ^^^",
                "  4 | };",
            ].join("\n"),
        );
    });

    it("mark multiple columns across multiple lines", () => {
        const rawLines = [
            "class Foo {",
            "  constructor() {",
            "    console.log(arguments);",
            "  }",
            "};",
        ].join("\n");
        expect(
            codeFrameColumns(rawLines, {
                start: { line: 2, column: 17 },
                end: { line: 4, column: 3 },
            }),
        ).to.be.equal(
            [
                "  1 | class Foo {",
                "> 2 |   constructor() {",
                "    |                 ^",
                "> 3 |     console.log(arguments);",
                "    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^",
                "> 4 |   }",
                "    | ^^^",
                "  5 | };",
            ].join("\n"),
        );
    });

    it("mark across multiple lines without columns", () => {
        const rawLines = [
            "class Foo {",
            "  constructor() {",
            "    console.log(arguments);",
            "  }",
            "};",
        ].join("\n");
        expect(
            codeFrameColumns(rawLines, { start: { line: 2 }, end: { line: 4 } }),
        ).to.be.equal(
            [
                "  1 | class Foo {",
                "> 2 |   constructor() {",
                "> 3 |     console.log(arguments);",
                "> 4 |   }",
                "  5 | };",
            ].join("\n"),
        );
    });

    it("opts.message", () => {
        const rawLines = ["class Foo {", "  constructor()", "};"].join("\n");
        expect(
            codeFrameColumns(
                rawLines,
                { start: { line: 2, column: 16 } },
                {
                    message: "Missing {",
                },
            ),
        ).to.be.equal(
            [
                "  1 | class Foo {",
                "> 2 |   constructor()",
                "    |                ^ Missing {",
                "  3 | };",
            ].join("\n"),
        );
    });

    it("opts.message without column", () => {
        const rawLines = ["class Foo {", "  constructor()", "};"].join("\n");
        expect(
            codeFrameColumns(
                rawLines,
                { start: { line: 2 } },
                {
                    message: "Missing {",
                },
            ),
        ).to.be.equal(
            [
                "  Missing {",
                "  1 | class Foo {",
                "> 2 |   constructor()",
                "  3 | };",
            ].join("\n"),
        );
    });

    it("opts.message with multiple lines", () => {
        const rawLines = [
            "class Foo {",
            "  constructor() {",
            "    console.log(arguments);",
            "  }",
            "};",
        ].join("\n");
        expect(
            codeFrameColumns(
                rawLines,
                {
                    start: { line: 2, column: 17 },
                    end: { line: 4, column: 3 },
                },
                {
                    message: "something about the constructor body",
                },
            ),
        ).to.be.equal(
            [
                "  1 | class Foo {",
                "> 2 |   constructor() {",
                "    |                 ^",
                "> 3 |     console.log(arguments);",
                "    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^",
                "> 4 |   }",
                "    | ^^^ something about the constructor body",
                "  5 | };",
            ].join("\n"),
        );
    });

    it("opts.message with multiple lines without columns", () => {
        const rawLines = [
            "class Foo {",
            "  constructor() {",
            "    console.log(arguments);",
            "  }",
            "};",
        ].join("\n");
        expect(
            codeFrameColumns(
                rawLines,
                { start: { line: 2 }, end: { line: 4 } },
                {
                    message: "something about the constructor body",
                },
            ),
        ).to.be.equal(
            [
                "  something about the constructor body",
                "  1 | class Foo {",
                "> 2 |   constructor() {",
                "> 3 |     console.log(arguments);",
                "> 4 |   }",
                "  5 | };",
            ].join("\n"),
        );
    });
});
