const mm = adone.glob.match;

describe("glob", "match", ".every()", () => {
    it("should return true if every string matches", () => {
        const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
        assert(mm.every(fixtures, ["z", "*/*"]));
    });

    it("should return false when not all strings match", () => {
        const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
        assert(!mm.every(fixtures, ["a/*", "x/*"]));
    });

    it("should arrayify a string value", () => {
        assert(mm.every("a", ["*"]));
    });
});
