const {
    js: { compiler: { esutils } }
} = adone;

describe("js", "compiler", "esutils", "code", () => {
    describe("isDecimalDigit", () => {
        it("returns true if provided code is decimal digit", () => {
            let ch;
            let i;
            const results = [];
            for (ch = i = 0; i <= 9; ch = ++i) {
                results.push(expect(esutils.code.isDecimalDigit((String(ch)).charCodeAt(0))).to.be.true);
            }
            return results;
        });
        return it("returns false if provided code is not decimal digit", () => {
            let code;
            let i;
            let j;
            let ref;
            let ref1;
            let ref2;
            let ref3;

            for (code = i = ref = "a".charCodeAt(0), ref1 = "z".charCodeAt(0); ref <= ref1 ? i <= ref1 : i >= ref1; code = ref <= ref1 ? ++i : --i) {
                expect(esutils.code.isDecimalDigit(code)).to.be.false;
            }
            const results = [];
            for (code = j = ref2 = "A".charCodeAt(0), ref3 = "Z".charCodeAt(0); ref2 <= ref3 ? j <= ref3 : j >= ref3; code = ref2 <= ref3 ? ++j : --j) {
                results.push(expect(esutils.code.isDecimalDigit(code)).to.be.false);
            }
            return results;
        });
    });
    describe("isHexDigit", () => {
        it("returns true if provided code is hexadecimal digit", () => {
            let ch;
            let code;
            let i;
            let j;
            let k;
            let ref;
            let ref1;
            let ref2;
            let ref3;

            for (ch = i = 0; i <= 9; ch = ++i) {
                expect(esutils.code.isHexDigit((`${ch}`).charCodeAt(0))).to.be.true;
            }
            for (code = j = ref = "a".charCodeAt(0), ref1 = "f".charCodeAt(0); ref <= ref1 ? j <= ref1 : j >= ref1; code = ref <= ref1 ? ++j : --j) {
                expect(esutils.code.isHexDigit(code)).to.be.true;
            }
            const results = [];
            for (code = k = ref2 = "A".charCodeAt(0), ref3 = "F".charCodeAt(0); ref2 <= ref3 ? k <= ref3 : k >= ref3; code = ref2 <= ref3 ? ++k : --k) {
                results.push(expect(esutils.code.isHexDigit(code)).to.be.true);
            }
            return results;
        });
        return it("returns false if provided code is not hexadecimal digit", () => {
            let code;
            let i;
            let j;
            let ref;
            let ref1;
            let ref2;
            let ref3;

            for (code = i = ref = "g".charCodeAt(0), ref1 = "z".charCodeAt(0); ref <= ref1 ? i <= ref1 : i >= ref1; code = ref <= ref1 ? ++i : --i) {
                expect(esutils.code.isHexDigit(code)).to.be.false;
            }
            const results = [];
            for (code = j = ref2 = "G".charCodeAt(0), ref3 = "Z".charCodeAt(0); ref2 <= ref3 ? j <= ref3 : j >= ref3; code = ref2 <= ref3 ? ++j : --j) {
                results.push(expect(esutils.code.isHexDigit(code)).to.be.false);
            }
            return results;
        });
    });
    describe("isOctalDigit", () => {
        it("returns true if provided code is octal digit", () => {
            let ch;
            let i;

            const results = [];
            for (ch = i = 0; i <= 7; ch = ++i) {
                results.push(expect(esutils.code.isOctalDigit((String(ch)).charCodeAt(0))).to.be.true);
            }
            return results;
        });
        return it("returns false if provided code is not octal digit", () => {
            let ch;
            let code;
            let i;
            let j;
            let k;
            let ref;
            let ref1;
            let ref2;
            let ref3;

            for (ch = i = 8; i <= 9; ch = ++i) {
                expect(esutils.code.isOctalDigit((`${ch}`).charCodeAt(0))).to.be.false;
            }
            for (code = j = ref = "a".charCodeAt(0), ref1 = "z".charCodeAt(0); ref <= ref1 ? j <= ref1 : j >= ref1; code = ref <= ref1 ? ++j : --j) {
                expect(esutils.code.isOctalDigit(code)).to.be.false;
            }
            const results = [];
            for (code = k = ref2 = "A".charCodeAt(0), ref3 = "Z".charCodeAt(0); ref2 <= ref3 ? k <= ref3 : k >= ref3; code = ref2 <= ref3 ? ++k : --k) {
                results.push(expect(esutils.code.isOctalDigit(code)).to.be.false);
            }
            return results;
        });
    });
    describe("isWhiteSpace", () => {
        it("returns true if provided code is white space", () => {
            let code;
            let i;
            let len;
            const codes = [0x0009, 0x000B, 0x000C, 0x0020, 0x00A0, 0xFEFF, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000];
            for (i = 0, len = codes.length; i < len; i++) {
                code = codes[i];
                expect(esutils.code.isWhiteSpace(code)).to.be.true;
            }
            return expect(esutils.code.isWhiteSpace(0x180E)).to.be.false;
        });
        return it("returns false if provided code is not white space", () => {
            let ch;
            let code;
            let i;
            let j;
            let k;
            let ref;
            let ref1;
            let ref2;
            let ref3;

            for (ch = i = 0; i <= 9; ch = ++i) {
                expect(esutils.code.isWhiteSpace((String(ch)).charCodeAt(0))).to.be.false;
            }
            for (code = j = ref = "a".charCodeAt(0), ref1 = "z".charCodeAt(0); ref <= ref1 ? j <= ref1 : j >= ref1; code = ref <= ref1 ? ++j : --j) {
                expect(esutils.code.isWhiteSpace(code)).to.be.false;
            }
            const results = [];
            for (code = k = ref2 = "A".charCodeAt(0), ref3 = "Z".charCodeAt(0); ref2 <= ref3 ? k <= ref3 : k >= ref3; code = ref2 <= ref3 ? ++k : --k) {
                results.push(expect(esutils.code.isWhiteSpace(code)).to.be.false);
            }
            return results;
        });
    });
    describe("isLineTerminator", () => {
        it("returns true if provided code is line terminator", () => {
            let code;
            let i;
            let len;
            const codes = [0x000A, 0x000D, 0x2028, 0x2029];
            const results = [];
            for (i = 0, len = codes.length; i < len; i++) {
                code = codes[i];
                results.push(expect(esutils.code.isLineTerminator(code)).to.be.true);
            }
            return results;
        });
        return it("returns false if provided code is not line terminator", () => {
            let ch;
            let code;
            let i;
            let j;
            let k;
            let ref;
            let ref1;
            let ref2;
            let ref3;
            
            for (ch = i = 0; i <= 9; ch = ++i) {
                expect(esutils.code.isLineTerminator((String(ch)).charCodeAt(0))).to.be.false;
            }
            for (code = j = ref = "a".charCodeAt(0), ref1 = "z".charCodeAt(0); ref <= ref1 ? j <= ref1 : j >= ref1; code = ref <= ref1 ? ++j : --j) {
                expect(esutils.code.isLineTerminator(code)).to.be.false;
            }
            const results = [];
            for (code = k = ref2 = "A".charCodeAt(0), ref3 = "Z".charCodeAt(0); ref2 <= ref3 ? k <= ref3 : k >= ref3; code = ref2 <= ref3 ? ++k : --k) {
                results.push(expect(esutils.code.isLineTerminator(code)).to.be.false);
            }
            return results;
        });
    });
    describe("isIdentifierStartES5", () => {
        it("returns true if provided code can be a start of Identifier in ES5", () => {
            let code;
            let i;
            let len;
            const characters = ["a", "_", "$", "ゆ"];
            const ref = characters.map((ch) => {
                return ch.charCodeAt(0);
            });
            const results = [];
            for (i = 0, len = ref.length; i < len; i++) {
                code = ref[i];
                results.push(expect(esutils.code.isIdentifierStartES5(code)).to.be.true);
            }
            return results;
        });
        return it("returns false if provided code cannot be a start of Identifier in ES5", () => {
            let ch;
            let i;
            const results = [];
            for (ch = i = 0; i <= 9; ch = ++i) {
                results.push(expect(esutils.code.isIdentifierStartES5((String(ch)).charCodeAt(0))).to.be.false);
            }
            return results;
        });
    });
    describe("isIdentifierPartES5", () => {
        it("returns true if provided code can be a part of Identifier in ES5", () => {
            let ch;
            let code;
            let i;
            let j;
            let len;
            const characters = ["a", "_", "$", "ゆ"];
            const ref = characters.map((ch) => {
                return ch.charCodeAt(0);
            });
            for (i = 0, len = ref.length; i < len; i++) {
                code = ref[i];
                expect(esutils.code.isIdentifierPartES5(code)).to.be.true;
            }
            const results = [];
            for (ch = j = 0; j <= 9; ch = ++j) {
                results.push(expect(esutils.code.isIdentifierPartES5((String(ch)).charCodeAt(0))).to.be.true);
            }
            return results;
        });
        return it("returns false if provided code cannot be a part of Identifier in ES5", () => {
            expect(esutils.code.isIdentifierPartES5("+".charCodeAt(0))).to.be.false;
            return expect(esutils.code.isIdentifierPartES5("-".charCodeAt(0))).to.be.false;
        });
    });
    describe("isIdentifierStartES6", () => {
        it("returns true if provided code can be a start of Identifier in ES6", () => {
            let code;
            let i;
            let len;
            const characters = ["a", "_", "$", "ゆ", "\u0AF9"];
            const ref = characters.map((ch) => {
                return ch.charCodeAt(0);
            });
            const results = [];
            for (i = 0, len = ref.length; i < len; i++) {
                code = ref[i];
                results.push(expect(esutils.code.isIdentifierStartES6(code)).to.be.true);
            }
            return results;
        });
        return it("returns false if provided code cannot be a start of Identifier in ES6", () => {
            let ch;
            let i;
            const results = [];
            for (ch = i = 0; i <= 9; ch = ++i) {
                results.push(expect(esutils.code.isIdentifierStartES6((`${ch}`).charCodeAt(0))).to.be.false);
            }
            return results;
        });
    });
    return describe("isIdentifierPartES6", () => {
        it("returns true if provided code can be a part of Identifier in ES6", () => {
            let ch;
            let code;
            let i;
            let j;
            let len;
            const characters = ["a", "_", "$", "ゆ"];
            const ref = characters.map((ch) => {
                return ch.charCodeAt(0);
            });
            for (i = 0, len = ref.length; i < len; i++) {
                code = ref[i];
                expect(esutils.code.isIdentifierPartES6(code)).to.be.true;
            }
            const results = [];
            for (ch = j = 0; j <= 9; ch = ++j) {
                results.push(expect(esutils.code.isIdentifierPartES6((String(ch)).charCodeAt(0))).to.be.true);
            }
            return results;
        });
        it("supports astral symbols", () => {
            return expect(esutils.code.isIdentifierPartES6(0xE01D5)).to.be.true;
        });
        return it("returns false if provided code cannot be a part of Identifier in ES6", () => {
            expect(esutils.code.isIdentifierPartES6("+".charCodeAt(0))).to.be.false;
            return expect(esutils.code.isIdentifierPartES6("-".charCodeAt(0))).to.be.false;
        });
    });
});
