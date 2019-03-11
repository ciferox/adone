const {
    cli: { chalk },
    text: { hasAnsi, stripAnsi, wrapAnsi }
} = adone;

describe("wrapAnsi", () => {
    // When "hard" is false

    const fixture = `The quick brown ${chalk.red("fox jumped over ")}the lazy ${chalk.green("dog and then ran away with the unicorn.")}`;
    const fixture2 = "12345678\n901234567890";
    const fixture3 = "12345678\n901234567890 12345";
    const fixture4 = "12345678\n";
    const fixture5 = "12345678\n ";

    it("wraps string at 20 characters", () => {
        const res20 = wrapAnsi(fixture, 20);

        assert.strictEqual(res20, "The quick brown \u001B[31mfox\u001B[39m\n\u001B[31mjumped over \u001B[39mthe lazy\n\u001B[32mdog and then ran\u001B[39m\n\u001B[32maway with the\u001B[39m\n\u001B[32municorn.\u001B[39m");
        assert.isTrue(stripAnsi(res20).split("\n").every((x) => x.length <= 20));
    });

    it("wraps string at 30 characters", () => {
        const res30 = wrapAnsi(fixture, 30);

        assert.strictEqual(res30, "The quick brown \u001B[31mfox jumped\u001B[39m\n\u001B[31mover \u001B[39mthe lazy \u001B[32mdog and then ran\u001B[39m\n\u001B[32maway with the unicorn.\u001B[39m");
        assert.isTrue(stripAnsi(res30).split("\n").every((x) => x.length <= 30));
    });

    it('does not break strings longer than "cols" characters', () => {
        const res5 = wrapAnsi(fixture, 5, { hard: false });

        assert.strictEqual(res5, "The\nquick\nbrown\n\u001B[31mfox\u001B[39m\n\u001B[31mjumped\u001B[39m\n\u001B[31mover\u001B[39m\n\u001B[31m\u001B[39mthe\nlazy\n\u001B[32mdog\u001B[39m\n\u001B[32mand\u001B[39m\n\u001B[32mthen\u001B[39m\n\u001B[32mran\u001B[39m\n\u001B[32maway\u001B[39m\n\u001B[32mwith\u001B[39m\n\u001B[32mthe\u001B[39m\n\u001B[32municorn.\u001B[39m");
        assert.isTrue(stripAnsi(res5).split("\n").filter((x) => x.length > 5).length > 0);
    });

    it("handles colored string that wraps on to multiple lines", () => {
        const res = wrapAnsi(`${chalk.green("hello world")} hey!`, 5, { hard: false });
        const lines = res.split("\n");
        assert.isTrue(hasAnsi(lines[0]));
        assert.isTrue(hasAnsi(lines[1]));
        assert.isFalse(hasAnsi(lines[2]));
    });

    it('does not prepend newline if first string is greater than "cols"', () => {
        const res = wrapAnsi(`${chalk.green("hello")}-world`, 5, { hard: false });
        assert.strictEqual(res.split("\n").length, 1);
    });

    // When "hard" is true

    it('breaks strings longer than "cols" characters', () => {
        const res5 = wrapAnsi(fixture, 5, { hard: true });

        assert.strictEqual(res5, "The\nquick\nbrown\n\u001B[31mfox\u001B[39m\n\u001B[31mjumpe\u001B[39m\n\u001B[31md\u001B[39m\n\u001B[31mover\u001B[39m\n\u001B[31m\u001B[39mthe\nlazy\n\u001B[32mdog\u001B[39m\n\u001B[32mand\u001B[39m\n\u001B[32mthen\u001B[39m\n\u001B[32mran\u001B[39m\n\u001B[32maway\u001B[39m\n\u001B[32mwith\u001B[39m\n\u001B[32mthe\u001B[39m\n\u001B[32munico\u001B[39m\n\u001B[32mrn.\u001B[39m");
        assert.isTrue(stripAnsi(res5).split("\n").every((x) => x.length <= 5));
    });

    it("removes last row if it contained only ansi escape codes", () => {
        const res = wrapAnsi(chalk.green("helloworld"), 2, { hard: true });
        assert.isTrue(stripAnsi(res).split("\n").every((x) => x.length === 2));
    });

    it("does not prepend newline if first word is split", () => {
        const res = wrapAnsi(`${chalk.green("hello")}world`, 5, { hard: true });
        assert.strictEqual(res.split("\n").length, 2);
    });

    it("takes into account line returns inside input", () => {
        const res20 = wrapAnsi(fixture2, 10, { hard: true });
        assert.strictEqual(res20, "12345678\n9012345678\n90");
    });

    it("word wrapping", () => {
        const res = wrapAnsi(fixture3, 15);
        assert.strictEqual(res, "12345678\n901234567890\n12345");
    });

    it("no word-wrapping", () => {
        const res = wrapAnsi(fixture3, 15, { wordWrap: false });
        assert.strictEqual(res, "12345678\n901234567890 12\n345");

        const res2 = wrapAnsi(fixture3, 5, { wordWrap: false });
        assert.strictEqual(res2, "12345\n678\n90123\n45678\n90 12\n345");

        const res3 = wrapAnsi(fixture5, 5, { wordWrap: false });
        assert.strictEqual(res3, "12345\n678\n");

        const res4 = wrapAnsi(fixture, 5, { wordWrap: false });
        assert.strictEqual(res4, "The q\nuick\nbrown\n\u001B[31mfox j\u001B[39m\n\u001B[31mumped\u001B[39m\n\u001B[31mover\u001B[39m\n\u001B[31m\u001B[39mthe l\nazy \u001B[32md\u001B[39m\n\u001B[32mog an\u001B[39m\n\u001B[32md the\u001B[39m\n\u001B[32mn ran\u001B[39m\n\u001B[32maway\u001B[39m\n\u001B[32mwith\u001B[39m\n\u001B[32mthe u\u001B[39m\n\u001B[32mnicor\u001B[39m\n\u001B[32mn.\u001B[39m");
    });

    it("no word-wrapping and no trimming", () => {
        const res = wrapAnsi(fixture3, 13, { wordWrap: false, trim: false });
        assert.strictEqual(res, "12345678\n901234567890 \n12345");

        const res2 = wrapAnsi(fixture4, 5, { wordWrap: false, trim: false });
        assert.strictEqual(res2, "12345\n678\n");

        const res3 = wrapAnsi(fixture5, 5, { wordWrap: false, trim: false });
        assert.strictEqual(res3, "12345\n678\n ");

        const res4 = wrapAnsi(fixture, 5, { wordWrap: false, trim: false });
        assert.strictEqual(res4, "The q\nuick \nbrown\n \u001B[31mfox \u001B[39m\n[31mjumpe[39m\n[31md ove[39m\n[31mr \u001B[39mthe\n lazy\n \u001B[32mdog \u001B[39m\n[32mand t[39m\n[32mhen r[39m\n[32man aw[39m\n[32may wi[39m\n[32mth th[39m\n[32me uni[39m\n[32mcorn.\u001B[39m");
    });

    it("supports fullwidth characters", () => {
        assert.strictEqual(wrapAnsi("안녕하세", 4, { hard: true }), "안녕\n하세");
    });

    it("supports unicode surrogate pairs", () => {
        assert.strictEqual(wrapAnsi("a\uD83C\uDE00bc", 2, { hard: true }), "a\n\uD83C\uDE00\nbc");
        assert.strictEqual(wrapAnsi("a\uD83C\uDE00bc\uD83C\uDE00d\uD83C\uDE00", 2, { hard: true }), "a\n\uD83C\uDE00\nbc\n\uD83C\uDE00\nd\n\uD83C\uDE00");
    });
});
