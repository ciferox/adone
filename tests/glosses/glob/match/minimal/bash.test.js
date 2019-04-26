import nm from "./support/match";
const isWindows = require("is-windows");

const { glob: { match } } = adone;

// from the Bash 4.3 specification/unit tests
const fixtures = ["*", "**", "\\*", "a", "a/*", "abc", "abd", "abe", "b", "bb", "bcd", "bdir/", "Beware", "c", "ca", "cb", "d", "dd", "de"];

describe("glob", "match", "minimal", "bash options and features:", () => {
    describe("failglob:", () => {
        it("should throw an error when no matches are found:", () => {
            assert.throws(() => {
                match.minimal.match(fixtures, "\\^", { failglob: true });
            }, /no matches found for/);
        });
    });

    // $echo a/{1..3}/b
    describe("bash", () => {
        it('should handle "regular globbing":', () => {
            nm(fixtures, "a*", ["a", "abc", "abd", "abe"]);
            nm(fixtures, "\\a*", ["a", "abc", "abd", "abe"]);
        });

        it("should match directories:", () => {
            nm(fixtures, "b*/", ["bdir/"]);
        });

        it("should use escaped characters as literals:", () => {
            if (isWindows()) {
                nm(fixtures, "\\*", { nonull: true }, ["*", "/*"]);
                nm(fixtures, "\\*", { nonull: true, unescape: true }, ["*"]);

                nm(fixtures, "\\^", { nonull: true }, ["\\^"]);
                nm(fixtures, "\\^", []);

                nm(fixtures, "a\\*", { nonull: true }, ["a\\*"]);
                nm(fixtures, "a\\*", ["a*"], { nonull: true, unescape: true });
                nm(fixtures, "a\\*", []);

                nm(fixtures, ["a\\*", "\\*"], { nonull: true }, ["*", "/*", "a\\*"]);
                nm(fixtures, ["a\\*", "\\*"], { nonull: true, unescape: true }, ["a*", "*"]);
                nm(fixtures, ["a\\*", "\\*"], { unescape: true }, ["*"]);
                nm(fixtures, ["a\\*", "\\*"], ["*", "/*"]);

                nm(fixtures, ["a\\*"], { nonull: true }, ["a\\*"]);
                nm(fixtures, ["a\\*"], []);

                nm(fixtures, ["c*", "a\\*", "*q*"], { nonull: true }, ["c", "ca", "cb", "a\\*", "*q*"]);
                nm(fixtures, ["c*", "a\\*", "*q*"], ["c", "ca", "cb"]);
            } else {
                nm(fixtures, "\\*", { nonull: true }, ["*", "\\*"]);
                nm(fixtures, "\\*", { nonull: true, unescape: true }, ["*"]);
                nm(fixtures, "\\*", { nonull: true, unescape: true, unixify: false }, ["*", "\\*"]);

                nm(fixtures, "\\^", { nonull: true }, ["\\^"]);
                nm(fixtures, "\\^", []);

                nm(fixtures, "a\\*", { nonull: true }, ["a\\*"]);
                nm(fixtures, "a\\*", ["a*"], { nonull: true, unescape: true });
                nm(fixtures, "a\\*", []);

                nm(fixtures, ["a\\*", "\\*"], { nonull: true }, ["a\\*", "*", "\\*"]);
                nm(fixtures, ["a\\*", "\\*"], { nonull: true, unescape: true }, ["a*", "*"]);
                nm(fixtures, ["a\\*", "\\*"], { nonull: true, unescape: true, unixify: false }, ["a*", "*", "\\*"]);
                nm(fixtures, ["a\\*", "\\*"], { unescape: true }, ["*"]);
                nm(fixtures, ["a\\*", "\\*"], { unescape: true, unixify: false }, ["*", "\\*"]);
                nm(fixtures, ["a\\*", "\\*"], ["*", "\\*"]);

                nm(fixtures, ["a\\*"], { nonull: true }, ["a\\*"]);
                nm(fixtures, ["a\\*"], []);

                nm(fixtures, ["c*", "a\\*", "*q*"], { nonull: true }, ["c", "ca", "cb", "a\\*", "*q*"]);
                nm(fixtures, ["c*", "a\\*", "*q*"], ["c", "ca", "cb"]);
                nm(fixtures, "\\**", ["*", "**"]);
            }
        });

        it("should work for quoted characters", () => {
            nm(fixtures.concat(['"', '"a']), '"**', ['"', '"a']);
            nm(fixtures.concat(['"', '"a']), '\"**', ['"', '"a']);
            nm(fixtures.concat('"'), '\"***', ['"']);
            nm(fixtures.concat(["'", '"', '"a']), "'***", ["'"]);
            nm(fixtures.concat("***"), '"***"', ["***"]);
            nm(fixtures.concat("***"), "'***'", ["***"]);
            nm(fixtures, '"***"', []);
            nm(fixtures, '"***"', { nonull: true }, ['"***"']);
            nm(fixtures, '"*"*', ["*", "**"]);
        });

        it("should match escaped quotes", () => {
            nm(fixtures.concat(['"**"', "**"]), '\\"**\\"', ['"**"']);
            nm(fixtures.concat(['foo/"**"/bar', "**"]), 'foo/\\"**\\"/bar', ['foo/"**"/bar']);
            nm(fixtures.concat(['foo/"*"/bar', 'foo/"a"/bar', 'foo/"b"/bar', 'foo/"c"/bar', "foo/'*'/bar", "foo/'a'/bar", "foo/'b'/bar", "foo/'c'/bar"]), 'foo/\\"*\\"/bar', ['foo/"*"/bar', 'foo/"a"/bar', 'foo/"b"/bar', 'foo/"c"/bar']);
            nm(fixtures.concat(["foo/*/bar", 'foo/"*"/bar', 'foo/"a"/bar', 'foo/"b"/bar', 'foo/"c"/bar', "foo/'*'/bar", "foo/'a'/bar", "foo/'b'/bar", "foo/'c'/bar"]), 'foo/"*"/bar', ["foo/*/bar", 'foo/"*"/bar']);
            nm(fixtures.concat(["'**'", "**"]), "\\'**\\'", ["'**'"]);
        });

        it("should work for escaped paths/dots:", () => {
            nm(fixtures, '"\\.\\./*/"', { nonull: true }, ['"\\.\\./*/"']);
            nm(fixtures, '"\\.\\./*/"', { nonull: true, unescape: true }, ['"../*/"']);
            nm(fixtures, "s/\\..*//", { nonull: true }, ["s/\\..*//"]);
        });

        it("Pattern from Larry Wall's Configure that caused bash to blow up:", () => {
            nm(fixtures, '"/^root:/{s/^[^:]*:[^:]*:\\([^:]*\\).*"\'$\'"/\\1/"', { nonull: true }, ['"/^root:/{s/^[^:]*:[^:]*:\\([^:]*\\).*"\'$\'"/\\1/"']);
            nm(fixtures, "[a-c]b*", ["abc", "abd", "abe", "bb", "cb"]);
        });

        it("should support character classes", () => {
            const f = fixtures.slice();
            f.push("baz", "bzz", "BZZ", "beware", "BewAre");

            nm(f, "a*[^c]", ["abd", "abe"]);
            nm(["a-b", "aXb"], "a[X-]b", ["a-b", "aXb"]);
            nm(f, "[a-y]*[^c]", ["abd", "abe", "baz", "bzz", "beware", "bb", "bcd", "ca", "cb", "dd", "de", "bdir/"]);
            nm(["a*b/ooo"], "a\\*b/*", ["a*b/ooo"]);
            nm(["a*b/ooo"], "a\\*?/*", ["a*b/ooo"]);
            nm(f, "a[b]c", ["abc"]);
            nm(f, 'a["b"]c', ["abc"]);
            nm(f, "a[\\\\b]c", ["abc"]); //<= backslash and a "b"
            nm(f, "a[\\b]c", []); //<= word boundary in a character class
            nm(f, "a[b-d]c", ["abc"]);
            nm(f, "a?c", ["abc"]);
            nm(["a-b"], "a[]-]b", ["a-b"]);
            nm(["man/man1/bash.1"], "*/man*/bash.*", ["man/man1/bash.1"]);

            if (isWindows()) {
                // should not match backslashes on windows, since backslashes are path
                // separators and negation character classes should not match path separators
                // unless it's explicitly defined in the character class
                nm(f, "[^a-c]*", ["d", "dd", "de", "Beware", "BewAre", "BZZ", "*", "**"]);
                nm(f, "[^a-c]*", ["d", "dd", "de", "BewAre", "BZZ", "*", "**"], { bash: false });
                nm(f, "[^a-c]*", ["d", "dd", "de", "*", "**"], { nocase: true });
            } else {
                nm(f, "[^a-c]*", ["d", "dd", "de", "Beware", "BewAre", "BZZ", "*", "**", "\\*"]);
                nm(f, "[^a-c]*", ["d", "dd", "de", "BewAre", "BZZ", "*", "**", "\\*"], { bash: false });
                nm(f, "[^a-c]*", ["d", "dd", "de", "*", "**", "\\*"], { nocase: true });
            }
        });

        it("should support basic wildmatch (brackets) features", () => {
            assert(!nm.isMatch("aab", "a[]-]b"));
            assert(!nm.isMatch("ten", "[ten]"));
            assert(!nm.isMatch("ten", "t[!a-g]n"));
            assert(nm.isMatch("]", "]"));
            assert(nm.isMatch("a-b", "a[]-]b"));
            assert(nm.isMatch("a]b", "a[]-]b"));
            assert(nm.isMatch("a]b", "a[]]b"));
            assert(nm.isMatch("aab", "a[\\]a\\-]b"));
            assert(nm.isMatch("ten", "t[a-g]n"));
            assert(nm.isMatch("ton", "t[!a-g]n"));
            assert(nm.isMatch("ton", "t[^a-g]n"));
        });

        it("should support Extended slash-matching features", () => {
            assert(!nm.isMatch("foo/bar", "f[^eiu][^eiu][^eiu][^eiu][^eiu]r"));
            assert(nm.isMatch("foo/bar", "foo[/]bar"));
            assert(nm.isMatch("foo-bar", "f[^eiu][^eiu][^eiu][^eiu][^eiu]r"));
        });

        it("should match braces", () => {
            assert(nm.isMatch("foo{}baz", "foo[{a,b}]+baz"));
        });

        it("should match parens", () => {
            assert(nm.isMatch("foo(bar)baz", "foo[bar()]+baz"));
        });

        it("should match escaped characters", () => {
            assert(!nm.isMatch("", "\\"));
            assert(!nm.isMatch("XXX/\\", "[A-Z]+/\\"));
            assert(nm.isMatch("\\", "\\"));
            if (isWindows()) {
                assert(!nm.isMatch("XXX/\\", "[A-Z]+/\\\\"));
            } else {
                assert(nm.isMatch("XXX/\\", "[A-Z]+/\\\\"));
            }
            assert(nm.isMatch("[ab]", "\\[ab]"));
            assert(nm.isMatch("[ab]", "[\\[:]ab]"));
        });

        it("should match brackets", () => {
            assert(!nm.isMatch("]", "[!]-]"));
            assert(nm.isMatch("a", "[!]-]"));
            assert(nm.isMatch("[ab]", "[[]ab]"));
        });

        it("tests with multiple `*'s:", () => {
            nm(["bbc", "abc", "bbd"], "a**c", ["abc"]);
            nm(["bbc", "abc", "bbd"], "a***c", ["abc"]);
            nm(["bbc", "abc", "bbc"], "a*****?c", ["abc"]);
            nm(["bbc", "abc"], "?*****??", ["bbc", "abc"]);
            nm(["bbc", "abc"], "*****??", ["bbc", "abc"]);
            nm(["bbc", "abc"], "?*****?c", ["bbc", "abc"]);
            nm(["bbc", "abc", "bbd"], "?***?****c", ["bbc", "abc"]);
            nm(["bbc", "abc"], "?***?****?", ["bbc", "abc"]);
            nm(["bbc", "abc"], "?***?****", ["bbc", "abc"]);
            nm(["bbc", "abc"], "*******c", ["bbc", "abc"]);
            nm(["bbc", "abc"], "*******?", ["bbc", "abc"]);
            nm(["abcdecdhjk"], "a*cd**?**??k", ["abcdecdhjk"]);
            nm(["abcdecdhjk"], "a**?**cd**?**??k", ["abcdecdhjk"]);
            nm(["abcdecdhjk"], "a**?**cd**?**??k***", ["abcdecdhjk"]);
            nm(["abcdecdhjk"], "a**?**cd**?**??***k", ["abcdecdhjk"]);
            nm(["abcdecdhjk"], "a**?**cd**?**??***k**", ["abcdecdhjk"]);
            nm(["abcdecdhjk"], "a****c**?**??*****", ["abcdecdhjk"]);
        });

        it("none of these should output anything:", () => {
            nm(["abc"], "??**********?****?", []);
            nm(["abc"], "??**********?****c", []);
            nm(["abc"], "?************c****?****", []);
            nm(["abc"], "*c*?**", []);
            nm(["abc"], "a*****c*?**", []);
            nm(["abc"], "a********???*******", []);
            nm(["a"], "[]", []);
            nm(["["], "[abc", []);
        });
    });

    describe("wildmat", () => {
        it("Basic wildmat features", () => {
            assert(!nm.isMatch("foo", "*f"));
            assert(!nm.isMatch("foo", "??"));
            assert(!nm.isMatch("foo", "bar"));
            assert(!nm.isMatch("foobar", "foo\\*bar"));
            assert(!nm.isMatch("", ""));
            assert(nm.isMatch("?a?b", "\\??\\?b"));
            assert(nm.isMatch("aaaaaaabababab", "*ab"));
            assert(nm.isMatch("f\\oo", "f\\oo"));
            assert(nm.isMatch("foo", "*"));
            assert(nm.isMatch("foo", "*foo*"));
            assert(nm.isMatch("foo", "???"));
            assert(nm.isMatch("foo", "f*"));
            assert(nm.isMatch("foo", "foo"));
            assert(nm.isMatch("foo*", "foo\\*", { unixify: false }));
            assert(nm.isMatch("foobar", "*ob*a*r*"));
        });

        it("should support recursion", () => {
            assert(!nm.isMatch("-adobe-courier-bold-o-normal--12-120-75-75-/-70-iso8859-1", "-*-*-*-*-*-*-12-*-*-*-m-*-*-*"));
            assert(!nm.isMatch("-adobe-courier-bold-o-normal--12-120-75-75-X-70-iso8859-1", "-*-*-*-*-*-*-12-*-*-*-m-*-*-*"));
            assert(!nm.isMatch("ab/cXd/efXg/hi", "*X*i"));
            assert(!nm.isMatch("ab/cXd/efXg/hi", "*Xg*i"));
            assert(!nm.isMatch("abcd/abcdefg/abcdefghijk/abcdefghijklmnop.txtz", "**/*a*b*g*n*t"));
            assert(!nm.isMatch("foo", "*/*/*"));
            assert(!nm.isMatch("foo", "fo"));
            assert(!nm.isMatch("foo/bar", "*/*/*"));
            assert(!nm.isMatch("foo/bar", "foo?bar"));
            assert(!nm.isMatch("foo/bb/aa/rr", "*/*/*"));
            assert(!nm.isMatch("foo/bba/arr", "foo*"));
            assert(!nm.isMatch("foo/bba/arr", "foo**"));
            assert(!nm.isMatch("foo/bba/arr", "foo/*"));
            assert(!nm.isMatch("foo/bba/arr", "foo/**arr"));
            assert(!nm.isMatch("foo/bba/arr", "foo/**z"));
            assert(!nm.isMatch("foo/bba/arr", "foo/*arr"));
            assert(!nm.isMatch("foo/bba/arr", "foo/*z"));
            assert(!nm.isMatch("XXX/adobe/courier/bold/o/normal//12/120/75/75/X/70/iso8859/1", "XXX/*/*/*/*/*/*/12/*/*/*/m/*/*/*"));
            assert(nm.isMatch("-adobe-courier-bold-o-normal--12-120-75-75-m-70-iso8859-1", "-*-*-*-*-*-*-12-*-*-*-m-*-*-*"));
            assert(nm.isMatch("ab/cXd/efXg/hi", "**/*X*/**/*i"));
            assert(nm.isMatch("ab/cXd/efXg/hi", "*/*X*/*/*i"));
            assert(nm.isMatch("abcd/abcdefg/abcdefghijk/abcdefghijklmnop.txt", "**/*a*b*g*n*t"));
            assert(nm.isMatch("abcXdefXghi", "*X*i"));
            assert(nm.isMatch("foo", "foo"));
            assert(nm.isMatch("foo/bar", "foo/*"));
            assert(nm.isMatch("foo/bar", "foo/bar"));
            assert(nm.isMatch("foo/bar", "foo[/]bar"));
            assert(nm.isMatch("foo/bb/aa/rr", "**/**/**"));
            assert(nm.isMatch("foo/bba/arr", "*/*/*"));
            assert(nm.isMatch("foo/bba/arr", "foo/**"));
            assert(nm.isMatch("XXX/adobe/courier/bold/o/normal//12/120/75/75/m/70/iso8859/1", "XXX/*/*/*/*/*/*/12/*/*/*/m/*/*/*", { unixify: false }));
        });
    });
});
