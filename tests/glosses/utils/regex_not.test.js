describe("util", "regexNot", () => {
    const { regexNot: not } = adone.util;

    it("should export a function", () => {
        assert.equal(typeof not, "function");
    });

    it("should create a negation regex", () => {
        const re = not("foo");
        assert.deepEqual(re, /^(?:(?!^(?:foo)$).)+$/);
        assert.equal(re.test("foo"), false);
        assert.equal(re.test("bar"), true);
        assert.equal(re.test("foobar"), true);
        assert.equal(re.test("barfoo"), true);
    });

    it("should create a loose negation regex when `options.contains` is true", () => {
        assert.deepEqual(not("foo", { contains: true }), /^(?:(?!(?:foo)).)+$/);
        assert.equal(not("foo", { contains: true }).test("foo"), false);
        assert.equal(not("foo", { contains: true }).test("bar"), true);
        assert.equal(not("foo", { contains: true }).test("foobar"), false);
        assert.equal(not("foo", { contains: true }).test("barfoo"), false);
    });

    it("should create a loose negation regex when `options.strictNegate` is false", () => {
        const opts = { strictNegate: false };
        assert.deepEqual(not("foo", opts), /^(?:(?!(?:foo)).)+$/);
        assert.equal(not("foo", opts).test("foo"), false);
        assert.equal(not("foo", opts).test("bar"), true);
        assert.equal(not("foo", opts).test("foobar"), false);
        assert.equal(not("foo", opts).test("barfoo"), false);
    });

    it("should support `options.endChar`", () => {
        const opts = { endChar: "*" };
        assert.deepEqual(not("foo", opts), /^(?:(?!^(?:foo)$).)*$/);
        assert.deepEqual(not("foo", opts).exec("foo"), null);
        assert.equal(not("foo", opts).test("foo"), false);
        assert.equal(not("foo", opts).test("bar"), true);
        assert.equal(not("foo", opts).test("foobar"), true);
        assert.equal(not("foo", opts).test("barfoo"), true);
    });

    it("should throw when a potentially unsafe regex is passed", () => {
        assert.throws(() => {
            not("(x+x+)+y", { safe: true });
        }, "potentially unsafe");
    });

    it("should throw an error when invalid args are passed", () => {
        assert.throws(() => {
            not();
        }, "expected a string");
    });
});
