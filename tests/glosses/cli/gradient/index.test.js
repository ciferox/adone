const {
    cli: { gradient }
} = adone;

describe("terminal", "gradient", () => {
    // Asset that actual is equal to at least one element of expected
    const assertEqualOne = (actual, expected) => {
        assert.isTrue(expected.indexOf(actual) > -1);
    };

    it("throw error if wrong gradient arguments", () => {
        assert.throws(() => gradient.create()("abc"));
        assert.throws(() => gradient.create("red")("abc"));
    });

    it("do not throw error if nothing to color", () => {
        assert.strictEqual(gradient.create("gold", "silver")(), "");
        assert.strictEqual(gradient.create("gold", "silver")(null), "");
    });

    it("throw error if options is not an object", () => {
        assert.throws(() => gradient.create("blue", "red")("abc", false), "Expected `options` to be an `object`, got `boolean`");
    });

    it("throw error if interpolation is not a string", () => {
        assert.throws(() => gradient.create("blue", "red")("abc", { interpolation: 1000 }), "Expected `options.interpolation` to be a `string`, got `number`");
    });

    it("throw error if hsvSpin is not a string, but only if interpolation is HSV", () => {
        gradient.create("blue", "red")("abc", { hsvSpin: 42 });
        assert.throws(() => gradient.create("blue", "red")("abc", { interpolation: "hsv", hsvSpin: 42 }), "Expected `options.hsvSpin` to be a `string`, got `number`");
    });

    it("works fine", () => {
        assertEqualOne(gradient.create("blue", "white", "red")("abc"), [
            "\u001b[94ma\u001b[39m\u001b[97mb\u001b[39m\u001b[91mc\u001b[39m",
            "\u001b[38;2;0;0;255ma\u001b[39m\u001b[38;2;255;255;255mb\u001b[39m\u001b[38;2;255;0;0mc\u001b[39m"
        ]);

        // Red -> yellow -> green (short arc)
        assertEqualOne(gradient.create("red", "green")("abc", { interpolation: "hsv" }), [
            "\u001b[91ma\u001b[39m\u001b[33mb\u001b[39m\u001b[32mc\u001b[39m",
            "\u001b[38;2;255;0;0ma\u001b[39m\u001b[38;2;191;191;0mb\u001b[39m\u001b[38;2;0;128;0mc\u001b[39m"
        ]);

        // Red -> blue -> green (long arc)
        assertEqualOne(gradient.create("red", "green")("abc", { interpolation: "hsv", hsvSpin: "long" }), [
            "\u001b[91ma\u001b[39m\u001b[34mb\u001b[39m\u001b[32mc\u001b[39m",
            "\u001b[38;2;255;0;0ma\u001b[39m\u001b[38;2;0;0;191mb\u001b[39m\u001b[38;2;0;128;0mc\u001b[39m"
        ]);
    });

    it("varargs syntax equal to array syntax", () => {
        assert.strictEqual(gradient.create("yellow", "green")("abc"), gradient.create(["yellow", "green"])("abc"));
    });

    it("supports aliases", () => {
        assert.strictEqual(gradient.cristal("Hello world"), gradient.create("#bdfff3", "#4ac29a")("Hello world"));
        assert.strictEqual(gradient.pastel("Hello world"), gradient.create("#74ebd5", "#74ecd5")("Hello world", { interpolation: "hsv", hsvSpin: "long" }));
    });

    it("multiline option works the same way on one line strings", () => {
        assert.strictEqual(gradient.create("blue", "white", "red").multiline("abc"), gradient.create("blue", "white", "red")("abc"));
        assert.strictEqual(gradient.create("red", "green").multiline("abc", { interpolation: "hsv" }), gradient.create("red", "green")("abc", { interpolation: "hsv" }));
    });

    it("multiline option works fine", () => {
        assert.strictEqual(gradient.create("orange", "purple").multiline("hello\nworld"), `${gradient.create("orange", "purple")("hello")}\n${gradient.create("orange", "purple")("world")}`);
        assert.strictEqual(gradient.atlas.multiline("abc\n\ndef"), `${gradient.atlas("abc")}\n\n${gradient.atlas("def")}`);
        assert.notEqual(gradient.rainbow.multiline("hi\nworld"), `${gradient.rainbow("hi")}\n${gradient.rainbow("world")}`);
    });

    it("case insensitive options", () => {
        assert.strictEqual(gradient.create("red", "green")("abc", { interpolation: "hsv", hsvSpin: "long" }), gradient.create("red", "green")("abc", { interpolation: "HSV", hsvSpin: "Long" }));
    });
});
