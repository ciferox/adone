const {
    util: { generateFunction }
} = adone;

describe("util", "generateFunction", () => {
    it("generate add function", () => {
        const fn = generateFunction()
            ("function add(n) {")
            ("return n + %d", 42)
            ("}");

        assert.strictEqual(fn.toString(), "function add(n) {\n  return n + 42\n}", "code is indented");
        assert.strictEqual(fn.toFunction()(10), 52, "function works");
    });

    it("generate function + closed variables", () => {
        const fn = generateFunction()
            ("function add(n) {")
            ("return n + %d + number", 42)
            ("}");

        const notGood = fn.toFunction();
        const good = fn.toFunction({ number: 10 });

        try {
            notGood(10);
            assert.ok(false, "function should not work");
        } catch (err) {
            assert.strictEqual(err.message, "number is not defined", "throws reference error");
        }

        assert.strictEqual(good(11), 63, "function with closed var works");
    });

    it("generate property", () => {
        const gen = generateFunction();

        assert.strictEqual(gen.property("a"), "a");
        assert.strictEqual(gen.property("42"), '"42"');
        assert.strictEqual(gen.property("b", "a"), "b.a");
        assert.strictEqual(gen.property("b", "42"), 'b["42"]');
        assert.strictEqual(gen.sym(42), "tmp");
        assert.strictEqual(gen.sym("a"), "a");
        assert.strictEqual(gen.sym("a"), "a1");
        assert.strictEqual(gen.sym(42), "tmp1");
        assert.strictEqual(gen.sym("const"), "tmp2");
    });
});
