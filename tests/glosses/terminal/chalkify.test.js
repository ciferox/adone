const {
    terminal: { chalk, chalkify }
} = adone;

const {
    modifiers,
    normalColors
} = chalkify;

describe("terminal", "chlky", () => {
    chalk.enabled = true;

    it("Modifiers", () => {
        const scheme = chalkify(modifiers.join("."), chalk);
        const text = scheme("foo");
        const should = chalk
            .reset
            .bold
            .dim
            .italic
            .underline
            .inverse
            .hidden
            .strikethrough("foo");

        assert.equal(text, should);
    });

    it("Normal Colors", () => {
        const scheme = chalkify(normalColors.join("."), chalk);
        const text = scheme("bar");
        const should = chalk
            .black
            .red
            .green
            .yellow
            .blue
            .magenta
            .cyan
            .white
            .gray
            .redBright
            .greenBright
            .yellowBright
            .blueBright
            .magentaBright
            .cyanBright
            .whiteBright("bar");

        assert.equal(text, should);
    });

    it("Background styles", () => {
        const scheme = chalkify("bgRed.bg#ff99cc.bgPink.bgBlackBright", chalk);
        const text = scheme("unicorn");
        const should = chalk
            .bgRed
            .bgHex("#ff99cc")
            .bgKeyword("pink")
            .bgBlackBright("unicorn");

        assert.equal(text, should);
    });

});
