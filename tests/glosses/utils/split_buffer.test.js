const {
    util: { splitBuffer }
} = adone;

describe("util", "splitBuffer", () => {
    it("can split", () => {
        const b = Buffer.from("this is a buffer i like to split");
        const delim = Buffer.from("buffer");
        let result = splitBuffer(b, delim);

        assert.equal(result.length, 2, "should have found chunks");
        assert.equal(result[0].toString(), "this is a ", "first chunk should not include delim");
        assert.equal(result[1].toString(), " i like to split", "should have all results");

        result = splitBuffer(b, delim, true);
        assert.equal(result[0].toString(), "this is a buffer", "should include delim");
        result = splitBuffer(Buffer.from("foo,"), Buffer.from(","));
        assert.equal(result.length, 2, "should have all results");
        result = splitBuffer(Buffer.from("foo"), Buffer.from(","));
        assert.equal(result.length, 1, "should have all results");
    });
});
