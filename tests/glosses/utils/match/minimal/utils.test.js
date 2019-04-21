const { util } = adone.getPrivate(adone.util.match.minimal);

describe("util", "match", "minimal", "utils", () => {
    describe(".hasSpecialChars", () => {
        it("should return true when the pattern has wildcards", () => {
            assert(util.hasSpecialChars("a*b"));
            assert(util.hasSpecialChars("ab/*"));
        });

        it("should return true when the pattern has extglob characters", () => {
            assert(util.hasSpecialChars("ab(x|y)"));
            assert(util.hasSpecialChars("ab[1-4]"));
        });

        it("should return true for plus", () => {
            assert(util.hasSpecialChars("a+b"));
        });

        it("should return false for dots", () => {
            assert(!util.hasSpecialChars("a.b"));
        });

        it("should return true for dots at the beginning of a string", () => {
            assert(util.hasSpecialChars(".a.b"));
            assert(util.hasSpecialChars(".ab"));
        });

        it("should return true for dots following a slash", () => {
            assert(util.hasSpecialChars("a/.a/a"));
            assert(util.hasSpecialChars("/.a.b"));
            assert(util.hasSpecialChars("./.a.b"));
            assert(util.hasSpecialChars("./.ab"));
            assert(util.hasSpecialChars("ab/.ab"));
            assert(util.hasSpecialChars("/.ab"));
            assert(util.hasSpecialChars("/.ab/foo"));
        });
    });
});
