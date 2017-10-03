const mm = adone.util.match;

describe("util", "match", ".makeRe()", () => {
    it("should throw an error when value is not a string", () => {
        assert.throws(() => {
            mm.makeRe();
        });
    });

    it("should create a regex for a glob pattern", () => {
        assert(mm.makeRe("*") instanceof RegExp);
    });

    it("should create a regex for a string", () => {
        assert.deepEqual(mm.makeRe("abc").source, "^(?:abc)$");
    });
});
