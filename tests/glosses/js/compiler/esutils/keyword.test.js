const { esutils } = adone.js.compiler;

const KW = [
    "if",
    "in",
    "do",
    "var",
    "for",
    "new",
    "try",
    "this",
    "else",
    "case",
    "void",
    "with",
    "enum",
    "while",
    "break",
    "catch",
    "throw",
    "const",
    "class",
    "super",
    "return",
    "typeof",
    "delete",
    "switch",
    "export",
    "import",
    "default",
    "finally",
    "extends",
    "function",
    "continue",
    "debugger",
    "instanceof"
];

const SRW = [
    "implements",
    "interface",
    "package",
    "private",
    "protected",
    "public",
    "static",
    "let"
];

describe("js", "compiler", "esutils", "keyword", () => {
    describe("isKeywordES6", () => {
        it("returns true if provided string is keyword under non-strict mode", () => {
            for (const word of KW) {
                expect(esutils.keyword.isKeywordES6(word, false)).to.be.true;
            }

            return expect(esutils.keyword.isKeywordES6("yield", false)).to.be.true;
        });

        it("returns false if provided string is not keyword under non-strict mode", () => {
            const words = [
                "hello",
                "20",
                "$",
                "ゆゆ式"
            ];

            for (const word of words) {
                expect(esutils.keyword.isKeywordES6(word, false)).to.be.false;
            }

            return SRW.map((word) =>
                expect(esutils.keyword.isKeywordES6(word, false)).to.be.false);
        });

        it("returns true if provided string is keyword under strict mode", () => {
            for (const word of KW) {
                expect(esutils.keyword.isKeywordES6(word, true)).to.be.true;
            }

            expect(esutils.keyword.isKeywordES6("yield", true)).to.be.true;

            return SRW.map((word) =>
                expect(esutils.keyword.isKeywordES6(word, true)).to.be.true);
        });


        return it("returns false if provided string is not keyword under strict mode", () => {
            const words = [
                "hello",
                "20",
                "$",
                "ゆゆ式"
            ];

            return words.map((word) =>
                expect(esutils.keyword.isKeywordES6(word, true)).to.be.false);
        });
    });


    describe("isKeywordES5", () => {
        it("returns true if provided string is keyword under non-strict mode", () =>
            KW.map((word) =>
                expect(esutils.keyword.isKeywordES5(word, false)).to.be.true)
        );

        it("returns false if provided string is not keyword under non-strict mode", () => {
            const words = [
                "hello",
                "20",
                "$",
                "ゆゆ式"
            ];

            for (const word of words) {
                expect(esutils.keyword.isKeywordES5(word, false)).to.be.false;
            }

            for (const word of SRW) {
                expect(esutils.keyword.isKeywordES5(word, false)).to.be.false;
            }

            return expect(esutils.keyword.isKeywordES5("yield", false)).to.be.false;
        });

        it("returns true if provided string is keyword under strict mode", () => {
            for (const word of KW) {
                expect(esutils.keyword.isKeywordES5(word, true)).to.be.true;
            }

            expect(esutils.keyword.isKeywordES5("yield", true)).to.be.true;

            return SRW.map((word) =>
                expect(esutils.keyword.isKeywordES5(word, true)).to.be.true);
        });


        return it("returns false if provided string is not keyword under strict mode", () => {
            const words = [
                "hello",
                "20",
                "$",
                "ゆゆ式"
            ];

            return words.map((word) =>
                expect(esutils.keyword.isKeywordES5(word, true)).to.be.false);
        });
    });


    describe("isReservedWordES6", () => {
        it("returns true for null/boolean values", () => {
            expect(esutils.keyword.isReservedWordES6("null", false)).to.be.true;
            expect(esutils.keyword.isReservedWordES6("null", true)).to.be.true;
            expect(esutils.keyword.isReservedWordES6("true", false)).to.be.true;
            expect(esutils.keyword.isReservedWordES6("true", true)).to.be.true;
            expect(esutils.keyword.isReservedWordES6("false", false)).to.be.true;
            return expect(esutils.keyword.isReservedWordES6("false", true)).to.be.true;
        });

        // isReservedWordES6 has the same properties as isKeywordES6

        it("returns true if provided string is keyword under non-strict mode", () => {
            for (const word of KW) {
                expect(esutils.keyword.isReservedWordES6(word, false)).to.be.true;
            }

            return expect(esutils.keyword.isReservedWordES6("yield", false)).to.be.true;
        });

        it("returns false if provided string is not keyword under non-strict mode", () => {
            const words = [
                "hello",
                "20",
                "$",
                "ゆゆ式"
            ];

            for (const word of words) {
                expect(esutils.keyword.isReservedWordES6(word, false)).to.be.false;
            }

            return SRW.map((word) =>
                expect(esutils.keyword.isReservedWordES6(word, false)).to.be.false);
        });

        it("returns true if provided string is keyword under strict mode", () => {
            for (const word of KW) {
                expect(esutils.keyword.isReservedWordES6(word, true)).to.be.true;
            }

            expect(esutils.keyword.isReservedWordES6("yield", true)).to.be.true;

            return SRW.map((word) =>
                expect(esutils.keyword.isReservedWordES6(word, true)).to.be.true);
        });


        return it("returns false if provided string is not keyword under strict mode", () => {
            const words = [
                "hello",
                "20",
                "$",
                "ゆゆ式"
            ];

            return words.map((word) =>
                expect(esutils.keyword.isReservedWordES6(word, true)).to.be.false);
        });
    });


    describe("isReservedWordES5", () => {
        it("returns true for null/boolean values", () => {
            expect(esutils.keyword.isReservedWordES5("null", false)).to.be.true;
            expect(esutils.keyword.isReservedWordES5("null", true)).to.be.true;
            expect(esutils.keyword.isReservedWordES5("true", false)).to.be.true;
            expect(esutils.keyword.isReservedWordES5("true", true)).to.be.true;
            expect(esutils.keyword.isReservedWordES5("false", false)).to.be.true;
            return expect(esutils.keyword.isReservedWordES5("false", true)).to.be.true;
        });

        // isReservedWordES5 has the same properties as isKeywordES5

        it("returns true if provided string is keyword under non-strict mode", () =>
            KW.map((word) =>
                expect(esutils.keyword.isReservedWordES5(word, false)).to.be.true)
        );

        it("returns false if provided string is not keyword under non-strict mode", () => {
            const words = [
                "hello",
                "20",
                "$",
                "ゆゆ式"
            ];

            for (const word of words) {
                expect(esutils.keyword.isReservedWordES5(word, false)).to.be.false;
            }

            for (const word of SRW) {
                expect(esutils.keyword.isReservedWordES5(word, false)).to.be.false;
            }

            return expect(esutils.keyword.isReservedWordES5("yield", false)).to.be.false;
        });

        it("returns true if provided string is keyword under strict mode", () => {
            for (const word of KW) {
                expect(esutils.keyword.isReservedWordES5(word, true)).to.be.true;
            }

            expect(esutils.keyword.isReservedWordES5("yield", true)).to.be.true;

            return SRW.map((word) =>
                expect(esutils.keyword.isReservedWordES5(word, true)).to.be.true);
        });


        return it("returns false if provided string is not keyword under strict mode", () => {
            const words = [
                "hello",
                "20",
                "$",
                "ゆゆ式"
            ];

            return words.map((word) =>
                expect(esutils.keyword.isReservedWordES5(word, true)).to.be.false);
        });
    });


    describe("isRestrictedWord", () => {
        it("returns true if provided string is \"eval\" or \"arguments\"", () => {
            expect(esutils.keyword.isRestrictedWord("eval")).to.be.true;
            return expect(esutils.keyword.isRestrictedWord("arguments")).to.be.true;
        });

        return it("returns false if provided string is not \"eval\" or \"arguments\"", () => {
            const words = [
                "hello",
                "20",
                "$",
                "ゆゆ式"
            ];

            return words.map((word) =>
                expect(esutils.keyword.isRestrictedWord(word)).to.be.false);
        });
    });


    describe("isIdentifierName", () => {
        it("returns false if provided string is empty", () => {
            expect(esutils.keyword.isIdentifierNameES5("")).to.be.false;
            return expect(esutils.keyword.isIdentifierNameES6("")).to.be.false;
        });

        it("returns true if provided string is IdentifierName", () => {
            const words = [
                "hello",
                "$",
                "ゆゆ式",
                "$20",
                "hello20",
                "_",
                "if"
            ];

            return words.map((word) =>
                (expect(esutils.keyword.isIdentifierNameES5(word)).to.be.true,
                    expect(esutils.keyword.isIdentifierNameES6(word)).to.be.true));
        });


        it("returns false if provided string is not IdentifierName", () => {
            const words = [
                "+hello",
                "0$",
                "-ゆゆ式",
                "#_",
                "_#"
            ];

            return words.map((word) =>
                (expect(esutils.keyword.isIdentifierNameES5(word)).to.be.false,
                    expect(esutils.keyword.isIdentifierNameES6(word)).to.be.false));
        });

        return it("supports astral symbols", () => expect(esutils.keyword.isIdentifierNameES6("x\uDB40\uDDD5")).to.be.true);
    });


    describe("isIdentifierES5", () => {
        it("returns false if provided string is empty", () => expect(esutils.keyword.isIdentifierES5("")).to.be.false);

        it("returns true if provided string is Identifier", () => {
            const words = [
                "hello",
                "$",
                "ゆゆ式",
                "$20",
                "hello20",
                "_"
            ];

            for (const word of words) {
                expect(esutils.keyword.isIdentifierES5(word)).to.be.true;
            }

            expect(esutils.keyword.isIdentifierES5("yield", false)).to.be.true;
            return expect(esutils.keyword.isIdentifierES5("let", false)).to.be.true;
        });

        return it("returns false if provided string is not Identifier", () => {
            const words = [
                "+hello",
                "0$",
                "-ゆゆ式",
                "#_",
                "_#",
                "if",
                "null",
                "true",
                "false"
            ];

            for (const word of words) {
                expect(esutils.keyword.isIdentifierES5(word)).to.be.false;
            }

            expect(esutils.keyword.isIdentifierES5("yield", true)).to.be.false;
            return expect(esutils.keyword.isIdentifierES5("let", true)).to.be.false;
        });
    });


    return describe("isIdentifierES6", () => {
        it("returns false if provided string is empty", () => expect(esutils.keyword.isIdentifierES6("")).to.be.false);

        it("returns true if provided string is Identifier", () => {
            const words = [
                "hello",
                "$",
                "ゆゆ式",
                "$20",
                "hello20",
                "_"
            ];

            for (const word of words) {
                expect(esutils.keyword.isIdentifierES6(word)).to.be.true;
            }

            return expect(esutils.keyword.isIdentifierES6("let", false)).to.be.true;
        });

        return it("returns false if provided string is not Identifier", () => {
            const words = [
                "+hello",
                "0$",
                "-ゆゆ式",
                "#_",
                "_#",
                "if",
                "null",
                "true",
                "false"
            ];

            for (const word of words) {
                expect(esutils.keyword.isIdentifierES6(word)).to.be.false;
            }

            expect(esutils.keyword.isIdentifierES6("yield", false)).to.be.false;
            expect(esutils.keyword.isIdentifierES6("yield", true)).to.be.false;
            return expect(esutils.keyword.isIdentifierES6("let", true)).to.be.false;
        });
    });
});
