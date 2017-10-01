const { util: { braces } } = adone;

describe("util", "braces", ".compile", () => {
    it("should return an object", () => {
        const res = braces.compile("a/{b,c}/d");
        assert(res);
        assert.equal(typeof res, "object");
    });

    it("should return output as an array", () => {
        const res = braces.compile("a/{b,c}/d");
        expect(res.output).to.be.an("array");
        assert.deepEqual(res.output, ["a/(b|c)/d"]);
    });
});
