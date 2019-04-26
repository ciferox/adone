const {
    is,
    glob: { match: { posixBrackets: matcher } },
    util
} = adone;

const compare = (a, b) => {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a > b ? 1 : a < b ? -1 : 0;
};

const match = function (fixtures, pattern, expected, options, msg) {
    if (!is.array(expected)) {
        const tmp = expected;
        expected = options;
        options = tmp;
    }

    if (is.string(options)) {
        msg = options;
        options = {};
    }

    msg = msg ? (`${pattern} ${msg}`) : pattern;
    const actual = matcher.match(util.arrify(fixtures), pattern, options);
    expected.sort(compare);
    actual.sort(compare);
    assert.deepEqual(actual, expected, msg);
};

describe("glob", "match", "posixBrackets", () => {
    describe("main export", () => {
        it("should create the equivalent regex character classes for POSIX expressions:", () => {
            assert.equal(matcher("foo[[:lower:]]bar"), "foo[a-z]bar");
            assert.equal(matcher("foo[[:lower:][:upper:]]bar"), "foo[a-zA-Z]bar");
            assert.equal(matcher("[[:alpha:]123]"), "[a-zA-Z123]");
            assert.equal(matcher("[[:lower:]]"), "[a-z]");
            assert.equal(matcher("[![:lower:]]"), "[^a-z]");
            assert.equal(matcher("[[:digit:][:upper:][:space:]]"), "[0-9A-Z \\t\\r\\n\\v\\f]");
            assert.equal(matcher("[[:xdigit:]]"), "[A-Fa-f0-9]");
            assert.equal(matcher("[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:graph:][:lower:][:print:][:punct:][:space:][:upper:][:xdigit:]]"), '[a-zA-Z0-9a-zA-Z \\t\\x00-\\x1F\\x7F0-9\\x21-\\x7Ea-z\\x20-\\x7E \\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~ \\t\\r\\n\\v\\fA-ZA-Fa-f0-9]');
            assert.equal(matcher("[^[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:lower:][:space:][:upper:][:xdigit:]]"), "[^a-zA-Z0-9a-zA-Z \\t\\x00-\\x1F\\x7F0-9a-z \\t\\r\\n\\v\\fA-ZA-Fa-f0-9]");
            assert.equal(matcher("[a-c[:digit:]x-z]"), "[a-c0-9x-z]");
            assert.equal(matcher("[_[:alpha:]][_[:alnum:]][_[:alnum:]]*"), "[_a-zA-Z][_a-zA-Z0-9][_a-zA-Z0-9]*", []);
        });
    });

    describe(".match", () => {
        it("should support POSIX.2 character classes", () => {
            match(["e"], "[[:xdigit:]]", ["e"]);
            match(["a", "1", "5", "A"], "[[:alpha:]123]", ["1", "a", "A"]);
            match(["9", "A", "b"], "[![:alpha:]]", ["9"]);
            match(["9", "A", "b"], "[^[:alpha:]]", ["9"]);
            match(["9", "a", "B"], "[[:digit:]]", ["9"]);
            match(["a", "b", "A"], "[:alpha:]", ["a"], "not a valid posix bracket, but valid char class");
            match(["a", "b", "A"], "[[:alpha:]]", ["a", "A", "b"]);
            match(["a", "aa", "aB", "a7"], "[[:lower:][:lower:]]", ["a"]);
            match(["a", "7", "aa", "aB", "a7"], "[[:lower:][:digit:]]", ["7", "a"]);
        });

        it("should match word characters", () => {
            const fixtures = ["a c", "a1c", "a123c", "a.c", "a.xy.zc", "a.zc", "abbbbc", "abbbc", "abbc", "abc", "abq", "axy zc", "axy", "axy.zc", "axyzc"];
            match(fixtures, "a[a-z]+c", ["abbbbc", "abbbc", "abbc", "abc", "axyzc"]);
        });

        it("should match literal brackets when escaped", () => {
            match(["a [b]", "a b"], "a [b]", ["a b"]);
            match(["a [b]", "a b"], "a \\[b\\]", ["a [b]"]);
            match(["a [b]", "a b"], "a ([b])", ["a b"]);
            match(["a [b]", "a b"], "a (\\[b\\]|[b])", ["a [b]", "a b"]);
            match(["a [b] c", "a b c"], "a [b] c", ["a b c"]);
        });

        it("should match character classes", () => {
            match(["abc", "abd"], "a[bc]d", ["abd"]);
        });

        it("should match character class alphabetical ranges", () => {
            match(["abc", "abd", "ace", "ac", "a-"], "a[b-d]e", ["ace"]);
            match(["abc", "abd", "ace", "ac", "a-"], "a[b-d]", ["ac"]);
        });

        it("should match character classes with leading dashes", () => {
            match(["abc", "abd", "ace", "ac", "a-"], "a[-c]", ["a-", "ac"]);
        });

        it("should match character classes with trailing dashes", () => {
            match(["abc", "abd", "ace", "ac", "a-"], "a[c-]", ["a-", "ac"]);
        });

        it("should match bracket literals", () => {
            match(["a]c", "abd", "ace", "ac", "a-"], "a[]]c", ["a]c"]);
        });

        it("should match bracket literals", () => {
            match(["a]", "abd", "ace", "ac", "a-"], "a]", ["a]"]);
        });

        it("should negation patterns", () => {
            match(["a]", "acd", "aed", "ac", "a-"], "a[^bc]d", ["aed"]);
        });

        it("should match negated dashes", () => {
            match(["adc", "a-c"], "a[^-b]c", ["adc"]);
        });

        it("should match negated brackets", () => {
            match(["adc", "a]c"], "a[^]b]c", ["adc"]);
        });

        it("should match alpha-numeric characters", () => {
            match(["01234", "0123e456", "0123e45g78"], "[\\de]+", ["01234", "0123e456"]);
            match(["01234", "0123e456", "0123e45g78"], "[\\de]*", ["01234", "0123e456"]);
            match(["01234", "0123e456", "0123e45g78"], "[e\\d]+", ["01234", "0123e456"]);
        });

        it("should not create an invalid posix character class:", () => {
            assert.equal(matcher("[:al:]"), "[:al:]");
            assert.equal(matcher("[abc[:punct:][0-9]"), '[abc\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~\\[0-9]');
        });

        it("should return `true` when the pattern matches:", () => {
            assert(matcher.isMatch("a", "[[:lower:]]"));
            assert(matcher.isMatch("A", "[[:upper:]]"));
            assert(matcher.isMatch("A", "[[:digit:][:upper:][:space:]]"));
            assert(matcher.isMatch("1", "[[:digit:][:upper:][:space:]]"));
            assert(matcher.isMatch(" ", "[[:digit:][:upper:][:space:]]"));
            assert(matcher.isMatch("5", "[[:xdigit:]]"));
            assert(matcher.isMatch("f", "[[:xdigit:]]"));
            assert(matcher.isMatch("D", "[[:xdigit:]]"));
            assert(matcher.isMatch("_", "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:graph:][:lower:][:print:][:punct:][:space:][:upper:][:xdigit:]]"));
            assert(matcher.isMatch("_", "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:graph:][:lower:][:print:][:punct:][:space:][:upper:][:xdigit:]]"));
            assert(matcher.isMatch(".", "[^[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:lower:][:space:][:upper:][:xdigit:]]"));
            assert(matcher.isMatch("5", "[a-c[:digit:]x-z]"));
            assert(matcher.isMatch("b", "[a-c[:digit:]x-z]"));
            assert(matcher.isMatch("y", "[a-c[:digit:]x-z]"));
        });

        it("should return `false` when the pattern does not match:", () => {
            assert(!matcher.isMatch("A", "[[:lower:]]"));
            assert(matcher.isMatch("A", "[![:lower:]]"));
            assert(!matcher.isMatch("a", "[[:upper:]]"));
            assert(!matcher.isMatch("a", "[[:digit:][:upper:][:space:]]"));
            assert(!matcher.isMatch(".", "[[:digit:][:upper:][:space:]]"));
            assert(!matcher.isMatch(".", "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:lower:][:space:][:upper:][:xdigit:]]"));
            assert(!matcher.isMatch("q", "[a-c[:digit:]x-z]"));
        });
    });

    describe(".makeRe()", () => {
        it("should make a regular expression for the given pattern:", () => {
            assert.deepEqual(matcher.makeRe("[[:alpha:]123]"), /^(?:[a-zA-Z123])$/);
            assert.deepEqual(matcher.makeRe("[![:lower:]]"), /^(?:[^a-z])$/);
        });
    });

    describe(".match()", () => {
        it("should return an array of matching strings:", () => {
            match(["a1B", "a1b"], "[[:alpha:]][[:digit:]][[:upper:]]", ["a1B"]);
            match([".", "a", "!"], "[[:digit:][:punct:][:space:]]", [".", "!"]);
        });
    });

    describe("POSIX: From the test suite for the POSIX.2 (BRE) pattern matching code:", () => {
        it("First, test POSIX.2 character classes", () => {
            assert(matcher.isMatch("e", "[[:xdigit:]]"));
            assert(matcher.isMatch("1", "[[:xdigit:]]"));
            assert(matcher.isMatch("a", "[[:alpha:]123]"));
            assert(matcher.isMatch("1", "[[:alpha:]123]"));
        });

        it("should match using POSIX.2 negation patterns", () => {
            assert(matcher.isMatch("9", "[![:alpha:]]"));
            assert(matcher.isMatch("9", "[^[:alpha:]]"));
        });

        it("should match word characters", () => {
            assert(matcher.isMatch("A", "[[:word:]]"));
            assert(matcher.isMatch("B", "[[:word:]]"));
            assert(matcher.isMatch("a", "[[:word:]]"));
            assert(matcher.isMatch("b", "[[:word:]]"));
        });

        it("should match digits with word class", () => {
            assert(matcher.isMatch("1", "[[:word:]]"));
            assert(matcher.isMatch("2", "[[:word:]]"));
        });

        it("should not digits", () => {
            assert(matcher.isMatch("1", "[[:digit:]]"));
            assert(matcher.isMatch("2", "[[:digit:]]"));
        });

        it("should not match word characters with digit class", () => {
            assert(!matcher.isMatch("a", "[[:digit:]]"));
            assert(!matcher.isMatch("A", "[[:digit:]]"));
        });

        it("should match uppercase alpha characters", () => {
            assert(matcher.isMatch("A", "[[:upper:]]"));
            assert(matcher.isMatch("B", "[[:upper:]]"));
        });

        it("should not match lowercase alpha characters", () => {
            assert(!matcher.isMatch("a", "[[:upper:]]"));
            assert(!matcher.isMatch("b", "[[:upper:]]"));
        });

        it("should not match digits with upper class", () => {
            assert(!matcher.isMatch("1", "[[:upper:]]"));
            assert(!matcher.isMatch("2", "[[:upper:]]"));
        });

        it("should match lowercase alpha characters", () => {
            assert(matcher.isMatch("a", "[[:lower:]]"));
            assert(matcher.isMatch("b", "[[:lower:]]"));
        });

        it("should not match uppercase alpha characters", () => {
            assert(!matcher.isMatch("A", "[[:lower:]]"));
            assert(!matcher.isMatch("B", "[[:lower:]]"));
        });

        it("should match one lower and one upper character", () => {
            assert(matcher.isMatch("aA", "[[:lower:]][[:upper:]]"));
            assert(!matcher.isMatch("AA", "[[:lower:]][[:upper:]]"));
            assert(!matcher.isMatch("Aa", "[[:lower:]][[:upper:]]"));
        });

        it("should match hexidecimal digits", () => {
            assert(matcher.isMatch("ababab", "[[:xdigit:]]*"));
            assert(matcher.isMatch("020202", "[[:xdigit:]]*"));
            assert(matcher.isMatch("900", "[[:xdigit:]]*"));
        });

        it('should match punctuation characters (\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~)', () => {
            assert(matcher.isMatch("!", "[[:punct:]]"));
            assert(matcher.isMatch("?", "[[:punct:]]"));
            assert(matcher.isMatch("#", "[[:punct:]]"));
            assert(matcher.isMatch("&", "[[:punct:]]"));
            assert(matcher.isMatch("@", "[[:punct:]]"));
            assert(matcher.isMatch("+", "[[:punct:]]"));
            assert(matcher.isMatch("*", "[[:punct:]]"));
            assert(matcher.isMatch(":", "[[:punct:]]"));
            assert(matcher.isMatch("=", "[[:punct:]]"));
            assert(matcher.isMatch("|", "[[:punct:]]"));
            assert(matcher.isMatch("|++", "[[:punct:]]*"));
        });

        it("should only match one character", () => {
            assert(!matcher.isMatch("?*+", "[[:punct:]]"));
        });

        it("should only match zero or more characters", () => {
            assert(matcher.isMatch("?*+", "[[:punct:]]*"));
            assert(matcher.isMatch("", "[[:punct:]]*"));
        });

        it("invalid character class expressions are just characters to be matched", () => {
            match(["a"], "[:al:]", ["a"]);
            match(["a"], "[[:al:]", ["a"]);
            match(["!"], "[abc[:punct:][0-9]", ["!"]);
        });

        it("should match the start of a valid sh identifier", () => {
            assert(matcher.isMatch("PATH", "[_[:alpha:]]*"));
        });

        it("should match the first two characters of a valid sh identifier", () => {
            assert(matcher.isMatch("PATH", "[_[:alpha:]][_[:alnum:]]*"));
        });

        /**
         * Some of these tests (and their descriptions) were ported directly
         * from the Bash 4.3 unit tests.
         */

        it("how about A?", () => {
            match(["9"], "[[:digit:]]", ["9"]);
            match(["X"], "[[:digit:]]", []);
            match(["aB"], "[[:lower:]][[:upper:]]", ["aB"]);
            match(["a", "3", "aa", "a3", "abc"], "[[:alpha:][:digit:]]", ["3", "a"]);
            match(["a", "b"], "[[:alpha:]\\]", [], []);
        });

        it("OK, what's a tab?  is it a blank? a space?", () => {
            assert(matcher.isMatch("\t", "[[:blank:]]"));
            assert(matcher.isMatch("\t", "[[:space:]]"));
            assert(matcher.isMatch(" ", "[[:space:]]"));
        });

        it("let's check out characters in the ASCII range", () => {
            assert(!matcher.isMatch("\\377", "[[:ascii:]]"));
            assert(!matcher.isMatch("9", "[1[:alpha:]123]"));
        });

        it("punctuation", () => {
            assert(!matcher.isMatch(" ", "[[:punct:]]"));
        });

        it("graph", () => {
            assert(matcher.isMatch("A", "[[:graph:]]"));
            assert(!matcher.isMatch("\b", "[[:graph:]]"));
            assert(!matcher.isMatch("\n", "[[:graph:]]"));
            assert(matcher.isMatch("\s", "[[:graph:]]"));
        });
    });
});

