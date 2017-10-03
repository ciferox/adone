const { util: { match: { extglob: { capture } } } } = adone;

describe("util", "match", "extglob", ".capture()", () => {
    it("should return null if no match", () => {
        assert.equal(capture("test/(a|b)", "hi/123"), null);
    });

    it("should capture paren groups", () => {
        assert.deepEqual(capture("test/(a|b)/x.js", "test/a/x.js"), ["a"]);
        assert.deepEqual(capture("test/(a|b)/x.js", "test/b/x.js"), ["b"]);
    });

    it("should capture star groups", () => {
        assert.deepEqual(capture("test/a*(a|b)/x.js", "test/a/x.js"), [""]);
        assert.deepEqual(capture("test/a*(a|b)/x.js", "test/aa/x.js"), ["a"]);
        assert.deepEqual(capture("test/a*(a|b)/x.js", "test/ab/x.js"), ["b"]);
        assert.deepEqual(capture("test/a*(a|b)/x.js", "test/aba/x.js"), ["ba"]);
    });

    it("should capture plus groups", () => {
        assert.deepEqual(capture("test/+(a|b)/x.js", "test/a/x.js"), ["a"]);
        assert.deepEqual(capture("test/+(a|b)/x.js", "test/b/x.js"), ["b"]);
        assert.deepEqual(capture("test/+(a|b)/x.js", "test/ab/x.js"), ["ab"]);
        assert.deepEqual(capture("test/+(a|b)/x.js", "test/aba/x.js"), ["aba"]);
    });

    it("should capture optional groups", () => {
        assert.deepEqual(capture("test/a?(a|b)/x.js", "test/a/x.js"), [""]);
        assert.deepEqual(capture("test/a?(a|b)/x.js", "test/ab/x.js"), ["b"]);
        assert.deepEqual(capture("test/a?(a|b)/x.js", "test/aa/x.js"), ["a"]);
    });

    it("should capture @ groups", () => {
        assert.deepEqual(capture("test/@(a|b)/x.js", "test/a/x.js"), ["a"]);
        assert.deepEqual(capture("test/@(a|b)/x.js", "test/b/x.js"), ["b"]);
    });

    it("should capture negated groups", () => {
        assert.deepEqual(capture("test/!(a|b)/x.js", "test/x/x.js"), ["x"]);
        assert.deepEqual(capture("test/!(a|b)/x.js", "test/y/x.js"), ["y"]);
    });
});
