const mm = adone.glob.match;

describe("glob", "match", ".all()", () => {
    it("should throw an error when value is not a string", () => {
        assert.throws(() => {
            mm.all();
        });
    });

    it("should return true when all patterns match the given string", () => {
        assert(mm.all("z", ["z", "*", "[a-z]"]));
        assert(mm.all("b", "b"));
        assert(mm.all("b", "*"));
    });

    it("should return false when some patterns do not match", () => {
        assert(!mm.all("a", ["a", "b", "*"]));
    });

    it("should arrayify a string value", () => {
        assert(mm.all("a", ["*"]));
    });
});
