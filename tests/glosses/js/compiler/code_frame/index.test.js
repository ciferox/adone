const { codeFrame } = adone.js.compiler;


describe("js", "compiler", "code_frame", () => {
    it("basic usage", () => {
        const rawLines = [
            "class Foo {",
            "  constructor()",
            "};"
        ].join("\n");
        assert.equal(codeFrame(rawLines, 2, 16), [
            "  1 | class Foo {",
            "> 2 |   constructor()",
            "    |                ^",
            "  3 | };"
        ].join("\n"));
    });

    it("optional column number", () => {
        const rawLines = [
            "class Foo {",
            "  constructor()",
            "};"
        ].join("\n");
        assert.equal(codeFrame(rawLines, 2, null), [
            "  1 | class Foo {",
            "> 2 |   constructor()",
            "  3 | };"
        ].join("\n"));
    });

    it("optional column number", () => {
        const rawLines = [
            "class Foo {",
            "  constructor()",
            "};"
        ].join("\n");
        assert.equal(codeFrame(rawLines, 2, null), [
            "  1 | class Foo {",
            "> 2 |   constructor()",
            "  3 | };"
        ].join("\n"));
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
            "}"
        ].join("\n");
        assert.equal(codeFrame(rawLines, 7, 2), [
            "   5 |  * @param b Number",
            "   6 |  * @returns Number",
            ">  7 |  */",
            "     |  ^",
            "   8 | ",
            "   9 | function sum(a, b) {",
            "  10 |   return a + b"
        ].join("\n"));
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
            "}"
        ].join("\n");
        assert.equal(codeFrame(rawLines, 6, 2), [
            "  4 |  * @param a Number",
            "  5 |  * @param b Number",
            "> 6 |  * @returns Number",
            "    |  ^",
            "  7 |  */",
            "  8 | ",
            "  9 | function sum(a, b) {"
        ].join("\n"));
    });

    it("tabs", () => {
        const rawLines = [
            "\tclass Foo {",
            "\t  \t\t    constructor\t(\t)",
            "\t};"
        ].join("\n");
        assert.equal(codeFrame(rawLines, 2, 25), [
            "  1 | \tclass Foo {",
            "> 2 | \t  \t\t    constructor\t(\t)",
            "    | \t  \t\t               \t \t ^",
            "  3 | \t};"
        ].join("\n"));
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
            "}"
        ].join("\n");
        assert.equal(codeFrame(rawLines, 7, 2, { linesAbove: 1 }), [
            "   6 |  * @returns Number",
            ">  7 |  */",
            "     |  ^",
            "   8 | ",
            "   9 | function sum(a, b) {",
            "  10 |   return a + b"
        ].join("\n"));
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
            "}"
        ].join("\n");
        assert.equal(codeFrame(rawLines, 7, 2, { linesBelow: 1 }), [
            "  5 |  * @param b Number",
            "  6 |  * @returns Number",
            "> 7 |  */",
            "    |  ^",
            "  8 | "
        ].join("\n"));
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
            "}"
        ].join("\n");
        assert.equal(codeFrame(rawLines, 7, 2, { linesAbove: 1, linesBelow: 1 }), [
            "  6 |  * @returns Number",
            "> 7 |  */",
            "    |  ^",
            "  8 | "
        ].join("\n"));
    });
});
