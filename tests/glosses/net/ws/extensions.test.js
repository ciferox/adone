const { net: { ws: { exts } } } = adone;

describe("net", "ws", "Extensions", () => {
    describe("parse", () => {
        it("should parse", () => {
            const extensions = exts.parse("foo");

            assert.deepStrictEqual(extensions, { foo: [{}] });
        });

        it("should parse params", () => {
            const extensions = exts.parse("foo; bar; baz=1; bar=2");

            assert.deepStrictEqual(extensions, {
                foo: [{ bar: [true, "2"], baz: ["1"] }]
            });
        });

        it("should parse multiple extensions", () => {
            const extensions = exts.parse("foo, bar; baz, foo; baz");

            assert.deepStrictEqual(extensions, {
                foo: [{}, { baz: [true] }],
                bar: [{ baz: [true] }]
            });
        });

        it("should parse quoted params", () => {
            const extensions = exts.parse('foo; bar="hi"');

            assert.deepStrictEqual(extensions, {
                foo: [{ bar: ["hi"] }]
            });
        });
    });

    describe("format", () => {
        it("should format", () => {
            const extensions = exts.format({ foo: {} });

            assert.strictEqual(extensions, "foo");
        });

        it("should format params", () => {
            const extensions = exts.format({ foo: { bar: [true, 2], baz: 1 } });

            assert.strictEqual(extensions, "foo; bar; bar=2; baz=1");
        });

        it("should format multiple extensions", () => {
            const extensions = exts.format({
                foo: [{}, { baz: true }],
                bar: { baz: true }
            });

            assert.strictEqual(extensions, "foo, foo; baz, bar; baz");
        });
    });
});
