const {
    js: { compiler: { esutils } }
} = adone;

const KW = ["if", "in", "do", "var", "for", "new", "try", "this", "else", "case", "void", "with", "enum", "while", "break", "catch", "throw", "const", "class", "super", "return", "typeof", "delete", "switch", "export", "import", "default", "finally", "extends", "function", "continue", "debugger", "instanceof"];

const SRW = ["implements", "interface", "package", "private", "protected", "public", "static", "let"];

describe("js", "compiler", "esutils", "keyword", () => {
    describe("isKeywordES6", () => {
        it("returns true if provided string is keyword under non-strict mode", () => {
            let i;
            let len;
            let word;
            for (i = 0, len = KW.length; i < len; i++) {
                word = KW[i];
                expect(esutils.keyword.isKeywordES6(word, false)).to.be.true();
            }
            return expect(esutils.keyword.isKeywordES6("yield", false)).to.be.true();
        });
        it("returns false if provided string is not keyword under non-strict mode", () => {
            let i;
            let j;
            let len;
            let len1;
            let word;
            const words = ["hello", "20", "$", "ゆゆ式"];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isKeywordES6(word, false)).to.be.false();
            }
            const results = [];
            for (j = 0, len1 = SRW.length; j < len1; j++) {
                word = SRW[j];
                results.push(expect(esutils.keyword.isKeywordES6(word, false)).to.be.false);
            }
            return results;
        });
        it("returns true if provided string is keyword under strict mode", () => {
            let i;
            let j;
            let len;
            let len1;
            let word;
            for (i = 0, len = KW.length; i < len; i++) {
                word = KW[i];
                expect(esutils.keyword.isKeywordES6(word, true)).to.be.true();
            }
            expect(esutils.keyword.isKeywordES6("yield", true)).to.be.true();
            const results = [];
            for (j = 0, len1 = SRW.length; j < len1; j++) {
                word = SRW[j];
                results.push(expect(esutils.keyword.isKeywordES6(word, true)).to.be.true);
            }
            return results;
        });
        return it("returns false if provided string is not keyword under strict mode", () => {
            let i;
            let len;
            let word;
            const words = ["hello", "20", "$", "ゆゆ式"];
            const results = [];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                results.push(expect(esutils.keyword.isKeywordES6(word, true)).to.be.false);
            }
            return results;
        });
    });
    describe("isKeywordES5", () => {
        it("returns true if provided string is keyword under non-strict mode", () => {
            let i;
            let len;
            let word;
            const results = [];
            for (i = 0, len = KW.length; i < len; i++) {
                word = KW[i];
                results.push(expect(esutils.keyword.isKeywordES5(word, false)).to.be.true);
            }
            return results;
        });
        it("returns false if provided string is not keyword under non-strict mode", () => {
            let i;
            let j;
            let len;
            let len1;
            let word;
            const words = ["hello", "20", "$", "ゆゆ式"];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isKeywordES5(word, false)).to.be.false();
            }
            for (j = 0, len1 = SRW.length; j < len1; j++) {
                word = SRW[j];
                expect(esutils.keyword.isKeywordES5(word, false)).to.be.false();
            }
            return expect(esutils.keyword.isKeywordES5("yield", false)).to.be.false();
        });
        it("returns true if provided string is keyword under strict mode", () => {
            let i;
            let j;
            let len;
            let len1;
            let word;
            for (i = 0, len = KW.length; i < len; i++) {
                word = KW[i];
                expect(esutils.keyword.isKeywordES5(word, true)).to.be.true();
            }
            expect(esutils.keyword.isKeywordES5("yield", true)).to.be.true();
            const results = [];
            for (j = 0, len1 = SRW.length; j < len1; j++) {
                word = SRW[j];
                results.push(expect(esutils.keyword.isKeywordES5(word, true)).to.be.true);
            }
            return results;
        });
        return it("returns false if provided string is not keyword under strict mode", () => {
            let i;
            let len;
            let word;
            const words = ["hello", "20", "$", "ゆゆ式"];
            const results = [];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                results.push(expect(esutils.keyword.isKeywordES5(word, true)).to.be.false);
            }
            return results;
        });
    });
    describe("isReservedWordES6", () => {
        it("returns true for null/boolean values", () => {
            expect(esutils.keyword.isReservedWordES6("null", false)).to.be.true();
            expect(esutils.keyword.isReservedWordES6("null", true)).to.be.true();
            expect(esutils.keyword.isReservedWordES6("true", false)).to.be.true();
            expect(esutils.keyword.isReservedWordES6("true", true)).to.be.true();
            expect(esutils.keyword.isReservedWordES6("false", false)).to.be.true();
            return expect(esutils.keyword.isReservedWordES6("false", true)).to.be.true();
        });
        it("returns true if provided string is keyword under non-strict mode", () => {
            let i;
            let len;
            let word;
            for (i = 0, len = KW.length; i < len; i++) {
                word = KW[i];
                expect(esutils.keyword.isReservedWordES6(word, false)).to.be.true();
            }
            return expect(esutils.keyword.isReservedWordES6("yield", false)).to.be.true();
        });
        it("returns false if provided string is not keyword under non-strict mode", () => {
            let i;
            let j;
            let len;
            let len1;
            let word;
            const words = ["hello", "20", "$", "ゆゆ式"];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isReservedWordES6(word, false)).to.be.false();
            }
            const results = [];
            for (j = 0, len1 = SRW.length; j < len1; j++) {
                word = SRW[j];
                results.push(expect(esutils.keyword.isReservedWordES6(word, false)).to.be.false);
            }
            return results;
        });
        it("returns true if provided string is keyword under strict mode", () => {
            let i;
            let j;
            let len;
            let len1;
            let word;
            for (i = 0, len = KW.length; i < len; i++) {
                word = KW[i];
                expect(esutils.keyword.isReservedWordES6(word, true)).to.be.true();
            }
            expect(esutils.keyword.isReservedWordES6("yield", true)).to.be.true();
            const results = [];
            for (j = 0, len1 = SRW.length; j < len1; j++) {
                word = SRW[j];
                results.push(expect(esutils.keyword.isReservedWordES6(word, true)).to.be.true);
            }
            return results;
        });
        return it("returns false if provided string is not keyword under strict mode", () => {
            let i;
            let len;
            let word;
            const words = ["hello", "20", "$", "ゆゆ式"];
            const results = [];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                results.push(expect(esutils.keyword.isReservedWordES6(word, true)).to.be.false);
            }
            return results;
        });
    });
    describe("isReservedWordES5", () => {
        it("returns true for null/boolean values", () => {
            expect(esutils.keyword.isReservedWordES5("null", false)).to.be.true();
            expect(esutils.keyword.isReservedWordES5("null", true)).to.be.true();
            expect(esutils.keyword.isReservedWordES5("true", false)).to.be.true();
            expect(esutils.keyword.isReservedWordES5("true", true)).to.be.true();
            expect(esutils.keyword.isReservedWordES5("false", false)).to.be.true();
            return expect(esutils.keyword.isReservedWordES5("false", true)).to.be.true();
        });
        it("returns true if provided string is keyword under non-strict mode", () => {
            let i;
            let len;
            let word;
            const results = [];
            for (i = 0, len = KW.length; i < len; i++) {
                word = KW[i];
                results.push(expect(esutils.keyword.isReservedWordES5(word, false)).to.be.true);
            }
            return results;
        });
        it("returns false if provided string is not keyword under non-strict mode", () => {
            let i;
            let j;
            let len;
            let len1;
            let word;
            const words = ["hello", "20", "$", "ゆゆ式"];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isReservedWordES5(word, false)).to.be.false();
            }
            for (j = 0, len1 = SRW.length; j < len1; j++) {
                word = SRW[j];
                expect(esutils.keyword.isReservedWordES5(word, false)).to.be.false();
            }
            return expect(esutils.keyword.isReservedWordES5("yield", false)).to.be.false();
        });
        it("returns true if provided string is keyword under strict mode", () => {
            let i;
            let j;
            let len;
            let len1;
            let word;
            for (i = 0, len = KW.length; i < len; i++) {
                word = KW[i];
                expect(esutils.keyword.isReservedWordES5(word, true)).to.be.true();
            }
            expect(esutils.keyword.isReservedWordES5("yield", true)).to.be.true();
            const results = [];
            for (j = 0, len1 = SRW.length; j < len1; j++) {
                word = SRW[j];
                results.push(expect(esutils.keyword.isReservedWordES5(word, true)).to.be.true);
            }
            return results;
        });
        return it("returns false if provided string is not keyword under strict mode", () => {
            let i;
            let len;
            let word;
            const words = ["hello", "20", "$", "ゆゆ式"];
            const results = [];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                results.push(expect(esutils.keyword.isReservedWordES5(word, true)).to.be.false);
            }
            return results;
        });
    });
    describe("isRestrictedWord", () => {
        it('returns true if provided string is "eval" or "arguments"', () => {
            expect(esutils.keyword.isRestrictedWord("eval")).to.be.true();
            return expect(esutils.keyword.isRestrictedWord("arguments")).to.be.true();
        });
        return it('returns false if provided string is not "eval" or "arguments"', () => {
            let i;
            let len;
            let word;
            const words = ["hello", "20", "$", "ゆゆ式"];
            const results = [];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                results.push(expect(esutils.keyword.isRestrictedWord(word)).to.be.false);
            }
            return results;
        });
    });
    describe("isIdentifierName", () => {
        it("returns false if provided string is empty", () => {
            expect(esutils.keyword.isIdentifierNameES5("")).to.be.false();
            return expect(esutils.keyword.isIdentifierNameES6("")).to.be.false();
        });
        it("returns true if provided string is IdentifierName", () => {
            let i;
            let len;
            let word;
            const words = ["hello", "$", "ゆゆ式", "$20", "hello20", "_", "if"];
            const results = [];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isIdentifierNameES5(word)).to.be.true();
                results.push(expect(esutils.keyword.isIdentifierNameES6(word)).to.be.true);
            }
            return results;
        });
        it("returns false if provided string is not IdentifierName", () => {
            let i;
            let len;
            let word;
            const words = ["+hello", "0$", "-ゆゆ式", "#_", "_#"];
            const results = [];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isIdentifierNameES5(word)).to.be.false();
                results.push(expect(esutils.keyword.isIdentifierNameES6(word)).to.be.false);
            }
            return results;
        });
        return it("supports astral symbols", () => {
            return expect(esutils.keyword.isIdentifierNameES6("x\uDB40\uDDD5")).to.be.true();
        });
    });
    describe("isIdentifierES5", () => {
        it("returns false if provided string is empty", () => {
            return expect(esutils.keyword.isIdentifierES5("")).to.be.false();
        });
        it("returns true if provided string is Identifier", () => {
            let i;
            let len;
            let word;
            const words = ["hello", "$", "ゆゆ式", "$20", "hello20", "_"];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isIdentifierES5(word)).to.be.true();
            }
            expect(esutils.keyword.isIdentifierES5("yield", false)).to.be.true();
            return expect(esutils.keyword.isIdentifierES5("let", false)).to.be.true();
        });
        return it("returns false if provided string is not Identifier", () => {
            let i;
            let len;
            let word;
            const words = ["+hello", "0$", "-ゆゆ式", "#_", "_#", "if", "null", "true", "false"];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isIdentifierES5(word)).to.be.false();
            }
            expect(esutils.keyword.isIdentifierES5("yield", true)).to.be.false();
            return expect(esutils.keyword.isIdentifierES5("let", true)).to.be.false();
        });
    });
    return describe("isIdentifierES6", () => {
        it("returns false if provided string is empty", () => {
            return expect(esutils.keyword.isIdentifierES6("")).to.be.false();
        });
        it("returns true if provided string is Identifier", () => {
            let i;
            let len;
            let word;
            const words = ["hello", "$", "ゆゆ式", "$20", "hello20", "_"];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isIdentifierES6(word)).to.be.true();
            }
            return expect(esutils.keyword.isIdentifierES6("let", false)).to.be.true();
        });
        return it("returns false if provided string is not Identifier", () => {
            let i;
            let len;
            let word;
            const words = ["+hello", "0$", "-ゆゆ式", "#_", "_#", "if", "null", "true", "false"];
            for (i = 0, len = words.length; i < len; i++) {
                word = words[i];
                expect(esutils.keyword.isIdentifierES6(word)).to.be.false();
            }
            expect(esutils.keyword.isIdentifierES6("yield", false)).to.be.false();
            expect(esutils.keyword.isIdentifierES6("yield", true)).to.be.false();
            return expect(esutils.keyword.isIdentifierES6("let", true)).to.be.false();
        });
    });
});
