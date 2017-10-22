describe("shani", "util", "__", "util", "valueToString", () => {
    const { valueToString } = adone.shani.util.__.util;

    it("returns string representation of an object", () => {
        const obj = {};

        assert.equal(valueToString(obj), obj.toString());
    });

    it("returns 'null' for literal null'", () => {
        assert.equal(valueToString(null), "null");
    });

    it("returns 'undefined' for literal undefined", () => {
        assert.equal(valueToString(undefined), "undefined");
    });
});
