/* global describe it */

const Extensions = adone.net.ws.exts;

describe("Extensions", () => {
    describe("parse", () => {
        it("should parse", () => {
            const extensions = Extensions.parse("foo");

            assert.deepEqual(extensions, { foo: [{}] });
        });

        it("should parse params", () => {
            const extensions = Extensions.parse("foo; bar; baz=1; bar=2");

            assert.deepEqual(extensions, {
                foo: [{ bar: [true, "2"], baz: ["1"] }]
            });
        });

        it("should parse multiple extensions", () => {
            const extensions = Extensions.parse("foo, bar; baz, foo; baz");

            assert.deepEqual(extensions, {
                foo: [{}, { baz: [true] }],
                bar: [{ baz: [true] }]
            });
        });

        it("should parse quoted params", () => {
            const extensions = Extensions.parse("foo; bar=\"hi\"");

            assert.deepEqual(extensions, {
                foo: [{ bar: ["hi"] }]
            });
        });
    });

    describe("format", () => {
        it("should format", () => {
            const extensions = Extensions.format({ foo: {} });

            assert.strictEqual(extensions, "foo");
        });

        it("should format params", () => {
            const extensions = Extensions.format({ foo: { bar: [true, 2], baz: 1 } });

            assert.strictEqual(extensions, "foo; bar; bar=2; baz=1");
        });

        it("should format multiple extensions", () => {
            const extensions = Extensions.format({
                foo: [{}, { baz: true }],
                bar: { baz: true }
            });

            assert.strictEqual(extensions, "foo, foo; baz, bar; baz");
        });
    });
});
