const {
    util: {
        match: { posixBrackets: matcher }
    }
} = adone;

describe("util", "match", "posixBrackets", "original wildmatch", () => {
    it("should support basic wildmatch (brackets) features", () => {
        assert(!matcher.isMatch("aab", "a[]-]b"));
        assert(!matcher.isMatch("ten", "[ten]"));
        assert(!matcher.isMatch("ten", "t[!a-g]n"));
        assert(matcher.isMatch("]", "]"));
        assert(matcher.isMatch("a-b", "a[]-]b"));
        assert(matcher.isMatch("a]b", "a[]-]b"));
        assert(matcher.isMatch("a]b", "a[]]b"));
        assert(matcher.isMatch("aab", "a[]a-]b"));
        assert(matcher.isMatch("ten", "t[a-g]n"));
        assert(matcher.isMatch("ton", "t[!a-g]n"));
        assert(matcher.isMatch("ton", "t[^a-g]n"));
    });

    it("should support Extended slash-matching features", () => {
        assert(!matcher.isMatch("foo/bar", "f[^eiu][^eiu][^eiu][^eiu][^eiu]r"));
        assert(matcher.isMatch("foo/bar", "foo[/]bar"));
        assert(matcher.isMatch("foo-bar", "f[^eiu][^eiu][^eiu][^eiu][^eiu]r"));
    });

    it("should match braces", () => {
        assert(matcher.isMatch("foo{}baz", "foo[{a,b}]+baz"));
    });

    it("should match parens", () => {
        assert(matcher.isMatch("foo(bar)baz", "foo[bar()]+baz"));
    });

    it("should match escaped characters", () => {
        assert(!matcher.isMatch("", "\\"));
        assert(!matcher.isMatch("XXX/\\", "[A-Z]+/\\"));
        assert(matcher.isMatch("\\", "\\"));
        assert(matcher.isMatch("XXX/\\", "[A-Z]+/\\\\"));
        assert(matcher.isMatch("[ab]", "\\[ab]"));
        assert(matcher.isMatch("[ab]", "[\\[:]ab]"));
    });

    it("should match brackets", () => {
        assert(!matcher.isMatch("]", "[!]-]"));
        assert(matcher.isMatch("a", "[!]-]"));
        assert(matcher.isMatch("[ab]", "[[]ab]"));
    });

    it("should not choke on malformed posix brackets", () => {
        assert(!matcher.isMatch("[ab]", "[[::]ab]"));
        assert(matcher.isMatch("[ab]", "[[:]ab]"));
        assert(matcher.isMatch("[ab]", "[[:digit]ab]"));
    });

    it("should not choke on non-bracket characters", () => {
        assert(!matcher.isMatch("foo", "@foo"));
        assert(matcher.isMatch("({foo})", "\\({foo}\\)"));
        assert(matcher.isMatch("@foo", "@foo"));
        assert(matcher.isMatch("{foo}", "{foo}"));
    });

    it("should support Character class tests", () => {
        assert(!matcher.isMatch(".", "[[:digit:][:upper:][:space:]]"));
        assert(!matcher.isMatch("1", "[[:digit:][:upper:][:spaci:]]"));
        assert(!matcher.isMatch("a", "[[:digit:][:upper:][:space:]]"));
        assert(!matcher.isMatch("q", "[a-c[:digit:]x-z]"));
        assert(matcher.isMatch(" ", "[[:digit:][:upper:][:space:]]"));
        assert(matcher.isMatch(".", "[[:digit:][:punct:][:space:]]"));
        assert(matcher.isMatch(".", "[^[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:lower:][:space:][:upper:][:xdigit:]]"));
        assert(matcher.isMatch("1", "[[:digit:][:upper:][:space:]]"));
        assert(matcher.isMatch("5", "[[:xdigit:]]"));
        assert(matcher.isMatch("5", "[a-c[:digit:]x-z]"));
        assert(matcher.isMatch("_", "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:graph:][:lower:][:print:][:punct:][:space:][:upper:][:xdigit:]]"));
        assert(matcher.isMatch("_", "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:graph:][:lower:][:print:][:punct:][:space:][:upper:][:xdigit:]]"));
        assert(matcher.isMatch("A", "[[:digit:][:upper:][:space:]]"));
        assert(matcher.isMatch("a1B", "[[:alpha:]][[:digit:]][[:upper:]]"));
        assert(matcher.isMatch("b", "[a-c[:digit:]x-z]"));
        assert(matcher.isMatch("D", "[[:xdigit:]]"));
        assert(matcher.isMatch("f", "[[:xdigit:]]"));
        assert(matcher.isMatch("y", "[a-c[:digit:]x-z]"));
    });

    it("should support Additional tests, including some malformed wildmats", () => {
        assert(!matcher.isMatch("$", "[ --]"));
        assert(!matcher.isMatch("+", "[,-.]"));
        assert(!matcher.isMatch("-", "[!a-"));
        assert(!matcher.isMatch("-", "[\\-_]"));
        assert(!matcher.isMatch("-", "[a-"));
        assert(!matcher.isMatch("-.]", "[,-.]"));
        assert(!matcher.isMatch("0", "[ --]"));
        assert(!matcher.isMatch("2", "[\\1-\\3]"));
        assert(!matcher.isMatch("4", "[\\1-\\3]"));
        assert(!matcher.isMatch("5", "[--A]"));
        assert(!matcher.isMatch("[", "[\\\\-^]"));
        assert(!matcher.isMatch("[", "[]-a]"));
        assert(!matcher.isMatch("\\", "[!\\\\]"));
        assert(!matcher.isMatch("\\", "[[-\\]]"));
        assert(!matcher.isMatch("\\", "[\\]"));
        assert(!matcher.isMatch("\\", "[\\]]"));
        assert(!matcher.isMatch("\\]", "[\\]]"));
        assert(!matcher.isMatch("]", "[\\\\-^]"));
        assert(!matcher.isMatch("^", "[]-a]"));
        assert(!matcher.isMatch("a[]b", "a[]b"));
        assert(!matcher.isMatch("ab", "[!"));
        assert(!matcher.isMatch("ab", "[-"));
        assert(!matcher.isMatch("ab", "a[]b"));
        assert(!matcher.isMatch("acrt", "a[c-c]st"));
        assert(!matcher.isMatch("G", "[A-\\\\]"));
        assert(!matcher.isMatch("j", "[a-e-n]"));
        assert(matcher.isMatch(" ", "[ --]"));
        assert(matcher.isMatch(" ", "[-- ]"));
        assert(matcher.isMatch(",", "[,]"));
        assert(matcher.isMatch(",", "[\\\\,]"));
        assert(matcher.isMatch("-", "[ --]"));
        assert(matcher.isMatch("-", "[,-.]"));
        assert(matcher.isMatch("-", "[------]"));
        assert(matcher.isMatch("-", "[---]"));
        assert(matcher.isMatch("-", "[--A]"));
        assert(matcher.isMatch("-", "[-]"));
        assert(matcher.isMatch("-", "[[-\\]]"));
        assert(matcher.isMatch("-", "[a-e-n]"));
        assert(matcher.isMatch("-b]", "[a-]b]"));
        assert(matcher.isMatch("3", "[\\1-\\3]"));
        assert(matcher.isMatch("[", "[!]-a]"));
        assert(matcher.isMatch("[", "[[-\\]]"));
        assert(matcher.isMatch("\\", "[\\\\,]"));
        assert(matcher.isMatch("\\", "[\\\\]"));
        assert(matcher.isMatch("]", "[[-\\]]"));
        assert(matcher.isMatch("]", "[\\]]"));
        assert(matcher.isMatch("^", "[!]-a]"));
        assert(matcher.isMatch("^", "[a^bc]"));
        assert(matcher.isMatch("a", "[!------]"));
        assert(matcher.isMatch("ab[", "ab["));
        assert(matcher.isMatch("acrt", "a[c-c]rt"));
    });

    it("should support Case-sensitivy features", () => {
        assert(!matcher.isMatch("A", "[[:lower:]]"));
        assert(!matcher.isMatch("a", "[[:upper:]]"));
        assert(!matcher.isMatch("a", "[A-Z]"));
        assert(!matcher.isMatch("A", "[a-z]"));
        assert(!matcher.isMatch("A", "[B-a]"));
        assert(!matcher.isMatch("A", "[B-Za]"));
        assert(!matcher.isMatch("z", "[Z-y]"));
        assert(matcher.isMatch("a", "[[:lower:]]"));
        assert(matcher.isMatch("A", "[[:upper:]]"));
        assert(matcher.isMatch("A", "[A-Z]"));
        assert(matcher.isMatch("a", "[a-z]"));
        assert(matcher.isMatch("a", "[B-a]"));
        assert(matcher.isMatch("a", "[B-Za]"));
        assert(matcher.isMatch("Z", "[Z-y]"));

        assert(matcher.isMatch("a", "[A-Z]", { nocase: true }));
        assert(matcher.isMatch("A", "[A-Z]", { nocase: true }));
        assert(matcher.isMatch("A", "[a-z]", { nocase: true }));
        assert(matcher.isMatch("a", "[a-z]", { nocase: true }));
        assert(matcher.isMatch("a", "[[:upper:]]", { nocase: true }));
        assert(matcher.isMatch("A", "[[:upper:]]", { nocase: true }));
        assert(matcher.isMatch("A", "[[:lower:]]", { nocase: true }));
        assert(matcher.isMatch("a", "[[:lower:]]", { nocase: true }));
        assert(matcher.isMatch("A", "[B-Za]", { nocase: true }));
        assert(matcher.isMatch("a", "[B-Za]", { nocase: true }));
        assert(matcher.isMatch("A", "[B-a]", { nocase: true }));
        assert(matcher.isMatch("a", "[B-a]", { nocase: true }));
        assert(matcher.isMatch("z", "[Z-y]", { nocase: true }));
        assert(matcher.isMatch("Z", "[Z-y]", { nocase: true }));
    });

    it("should support Additional tests not found in the original wildmatch", () => {
        assert(matcher.isMatch("-", "[]-z]"));
        assert(matcher.isMatch("-", "[[:space:]-\\]]"));
        assert(matcher.isMatch("]", "[[:space:]-\\]]"));
        assert(!matcher.isMatch("[", "[[:space:]-\\]]"));
        assert(!matcher.isMatch("c", "[[:space:]-z]"));
        assert(!matcher.isMatch("c", "[]-z]"));
    });
});
