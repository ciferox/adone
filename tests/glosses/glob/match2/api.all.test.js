

process.env.PICOMATCH_NO_CACHE = "true";

const path = require("path");
const { all } = adone.glob.match;

if (!process.env.ORIGINAL_PATH_SEP) {
    process.env.ORIGINAL_PATH_SEP = path.sep;
}

describe(".all()", () => {
    it("should throw an error when value is not a string", () => {
        assert.throws(() => all());
    });

    it("should return true when all patterns match the given string", () => {
        assert(all("z", ["z", "*", "[a-z]"]));
        assert(all("b", "b"));
        assert(all("b", "*"));
    });

    it("should return false when some patterns do not match", () => {
        assert(!all("a", ["a", "b", "*"]));
        assert(!all("a", ["a*", "z*"]));
    });

    it("should arrayify a string pattern", () => {
        assert(all("a", "*"));
    });
});
