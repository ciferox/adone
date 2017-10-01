const { util: { braces } } = adone;

describe("util", "braces", ".makeRe", () => {
    it("should throw an error when invalid args are passed", () => {
        assert.throws(() => {
            braces.makeRe();
        });
    });

    it("should throw an error when string exceeds max safe length", () => {
        const MAX_LENGTH = 1024 * 64;

        assert.throws(() => {
            braces.makeRe(Array(MAX_LENGTH + 1).join("."));
        });
    });
});
