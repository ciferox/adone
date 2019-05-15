const { fillRange } = adone.glob.match;
const { isMatch } = adone.glob.match.picomatch;

describe("options.expandRange", () => {
    it("should support a custom function for expanding ranges in brace patterns", () => {
        assert(isMatch("a/c", "a/{a..c}", { expandRange: (a, b) => `([${a}-${b}])` }));
        assert(!isMatch("a/z", "a/{a..c}", { expandRange: (a, b) => `([${a}-${b}])` }));
        assert(isMatch("a/99", "a/{1..100}", {
            expandRange(a, b) {
                return `(${fillRange(a, b, { toRegex: true })})`;
            }
        }));
    });
});
