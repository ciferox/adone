describe("cli", "Chalk", () => {
    const {
        cli: { chalk, stats }
    } = adone;

    stats.stdout = {
        level: 3,
        hasBasic: true,
        has256: true,
        has16m: true
    };

    describe("constructor", () => {
        it("Chalk.constructor should throw an expected error", () => {
            const expectedError = assert.throws(() => {
                chalk.constructor();
            });

            assert.equal(expectedError.message, "`chalk.constructor()` is deprecated. Use `new chalk.Instance()` instead.");

            assert.throws(() => {
                new chalk.constructor(); // eslint-disable-line no-new
            });
        });
    });

    describe("instance", () => {
        it("create an isolated context where colors can be disabled (by level)", () => {
            const instance = new chalk.Instance({ level: 0, enabled: true });
            assert.equal(instance.red("foo"), "foo");
            assert.equal(chalk.red("foo"), "\u001B[31mfoo\u001B[39m");
            instance.level = 2;
            assert.equal(instance.red("foo"), "\u001B[31mfoo\u001B[39m");
        });

        it("create an isolated context where colors can be disabled (by enabled flag)", () => {
            const instance = new chalk.Instance({ enabled: false });
            assert.equal(instance.red("foo"), "foo");
            assert.equal(chalk.red("foo"), "\u001B[31mfoo\u001B[39m");
            instance.enabled = true;
            assert.equal(instance.red("foo"), "\u001B[31mfoo\u001B[39m");
        });

        it("the `level` option should be a number from 0 to 3", () => {
            /**
             * eslint-disable no-new
             */
            assert.throws(() => {
                new chalk.Instance({ level: 10 });
            }, /should be an integer from 0 to 3/);

            assert.throws(() => {
                new chalk.Instance({ level: -1 });
            }, /should be an integer from 0 to 3/);
            /* eslint-enable no-new */
        });
    });

    it("don't add any styling when called as the base function", () => {
        assert.equal(chalk("foo"), "foo");
    });

    it("support multiple arguments in base function", () => {
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
        assert.equal(new chalk.Instance({ level: 1 }).hex("#FF0000")("hello"), "\u001B[91mhello\u001B[39m");
        assert.equal(new chalk.Instance({ level: 1 }).bgHex("#FF0000")("hello"), "\u001B[101mhello\u001B[49m");
    });

    it("properly convert RGB to 256 colors on basic color terminals", () => {
        assert.equal(new chalk.Instance({ level: 2 }).hex("#FF0000")("hello"), "\u001B[38;5;196mhello\u001B[39m");
        assert.equal(new chalk.Instance({ level: 2 }).bgHex("#FF0000")("hello"), "\u001B[48;5;196mhello\u001B[49m");
        assert.equal(new chalk.Instance({ level: 3 }).bgHex("#FF0000")("hello"), "\u001B[48;2;255;0;0mhello\u001B[49m");
    });

    it("don't emit RGB codes if level is 0", () => {
        assert.equal(new chalk.Instance({ level: 0 }).hex("#FF0000")("hello"), "hello");
        assert.equal(new chalk.Instance({ level: 0 }).bgHex("#FF0000")("hello"), "hello");
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
            assert.isFalse(red.enabled);
            chalk.enabled = true;
            assert.isTrue(red.enabled);
            chalk.enabled = true;
        });

        it("propagate enable/disable changes from child colors", () => {
            chalk.enabled = false;
            const red = chalk.red;
            assert.isFalse(red.enabled);
            assert.isFalse(chalk.enabled);
            red.enabled = true;
            assert.isTrue(red.enabled);
            assert.isTrue(chalk.enabled);
            chalk.enabled = false;
            assert.isFalse(red.enabled);
            assert.isFalse(chalk.enabled);
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
                    console.log(adone.cli.chalk.hex('#ff6159')('test'))
                `)
            });
            assert.equal(res, "test");
        });
    });

    describe("visible", () => {
        it("visible: normal output when enabled", () => {
            const ctx = new chalk.Instance({ level: 3, enabled: true });
            assert.equal(ctx.visible.red("foo"), "\u001B[31mfoo\u001B[39m");
            assert.equal(ctx.red.visible("foo"), "\u001B[31mfoo\u001B[39m");
        });

        it("visible: no output when disabled", () => {
            const ctx = new chalk.Instance({ level: 3, enabled: false });
            assert.equal(ctx.red.visible("foo"), "");
            assert.equal(ctx.visible.red("foo"), "");
        });

        it("visible: no output when level is too low", () => {
            const ctx = new chalk.Instance({ level: 0, enabled: true });
            assert.equal(ctx.visible.red("foo"), "");
            assert.equal(ctx.red.visible("foo"), "");
        });

        it("test switching back and forth between enabled and disabled", () => {
            const ctx = new chalk.Instance({ level: 3, enabled: true });
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

    describe("termplate literals", () => {
        it("return an empty string for an empty literal", () => {
            const instance = new chalk.Instance();
            assert.equal(instance``, "");
        });

        it("return a regular string for a literal with no templates", () => {
            const instance = new chalk.Instance({ level: 0 });
            assert.equal(instance`hello`, "hello");
        });

        it("correctly perform template parsing", () => {
            const instance = new chalk.Instance({ level: 0 });
            assert.equal(instance`{bold Hello, {cyan World!} This is a} test. {green Woo!}`,
                `${instance.bold("Hello,", instance.cyan("World!"), "This is a")} test. ${instance.green("Woo!")}`);
        });

        it("correctly perform template substitutions", () => {
            const instance = new chalk.Instance({ level: 0 });
            const name = "Sindre";
            const exclamation = "Neat";
            assert.equal(instance`{bold Hello, {cyan.inverse ${name}!} This is a} test. {green ${exclamation}!}`,
                `${instance.bold("Hello,", instance.cyan.inverse(`${name}!`), "This is a")} test. ${instance.green(`${exclamation}!`)}`);
        });

        it("correctly parse and evaluate color-convert functions", () => {
            const instance = new chalk.Instance({ level: 3 });
            assert.equal(instance`{bold.rgb(144,10,178).inverse Hello, {~inverse there!}}`,
                "\u001B[1m\u001B[38;2;144;10;178m\u001B[7mHello, " +
                "\u001B[27m\u001B[39m\u001B[22m\u001B[1m" +
                "\u001B[38;2;144;10;178mthere!\u001B[39m\u001B[22m");

            assert.equal(instance`{bold.bgRgb(144,10,178).inverse Hello, {~inverse there!}}`,
                "\u001B[1m\u001B[48;2;144;10;178m\u001B[7mHello, " +
                "\u001B[27m\u001B[49m\u001B[22m\u001B[1m" +
                "\u001B[48;2;144;10;178mthere!\u001B[49m\u001B[22m");
        });

        it("properly handle escapes", () => {
            const instance = new chalk.Instance({ level: 3 });
            assert.equal(instance`{bold hello \{in brackets\}}`,
                "\u001B[1mhello {in brackets}\u001B[22m");
        });

        it("throw if there is an unclosed block", () => {
            const instance = new chalk.Instance({ level: 3 });
            try {
                console.log(instance`{bold this shouldn't appear ever\}`);
                assert.fail();
            } catch (error) {
                assert.equal(error.message, "Chalk template literal is missing 1 closing bracket (`}`)");
            }

            try {
                console.log(instance`{bold this shouldn't {inverse appear {underline ever\} :) \}`);
                assert.fail();
            } catch (error) {
                assert.equal(error.message, "Chalk template literal is missing 3 closing brackets (`}`)");
            }
        });

        it("throw if there is an invalid style", () => {
            const instance = new chalk.Instance({ level: 3 });
            try {
                console.log(instance`{abadstylethatdoesntexist this shouldn't appear ever}`);
                assert.fail();
            } catch (error) {
                assert.equal(error.message, "Unknown Chalk style: abadstylethatdoesntexist");
            }
        });

        it("properly style multiline color blocks", () => {
            const instance = new chalk.Instance({ level: 3 });
            assert.equal(
                instance`{bold
			Hello! This is a
			${"multiline"} block!
			:)
		} {underline
			I hope you enjoy
		}`,
                "\u001B[1m\u001B[22m\n" +
                "\u001B[1m\t\t\tHello! This is a\u001B[22m\n" +
                "\u001B[1m\t\t\tmultiline block!\u001B[22m\n" +
                "\u001B[1m\t\t\t:)\u001B[22m\n" +
                "\u001B[1m\t\t\u001B[22m \u001B[4m\u001B[24m\n" +
                "\u001B[4m\t\t\tI hope you enjoy\u001B[24m\n" +
                "\u001B[4m\t\t\u001B[24m"
            );
        });

        it("escape interpolated values", () => {
            const instance = new chalk.Instance({ level: 0 });
            assert.equal(instance`Hello {bold hi}`, "Hello hi");
            assert.equal(instance`Hello ${"{bold hi}"}`, "Hello {bold hi}");
        });

        it("allow custom colors (themes) on custom contexts", () => {
            const instance = new chalk.Instance({ level: 3 });
            instance.rose = instance.hex("#F6D9D9");
            assert.equal(instance`Hello, {rose Rose}.`, "Hello, \u001B[38;2;246;217;217mRose\u001B[39m.");
        });

        it("correctly parse newline literals (bug #184)", () => {
            const instance = new chalk.Instance({ level: 0 });
            assert.equal(instance`Hello
{red there}`, "Hello\nthere");
        });

        it("correctly parse newline escapes (bug #177)", () => {
            const instance = new chalk.Instance({ level: 0 });
            assert.equal(instance`Hello\nthere!`, "Hello\nthere!");
        });

        it("correctly parse escape in parameters (bug #177 comment 318622809)", () => {
            const instance = new chalk.Instance({ level: 0 });
            const str = "\\";
            assert.equal(instance`{blue ${str}}`, "\\");
        });

        it("correctly parses unicode/hex escapes", () => {
            const instance = new chalk.Instance({ level: 0 });
            assert.equal(instance`\u0078ylophones are fo\x78y! {magenta.inverse \u0078ylophones are fo\x78y!}`,
                "xylophones are foxy! xylophones are foxy!");
        });

        it("correctly parses string arguments", () => {
            const instance = new chalk.Instance({ level: 3 });
            assert.equal(instance`{keyword('black').bold can haz cheezburger}`, "\u001B[38;2;0;0;0m\u001B[1mcan haz cheezburger\u001B[22m\u001B[39m");
            assert.equal(instance`{keyword('blac\x6B').bold can haz cheezburger}`, "\u001B[38;2;0;0;0m\u001B[1mcan haz cheezburger\u001B[22m\u001B[39m");
            assert.equal(instance`{keyword('blac\u006B').bold can haz cheezburger}`, "\u001B[38;2;0;0;0m\u001B[1mcan haz cheezburger\u001B[22m\u001B[39m");
        });

        it("throws if a bad argument is encountered", () => {
            const instance = new chalk.Instance({ level: 3 }); // Keep level at least 1 in case we optimize for disabled chalk instances
            try {
                console.log(instance`{keyword(????) hi}`);
                assert.fail();
            } catch (error) {
                assert.equal(error.message, "Invalid Chalk template style argument: ???? (in style 'keyword')");
            }
        });

        it("throws if an extra unescaped } is found", () => {
            const instance = new chalk.Instance({ level: 0 });
            try {
                console.log(instance`{red hi!}}`);
                assert.fail();
            } catch (error) {
                assert.equal(error.message, "Found extraneous } in Chalk template literal");
            }
        });

        it("should not parse upper-case escapes", () => {
            const instance = new chalk.Instance({ level: 0 });
            assert.equal(instance`\N\n\T\t\X07\x07\U000A\u000A\U000a\u000a`, "N\nT\tX07\x07U000A\u000AU000a\u000A");
        });

        it("should properly handle undefined template interpolated values", () => {
            const instance = new chalk.Instance({ level: 0 });
            assert.equal(instance`hello ${undefined}`, "hello undefined");
            assert.equal(instance`hello ${null}`, "hello null");
        });
    });

    describe.skip("no collor suppor", () => {
        stats.stdout = {
            level: 0,
            hasBasic: false,
            has256: false,
            has16m: false
        };

        it("colors can be forced by using chalk.enabled", () => {
            chalk.enabled = true;
            assert.equal(chalk.green("hello"), "\u001B[32mhello\u001B[39m");
        });

    });
});
