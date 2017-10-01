const { util } = adone.private(adone.util.braces);

describe("util", "braces", "utils", () => {
    describe(".isEmptySets", () => {
        it("should return true if string contains only empty stems", () => {
            assert(util.isEmptySets("{,}"));
            assert(util.isEmptySets("{,}{,}"));
            assert(util.isEmptySets("{,}{,}{,}{,}{,}"));
        });

        it("should return false if string contains more than empty stems", () => {
            assert(!util.isEmptySets("{,}foo"));
        });

        it("should return false if string contains other than empty stems", () => {
            assert(!util.isEmptySets("foo"));
        });
    });

    describe(".split", () => {
        it("should split on commas by default", () => {
            assert.deepEqual(util.split("a,b,c"), ["a", "b", "c"]);
            assert.deepEqual(util.split("{a,b,c}"), ["{a", "b", "c}"]);
        });

        it("should not split inside parens", () => {
            assert.deepEqual(util.split("*(a|{b|c,d})"), ["*(a|{b|c,d})"]);
            assert.deepEqual(util.split("a,@(b,c)"), ["a", "@(b,c)"]);
            assert.deepEqual(util.split("a,*(b|c,d),z"), ["a", "*(b|c,d)", "z"]);
        });

        it("should work with unclosed parens", () => {
            assert.deepEqual(util.split("*(a|{b|c,d}"), ["*(a|{b|c,d}"]);
        });

        it("should not split inside nested parens", () => {
            assert.deepEqual(util.split("a,*(b|(c,d)),z"), ["a", "*(b|(c,d))", "z"]);
            assert.deepEqual(util.split("a,*(b,(c,d)),z"), ["a", "*(b,(c,d))", "z"]);
        });

        it("should not split inside brackets", () => {
            assert.deepEqual(util.split('[a-z,"]*'), ['[a-z,"]*']);
        });

        it("should work with unclosed brackets", () => {
            assert.deepEqual(util.split('[a-z,"*'), ['[a-z,"*']);
        });

        it("should not split parens nested inside brackets", () => {
            assert.deepEqual(util.split('[-a(z,")]*'), ['[-a(z,")]*']);
        });

        it("should not split brackets nested inside parens", () => {
            assert.deepEqual(util.split("x,(a,[-a,])*"), ["x", "(a,[-a,])*"]);
            assert.deepEqual(util.split("a,(1,[^(x,y)],3),z"), ["a", "(1,[^(x,y)],3)", "z"]);
        });

        it("should support escaped parens", () => {
            assert.deepEqual(util.split("a,@(b,c\\),z)"), ["a", "@(b,c\\),z)"]);
        });

        it("should support escaped brackets", () => {
            assert.deepEqual(util.split("a,@([b,c\\],x]|b),z"), ["a", "@([b,c\\],x]|b)", "z"]);
            assert.deepEqual(util.split("a,@([b,c\\],x],b),z"), ["a", "@([b,c\\],x],b)", "z"]);
        });
    });
});
