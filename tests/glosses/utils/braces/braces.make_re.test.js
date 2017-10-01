const { util: { braces } } = adone;

describe("util", "braces", ".create", () => {
    it("should throw an error when invalid args are passed", () => {
        assert.throws(() => {
            braces.create();
        });
    });

    it("should throw an error when string exceeds max safe length", () => {
        const MAX_LENGTH = 1024 * 64;

        assert.throws(() => {
            braces.create(Array(MAX_LENGTH + 1).join("."));
        });
    });
});
