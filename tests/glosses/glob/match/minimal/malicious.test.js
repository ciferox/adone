import nm from "./support/match";

/**
 * These tests are based on minimatch unit tests
 */
const generate = (len, ch) => {
    let pattern = "";
    while (--len) {
        pattern += ch;
    }
    return pattern;
};

describe("glob", "match", "minimal", "handling of potential regex exploits", () => {
    it("should support long escape sequences", () => {
        assert(nm.isMatch("A", `!(${generate(1024 * 2, "\\")}A)`), "within the limits, and valid match");
        assert(!nm.isMatch("A", `[!(${generate(1024 * 2, "\\")}A`), "within the limits, but invalid regex");
    });

    it("should throw an error when the pattern is too long", () => {
        assert.throws(() => {
            const exploit = `!(${generate(1024 * 64, "\\")}A)`;
            assert(!nm.isMatch("A", exploit));
        }, /expected pattern to be less than 65536 characters/);
    });
});
