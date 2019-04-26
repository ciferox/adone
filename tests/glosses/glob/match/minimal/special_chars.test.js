import nm from "./support/match";

const path = require("path");
const isWindows = require("is-windows");

describe("glob", "match", "minimal", "special characters", () => {
    describe("regex", () => {
        it("should match common regex characters", () => {
            const fixtures = ["a c", "a1c", "a123c", "a.c", "a.xy.zc", "a.zc", "abbbbc", "abbbc", "abbc", "abc", "abq", "axy zc", "axy", "axy.zc", "axyzc", "^abc$"];

            nm(fixtures, "ab?bc", ["abbbc"]);
            nm(fixtures, "ab*c", ["abbbbc", "abbbc", "abbc", "abc"]);
            nm(fixtures, "ab+bc", ["abbbbc", "abbbc", "abbc"]);
            nm(fixtures, "^abc$", ["^abc$"]);
            nm(fixtures, "a.c", ["a.c"]);
            nm(fixtures, "a.*c", ["a.c", "a.xy.zc", "a.zc"]);
            nm(fixtures, "a*c", ["a c", "a.c", "a1c", "a123c", "abbbbc", "abbbc", "abbc", "abc", "axyzc", "axy zc", "axy.zc", "a.xy.zc", "a.zc"]);
            nm(fixtures, "a\\w+c", ["a1c", "a123c", "abbbbc", "abbbc", "abbc", "abc", "axyzc"], "Should match word characters");
            nm(fixtures, "a\\W+c", ["a.c", "a c"], "Should match non-word characters");
            nm(fixtures, "a\\d+c", ["a1c", "a123c"], "Should match numbers");
            nm(["foo@#$%123ASD #$$%^&", "foo!@#$asdfl;", "123"], "\\d+", ["123"]);
            nm(["a123c", "abbbc"], "a\\D+c", ["abbbc"], "Should match non-numbers");
            nm(["foo", " foo "], "(f|o)+\\b", ["foo"], "Should match word boundaries");
        });
    });

    describe("spaces:", () => {
        it("should match spaces", () => {
            assert(nm.isMatch(" ", " "));
            assert(nm.isMatch("  ", "  "));
            assert(!nm.isMatch(" ", "  "));
            assert(!nm.isMatch("  ", " "));
            assert(nm.isMatch(" /", " /"));
            assert(nm.isMatch(" / ", " / "));
            assert(nm.isMatch(" /foo", " /*"));
            assert(nm.isMatch(" /foo", " /*"));
            assert(nm.isMatch("foo ", "* "));
            assert(nm.isMatch(" foo/foo", " foo/*"));
            assert(nm.isMatch("foo /foo", "foo /*"));
            assert(nm.isMatch("foo /foo ", "foo /*"));
        });
    });

    describe("$ dollar signs:", () => {
        it("should treat dollar signs as literal", () => {
            assert(nm.isMatch("$", "$"));
            assert(nm.isMatch("$/foo", "$/*"));
            assert(nm.isMatch("$/foo", "$/*"));
            assert(nm.isMatch("foo$", "*$"));
            assert(nm.isMatch("$foo/foo", "$foo/*"));
            assert(nm.isMatch("foo$/foo", "foo$/*"));
            assert(nm.isMatch("foo$/foo$", "foo$/*"));
        });
    });

    describe("^ caret", () => {
        it("should treat caret as literal:", () => {
            assert(nm.isMatch("^", "^"));
            assert(nm.isMatch("^/foo", "^/*"));
            assert(nm.isMatch("^/foo", "^/*"));
            assert(nm.isMatch("foo^", "*^"));
            assert(nm.isMatch("^foo/foo", "^foo/*"));
            assert(nm.isMatch("foo^/foo", "foo^/*"));
        });
    });

    describe("slashes", () => {
        it("should match forward slashes", () => {
            assert(nm.isMatch("/", "/"));
        });

        it("should match backslashes", () => {
            assert(nm.isMatch("\\", "[\\\\/]"));
            assert(nm.isMatch("\\", "[\\\\/]+"));
            assert(nm.isMatch("\\\\", "[\\\\/]+"));
            assert(nm.isMatch("\\\\\\", "[\\\\/]+"));

            if (isWindows()) {
                nm(["\\"], "[\\\\/]", ["/"]);
                nm(["\\", "\\\\", "\\\\\\"], "[\\\\/]+", ["/"]);
            } else {
                nm(["\\"], "[\\\\/]", ["\\"]);
                nm(["\\", "\\\\", "\\\\\\"], "[\\\\/]+", ["\\", "\\\\", "\\\\\\"]);
            }

            const sep = path.sep;
            path.sep = "\\";
            assert(nm.isMatch("\\", "[\\\\/]"));
            assert(nm.isMatch("\\", "[\\\\/]+"));
            assert(nm.isMatch("\\\\", "[\\\\/]+"));
            assert(nm.isMatch("\\\\\\", "[\\\\/]+"));
            nm(["\\"], "[\\\\/]", ["/"]);
            nm(["\\", "\\\\", "\\\\\\"], "[\\\\/]+", ["/"]);
            path.sep = sep;
        });
    });

    describe("colons and drive letters", () => {
        it("should treat common URL characters as literals", () => {
            assert(nm.isMatch(":", ":"));
            assert(nm.isMatch(":/foo", ":/*"));
            assert(nm.isMatch("D://foo", "D://*"));
            assert(nm.isMatch("D://foo", "D:\\/\\/*"));
        });
    });

    describe("[ab] - brackets:", () => {
        it("should support regex character classes:", () => {
            nm(["a/b.md", "a/c.md", "a/d.md", "a/E.md"], "a/[A-Z].md", ["a/E.md"]);
            nm(["a/b.md", "a/c.md", "a/d.md"], "a/[bd].md", ["a/b.md", "a/d.md"]);
            nm(["a-1.md", "a-2.md", "a-3.md", "a-4.md", "a-5.md"], "a-[2-4].md", ["a-2.md", "a-3.md", "a-4.md"]);
            nm(["a/b.md", "b/b.md", "c/b.md", "b/c.md", "a/d.md"], "[bc]/[bd].md", ["b/b.md", "c/b.md"]);
        });

        it("should handle brackets", () => {
            nm(["ab", "ac", "ad", "a*", "*"], "[a*]*", ["*", "a*"], { bash: false });
            nm(["ab", "ac", "ad", "a*", "*"], "[a*]*", ["*", "a*", "ab", "ac", "ad"]);
        });

        it("should handle unclosed brackets", () => {
            nm(["[!ab", "[ab"], "[!a*", ["[!ab"]);
        });
    });

    describe("(a|b) - logical OR:", () => {
        it("should support regex logical OR:", () => {
            nm(["a/a", "a/b", "a/c", "b/a", "b/b"], "(a|b)/b", ["a/b", "b/b"]);
            nm(["a/a", "a/b", "a/c", "b/a", "b/b", "c/b"], "((a|b)|c)/b", ["a/b", "b/b", "c/b"]);
            nm(["a/b.md", "a/c.md", "a/d.md"], "a/(b|d).md", ["a/b.md", "a/d.md"]);
            nm(["a-1.md", "a-2.md", "a-3.md", "a-4.md", "a-5.md"], "a-(2|3|4).md", ["a-2.md", "a-3.md", "a-4.md"]);
            nm(["a/b.md", "b/b.md", "c/b.md", "b/c.md", "a/d.md"], "(b|c)/(b|d).md", ["b/b.md", "c/b.md"]);
        });
    });
});
