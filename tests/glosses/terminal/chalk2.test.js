const {
    terminal: { chalk2: chalk }
} = adone;

const CODES = module.exports = {
    // modifiers
    reset: [0, 0],
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29],

    // colors
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    gray: [90, 39],

    // background colors
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49]
};


const ANSI = (x) => `\x1b[${x}m`;

describe("terminal", "chalk", () => {
    it("kleur", () => {
        assert.equal(typeof chalk, "object", "exports an object");
        assert.ok(chalk.enabled, "colors enabled by default");
    });

    describe("codes", () => {
        let k;
        let tmp;
        let val;

        for (k in CODES) {
            // eslint-disable-next-line no-loop-func
            it(k, () => {
                tmp = CODES[k];
                val = chalk[k]("~foobar~");
                assert.equal(typeof chalk[k], "function", "is a function");
                assert.equal(typeof chalk[k]().bold, "function", "~> and is chainable");
                assert.equal(typeof val, "string", "returns a string value");
                assert.equal(val, `${ANSI(tmp[0])}~foobar~${ANSI(tmp[1])}`, "~> matches expected");
            });
        }
    });

    it("chains", () => {
        const val = "~foobar~";
        const { bold, underline, italic, bgRed, red, green, yellow } = CODES;
        assert.equal(chalk.red().bold(val), ANSI(bold[0]) + ANSI(red[0]) + val + ANSI(red[1]) + ANSI(bold[1]));
        assert.equal(chalk.bold().yellow().bgRed().italic(val), ANSI(italic[0]) + ANSI(bgRed[0]) + ANSI(yellow[0]) + ANSI(bold[0]) + val + ANSI(bold[1]) + ANSI(yellow[1]) + ANSI(bgRed[1]) + ANSI(italic[1]));
        assert.equal(chalk.green().bold().underline(val), ANSI(underline[0]) + ANSI(bold[0]) + ANSI(green[0]) + val + ANSI(green[1]) + ANSI(bold[1]) + ANSI(underline[1]));
    });

    it("nested", () => {
        const { yellow, red, bold, cyan } = CODES;
        const expect = `${ANSI(yellow[0])}foo ${ANSI(bold[0])}${ANSI(red[0])}red${ANSI(yellow[0])}${ANSI(bold[1])} bar ${ANSI(cyan[0])}cyan${ANSI(yellow[0])} baz${ANSI(yellow[1])}`;
        assert.equal(chalk.yellow(`foo ${chalk.red().bold("red")} bar ${chalk.cyan("cyan")} baz`), expect);
    });

    it("integer", () => {
        const { red, blue, italic } = CODES;
        assert.equal(chalk.blue(123), `${ANSI(blue[0])}123${ANSI(blue[1])}`, "~> basic");
        assert.equal(chalk.red().italic(0), `${ANSI(italic[0]) + ANSI(red[0])}0${ANSI(red[1])}${ANSI(italic[1])}`, "~> chain w/ 0");
        assert.equal(chalk.italic(`${chalk.red(123)} ${chalk.blue(0)}`), `${ANSI(italic[0]) + ANSI(red[0])}123${ANSI(red[1])} ${ANSI(blue[0])}0${ANSI(blue[1])}${ANSI(italic[1])}`, "~> chain w/ nested & 0");
        assert.equal(chalk.blue(-1), `${ANSI(blue[0])}-1${ANSI(blue[1])}`, "~> basic w/ negatives");
    });

    // it('multiline', t => {
    // 	let { blue, bold, red, italic } = CODES;
    // 	assert.equal(c.blue('hello\nworld'), ANSI(blue[0]) + 'hello' + ANSI(blue[1]) + '\n' + ANSI(blue[0]) + 'world' + ANSI(blue[1]), '~> basic');
    // 	assert.equal(c.blue.bold('hello\nworld'), ANSI(bold[0]) + ANSI(blue[0]) + 'hello' + ANSI(blue[1]) + ANSI(bold[1]) + '\n' + ANSI(bold[0]) + ANSI(blue[0]) + 'world' + ANSI(blue[1]) + ANSI(bold[1]), '~> simple chain');
    // 	assert.equal(c.italic.bold(`${c.red('hello')}\n${c.blue('world')}`), ANSI(bold[0]) + ANSI(italic[0]) + ANSI(red[0]) + 'hello' + ANSI(red[1]) + ANSI(italic[1]) + ANSI(bold[1]) + '\n' + ANSI(bold[0]) + ANSI(italic[0]) + ANSI(blue[0]) + 'world' + ANSI(blue[1]) + ANSI(italic[1]) + ANSI(bold[1]), '~> chain w/ nested');
    // 	t.end();
    // });

    it("partial require", () => {
        const { red, bold, italic } = CODES;
        const r = chalk.red;
        const b = chalk.bold;
        const i = chalk.italic;

        assert.equal(r("foo"), `${ANSI(red[0])}foo${ANSI(red[1])}`, "~> red()");
        assert.equal(b("bar"), `${ANSI(bold[0])}bar${ANSI(bold[1])}`, "~> bold()");
        assert.equal(i("baz"), `${ANSI(italic[0])}baz${ANSI(italic[1])}`, "~> italic()");

        assert.equal(r().bold().italic("foo"), `${ANSI(italic[0]) + ANSI(bold[0]) + ANSI(red[0])}foo${ANSI(red[1])}${ANSI(bold[1])}${ANSI(italic[1])}`, "~> red().bold().italic()");
        assert.equal(r().bold().italic("foo"), `${ANSI(italic[0]) + ANSI(bold[0]) + ANSI(red[0])}foo${ANSI(red[1])}${ANSI(bold[1])}${ANSI(italic[1])}`, "~> red().bold().italic() – repeat");

        assert.equal(b().italic().red("bar"), `${ANSI(red[0]) + ANSI(italic[0]) + ANSI(bold[0])}bar${ANSI(bold[1])}${ANSI(italic[1])}${ANSI(red[1])}`, "~> bold().italic().red()");
        assert.equal(b().italic().red("bar"), `${ANSI(red[0]) + ANSI(italic[0]) + ANSI(bold[0])}bar${ANSI(bold[1])}${ANSI(italic[1])}${ANSI(red[1])}`, "~> bold().italic().red() – repeat");

        assert.equal(i().red().bold("baz"), `${ANSI(bold[0]) + ANSI(red[0]) + ANSI(italic[0])}baz${ANSI(italic[1])}${ANSI(red[1])}${ANSI(bold[1])}`, "~> italic().red().bold()");
        assert.equal(i().red().bold("baz"), `${ANSI(bold[0]) + ANSI(red[0]) + ANSI(italic[0])}baz${ANSI(italic[1])}${ANSI(red[1])}${ANSI(bold[1])}`, "~> italic().red().bold() – repeat");

        assert.equal(r("foo"), `${ANSI(red[0])}foo${ANSI(red[1])}`, "~> red() – clean");
        assert.equal(b("bar"), `${ANSI(bold[0])}bar${ANSI(bold[1])}`, "~> bold() – clean");
        assert.equal(i("baz"), `${ANSI(italic[0])}baz${ANSI(italic[1])}`, "~> italic() – clean");
    });

    it("named chains", () => {
        const { red, bold, italic } = CODES;

        const foo = chalk.red().bold;
        const bar = chalk.bold().italic().red;

        assert.equal(chalk.red("foo"), `${ANSI(red[0])}foo${ANSI(red[1])}`, "~> c.red() – clean");
        assert.equal(chalk.bold("bar"), `${ANSI(bold[0])}bar${ANSI(bold[1])}`, "~> c.bold() – clean");

        assert.equal(foo("foo"), `${ANSI(bold[0]) + ANSI(red[0])}foo${ANSI(red[1])}${ANSI(bold[1])}`, "~> foo()");
        assert.equal(foo("foo"), `${ANSI(bold[0]) + ANSI(red[0])}foo${ANSI(red[1])}${ANSI(bold[1])}`, "~> foo() – repeat");

        assert.equal(bar("bar"), `${ANSI(red[0]) + ANSI(italic[0]) + ANSI(bold[0])}bar${ANSI(bold[1])}${ANSI(italic[1])}${ANSI(red[1])}`, "~> bar()");
        assert.equal(bar("bar"), `${ANSI(red[0]) + ANSI(italic[0]) + ANSI(bold[0])}bar${ANSI(bold[1])}${ANSI(italic[1])}${ANSI(red[1])}`, "~> bar() – repeat");

        assert.equal(chalk.red("foo"), `${ANSI(red[0])}foo${ANSI(red[1])}`, "~> c.red() – clean");
        assert.equal(chalk.bold("bar"), `${ANSI(bold[0])}bar${ANSI(bold[1])}`, "~> c.bold() – clean");
    });

    it("disabled", () => {
        chalk.enabled = false;
        assert.equal(chalk.red("foo"), "foo", "~> raw text only");
        assert.equal(chalk.red().italic().bold("foobar"), "foobar", "~> chaining okay");
    });
});
