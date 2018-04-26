const { Snapdragon } = adone.util;

describe("util", "Snapdragon", "options", () => {
    it("should correctly accept and store options in constructor", () => {
        const snap = new Snapdragon({
            a: true,
            b: null,
            c: false,
            d: "d"
        });

        assert.strictEqual(snap.options.a, true);
        assert.strictEqual(snap.options.b, null);
        assert.strictEqual(snap.options.c, false);
        assert.strictEqual(snap.options.d, "d");
    });
});
