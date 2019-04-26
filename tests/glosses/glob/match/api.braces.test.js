const mm = adone.glob.match;

describe("glob", "match", ".braces()", () => {
    it("should throw an error when arguments are invalid", () => {
        assert.throws(() => {
            mm.braces();
        });
    });

    it("should create a regex source string from a brace pattern", () => {
        assert.deepEqual(mm.braces("{a,b}"), ["(a|b)"]);
    });

    it("should expand a brace pattern", () => {
        assert.deepEqual(mm.braces("{a,b}", { expand: true }), ["a", "b"]);
    });
});
