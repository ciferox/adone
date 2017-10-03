const mm = adone.util.match;

describe("util", "match", ".braceExpand()", () => {
    it("should throw an error when arguments are invalid", () => {
        assert.throws(() => {
            mm.braceExpand();
        });
    });

    it("should expand a brace pattern", () => {
        assert.deepEqual(mm.braceExpand("{a,b}"), ["a", "b"]);
    });
});
