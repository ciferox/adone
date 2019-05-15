const mm = adone.glob.match;

describe(".every()", () => {

    it("should return true if every string matches", () => {
        const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
        assert(!mm.every(fixtures, ["z", "*/*"]));
    });

    it("should return false when not all strings match", () => {
        const fixtures = ["a/a", "a/b", "a/c", "b/a", "b/b", "b/c"];
        assert(!mm.every(fixtures, ["a/*", "x/*"]));
        assert(mm.every(fixtures, ["(a|b)/*", "*/*"]));
    });

    it("should arrayify a string value", () => {
        assert(mm.every("a", "*"));
    });
});
