describe("shani", "util", "__", "util", "typeOf", () => {
    const { typeOf } = adone.shani.util.__.util;

    it("returns boolean", () => {
        assert.equal(typeOf(false), "boolean");
    });

    it("returns string", () => {
        assert.equal(typeOf("Sinon.JS"), "string");
    });

    it("returns number", () => {
        assert.equal(typeOf(123), "number");
    });

    it("returns object", () => {
        assert.equal(typeOf({}), "object");
    });

    it("returns function", () => {
        assert.equal(typeOf(() => {}), "function");
    });

    it("returns undefined", () => {
        assert.equal(typeOf(undefined), "undefined");
    });

    it("returns null", () => {
        assert.equal(typeOf(null), "null");
    });

    it("returns array", () => {
        assert.equal(typeOf([]), "array");
    });

    it("returns regexp", () => {
        assert.equal(typeOf(/.*/), "regexp");
    });

    it("returns date", () => {
        assert.equal(typeOf(new Date()), "date");
    });
});
