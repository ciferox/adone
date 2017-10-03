const mm = adone.util.match;

describe("util", "match", ".some()", () => {
    it("should return true if any matches are found", () => {
        const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
        assert(mm.some(fixtures, ["z", "b/*"]));
    });

    it("should return false if no matches are found", () => {
        const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
        assert(!mm.some(fixtures, ["z", "x/*"]));
    });

    it("should arrayify a string value", () => {
        assert(mm.some("a", ["*"]));
    });
});
