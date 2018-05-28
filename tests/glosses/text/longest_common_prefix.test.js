const {
    text: { longestCommonPrefix }
} = adone;

describe("longestCommonPrefix", () => {
    it("test1", () => {
        assert.equal(longestCommonPrefix([]), "");
        assert.equal(longestCommonPrefix(["a", "b", "c"]), "");
        assert.equal(longestCommonPrefix(["aa", "ab", "ac"]), "a");
        assert.equal(longestCommonPrefix(["aaaa", "aab", "aaaac"]), "aa");
        assert.equal(longestCommonPrefix(["abaa", "aab", "aaaac"]), "a");
        assert.equal(longestCommonPrefix([" abaa", " aab", " aaaac"]), " a");
        assert.equal(longestCommonPrefix(["a", "a", "a"]), "a");
        assert.equal(longestCommonPrefix(["abcd", "abcd", "abcd"]), "abcd");
        assert.equal(longestCommonPrefix(["", "", ""]), "");
        assert.equal(longestCommonPrefix([
            "mango-orange",
            "mango-apple",
            "mango-purple",
            "mango-pear"
        ]), "mango-");
    });
});
