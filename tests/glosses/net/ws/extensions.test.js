const { net: { ws: { exts } } } = adone;

describe("net", "ws", "Extensions", () => {
    describe("parse", () => {
        it("parses a single extension", () => {
            const extensions = exts.parse("foo");

            assert.deepStrictEqual(extensions, { foo: [{}] });
        });

        it("parses params", () => {
            const extensions = exts.parse("foo; bar; baz=1; bar=2");

            assert.deepStrictEqual(extensions, {
                foo: [{ bar: [true, "2"], baz: ["1"] }]
            });
        });

        it("parses multiple extensions", () => {
            const extensions = exts.parse("foo, bar; baz, foo; baz");

            assert.deepStrictEqual(extensions, {
                foo: [{}, { baz: [true] }],
                bar: [{ baz: [true] }]
            });
        });

        it("parses quoted params", () => {
            const extensions = exts.parse('foo; bar="hi"');

            assert.deepStrictEqual(extensions, {
                foo: [{ bar: ["hi"] }]
            });
        });

        it("ignores names that match Object.prototype properties", () => {
            const parse = exts.parse;

            assert.deepStrictEqual(parse("hasOwnProperty, toString"), {});
            assert.deepStrictEqual(parse("foo; constructor"), { foo: [{}] });
        });
    });

    describe("format", () => {
        it("formats a single extension", () => {
            const extensions = exts.format({ foo: {} });

            assert.strictEqual(extensions, "foo");
        });

        it("formats params", () => {
            const extensions = exts.format({ foo: { bar: [true, 2], baz: 1 } });

            assert.strictEqual(extensions, "foo; bar; bar=2; baz=1");
        });

        it("formats multiple extensions", () => {
            const extensions = exts.format({
                foo: [{}, { baz: true }],
                bar: { baz: true }
            });

            assert.strictEqual(extensions, "foo, foo; baz, bar; baz");
        });
    });
});
