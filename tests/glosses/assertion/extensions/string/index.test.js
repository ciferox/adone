const {
    assertion
} = adone;

assertion.config.includeStack = true;

const { assert, expect, extension } = assertion;

assertion
    .use(extension.string)
    .use((lib, util) => {
        const inspect = util.objDisplay;

        lib.Assertion.addMethod("fail", function (message) {

            const obj = this._obj;
            new lib.Assertion(obj).is.a("function");

            try {
                obj();
            } catch (err) {
                this.assert(
                    err instanceof lib.AssertionError,
                    `expected #{this} to fail, but it threw ${inspect(err)}`
                );
                this.assert(
                    err.message === message,
                    `expected #{this} to fail with ${inspect(message)}, but got ${inspect(err.message)}`
                );
                return;
            }

            this.assert(false, "expected #{this} to fail");
        });
    });

describe("chai-string", () => {

    describe("#startsWith", () => {

        it("should return true", () => {
            const str = "abcdef";
            const prefix = "abc";
            expect(str).to.startsWith(prefix);
        });

        it("should return false", () => {
            const str = "abcdef";
            const prefix = "cba";
            expect(str).not.to.startsWith(prefix);
        });

        it("should return false (2)", () => {
            const str = "12abcdef";
            const prefix = 12.0;
            expect(str).not.to.startsWith(prefix);
        });

        it("check that", () => {
            const obj = { foo: "hello world" };
            expect(obj).to.have.property("foo").that.startsWith("hello");
        });

    });

    describe("#endWith", () => {
        it("should return true", () => {
            const str = "abcdef";
            const suffix = "def";
            expect(str).to.endWith(suffix);
        });

        it("should return false", () => {
            const str = "abcdef";
            const suffix = "fed";
            expect(str).to.not.endWith(suffix);
        });

        it("should return false (2)", () => {
            const str = "abcdef12";
            const suffix = 12.0;
            expect(str).to.not.endsWith(suffix);
        });
    });

    describe("#equalIgnoreCase", () => {

        it("should return true", () => {
            const str1 = "abcdef";
            const str2 = "AbCdEf";
            expect(str1).to.equalIgnoreCase(str2);
        });

        it("should return false", () => {
            const str1 = "abcdef";
            const str2 = "aBDDD";
            expect(str1).not.to.equalIgnoreCase(str2);
        });

        it("should return false (2)", () => {
            const str1 = 12;
            const str2 = "12";
            expect(str1).not.to.equalIgnoreCase(str2);
        });

        it("should return false (3)", () => {
            const str1 = "12";
            const str2 = 12;
            expect(str1).not.to.equalIgnoreCase(str2);
        });

    });

    describe("#equalIgnoreSpaces", () => {

        it("should return true", () => {
            const str1 = "abcdef";
            const str2 = "a\nb\tc\r d  ef";
            expect(str1).to.equalIgnoreSpaces(str2);
        });

        it("should return false", () => {
            const str1 = "abcdef";
            const str2 = "a\nb\tc\r d  efg";
            expect(str1).not.to.equalIgnoreSpaces(str2);
        });

        it("should return false (2)", () => {
            expect("12").not.to.equalIgnoreSpaces(12);
        });

        it("should return false (3)", () => {
            expect(12).not.to.equalIgnoreSpaces("12");
        });

    });

    describe("#containIgnoreSpaces", () => {

        it("should return true", () => {
            const str1 = "1234abcdef56";
            const str2 = "1234a\nb\tc\r d  ef56";
            expect(str1).to.containIgnoreSpaces(str2);
        });

        it("should return true (2)", () => {
            const str1 = "abcdef";
            const str2 = "a\nb\tc\r d  ef";
            expect(str1).to.containIgnoreSpaces(str2);
        });

        it("should return false", () => {
            const str1 = "abdef";
            const str2 = "a\nb\tc\r d  ef";
            expect(str1).not.to.containIgnoreSpaces(str2);
        });

        it("should return false (2)", () => {
            expect("12").not.to.containIgnoreSpaces(12);
        });

        it("should return false (3)", () => {
            expect(12).not.to.containIgnoreSpaces("12");
        });
    });

    describe("#containIgnoreCase", () => {

        it("should return true", () => {
            const str1 = "abcdef";
            const str2 = "cDe";
            expect(str1).to.containIgnoreCase(str1, str2);
        });

        it("should return true (2)", () => {
            expect("abcdef").to.containIgnoreCase("cDe");
        });

        it("should return true (3)", () => {
            const str1 = "abcdef";
            const str2 = "AbCdeF";
            expect(str1).to.containIgnoreCase(str2);
        });

        it("should return false", () => {
            const str1 = "abcdef";
            const str2 = "efg";
            expect(str1).not.to.containIgnoreCase(str2);
        });

        it("should return false (2)", () => {
            const str1 = "123";
            const str2 = 123;
            expect(str1).not.to.containIgnoreCase(str2);
        });

        it("should return false (3)", () => {
            const str1 = "abcdef";
            const str2 = "zabcd";
            expect(str1).not.to.containIgnoreCase(str2);
        });
    });

    describe("#singleLine", () => {

        it("should return true", () => {
            const str = "abcdef";
            assert.singleLine(str);
        });

        it("should return false", () => {
            const str = "abc\ndef";
            expect(str).not.to.singleLine();
        });

        it("should return false (2)", () => {
            expect(12).not.to.singleLine(12);
        });

    });

    describe("#reverseOf", () => {

        it("should return true", () => {
            const str1 = "abcdef";
            const str2 = "fedcba";
            expect(str1).to.reverseOf(str2);
        });

        it("should return false", () => {
            const str1 = "abcdef";
            const str2 = "aBDDD";
            expect(str1).not.to.reverseOf(str2);
        });

        it("should return false (2)", () => {
            expect("12").not.to.reverseOf(12);
        });

        it("should return false (3)", () => {
            expect(12).not.to.reverseOf("12");
        });

    });

    describe("#palindrome", () => {

        it("should return true", () => {
            const str = "abcba";
            expect(str).to.palindrome();
        });

        it("should return true (2)", () => {
            const str = "abccba";
            expect(str).to.palindrome();
        });

        it("should return true (3)", () => {
            const str = "";
            expect(str).to.palindrome();
        });

        it("should return false", () => {
            const str = "abcdef";
            expect(str).not.to.palindrome();
        });

        it("should return false (2)", () => {
            expect(12).not.to.palindrome();
        });

    });

    describe("#entriesCount", () => {

        it("should return true", () => {
            const str = "abcabd";
            const substr = "ab";
            const count = 2;
            expect(str).to.entriesCount(substr, count);
        });

        it("should return true (2)", () => {
            const str = "ababd";
            const substr = "ab";
            const count = 2;
            expect(str).to.entriesCount(substr, count);
        });

        it("should return true (3)", () => {
            const str = "abab";
            const substr = "ab";
            const count = 2;
            expect(str).to.entriesCount(substr, count);
        });

        it("should return true (4)", () => {
            const str = 12;
            const substr = "ab";
            const count = 0;
            expect(str).to.entriesCount(substr, count);
        });

        it("should return true (5)", () => {
            const str = "12";
            const substr = 12;
            const count = 0;
            expect(str).to.entriesCount(substr, count);
        });

        it("should return false ", () => {
            const str = "12";
            const substr = 12;
            const count = 1;
            expect(str).not.to.entriesCount(substr, count);
        });

    });

    describe("#indexOf", () => {

        it("should return true", () => {
            const str = "abcabd";
            const substr = "ab";
            const index = 0;
            expect(str).to.indexOf(substr, index);
        });

        it("should return true (2)", () => {
            const str = "abcabd";
            const substr = "ca";
            const index = 2;
            expect(str).to.indexOf(substr, index);
        });

        it("should return true (3)", () => {
            const str = "ababab";
            const substr = "ba";
            const index = 1;
            expect(str).to.indexOf(substr, index);
        });

        it("should return true (4)", () => {
            const str = "12";
            const substr = 12;
            const index = -1;
            expect(str).to.indexOf(substr, index);
        });

        it("should return true (5)", () => {
            const str = 12;
            const substr = "12";
            const index = -1;
            expect(str).to.indexOf(substr, index);
        });

        it("should return false", () => {
            const str = "abcaab";
            const substr = "da";
            const index = 1;
            expect(str).not.to.indexOf(substr, index);
        });

        it("should return false (2)", () => {
            const str = "12";
            const substr = 12;
            const index = 0;
            expect(str).not.to.indexOf(substr, index);
        });

        it("should return false (3)", () => {
            const str = 12;
            const substr = "12";
            const index = 0;
            expect(str).not.to.indexOf(substr, index);
        });

    });


    describe("tdd alias", () => {

        beforeEach(function () {
            this.str = "abcdef";
            this.str2 = "a\nb\tc\r d  ef";
        });

        it(".startsWith", function () {
            assert.startsWith(this.str, "abc");
        });

        it(".notStartsWith", function () {
            assert.notStartsWith(this.str, "cba");
        });

        it(".notStartsWith (2)", () => {
            assert.notStartsWith("12abc", 12.0);
        });

        it(".endsWith", function () {
            assert.endsWith(this.str, "def");
        });

        it(".notEndsWith", function () {
            assert.notEndsWith(this.str, "fed");
        });

        it(".notEndsWith (2)", () => {
            assert.notEndsWith("abc12", 12.0);
        });

        it(".equalIgnoreCase", function () {
            assert.equalIgnoreCase(this.str, "AbCdEf");
        });

        it(".notEqualIgnoreCase", function () {
            assert.notEqualIgnoreCase(this.str, "abDDD");
        });

        it(".notEqualIgnoreCase (2)", () => {
            assert.notEqualIgnoreCase("12", 12);
        });

        it(".notEqualIgnoreCase (3)", () => {
            assert.notEqualIgnoreCase(12, "12");
        });

        it(".equalIgnoreSpaces", function () {
            assert.equalIgnoreSpaces(this.str, this.str2);
        });

        it(".notEqualIgnoreSpaces", function () {
            assert.notEqualIgnoreSpaces(this.str, `${this.str2}g`);
        });

        it(".notEqualIgnoreSpaces (2)", () => {
            assert.notEqualIgnoreSpaces("12", 12);
        });

        it(".notEqualIgnoreSpaces (3)", () => {
            assert.notEqualIgnoreSpaces(12, "12");
        });

        it(".containIgnoreSpaces", function () {
            assert.containIgnoreSpaces(this.str, this.str2);
        });

        it(".notContainIgnoreSpaces", function () {
            assert.notContainIgnoreSpaces(this.str, `${this.str2}g`);
        });

        it(".singleLine", function () {
            assert.singleLine(this.str);
        });

        it(".notSingleLine", () => {
            assert.notSingleLine("abc\ndef");
        });

        it(".notSingleLine (2)", () => {
            assert.notSingleLine(12);
        });

        it(".reverseOf", function () {
            assert.reverseOf(this.str, "fedcba");
        });

        it(".notReverseOf", function () {
            assert.notReverseOf(this.str, "aaaaa");
        });

        it(".notReverseOf (2)", () => {
            assert.notReverseOf("12", 12);
        });

        it(".notReverseOf (3)", () => {
            assert.notReverseOf(12, "12");
        });

        it(".palindrome", () => {
            assert.palindrome("abcba");
            assert.palindrome("abccba");
            assert.palindrome("");
        });

        it(".notPalindrome", function () {
            assert.notPalindrome(this.str);
        });

        it(".notPalindrome (2)", () => {
            assert.notPalindrome(12);
        });

        it(".entriesCount", () => {
            assert.entriesCount("abcabd", "ab", 2);
            assert.entriesCount("ababd", "ab", 2);
            assert.entriesCount("abab", "ab", 2);
            assert.entriesCount("", "ab", 0);
            assert.entriesCount(12, "ab", 0);
            assert.entriesCount("12", 12, 0);
        });

        it(".indexOf", () => {
            assert.indexOf("abcabd", "ab", 0);
            assert.indexOf("abcabd", "ca", 2);
            assert.indexOf("ababab", "ba", 1);
            assert.indexOf("ababab", "ba", 1);
            assert.indexOf(12, "12", -1);
            assert.indexOf("12", 12, -1);
            expect("ababab").to.have.indexOf("ba", 1);
        });

    });
});
