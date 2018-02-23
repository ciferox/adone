describe("terminal", "Chalk", () => {
    const {
        terminal: { chalk }
    } = adone;

    it.todo("don't add any styling when called as the base function", () => {
        assert.equal(chalk("foo"), "foo");
    });

    it.todo("support multiple arguments in base function", () => {
        assert.equal(chalk("hello", "there"), "hello there");
    });

    it("style string", () => {
        assert.equal(chalk.underline("foo"), "\u001B[4mfoo\u001B[24m");
        assert.equal(chalk.red("foo"), "\u001B[31mfoo\u001B[39m");
        assert.equal(chalk.bgRed("foo"), "\u001B[41mfoo\u001B[49m");
    });

    it("support applying multiple styles at once", () => {
        assert.equal(chalk.red.bgGreen.underline("foo"), "\u001B[31m\u001B[42m\u001B[4mfoo\u001B[24m\u001B[49m\u001B[39m");
        assert.equal(chalk.underline.red.bgGreen("foo"), "\u001B[4m\u001B[31m\u001B[42mfoo\u001B[49m\u001B[39m\u001B[24m");
    });

    it("support nesting styles", () => {
        assert.equal(
            chalk.red(`foo${chalk.underline.bgBlue("bar")}!`),
            "\u001B[31mfoo\u001B[4m\u001B[44mbar\u001B[49m\u001B[24m!\u001B[39m"
        );
    });

    it("support nesting styles of the same type (color, underline, bg)", () => {
        assert.equal(
            chalk.red(`a${chalk.yellow(`b${chalk.green("c")}b`)}c`),
            "\u001B[31ma\u001B[33mb\u001B[32mc\u001B[33mb\u001B[31mc\u001B[39m"
        );
    });

    it("reset all styles with `.reset()`", () => {
        assert.equal(chalk.reset(`${chalk.red.bgGreen.underline("foo")}foo`), "\u001B[0m\u001B[31m\u001B[42m\u001B[4mfoo\u001B[24m\u001B[49m\u001B[39mfoo\u001B[0m");
    });

    it("support caching multiple styles", () => {
        const red = chalk.red;
        const green = chalk.green;
        const redBold = red.bold;
        const greenBold = green.bold;

        assert.notEqual(red("foo"), green("foo"));
        assert.notEqual(redBold("bar"), greenBold("bar"));
        assert.notEqual(green("baz"), greenBold("baz"));
    });

    it("alias gray to grey", () => {
        assert.equal(chalk.grey("foo"), "\u001B[90mfoo\u001B[39m");
    });

    it("support variable number of arguments", () => {
        assert.equal(chalk.red("foo", "bar"), "\u001B[31mfoo bar\u001B[39m");
    });

    it("support falsy values", () => {
        assert.equal(chalk.red(0), "\u001B[31m0\u001B[39m");
    });

    it("don't output escape codes if the input is empty", () => {
        assert.equal(chalk.red(), "");
        assert.equal(chalk.red.blue.black(), "");
    });

    it("keep Function.prototype methods", () => {
        assert.equal(chalk.grey.apply(null, ["foo"]), "\u001B[90mfoo\u001B[39m");
        assert.equal(chalk.reset(`${chalk.red.bgGreen.underline.bind(null)("foo")}foo`), "\u001B[0m\u001B[31m\u001B[42m\u001B[4mfoo\u001B[24m\u001B[49m\u001B[39mfoo\u001B[0m");
        assert.equal(chalk.red.blue.black.call(null), "");
    });

    it("line breaks should open and close colors", () => {
        assert.equal(chalk.grey("hello\nworld"), "\u001B[90mhello\u001B[39m\n\u001B[90mworld\u001B[39m");
    });

    it("properly convert RGB to 16 colors on basic color terminals", () => {
        assert.equal(new chalk.constructor({ level: 1 }).hex("#FF0000")("hello"), "\u001B[91mhello\u001B[39m");
        assert.equal(new chalk.constructor({ level: 1 }).bgHex("#FF0000")("hello"), "\u001B[101mhello\u001B[49m");
    });

    it("properly convert RGB to 256 colors on basic color terminals", () => {
        assert.equal(new chalk.constructor({ level: 2 }).hex("#FF0000")("hello"), "\u001B[38;5;196mhello\u001B[39m");
        assert.equal(new chalk.constructor({ level: 2 }).bgHex("#FF0000")("hello"), "\u001B[48;5;196mhello\u001B[49m");
        assert.equal(new chalk.constructor({ level: 3 }).bgHex("#FF0000")("hello"), "\u001B[48;2;255;0;0mhello\u001B[49m");
    });

    it("don't emit RGB codes if level is 0", () => {
        assert.equal(new chalk.constructor({ level: 0 }).hex("#FF0000")("hello"), "hello");
        assert.equal(new chalk.constructor({ level: 0 }).bgHex("#FF0000")("hello"), "hello");
    });

    describe("constructor", () => {
        it("create an isolated context where colors can be disabled (by level)", () => {
            const ctx = new chalk.constructor({ level: 0, enabled: true });
            assert.equal(ctx.red("foo"), "foo");
            assert.equal(chalk.red("foo"), "\u001B[31mfoo\u001B[39m");
            ctx.level = 2;
            assert.equal(ctx.red("foo"), "\u001B[31mfoo\u001B[39m");
        });

        it("create an isolated context where colors can be disabled (by enabled flag)", () => {
            const ctx = new chalk.constructor({ enabled: false });
            assert.equal(ctx.red("foo"), "foo");
            assert.equal(chalk.red("foo"), "\u001B[31mfoo\u001B[39m");
            ctx.enabled = true;
            assert.equal(ctx.red("foo"), "\u001B[31mfoo\u001B[39m");
        });
    });

    describe("enabled", () => {
        it("don't output colors when manually disabled", () => {
            chalk.enabled = false;
            assert.equal(chalk.red("foo"), "foo");
            chalk.enabled = true;
        });

        it("enable/disable colors based on overall chalk enabled property, not individual instances", () => {
            chalk.enabled = false;
            const red = chalk.red;
            assert.false(red.enabled);
            chalk.enabled = true;
            assert.true(red.enabled);
            chalk.enabled = true;
        });

        it("propagate enable/disable changes from child colors", () => {
            chalk.enabled = false;
            const red = chalk.red;
            assert.false(red.enabled);
            assert.false(chalk.enabled);
            red.enabled = true;
            assert.true(red.enabled);
            assert.true(chalk.enabled);
            chalk.enabled = false;
            assert.false(red.enabled);
            assert.false(chalk.enabled);
            chalk.enabled = true;
        });
    });

    describe("level", () => {
        it("don't output colors when manually disabled", () => {
            const oldLevel = chalk.level;
            chalk.level = 0;
            assert.equal(chalk.red("foo"), "foo");
            chalk.level = oldLevel;
        });

        it("enable/disable colors based on overall chalk enabled property, not individual instances", () => {
            const oldLevel = chalk.level;
            chalk.level = 1;
            const red = chalk.red;
            assert.equal(red.level, 1);
            chalk.level = 0;
            assert.equal(red.level, chalk.level);
            chalk.level = oldLevel;
        });

        it("propagate enable/disable changes from child colors", () => {
            const oldLevel = chalk.level;
            chalk.level = 1;
            const red = chalk.red;
            assert.equal(red.level, 1);
            assert.equal(chalk.level, 1);
            red.level = 0;
            assert.equal(red.level, 0);
            assert.equal(chalk.level, 0);
            chalk.level = 1;
            assert.equal(red.level, 1);
            assert.equal(chalk.level, 1);
            chalk.level = oldLevel;
        });

        it("disable colors if they are not supported", async () => {
            const res = await adone.system.process.execStdout("node", {
                input: new adone.collection.BufferList(`
                    require("${adone.ROOT_PATH}");
                    console.log(adone.terminal.chalk.hex('#ff6159')('test'))
                `)
            });
            assert.equal(res, "test");
        });
    });

    describe("visible", () => {
        it("visible: normal output when enabled", () => {
            const ctx = new chalk.constructor({ level: 3, enabled: true });
            assert.equal(ctx.visible.red("foo"), "\u001B[31mfoo\u001B[39m");
            assert.equal(ctx.red.visible("foo"), "\u001B[31mfoo\u001B[39m");
        });

        it("visible: no output when disabled", () => {
            const ctx = new chalk.constructor({ level: 3, enabled: false });
            assert.equal(ctx.red.visible("foo"), "");
            assert.equal(ctx.visible.red("foo"), "");
        });

        it("visible: no output when level is too low", () => {
            const ctx = new chalk.constructor({ level: 0, enabled: true });
            assert.equal(ctx.visible.red("foo"), "");
            assert.equal(ctx.red.visible("foo"), "");
        });

        it("test switching back and forth between enabled and disabled", () => {
            const ctx = new chalk.constructor({ level: 3, enabled: true });
            assert.equal(ctx.red("foo"), "\u001B[31mfoo\u001B[39m");
            assert.equal(ctx.visible.red("foo"), "\u001B[31mfoo\u001B[39m");
            assert.equal(ctx.red.visible("foo"), "\u001B[31mfoo\u001B[39m");
            assert.equal(ctx.visible("foo"), "foo");
            assert.equal(ctx.red("foo"), "\u001B[31mfoo\u001B[39m");

            ctx.enabled = false;
            assert.equal(ctx.red("foo"), "foo");
            assert.equal(ctx.visible("foo"), "");
            assert.equal(ctx.visible.red("foo"), "");
            assert.equal(ctx.red.visible("foo"), "");
            assert.equal(ctx.red("foo"), "foo");

            ctx.enabled = true;
            assert.equal(ctx.red("foo"), "\u001B[31mfoo\u001B[39m");
            assert.equal(ctx.visible.red("foo"), "\u001B[31mfoo\u001B[39m");
            assert.equal(ctx.red.visible("foo"), "\u001B[31mfoo\u001B[39m");
            assert.equal(ctx.visible("foo"), "foo");
            assert.equal(ctx.red("foo"), "\u001B[31mfoo\u001B[39m");
        });

    });
});
