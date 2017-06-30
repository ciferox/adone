const { is } = adone;
const { Table, Cell, ColSpanCell, RowSpanCell, util: { strlen, repeat, pad, truncate, wordWrap, colorizeLines } } = adone.text.table;
// var colors = require('colors/safe');

describe("text", "Table", () => {
    describe("utils", () => {
        describe("strlen", () => {
            it('length of "hello" is 5', () => {
                expect(strlen("hello")).to.equal(5);
            });

            it('length of "hi" is 2', () => {
                expect(strlen("hi")).to.equal(2);
            });

            // it('length of "hello" in red is 5', function () {
            //     expect(strlen(colors.red("hello"))).to.equal(5);
            // });

            // it('length of "hello" in zebra is 5', function () {
            //     expect(strlen(colors.zebra("hello"))).to.equal(5);
            // });

            it('length of "hello\\nhi\\nheynow" is 6', () => {
                expect(strlen("hello\nhi\nheynow")).to.equal(6);
            });

            it('length of "中文字符" is 8', () => {
                expect(strlen("中文字符")).to.equal(8);
            });

            it('length of "日本語の文字" is 12', () => {
                expect(strlen("日本語の文字")).to.equal(12);
            });

            it('length of "한글" is 4', () => {
                expect(strlen("한글")).to.equal(4);
            });
        });

        describe("repeat", () => {
            it('"-" x 3', () => {
                expect(repeat("-", 3)).to.equal("---");
            });

            it('"-" x 4', () => {
                expect(repeat("-", 4)).to.equal("----");
            });

            it('"=" x 4', () => {
                expect(repeat("=", 4)).to.equal("====");
            });
        });

        describe("pad", () => {
            it("pad('hello',6,' ', right) == ' hello'", () => {
                expect(pad("hello", 6, " ", "right")).to.equal(" hello");
            });

            it("pad('hello',7,' ', left) == 'hello  '", () => {
                expect(pad("hello", 7, " ", "left")).to.equal("hello  ");
            });

            it("pad('hello',8,' ', center) == ' hello  '", () => {
                expect(pad("hello", 8, " ", "center")).to.equal(" hello  ");
            });

            it("pad('hello',9,' ', center) == '  hello  '", () => {
                expect(pad("hello", 9, " ", "center")).to.equal("  hello  ");
            });

            it("pad('yo',4,' ', center) == ' yo '", () => {
                expect(pad("yo", 4, " ", "center")).to.equal(" yo ");
            });

            // it("pad red(hello)", function () {
            //     expect(pad(colors.red("hello"), 7, " ", "right")).to.equal("  " + colors.red("hello"));
            // });

            it("pad('hello', 2, ' ', right) == 'hello'", () => {
                expect(pad("hello", 2, " ", "right")).to.equal("hello");
            });
        });

        describe("truncate", () => {
            it('truncate("hello", 5) === "hello"', () => {
                expect(truncate("hello", 5)).to.equal("hello");
            });

            it('truncate("hello sir", 7, "…") == "hello …"', () => {
                expect(truncate("hello sir", 7, "…")).to.equal("hello …");
            });

            it('truncate("hello sir", 6, "…") == "hello…"', () => {
                expect(truncate("hello sir", 6, "…")).to.equal("hello…");
            });

            it('truncate("goodnight moon", 8, "…") == "goodnig…"', () => {
                expect(truncate("goodnight moon", 8, "…")).to.equal("goodnig…");
            });

            // it('truncate(colors.zebra("goodnight moon"), 15, "…") == colors.zebra("goodnight moon")', function () {
            //     const original = colors.zebra("goodnight moon");
            //     expect(truncate(original, 15, "…")).to.equal(original);
            // });

            // it('truncate(colors.zebra("goodnight moon"), 8, "…") == colors.zebra("goodnig") + "…"', function () {
            //     const original = colors.zebra("goodnight moon");
            //     const expected = colors.zebra("goodnig") + "…";
            //     expect(truncate(original, 8, "…")).to.equal(expected);
            // });

            // it('truncate(colors.zebra("goodnight moon"), 9, "…") == colors.zebra("goodnig") + "…"', function () {
            //     const original = colors.zebra("goodnight moon");
            //     const expected = colors.zebra("goodnigh") + "…";
            //     expect(truncate(original, 9, "…")).to.equal(expected);
            // });

            // it("red(hello) + green(world) truncated to 9 chars", function () {
            //     const original = colors.red("hello") + colors.green(" world");
            //     const expected = colors.red("hello") + colors.green(" wo") + "…";
            //     expect(truncate(original, 9)).to.equal(expected);
            // });

            // it("red-on-green(hello) + green-on-red(world) truncated to 9 chars", function () {
            //     const original = colors.red.bgGreen("hello") + colors.green.bgRed(" world");
            //     const expected = colors.red.bgGreen("hello") + colors.green.bgRed(" wo") + "…";
            //     expect(truncate(original, 9)).to.equal(expected);
            // });

            // it("red-on-green(hello) + green-on-red(world) truncated to 10 chars - using inverse", function () {
            //     const original = colors.red.bgGreen("hello" + colors.inverse(" world"));
            //     const expected = colors.red.bgGreen("hello" + colors.inverse(" wor")) + "…";
            //     expect(truncate(original, 10)).to.equal(expected);
            // });

            // it("red-on-green( zebra (hello world) ) truncated to 11 chars", function () {
            //     const original = colors.red.bgGreen(colors.zebra("hello world"));
            //     const expected = colors.red.bgGreen(colors.zebra("hello world"));
            //     expect(truncate(original, 11)).to.equal(expected);
            // });

            // it("red-on-green( zebra (hello world) ) truncated to 10 chars", function () {
            //     const original = colors.red.bgGreen(colors.zebra("hello world"));
            //     const expected = colors.red.bgGreen(colors.zebra("hello wor")) + "…";
            //     expect(truncate(original, 10)).to.equal(expected);
            // });

            it("handles reset code", () => {
                const original = "\x1b[31mhello\x1b[0m world";
                const expected = "\x1b[31mhello\x1b[0m wor…";
                expect(truncate(original, 10)).to.equal(expected);
            });

            it("handles reset code (EMPTY VERSION)", () => {
                const original = "\x1b[31mhello\x1b[0m world";
                const expected = "\x1b[31mhello\x1b[0m wor…";
                expect(truncate(original, 10)).to.equal(expected);
            });

            it('truncateWidth("漢字テスト", 15) === "漢字テスト"', () => {
                expect(truncate("漢字テスト", 15)).to.equal("漢字テスト");
            });

            it('truncateWidth("漢字テスト", 6) === "漢字…"', () => {
                expect(truncate("漢字テスト", 6)).to.equal("漢字…");
            });

            it('truncateWidth("漢字テスト", 5) === "漢字…"', () => {
                expect(truncate("漢字テスト", 5)).to.equal("漢字…");
            });

            it('truncateWidth("漢字testてすと", 12) === "漢字testて…"', () => {
                expect(truncate("漢字testてすと", 12)).to.equal("漢字testて…");
            });

            it("handles color code with CJK chars", () => {
                const original = "漢字\x1b[31m漢字\x1b[0m漢字";
                const expected = "漢字\x1b[31m漢字\x1b[0m漢…";
                expect(truncate(original, 11)).to.equal(expected);
            });
        });

        describe("Table.applyOptions", () => {
            it("allows you to override chars", () => {
                expect(Table.applyOptions()).to.eql(Table.defaultOptions);
            });

            it("chars will be merged deeply", () => {
                const expected = Table.defaultOptions;
                expected.chars.left = "L";
                expect(Table.applyOptions({ chars: { left: "L" } })).to.eql(expected);
            });

            it("style will be merged deeply", () => {
                const expected = Table.defaultOptions;
                expected.style["padding-left"] = 2;
                expect(Table.applyOptions({ style: { "padding-left": 2 } })).to.eql(expected);
            });

            it("head will be overwritten", () => {
                const expected = Table.defaultOptions;
                expected.style.head = [];
                //we can't use lodash's `merge()` in implementation because it would deeply copy array.
                expect(Table.applyOptions({ style: { head: [] } })).to.eql(expected);
            });

            it("border will be overwritten", () => {
                const expected = Table.defaultOptions;
                expected.style.border = [];
                //we can't use lodash's `merge()` in implementation because it would deeply copy array.
                expect(Table.applyOptions({ style: { border: [] } })).to.eql(expected);
            });
        });

        describe("wordWrap", () => {
            it("length", () => {
                const input = "Hello, how are you today? I am fine, thank you!";

                const expected = "Hello, how\nare you\ntoday? I\nam fine,\nthank you!";

                expect(wordWrap(10, input).join("\n")).to.equal(expected);
            });

            // it("length with colors", function () {
            //     const input = colors.red("Hello, how are") + colors.blue(" you today? I") + colors.green(" am fine, thank you!");

            //     const expected = colors.red("Hello, how\nare") + colors.blue(" you\ntoday? I") + colors.green("\nam fine,\nthank you!");

            //     expect(wordWrap(10, input).join("\n")).to.equal(expected);
            // });

            it("will not create an empty last line", () => {
                const input = "Hello Hello ";

                const expected = "Hello\nHello";

                expect(wordWrap(5, input).join("\n")).to.equal(expected);
            });

            it("will handle color reset code", () => {
                const input = "\x1b[31mHello\x1b[0m Hello ";

                const expected = "\x1b[31mHello\x1b[0m\nHello";

                expect(wordWrap(5, input).join("\n")).to.equal(expected);
            });

            it("will handle color reset code (EMPTY version)", () => {
                const input = "\x1b[31mHello\x1b[m Hello ";

                const expected = "\x1b[31mHello\x1b[m\nHello";

                expect(wordWrap(5, input).join("\n")).to.equal(expected);
            });

            it("words longer than limit will not create extra newlines", () => {
                const input = "disestablishment is a multiplicity someotherlongword";

                const expected = "disestablishment\nis a\nmultiplicity\nsomeotherlongword";

                expect(wordWrap(7, input).join("\n")).to.equal(expected);
            });

            it("multiple line input", () => {
                const input = "a\nb\nc d e d b duck\nm\nn\nr";
                const expected = ["a", "b", "c d", "e d", "b", "duck", "m", "n", "r"];

                expect(wordWrap(4, input)).to.eql(expected);
            });

            it("will not start a line with whitespace", () => {
                const input = "ab cd  ef gh  ij kl";
                const expected = ["ab cd", "ef gh", "ij kl"];
                expect(wordWrap(7, input)).to.eql(expected);
            });

            it("wraps CJK chars", () => {
                const input = "漢字 漢\n字 漢字";
                const expected = ["漢字 漢", "字 漢字"];
                expect(wordWrap(7, input)).to.eql(expected);
            });

            it("wraps CJK chars with colors", () => {
                const input = "\x1b[31m漢字\x1b[0m\n 漢字";
                const expected = ["\x1b[31m漢字\x1b[0m", " 漢字"];
                expect(wordWrap(5, input)).to.eql(expected);
            });
        });

        describe("colorizeLines", () => {
            // it("foreground colors continue on each line", function () {
            //     const input = colors.red("Hello\nHi").split("\n");

            //     expect(colorizeLines(input)).to.eql([
            //         colors.red("Hello"),
            //         colors.red("Hi")
            //     ]);
            // });

            // it("foreground colors continue on each line", function () {
            //     const input = colors.bgRed("Hello\nHi").split("\n");

            //     expect(colorizeLines(input)).to.eql([
            //         colors.bgRed("Hello"),
            //         colors.bgRed("Hi")
            //     ]);
            // });

            // it("styles will continue on each line", function () {
            //     const input = colors.underline("Hello\nHi").split("\n");

            //     expect(colorizeLines(input)).to.eql([
            //         colors.underline("Hello"),
            //         colors.underline("Hi")
            //     ]);
            // });

            // it("styles that end before the break will not be applied to the next line", function () {
            //     const input = (colors.underline("Hello") + "\nHi").split("\n");

            //     expect(colorizeLines(input)).to.eql([
            //         colors.underline("Hello"),
            //         "Hi"
            //     ]);
            // });

            it("the reset code can be used to drop styles", () => {
                const input = "\x1b[31mHello\x1b[0m\nHi".split("\n");
                expect(colorizeLines(input)).to.eql([
                    "\x1b[31mHello\x1b[0m",
                    "Hi"
                ]);
            });

            it("handles aixterm 16-color foreground", () => {
                const input = "\x1b[90mHello\nHi\x1b[0m".split("\n");
                expect(colorizeLines(input)).to.eql([
                    "\x1b[90mHello\x1b[39m",
                    "\x1b[90mHi\x1b[0m"
                ]);
            });

            it("handles aixterm 16-color background", () => {
                const input = "\x1b[100mHello\nHi\x1b[m\nHowdy".split("\n");
                expect(colorizeLines(input)).to.eql([
                    "\x1b[100mHello\x1b[49m",
                    "\x1b[100mHi\x1b[m",
                    "Howdy"
                ]);
            });

            it("handles aixterm 256-color foreground", () => {
                const input = "\x1b[48;5;8mHello\nHi\x1b[0m\nHowdy".split("\n");
                expect(colorizeLines(input)).to.eql([
                    "\x1b[48;5;8mHello\x1b[49m",
                    "\x1b[48;5;8mHi\x1b[0m",
                    "Howdy"
                ]);
            });

            // it("handles CJK chars", function () {
            //     const input = colors.red("æ¼¢å­—\nãƒ†ã‚¹ãƒˆ").split("\n");

            //     expect(colorizeLines(input)).to.eql([
            //         colors.red("æ¼¢å­—"),
            //         colors.red("ãƒ†ã‚¹ãƒˆ")
            //     ]);
            // });
        });
    });

    describe("Common", () => {
        it("test complete table", () => {
            const table = new Table({
                head: ["Rel", "Change", "By", "When"],
                style: {
                    "padding-left": 1,
                    "padding-right": 1,
                    head: [],
                    border: []
                },
                colWidths: [6, 21, 25, 17]
            });

            table.push(
                ["v0.1", "Testing something cool", "rauchg@gmail.com", "7 minutes ago"],
                ["v0.1", "Testing something cool", "rauchg@gmail.com", "8 minutes ago"]
            );

            const expected = [
                "┌──────┬─────────────────────┬─────────────────────────┬─────────────────┐",
                "│ Rel  │ Change              │ By                      │ When            │",
                "├──────┼─────────────────────┼─────────────────────────┼─────────────────┤",
                "│ v0.1 │ Testing something … │ rauchg@gmail.com        │ 7 minutes ago   │",
                "├──────┼─────────────────────┼─────────────────────────┼─────────────────┤",
                "│ v0.1 │ Testing something … │ rauchg@gmail.com        │ 8 minutes ago   │",
                "└──────┴─────────────────────┴─────────────────────────┴─────────────────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test width property", () => {
            const table = new Table({
                head: ["Cool"],
                style: {
                    head: [],
                    border: []
                }
            });

            expect(table.width).to.equal(8);
        });

        it("test vertical table output", () => {
            const table = new Table({ style: { "padding-left": 0, "padding-right": 0, head: [], border: [] } }); // clear styles to prevent color output

            table.push(
                { "v0.1": "Testing something cool" },
                { "v0.1": "Testing something cool" }
            );

            const expected = [
                "┌────┬──────────────────────┐",
                "│v0.1│Testing something cool│",
                "├────┼──────────────────────┤",
                "│v0.1│Testing something cool│",
                "└────┴──────────────────────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test cross table output", () => {
            const table = new Table({ head: ["", "Header 1", "Header 2"], style: { "padding-left": 0, "padding-right": 0, head: [], border: [] } }); // clear styles to prevent color output

            table.push(
                { "Header 3": ["v0.1", "Testing something cool"] },
                { "Header 4": ["v0.1", "Testing something cool"] }
            );

            const expected = [
                "┌────────┬────────┬──────────────────────┐",
                "│        │Header 1│Header 2              │",
                "├────────┼────────┼──────────────────────┤",
                "│Header 3│v0.1    │Testing something cool│",
                "├────────┼────────┼──────────────────────┤",
                "│Header 4│v0.1    │Testing something cool│",
                "└────────┴────────┴──────────────────────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test table colors", function () {
            if (!process.stdout.isTTY) {
                // no colors support
                this.skip();
                return;
            }
            const table = new Table({
                head: ["Rel", "By"],
                style: { head: ["red"], border: ["grey"] }
            });

            const off = "\u001b[39m";
            const red = "\u001b[31m";
            const orange = "\u001b[38;5;221m";
            const grey = "\u001b[90m";
            const c256s = `${orange}v0.1${off}`;

            table.push(
                [c256s, "adone"]
            );

            const expected = [
                `${grey}┌──────${off}${grey}┬───────┐${off}`,
                `${grey}│${off}${red} Rel  ${off}${grey}│${off}${red} By    ${off}${grey}│${off}`,
                `${grey}├──────${off}${grey}┼───────┤${off}`,
                `${grey}│${off} ${c256s} ${grey}│${off} adone ${grey}│${off}`,
                `${grey}└──────${off}${grey}┴───────┘${off}`
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test custom chars", () => {
            const table = new Table({
                chars: {
                    top: "═",
                    "top-mid": "╤",
                    "top-left": "╔",
                    "top-right": "╗",
                    bottom: "═",
                    "bottom-mid": "╧",
                    "bottom-left": "╚",
                    "bottom-right": "╝",
                    left: "║",
                    "left-mid": "╟",
                    right: "║",
                    "right-mid": "╢"
                },
                style: {
                    head: [],
                    border: []
                }
            });

            table.push(
                ["foo", "bar", "baz"]
                , ["frob", "bar", "quuz"]
            );

            const expected = [
                "╔══════╤═════╤══════╗",
                "║ foo  │ bar │ baz  ║",
                "╟──────┼─────┼──────╢",
                "║ frob │ bar │ quuz ║",
                "╚══════╧═════╧══════╝"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test compact shortand", () => {
            const table = new Table({
                style: {
                    head: [],
                    border: [],
                    compact: true
                }
            });

            table.push(
                ["foo", "bar", "baz"],
                ["frob", "bar", "quuz"]
            );

            const expected = [
                "┌──────┬─────┬──────┐",
                "│ foo  │ bar │ baz  │",
                "│ frob │ bar │ quuz │",
                "└──────┴─────┴──────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test compact empty mid line", () => {
            const table = new Table({
                chars: {
                    mid: "",
                    "left-mid": "",
                    "mid-mid": "",
                    "right-mid": ""
                },
                style: {
                    head: [],
                    border: []
                }
            });

            table.push(
                ["foo", "bar", "baz"],
                ["frob", "bar", "quuz"]
            );

            const expected = [
                "┌──────┬─────┬──────┐",
                "│ foo  │ bar │ baz  │",
                "│ frob │ bar │ quuz │",
                "└──────┴─────┴──────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test decoration lines disabled", () => {
            const table = new Table({
                chars: {
                    top: "",
                    "top-mid": "",
                    "top-left": "",
                    "top-right": "",
                    bottom: "",
                    "bottom-mid": "",
                    "bottom-left": "",
                    "bottom-right": "",
                    left: "",
                    "left-mid": "",
                    mid: "",
                    "mid-mid": "",
                    right: "",
                    "right-mid": "",
                    middle: " " // a single space
                },
                style: {
                    head: [],
                    border: [],
                    "padding-left": 0,
                    "padding-right": 0
                }
            });

            table.push(
                ["foo", "bar", "baz"],
                ["frobnicate", "bar", "quuz"]
            );

            const expected = [
                "foo        bar baz ",
                "frobnicate bar quuz"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test with null/undefined as values or column names", () => {
            const table = new Table({
                style: {
                    head: [],
                    border: []
                }
            });

            table.push(
                [null, undefined, 0]
            );

            const expected = [
                "┌──┬──┬───┐",
                "│  │  │ 0 │",
                "└──┴──┴───┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        // it("wordWrap with colored text", function () {
        //     const table = new Table({ style: { border: [], head: [] }, wordWrap: true, colWidths: [7, 9] });

        //     table.push([colors.red("Hello how are you?"), colors.blue("I am fine thanks!")]);

        //     const expected = [
        //         "┌───────┬─────────┐",
        //         "│ " + colors.red("Hello") + " │ " + colors.blue("I am") + "    │",
        //         "│ " + colors.red("how") + "   │ " + colors.blue("fine") + "    │",
        //         "│ " + colors.red("are") + "   │ " + colors.blue("thanks!") + " │",
        //         "│ " + colors.red("you?") + "  │         │",
        //         "└───────┴─────────┘"
        //     ];

        //     expect(table.toString()).to.equal(expected.join("\n"));
        // });

        it("allows numbers as `content` property of cells defined using object notation", () => {
            const table = new Table({ style: { border: [], head: [] } });

            table.push([{ content: 12 }]);

            const expected = [
                "┌────┐",
                "│ 12 │",
                "└────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("throws if content is not a string or number", () => {
            const table = new Table({ style: { border: [], head: [] } });

            expect(() => {
                table.push([{ content: { a: "b" } }]);
                table.toString();
            }).to.throw();

        });

        it("works with CJK values", () => {
            const table = new Table({ style: { border: [], head: [] }, colWidths: [5, 10, 5] });

            table.push(
                ["foobar", "English test", "baz"],
                ["foobar", "中文测试", "baz"],
                ["foobar", "日本語テスト", "baz"],
                ["foobar", "한국어테스트", "baz"]
            );

            const expected = [
                "┌─────┬──────────┬─────┐",
                "│ fo… │ English… │ baz │",
                "├─────┼──────────┼─────┤",
                "│ fo… │ 中文测试 │ baz │",
                "├─────┼──────────┼─────┤",
                "│ fo… │ 日本語…  │ baz │",
                "├─────┼──────────┼─────┤",
                "│ fo… │ 한국어…  │ baz │",
                "└─────┴──────────┴─────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });
    });

    describe("New lines", () => {
        it("test table with newlines in headers", () => {
            const table = new Table({
                head: ["Test", "1\n2\n3"],
                style: {
                    "padding-left": 1,
                    "padding-right": 1,
                    head: [],
                    border: []
                }
            });

            const expected = [
                "┌──────┬───┐",
                "│ Test │ 1 │",
                "│      │ 2 │",
                "│      │ 3 │",
                "└──────┴───┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test column width is accurately reflected when newlines are present", () => {
            const table = new Table({ head: ["Test\nWidth"], style: { head: [], border: [] } });
            expect(table.width).to.equal(9);
        });

        it("test newlines in body cells", () => {
            const table = new Table({ style: { head: [], border: [] } });

            table.push(["something\nwith\nnewlines"]);

            const expected = [
                "┌───────────┐",
                "│ something │",
                "│ with      │",
                "│ newlines  │",
                "└───────────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test newlines in vertical cell header and body", () => {
            const table = new Table({ style: { "padding-left": 0, "padding-right": 0, head: [], border: [] } });

            table.push(
                { "v\n0.1": "Testing\nsomething cool" }
            );

            const expected = [
                "┌───┬──────────────┐",
                "│v  │Testing       │",
                "│0.1│something cool│",
                "└───┴──────────────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });

        it("test newlines in cross table header and body", () => {
            const table = new Table({ head: ["", "Header\n1"], style: { "padding-left": 0, "padding-right": 0, head: [], border: [] } });

            table.push({ "Header\n2": ["Testing\nsomething\ncool"] });

            const expected = [
                "┌──────┬─────────┐",
                "│      │Header   │",
                "│      │1        │",
                "├──────┼─────────┤",
                "│Header│Testing  │",
                "│2     │something│",
                "│      │cool     │",
                "└──────┴─────────┘"
            ];

            expect(table.toString()).to.equal(expected.join("\n"));
        });
    });

    describe("Layout", () => {
        /**
         * Provides a shorthand for validating a table of cells.
         * To pass, both arrays must have the same dimensions, and each cell in `actualRows` must
         * satisfy the shorthand assertion of the corresponding location in `expectedRows`.
         *
         * Available Expectations Can Be:
         *
         *    * A `String` -  Must be a normal cell with contents equal to the String value.
         *    * `null` -  Must be a RowSpanCell
         *
         * Or an `Object` with any of the following properties (multiple properties allowed):
         *    * rowSpan:Number - Must be a normal cell with the given rowSpan.
         *    * colSpan:Number - Must be a normal cell with the given colSpan.
         *    * content:String - Must be a normal cell with the given content.
         *    * spannerFor:[row,col] - Must be a RowSpanCell delegating to the cell at the given coordinates.
         *
         * @param actualRows - the table of cells under test.
         * @param expectedRows - a table of shorthand assertions.
         */

        const findCell = (table, x, y) => {
            for (let i = 0; i < table.length; i++) {
                const row = table[i];
                for (let j = 0; j < row.length; j++) {
                    const cell = row[j];
                    if (cell.x === x && cell.y === y) {
                        return cell;
                    }
                }
            }
        };

        const checkExpectation = (actualCell, expectedCell, x, y, actualTable) => {
            if (is.string(expectedCell)) {
                expectedCell = { content: expectedCell };
            }
            const address = `(${y},${x})`;
            if (expectedCell.hasOwnProperty("content")) {
                expect(actualCell, address).to.be.instanceOf(Cell);
                expect(actualCell.content, `content of ${address}`).to.equal(expectedCell.content);
            }
            if (expectedCell.hasOwnProperty("rowSpan")) {
                expect(actualCell, address).to.be.instanceOf(Cell);
                expect(actualCell.rowSpan, `rowSpan of ${address}`).to.equal(expectedCell.rowSpan);
            }
            if (expectedCell.hasOwnProperty("colSpan")) {
                expect(actualCell, address).to.be.instanceOf(Cell);
                expect(actualCell.colSpan, `colSpan of ${address}`).to.equal(expectedCell.colSpan);
            }
            if (expectedCell.hasOwnProperty("spannerFor")) {
                expect(actualCell, address).to.be.instanceOf(RowSpanCell);
                expect(actualCell.originalCell, `${address}originalCell should be a cell`).to.be.instanceOf(Cell);
                expect(actualCell.originalCell, `${address}originalCell not right`).to.equal(findCell(actualTable,
                    expectedCell.spannerFor[1],
                    expectedCell.spannerFor[0]
                ));
                //TODO: retest here x,y coords
            }
        };

        const checkLayout = (actualTable, expectedTable) => {
            expectedTable.forEach((expectedRow, y) => {
                expectedRow.forEach((expectedCell, x) => {
                    if (expectedCell !== null) {
                        const actualCell = findCell(actualTable, x, y);
                        checkExpectation(actualCell, expectedCell, x, y, actualTable);
                    }
                });
            });
        };

        it("simple 2x2 layout", () => {
            const actual = Table.makeLayout([
                ["hello", "goodbye"],
                ["hola", "adios"]
            ]);

            const expected = [
                ["hello", "goodbye"],
                ["hola", "adios"]
            ];

            checkLayout(actual, expected);
        });

        it("cross table", () => {
            const actual = Table.makeLayout([
                { "1.0": ["yes", "no"] },
                { "2.0": ["hello", "goodbye"] }
            ]);

            const expected = [
                ["1.0", "yes", "no"],
                ["2.0", "hello", "goodbye"]
            ];

            checkLayout(actual, expected);
        });

        it("vertical table", () => {
            const actual = Table.makeLayout([
                { "1.0": "yes" },
                { "2.0": "hello" }
            ]);

            const expected = [
                ["1.0", "yes"],
                ["2.0", "hello"]
            ];

            checkLayout(actual, expected);
        });

        it("colSpan adds RowSpanCells to the right", () => {
            const actual = Table.makeLayout([
                [{ content: "hello", colSpan: 2 }],
                ["hola", "adios"]
            ]);

            const expected = [
                [{ content: "hello", colSpan: 2 }, null],
                ["hola", "adios"]
            ];

            checkLayout(actual, expected);
        });

        it("rowSpan adds RowSpanCell below", () => {
            const actual = Table.makeLayout([
                [{ content: "hello", rowSpan: 2 }, "goodbye"],
                ["adios"]
            ]);

            const expected = [
                ["hello", "goodbye"],
                [{ spannerFor: [0, 0] }, "adios"]
            ];

            checkLayout(actual, expected);
        });

        it("rowSpan and cellSpan together", () => {
            const actual = Table.makeLayout([
                [{ content: "hello", rowSpan: 2, colSpan: 2 }, "goodbye"],
                ["adios"]
            ]);

            const expected = [
                ["hello", null, "goodbye"],
                [{ spannerFor: [0, 0] }, null, "adios"]
            ];

            checkLayout(actual, expected);
        });

        it("complex layout", () => {
            const actual = Table.makeLayout([
                [{ content: "hello", rowSpan: 2, colSpan: 2 }, { content: "yo", rowSpan: 2, colSpan: 2 }, "goodbye"],
                ["adios"]
            ]);

            const expected = [
                ["hello", null, "yo", null, "goodbye"],
                [{ spannerFor: [0, 0] }, null, { spannerFor: [0, 2] }, null, "adios"]
            ];

            checkLayout(actual, expected);
        });

        it("complex layout2", () => {
            const actual = Table.makeLayout([
                ["a", "b", { content: "c", rowSpan: 3, colSpan: 2 }, "d"],
                [{ content: "e", rowSpan: 2, colSpan: 2 }, "f"],
                ["g"]
            ]);

            const expected = [
                ["a", "b", "c", null, "d"],
                ["e", null, { spannerFor: [0, 2] }, null, "f"],
                [{ spannerFor: [1, 0] }, null, { spannerFor: [0, 2] }, null, "g"]
            ];

            checkLayout(actual, expected);
        });

        it("stairstep spans", () => {
            const actual = Table.makeLayout([
                [{ content: "", rowSpan: 2 }, ""],
                [{ content: "", rowSpan: 2 }],
                [""]
            ]);

            const expected = [
                [{ content: "", rowSpan: 2 }, ""],
                [{ spannerFor: [0, 0] }, { content: "", rowSpan: 2 }],
                ["", { spannerFor: [1, 1] }]
            ];

            checkLayout(actual, expected);
        });

        describe("fillInTable", () => {
            const mc = (opts, y, x) => {
                const cell = new Cell(opts);
                cell.x = x;
                cell.y = y;
                return cell;
            };

            it("will blank out individual cells", () => {
                const cells = [
                    [mc("a", 0, 1)],
                    [mc("b", 1, 0)]
                ];
                Table.fillIn(cells);

                checkLayout(cells, [
                    ["", "a"],
                    ["b", ""]
                ]);
            });

            it("will autospan to the right", () => {
                const cells = [
                    [],
                    [mc("a", 1, 1)]
                ];
                Table.fillIn(cells);

                checkLayout(cells, [
                    [{ content: "", colSpan: 2 }, null],
                    ["", "a"]
                ]);
            });

            it("will autospan down", () => {
                const cells = [
                    [mc("a", 0, 1)],
                    []
                ];
                Table.fillIn(cells);
                Table.addRowSpanCells(cells);

                checkLayout(cells, [
                    [{ content: "", rowSpan: 2 }, "a"],
                    [{ spannerFor: [0, 0] }, ""]
                ]);
            });

            it("will autospan right and down", () => {
                const cells = [
                    [mc("a", 0, 2)],
                    [],
                    [mc("b", 2, 1)]
                ];
                Table.fillIn(cells);
                Table.addRowSpanCells(cells);

                checkLayout(cells, [
                    [{ content: "", colSpan: 2, rowSpan: 2 }, null, "a"],
                    [{ spannerFor: [0, 0] }, null, { content: "", colSpan: 1, rowSpan: 2 }],
                    ["", "b", { spannerFor: [1, 2] }]
                ]);
            });
        });

        describe("computeWidths", () => {
            const mc = (y, x, desiredWidth, colSpan) => {
                return { x, y, desiredWidth, colSpan };
            };

            it("finds the maximum desired width of each column", () => {
                const widths = [];
                const cells = [
                    [mc(0, 0, 7), mc(0, 1, 3), mc(0, 2, 5)],
                    [mc(1, 0, 8), mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 0, 6), mc(2, 1, 9), mc(2, 2, 1)]
                ];

                Table.computeWidths(widths, cells);

                expect(widths).to.eql([8, 9, 5]);
            });

            it("won't touch hard coded values", () => {
                const widths = [null, 3];
                const cells = [
                    [mc(0, 0, 7), mc(0, 1, 3), mc(0, 2, 5)],
                    [mc(1, 0, 8), mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 0, 6), mc(2, 1, 9), mc(2, 2, 1)]
                ];

                Table.computeWidths(widths, cells);

                expect(widths).to.eql([8, 3, 5]);
            });

            it("assumes undefined desiredWidth is 1", () => {
                const widths = [];
                const cells = [[{ x: 0, y: 0 }], [{ x: 0, y: 1 }], [{ x: 0, y: 2 }]];
                Table.computeWidths(widths, cells);
                expect(widths).to.eql([1]);
            });

            it("takes into account colSpan and wont over expand", () => {
                const widths = [];
                const cells = [
                    [mc(0, 0, 10, 2), mc(0, 2, 5)],
                    [mc(1, 0, 5), mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 0, 4), mc(2, 1, 2), mc(2, 2, 1)]
                ];
                Table.computeWidths(widths, cells);
                expect(widths).to.eql([5, 5, 5]);
            });

            it("will expand rows involved in colSpan in a balanced way", () => {
                const widths = [];
                const cells = [
                    [mc(0, 0, 13, 2), mc(0, 2, 5)],
                    [mc(1, 0, 5), mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 0, 4), mc(2, 1, 2), mc(2, 2, 1)]
                ];
                Table.computeWidths(widths, cells);
                expect(widths).to.eql([6, 6, 5]);
            });

            it("expands across 3 cols", () => {
                const widths = [];
                const cells = [
                    [mc(0, 0, 25, 3)],
                    [mc(1, 0, 5), mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 0, 4), mc(2, 1, 2), mc(2, 2, 1)]
                ];
                Table.computeWidths(widths, cells);
                expect(widths).to.eql([9, 9, 5]);
            });

            it("multiple spans in same table", () => {
                const widths = [];
                const cells = [
                    [mc(0, 0, 25, 3)],
                    [mc(1, 0, 30, 3)],
                    [mc(2, 0, 4), mc(2, 1, 2), mc(2, 2, 1)]
                ];
                Table.computeWidths(widths, cells);
                expect(widths).to.eql([11, 9, 8]);
            });

            it("spans will only edit uneditable tables", () => {
                const widths = [null, 3];
                const cells = [
                    [mc(0, 0, 20, 3)],
                    [mc(1, 0, 4), mc(1, 1, 20), mc(1, 2, 5)]
                ];
                Table.computeWidths(widths, cells);
                expect(widths).to.eql([7, 3, 8]);
            });

            it("spans will only edit uneditable tables - first column uneditable", () => {
                const widths = [3];
                const cells = [
                    [mc(0, 0, 20, 3)],
                    [mc(1, 0, 4), mc(1, 1, 3), mc(1, 2, 5)]
                ];
                Table.computeWidths(widths, cells);
                expect(widths).to.eql([3, 7, 8]);
            });
        });

        describe("computeHeights", () => {
            const mc = (y, x, desiredHeight, colSpan) => {
                return { x, y, desiredHeight, rowSpan: colSpan };
            };

            it("finds the maximum desired height of each row", () => {
                const heights = [];
                const cells = [
                    [mc(0, 0, 7), mc(0, 1, 3), mc(0, 2, 5)],
                    [mc(1, 0, 8), mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 0, 6), mc(2, 1, 9), mc(2, 2, 1)]
                ];

                Table.computeHeights(heights, cells);

                expect(heights).to.eql([7, 8, 9]);
            });

            it("won't touch hard coded values", () => {
                const heights = [null, 3];
                const cells = [
                    [mc(0, 0, 7), mc(0, 1, 3), mc(0, 2, 5)],
                    [mc(1, 0, 8), mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 0, 6), mc(2, 1, 9), mc(2, 2, 1)]
                ];

                Table.computeHeights(heights, cells);

                expect(heights).to.eql([7, 3, 9]);
            });

            it("assumes undefined desiredHeight is 1", () => {
                const heights = [];
                const cells = [[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]];
                Table.computeHeights(heights, cells);
                expect(heights).to.eql([1]);
            });

            it("takes into account rowSpan and wont over expand", () => {
                const heights = [];
                const cells = [
                    [mc(0, 0, 10, 2), mc(0, 1, 5), mc(0, 2, 2)],
                    [mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 0, 4), mc(2, 1, 2), mc(2, 2, 1)]
                ];
                Table.computeHeights(heights, cells);
                expect(heights).to.eql([5, 5, 4]);
            });

            it("will expand rows involved in rowSpan in a balanced way", () => {
                const heights = [];
                const cells = [
                    [mc(0, 0, 13, 2), mc(0, 1, 5), mc(0, 2, 5)],
                    [mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 0, 4), mc(2, 1, 2), mc(2, 2, 1)]
                ];
                Table.computeHeights(heights, cells);
                expect(heights).to.eql([6, 6, 4]);
            });

            it("expands across 3 rows", () => {
                const heights = [];
                const cells = [
                    [mc(0, 0, 25, 3), mc(0, 1, 5), mc(0, 2, 4)],
                    [mc(1, 1, 5), mc(1, 2, 2)],
                    [mc(2, 1, 2), mc(2, 2, 1)]
                ];
                Table.computeHeights(heights, cells);
                expect(heights).to.eql([9, 9, 5]);
            });

            it("multiple spans in same table", () => {
                const heights = [];
                const cells = [
                    [mc(0, 0, 25, 3), mc(0, 1, 30, 3), mc(0, 2, 4)],
                    [mc(1, 2, 2)],
                    [mc(2, 2, 1)]
                ];
                Table.computeHeights(heights, cells);
                expect(heights).to.eql([11, 9, 8]);
            });
        });


        describe("layoutTable", () => {
            it("sets x and y", () => {
                const table = [
                    [{}, {}],
                    [{}, {}]
                ];

                Table.layout(table);

                expect(table).to.eql([
                    [{ x: 0, y: 0 }, { x: 1, y: 0 }],
                    [{ x: 0, y: 1 }, { x: 1, y: 1 }]
                ]);

                const w = Table.maxWidth(table);
                expect(w).to.equal(2);
            });

            it("colSpan will push x values to the right", () => {
                const table = [
                    [{ colSpan: 2 }, {}],
                    [{}, { colSpan: 2 }]
                ];

                Table.layout(table);

                expect(table).to.eql([
                    [{ x: 0, y: 0, colSpan: 2 }, { x: 2, y: 0 }],
                    [{ x: 0, y: 1 }, { x: 1, y: 1, colSpan: 2 }]
                ]);

                expect(Table.maxWidth(table)).to.equal(3);
            });

            it("rowSpan will push x values on cells below", () => {
                const table = [
                    [{ rowSpan: 2 }, {}],
                    [{}]
                ];

                Table.layout(table);

                expect(table).to.eql([
                    [{ x: 0, y: 0, rowSpan: 2 }, { x: 1, y: 0 }],
                    [{ x: 1, y: 1 }]
                ]);

                expect(Table.maxWidth(table)).to.equal(2);
            });

            it("colSpan and rowSpan together", () => {
                const table = [
                    [{ rowSpan: 2, colSpan: 2 }, {}],
                    [{}]
                ];

                Table.layout(table);

                expect(table).to.eql([
                    [{ x: 0, y: 0, rowSpan: 2, colSpan: 2 }, { x: 2, y: 0 }],
                    [{ x: 2, y: 1 }]
                ]);

                expect(Table.maxWidth(table)).to.equal(3);
            });

            it("complex layout", () => {

                const table = [
                    [{ c: "a" }, { c: "b" }, { c: "c", rowSpan: 3, colSpan: 2 }, { c: "d" }],
                    [{ c: "e", rowSpan: 2, colSpan: 2 }, { c: "f" }],
                    [{ c: "g" }]
                ];

                Table.layout(table);

                expect(table).to.eql([
                    [{ c: "a", y: 0, x: 0 }, { c: "b", y: 0, x: 1 }, { c: "c", y: 0, x: 2, rowSpan: 3, colSpan: 2 }, { c: "d", y: 0, x: 4 }],
                    [{ c: "e", rowSpan: 2, colSpan: 2, y: 1, x: 0 }, { c: "f", y: 1, x: 4 }],
                    [{ c: "g", y: 2, x: 4 }]
                ]);

            });

            it("maxWidth of single element", () => {
                const table = [[{}]];
                Table.layout(table);
                expect(Table.maxWidth(table)).to.equal(1);
            });
        });

        describe("addRowSpanCells", () => {
            it("will insert a rowSpan cell - beginning of line", () => {
                const table = [
                    [{ x: 0, y: 0, rowSpan: 2 }, { x: 1, y: 0 }],
                    [{ x: 1, y: 1 }]
                ];

                Table.addRowSpanCells(table);

                expect(table[0]).to.eql([{ x: 0, y: 0, rowSpan: 2 }, { x: 1, y: 0 }]);
                expect(table[1].length).to.equal(2);
                expect(table[1][0]).to.be.instanceOf(RowSpanCell);
                expect(table[1][1]).to.eql({ x: 1, y: 1 });
            });

            it("will insert a rowSpan cell - end of line", () => {
                const table = [
                    [{ x: 0, y: 0 }, { x: 1, y: 0, rowSpan: 2 }],
                    [{ x: 0, y: 1 }]
                ];

                Table.addRowSpanCells(table);

                expect(table[0]).to.eql([{ x: 0, y: 0 }, { rowSpan: 2, x: 1, y: 0 }]);
                expect(table[1].length).to.equal(2);
                expect(table[1][0]).to.eql({ x: 0, y: 1 });
                expect(table[1][1]).to.be.instanceOf(RowSpanCell);
            });

            it("will insert a rowSpan cell - middle of line", () => {
                const table = [
                    [{ x: 0, y: 0 }, { x: 1, y: 0, rowSpan: 2 }, { x: 2, y: 0 }],
                    [{ x: 0, y: 1 }, { x: 2, y: 1 }]
                ];

                Table.addRowSpanCells(table);

                expect(table[0]).to.eql([{ x: 0, y: 0 }, { rowSpan: 2, x: 1, y: 0 }, { x: 2, y: 0 }]);
                expect(table[1].length).to.equal(3);
                expect(table[1][0]).to.eql({ x: 0, y: 1 });
                expect(table[1][1]).to.be.instanceOf(RowSpanCell);
                expect(table[1][2]).to.eql({ x: 2, y: 1 });
            });

            it("will insert a rowSpan cell - multiple on the same line", () => {
                const table = [
                    [{ x: 0, y: 0 }, { x: 1, y: 0, rowSpan: 2 }, { x: 2, y: 0, rowSpan: 2 }, { x: 3, y: 0 }],
                    [{ x: 0, y: 1 }, { x: 3, y: 1 }]
                ];

                Table.addRowSpanCells(table);

                expect(table[0]).to.eql([{ x: 0, y: 0 }, { rowSpan: 2, x: 1, y: 0 }, { rowSpan: 2, x: 2, y: 0 }, { x: 3, y: 0 }]);
                expect(table[1].length).to.equal(4);
                expect(table[1][0]).to.eql({ x: 0, y: 1 });
                expect(table[1][1]).to.be.instanceOf(RowSpanCell);
                expect(table[1][2]).to.be.instanceOf(RowSpanCell);
                expect(table[1][3]).to.eql({ x: 3, y: 1 });
            });
        });
    });

    describe("Cell", () => {
        const defaultOptions = () => {
            //overwrite coloring of head and border by default for easier testing.
            return Table.applyOptions({ style: { head: [], border: [] } });
        };

        const defaultChars = () => {
            return {
                top: "─",
                topMid: "┬",
                topLeft: "┌",
                topRight: "┐",
                bottom: "─",
                bottomMid: "┴",
                bottomLeft: "└",
                bottomRight: "┘",
                left: "│",
                leftMid: "├",
                mid: "─",
                midMid: "┼",
                right: "│",
                rightMid: "┤",
                middle: "│"
            };
        };

        describe("constructor", () => {
            it("colSpan and rowSpan default to 1", () => {
                const cell = new Cell();
                expect(cell.colSpan).to.equal(1);
                expect(cell.rowSpan).to.equal(1);
            });

            it("colSpan and rowSpan can be set via constructor", () => {
                const cell = new Cell({ rowSpan: 2, colSpan: 3 });
                expect(cell.rowSpan).to.equal(2);
                expect(cell.colSpan).to.equal(3);
            });

            it("content can be set as a string", () => {
                const cell = new Cell("hello\nworld");
                expect(cell.content).to.equal("hello\nworld");
            });

            it("content can be set as a options property", () => {
                const cell = new Cell({ content: "hello\nworld" });
                expect(cell.content).to.equal("hello\nworld");
            });

            it("default content is an empty string", () => {
                const cell = new Cell();
                expect(cell.content).to.equal("");
            });

            it("new Cell(null) will have empty string content", () => {
                const cell = new Cell(null);
                expect(cell.content).to.equal("");
            });

            it("new Cell({content: null}) will have empty string content", () => {
                const cell = new Cell({ content: null });
                expect(cell.content).to.equal("");
            });

            it('new Cell(0) will have "0" as content', () => {
                const cell = new Cell(0);
                expect(cell.content).to.equal("0");
            });

            it('new Cell({content: 0}) will have "0" as content', () => {
                const cell = new Cell({ content: 0 });
                expect(cell.content).to.equal("0");
            });

            it('new Cell(false) will have "false" as content', () => {
                const cell = new Cell(false);
                expect(cell.content).to.equal("false");
            });

            it('new Cell({content: false}) will have "false" as content', () => {
                const cell = new Cell({ content: false });
                expect(cell.content).to.equal("false");
            });
        });

        describe("mergeTableOptions", () => {
            describe("chars", () => {
                it("unset chars take on value of table", () => {
                    const cell = new Cell();
                    const tableOptions = defaultOptions();
                    cell.mergeTableOptions(tableOptions);
                    expect(cell.chars).to.eql(defaultChars());
                });

                it("set chars override the value of table", () => {
                    const cell = new Cell({ chars: { bottomRight: "=" } });
                    cell.mergeTableOptions(defaultOptions());
                    const chars = defaultChars();
                    chars.bottomRight = "=";
                    expect(cell.chars).to.eql(chars);
                });

                it("hyphenated names will be converted to camel-case", () => {
                    const cell = new Cell({ chars: { "bottom-left": "=" } });
                    cell.mergeTableOptions(defaultOptions());
                    const chars = defaultChars();
                    chars.bottomLeft = "=";
                    expect(cell.chars).to.eql(chars);
                });
            });

            describe("truncate", () => {
                it("if unset takes on value of table", () => {
                    const cell = new Cell();
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.truncate).to.equal("…");
                });

                it("if set overrides value of table", () => {
                    const cell = new Cell({ truncate: "..." });
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.truncate).to.equal("...");
                });
            });

            describe("style.padding-left", () => {
                it("if unset will be copied from tableOptions.style", () => {
                    let cell = new Cell();
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.paddingLeft).to.equal(1);

                    cell = new Cell();
                    let tableOptions = defaultOptions();
                    tableOptions.style["padding-left"] = 2;
                    cell.mergeTableOptions(tableOptions);
                    expect(cell.paddingLeft).to.equal(2);

                    cell = new Cell();
                    tableOptions = defaultOptions();
                    tableOptions.style.paddingLeft = 3;
                    cell.mergeTableOptions(tableOptions);
                    expect(cell.paddingLeft).to.equal(3);
                });

                it("if set will override tableOptions.style", () => {
                    let cell = new Cell({ style: { "padding-left": 2 } });
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.paddingLeft).to.equal(2);

                    cell = new Cell({ style: { paddingLeft: 3 } });
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.paddingLeft).to.equal(3);
                });
            });

            describe("style.padding-right", () => {
                it("if unset will be copied from tableOptions.style", () => {
                    let cell = new Cell();
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.paddingRight).to.equal(1);

                    cell = new Cell();
                    let tableOptions = defaultOptions();
                    tableOptions.style["padding-right"] = 2;
                    cell.mergeTableOptions(tableOptions);
                    expect(cell.paddingRight).to.equal(2);

                    cell = new Cell();
                    tableOptions = defaultOptions();
                    tableOptions.style.paddingRight = 3;
                    cell.mergeTableOptions(tableOptions);
                    expect(cell.paddingRight).to.equal(3);
                });

                it("if set will override tableOptions.style", () => {
                    let cell = new Cell({ style: { "padding-right": 2 } });
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.paddingRight).to.equal(2);

                    cell = new Cell({ style: { paddingRight: 3 } });
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.paddingRight).to.equal(3);
                });
            });

            describe("desiredWidth", () => {
                it("content(hello) padding(1,1) == 7", () => {
                    const cell = new Cell("hello");
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.desiredWidth).to.equal(7);
                });

                it("content(hi) padding(1,2) == 5", () => {
                    const cell = new Cell({ content: "hi", style: { paddingRight: 2 } });
                    const tableOptions = defaultOptions();
                    cell.mergeTableOptions(tableOptions);
                    expect(cell.desiredWidth).to.equal(5);
                });

                it("content(hi) padding(3,2) == 7", () => {
                    const cell = new Cell({ content: "hi", style: { paddingLeft: 3, paddingRight: 2 } });
                    const tableOptions = defaultOptions();
                    cell.mergeTableOptions(tableOptions);
                    expect(cell.desiredWidth).to.equal(7);
                });
            });

            describe("desiredHeight", () => {
                it("1 lines of text", () => {
                    const cell = new Cell("hi");
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.desiredHeight).to.equal(1);
                });

                it("2 lines of text", () => {
                    const cell = new Cell("hi\nbye");
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.desiredHeight).to.equal(2);
                });

                it("2 lines of text", () => {
                    const cell = new Cell("hi\nbye\nyo");
                    cell.mergeTableOptions(defaultOptions());
                    expect(cell.desiredHeight).to.equal(3);
                });
            });
        });

        describe("init", () => {
            describe("hAlign", () => {
                it("if unset takes colAlign value from tableOptions", () => {
                    const tableOptions = defaultOptions();
                    tableOptions.colAligns = ["left", "right", "both"];
                    let cell = new Cell();
                    cell.x = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.hAlign).to.equal("left");
                    cell = new Cell();
                    cell.x = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.hAlign).to.equal("right");
                    cell = new Cell();
                    cell.mergeTableOptions(tableOptions);
                    cell.x = 2;
                    cell.init(tableOptions);
                    expect(cell.hAlign).to.equal("both");
                });

                it("if set overrides tableOptions", () => {
                    const tableOptions = defaultOptions();
                    tableOptions.colAligns = ["left", "right", "both"];
                    let cell = new Cell({ hAlign: "right" });
                    cell.x = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.hAlign).to.equal("right");
                    cell = new Cell({ hAlign: "left" });
                    cell.x = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.hAlign).to.equal("left");
                    cell = new Cell({ hAlign: "right" });
                    cell.x = 2;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.hAlign).to.equal("right");
                });
            });

            describe("vAlign", () => {
                it("if unset takes rowAlign value from tableOptions", () => {
                    const tableOptions = defaultOptions();
                    tableOptions.rowAligns = ["top", "bottom", "center"];
                    let cell = new Cell();
                    cell.y = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.vAlign).to.equal("top");
                    cell = new Cell();
                    cell.y = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.vAlign).to.equal("bottom");
                    cell = new Cell();
                    cell.y = 2;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.vAlign).to.equal("center");
                });

                it("if set overrides tableOptions", () => {
                    const tableOptions = defaultOptions();
                    tableOptions.rowAligns = ["top", "bottom", "center"];

                    let cell = new Cell({ vAlign: "bottom" });
                    cell.y = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.vAlign).to.equal("bottom");

                    cell = new Cell({ vAlign: "top" });
                    cell.y = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.vAlign).to.equal("top");

                    cell = new Cell({ vAlign: "center" });
                    cell.y = 2;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.vAlign).to.equal("center");
                });
            });

            describe("width", () => {
                it("will match colWidth of x", () => {
                    const tableOptions = defaultOptions();
                    tableOptions.colWidths = [5, 10, 15];

                    let cell = new Cell();
                    cell.x = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.width).to.equal(5);

                    cell = new Cell();
                    cell.x = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.width).to.equal(10);

                    cell = new Cell();
                    cell.x = 2;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.width).to.equal(15);
                });

                it("will add colWidths if colSpan > 1", () => {
                    const tableOptions = defaultOptions();
                    tableOptions.colWidths = [5, 10, 15];

                    let cell = new Cell({ colSpan: 2 });
                    cell.x = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.width).to.equal(16);

                    cell = new Cell({ colSpan: 2 });
                    cell.x = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.width).to.equal(26);

                    cell = new Cell({ colSpan: 3 });
                    cell.x = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.width).to.equal(32);
                });
            });

            describe("height", () => {
                it("will match rowHeight of x", () => {
                    const tableOptions = defaultOptions();
                    tableOptions.rowHeights = [5, 10, 15];

                    let cell = new Cell();
                    cell.y = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.height).to.equal(5);

                    cell = new Cell();
                    cell.y = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.height).to.equal(10);

                    cell = new Cell();
                    cell.y = 2;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.height).to.equal(15);
                });

                it("will add rowHeights if rowSpan > 1", () => {
                    const tableOptions = defaultOptions();
                    tableOptions.rowHeights = [5, 10, 15];

                    let cell = new Cell({ rowSpan: 2 });
                    cell.y = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.height).to.equal(16);

                    cell = new Cell({ rowSpan: 2 });
                    cell.y = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.height).to.equal(26);

                    cell = new Cell({ rowSpan: 3 });
                    cell.y = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.height).to.equal(32);
                });
            });

            describe("drawRight", () => {
                let tableOptions;

                beforeEach(() => {
                    tableOptions = defaultOptions();
                    tableOptions.colWidths = [20, 20, 20];
                });

                it("col 1 of 3, with default colspan", () => {
                    const cell = new Cell();
                    cell.x = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.drawRight).to.equal(false);
                });

                it("col 2 of 3, with default colspan", () => {
                    const cell = new Cell();
                    cell.x = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.drawRight).to.equal(false);
                });

                it("col 3 of 3, with default colspan", () => {
                    const cell = new Cell();
                    cell.x = 2;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.drawRight).to.equal(true);
                });

                it("col 3 of 4, with default colspan", () => {
                    const cell = new Cell();
                    cell.x = 2;
                    tableOptions.colWidths = [20, 20, 20, 20];
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.drawRight).to.equal(false);
                });

                it("col 2 of 3, with colspan of 2", () => {
                    const cell = new Cell({ colSpan: 2 });
                    cell.x = 1;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.drawRight).to.equal(true);
                });

                it("col 1 of 3, with colspan of 3", () => {
                    const cell = new Cell({ colSpan: 3 });
                    cell.x = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.drawRight).to.equal(true);
                });

                it("col 1 of 3, with colspan of 2", () => {
                    const cell = new Cell({ colSpan: 2 });
                    cell.x = 0;
                    cell.mergeTableOptions(tableOptions);
                    cell.init(tableOptions);
                    expect(cell.drawRight).to.equal(false);
                });
            });
        });

        describe("drawLine", () => {
            let cell;

            beforeEach(() => {
                cell = new Cell();

                //manually init
                cell.chars = defaultChars();
                cell.paddingLeft = cell.paddingRight = 1;
                cell.width = 7;
                cell.height = 3;
                cell.hAlign = "center";
                cell.vAlign = "center";
                cell.chars.left = "L";
                cell.chars.right = "R";
                cell.chars.middle = "M";
                cell.content = "hello\nhowdy\ngoodnight";
                cell.lines = cell.content.split("\n");
                cell.x = cell.y = 0;
            });

            describe("top line", () => {
                it("will draw the top left corner when x=0,y=0", () => {
                    cell.x = cell.y = 0;
                    expect(cell.draw("top")).to.equal("┌───────");
                    cell.drawRight = true;
                    expect(cell.draw("top")).to.equal("┌───────┐");
                });

                it("will draw the top mid corner when x=1,y=0", () => {
                    cell.x = 1;
                    cell.y = 0;
                    expect(cell.draw("top")).to.equal("┬───────");
                    cell.drawRight = true;
                    expect(cell.draw("top")).to.equal("┬───────┐");
                });

                it("will draw the left mid corner when x=0,y=1", () => {
                    cell.x = 0;
                    cell.y = 1;
                    expect(cell.draw("top")).to.equal("├───────");
                    cell.drawRight = true;
                    expect(cell.draw("top")).to.equal("├───────┤");
                });

                it("will draw the mid mid corner when x=1,y=1", () => {
                    cell.x = 1;
                    cell.y = 1;
                    expect(cell.draw("top")).to.equal("┼───────");
                    cell.drawRight = true;
                    expect(cell.draw("top")).to.equal("┼───────┤");
                });

                // it("will draw in the color specified by border style", function () {
                //     cell.border = ["gray"];
                //     expect(cell.draw("top")).to.equal(colors.gray("┌───────"));
                // });
            });

            describe("bottom line", () => {
                it("will draw the bottom left corner if x=0", () => {
                    cell.x = 0;
                    cell.y = 1;
                    expect(cell.draw("bottom")).to.equal("└───────");
                    cell.drawRight = true;
                    expect(cell.draw("bottom")).to.equal("└───────┘");
                });

                it("will draw the bottom left corner if x=1", () => {
                    cell.x = 1;
                    cell.y = 1;
                    expect(cell.draw("bottom")).to.equal("┴───────");
                    cell.drawRight = true;
                    expect(cell.draw("bottom")).to.equal("┴───────┘");
                });

                // it("will draw in the color specified by border style", function () {
                //     cell.border = ["gray"];
                //     expect(cell.draw("bottom")).to.equal(colors.gray("└───────"));
                // });
            });

            describe("drawBottom", () => {
                it("draws an empty line", () => {
                    expect(cell.drawEmpty()).to.equal("L       ");
                    expect(cell.drawEmpty(true)).to.equal("L       R");
                });

                // it("draws an empty line", function () {
                //     cell.border = ["gray"];
                //     cell.head = ["red"];
                //     expect(cell.drawEmpty()).to.equal(colors.gray("L") + colors.red("       "));
                //     expect(cell.drawEmpty(true)).to.equal(colors.gray("L") + colors.red("       ") + colors.gray("R"));
                // });
            });

            describe("first line of text", () => {
                beforeEach(() => {
                    cell.width = 9;
                });

                it("will draw left side if x=0", () => {
                    cell.x = 0;
                    expect(cell.draw(0)).to.equal("L  hello  ");
                    cell.drawRight = true;
                    expect(cell.draw(0)).to.equal("L  hello  R");
                });

                it("will draw mid side if x=1", () => {
                    cell.x = 1;
                    expect(cell.draw(0)).to.equal("M  hello  ");
                    cell.drawRight = true;
                    expect(cell.draw(0)).to.equal("M  hello  R");
                });

                it("will align left", () => {
                    cell.x = 1;
                    cell.hAlign = "left";
                    expect(cell.draw(0)).to.equal("M hello   ");
                    cell.drawRight = true;
                    expect(cell.draw(0)).to.equal("M hello   R");
                });

                it("will align right", () => {
                    cell.x = 1;
                    cell.hAlign = "right";
                    expect(cell.draw(0)).to.equal("M   hello ");
                    cell.drawRight = true;
                    expect(cell.draw(0)).to.equal("M   hello R");
                });

                // it("left and right will be drawn in color of border style", function () {
                //     cell.border = ["gray"];
                //     cell.x = 0;
                //     expect(cell.draw(0)).to.equal(colors.gray("L") + "  hello  ");
                //     cell.drawRight = true;
                //     expect(cell.draw(0)).to.equal(colors.gray("L") + "  hello  " + colors.gray("R"));
                // });

                // it("text will be drawn in color of head style if y == 0", function () {
                //     cell.head = ["red"];
                //     cell.x = cell.y = 0;
                //     expect(cell.draw(0)).to.equal("L" + colors.red("  hello  "));
                //     cell.drawRight = true;
                //     expect(cell.draw(0)).to.equal("L" + colors.red("  hello  ") + "R");
                // });

                it("text will NOT be drawn in color of head style if y == 1", () => {
                    cell.head = ["red"];
                    cell.x = cell.y = 1;
                    expect(cell.draw(0)).to.equal("M  hello  ");
                    cell.drawRight = true;
                    expect(cell.draw(0)).to.equal("M  hello  R");
                });

                // it("head and border colors together", function () {
                //     cell.border = ["gray"];
                //     cell.head = ["red"];
                //     cell.x = cell.y = 0;
                //     expect(cell.draw(0)).to.equal(colors.gray("L") + colors.red("  hello  "));
                //     cell.drawRight = true;
                //     expect(cell.draw(0)).to.equal(colors.gray("L") + colors.red("  hello  ") + colors.gray("R"));
                // });
            });

            describe("second line of text", () => {
                beforeEach(() => {
                    cell.width = 9;
                });

                it("will draw left side if x=0", () => {
                    cell.x = 0;
                    expect(cell.draw(1)).to.equal("L  howdy  ");
                    cell.drawRight = true;
                    expect(cell.draw(1)).to.equal("L  howdy  R");
                });

                it("will draw mid side if x=1", () => {
                    cell.x = 1;
                    expect(cell.draw(1)).to.equal("M  howdy  ");
                    cell.drawRight = true;
                    expect(cell.draw(1)).to.equal("M  howdy  R");
                });

                it("will align left", () => {
                    cell.x = 1;
                    cell.hAlign = "left";
                    expect(cell.draw(1)).to.equal("M howdy   ");
                    cell.drawRight = true;
                    expect(cell.draw(1)).to.equal("M howdy   R");
                });

                it("will align right", () => {
                    cell.x = 1;
                    cell.hAlign = "right";
                    expect(cell.draw(1)).to.equal("M   howdy ");
                    cell.drawRight = true;
                    expect(cell.draw(1)).to.equal("M   howdy R");
                });
            });

            describe("truncated line of text", () => {
                beforeEach(() => {
                    cell.width = 9;
                });

                it("will draw left side if x=0", () => {
                    cell.x = 0;
                    expect(cell.draw(2)).to.equal("L goodni… ");
                    cell.drawRight = true;
                    expect(cell.draw(2)).to.equal("L goodni… R");
                });

                it("will draw mid side if x=1", () => {
                    cell.x = 1;
                    expect(cell.draw(2)).to.equal("M goodni… ");
                    cell.drawRight = true;
                    expect(cell.draw(2)).to.equal("M goodni… R");
                });

                it("will not change when aligned left", () => {
                    cell.x = 1;
                    cell.hAlign = "left";
                    expect(cell.draw(2)).to.equal("M goodni… ");
                    cell.drawRight = true;
                    expect(cell.draw(2)).to.equal("M goodni… R");
                });

                it("will not change when aligned right", () => {
                    cell.x = 1;
                    cell.hAlign = "right";
                    expect(cell.draw(2)).to.equal("M goodni… ");
                    cell.drawRight = true;
                    expect(cell.draw(2)).to.equal("M goodni… R");
                });
            });

            describe("vAlign", () => {
                beforeEach(() => {
                    cell.height = "5";
                });

                it("center", () => {
                    cell.vAlign = "center";
                    expect(cell.draw(0)).to.equal("L       ");
                    expect(cell.draw(1)).to.equal("L hello ");
                    expect(cell.draw(2)).to.equal("L howdy ");
                    expect(cell.draw(3)).to.equal("L good… ");
                    expect(cell.draw(4)).to.equal("L       ");

                    cell.drawRight = true;
                    expect(cell.draw(0)).to.equal("L       R");
                    expect(cell.draw(1)).to.equal("L hello R");
                    expect(cell.draw(2)).to.equal("L howdy R");
                    expect(cell.draw(3)).to.equal("L good… R");
                    expect(cell.draw(4)).to.equal("L       R");

                    cell.x = 1;
                    cell.drawRight = false;
                    expect(cell.draw(0)).to.equal("M       ");
                    expect(cell.draw(1)).to.equal("M hello ");
                    expect(cell.draw(2)).to.equal("M howdy ");
                    expect(cell.draw(3)).to.equal("M good… ");
                    expect(cell.draw(4)).to.equal("M       ");
                });

                it("top", () => {
                    cell.vAlign = "top";
                    expect(cell.draw(0)).to.equal("L hello ");
                    expect(cell.draw(1)).to.equal("L howdy ");
                    expect(cell.draw(2)).to.equal("L good… ");
                    expect(cell.draw(3)).to.equal("L       ");
                    expect(cell.draw(4)).to.equal("L       ");

                    cell.vAlign = null; //top is the default
                    cell.drawRight = true;
                    expect(cell.draw(0)).to.equal("L hello R");
                    expect(cell.draw(1)).to.equal("L howdy R");
                    expect(cell.draw(2)).to.equal("L good… R");
                    expect(cell.draw(3)).to.equal("L       R");
                    expect(cell.draw(4)).to.equal("L       R");

                    cell.x = 1;
                    cell.drawRight = false;
                    expect(cell.draw(0)).to.equal("M hello ");
                    expect(cell.draw(1)).to.equal("M howdy ");
                    expect(cell.draw(2)).to.equal("M good… ");
                    expect(cell.draw(3)).to.equal("M       ");
                    expect(cell.draw(4)).to.equal("M       ");
                });

                it("center", () => {
                    cell.vAlign = "bottom";
                    expect(cell.draw(0)).to.equal("L       ");
                    expect(cell.draw(1)).to.equal("L       ");
                    expect(cell.draw(2)).to.equal("L hello ");
                    expect(cell.draw(3)).to.equal("L howdy ");
                    expect(cell.draw(4)).to.equal("L good… ");

                    cell.drawRight = true;
                    expect(cell.draw(0)).to.equal("L       R");
                    expect(cell.draw(1)).to.equal("L       R");
                    expect(cell.draw(2)).to.equal("L hello R");
                    expect(cell.draw(3)).to.equal("L howdy R");
                    expect(cell.draw(4)).to.equal("L good… R");

                    cell.x = 1;
                    cell.drawRight = false;
                    expect(cell.draw(0)).to.equal("M       ");
                    expect(cell.draw(1)).to.equal("M       ");
                    expect(cell.draw(2)).to.equal("M hello ");
                    expect(cell.draw(3)).to.equal("M howdy ");
                    expect(cell.draw(4)).to.equal("M good… ");
                });
            });

            it("vertically truncated will show truncation on last visible line", () => {
                cell.height = 2;
                expect(cell.draw(0)).to.equal("L hello ");
                expect(cell.draw(1)).to.equal("L howd… ");
            });

            it("won't vertically truncate if the lines just fit", () => {
                cell.height = 2;
                cell.content = "hello\nhowdy";
                cell.lines = cell.content.split("\n");
                expect(cell.draw(0)).to.equal("L hello ");
                expect(cell.draw(1)).to.equal("L howdy ");
            });

            it("will vertically truncate even if last line is short", () => {
                cell.height = 2;
                cell.content = "hello\nhi\nhowdy";
                cell.lines = cell.content.split("\n");
                expect(cell.draw(0)).to.equal("L hello ");
                expect(cell.draw(1)).to.equal("L  hi…  ");
            });

            it("allows custom truncation", () => {
                cell.height = 2;
                cell.truncate = "...";
                cell.content = "hello\nhi\nhowdy";
                cell.lines = cell.content.split("\n");
                expect(cell.draw(0)).to.equal("L hello ");
                expect(cell.draw(1)).to.equal("L hi... ");

                cell.content = "hello\nhowdy\nhi";
                cell.lines = cell.content.split("\n");
                expect(cell.draw(0)).to.equal("L hello ");
                expect(cell.draw(1)).to.equal("L ho... ");
            });
        });

        describe("ColSpanCell", () => {
            it("has an init function", () => {
                expect(new ColSpanCell()).to.respondTo("init");
                new ColSpanCell().init(); // nothing happens.
            });

            it("draw returns an empty string", () => {
                expect(new ColSpanCell().draw("top")).to.equal("");
                expect(new ColSpanCell().draw("bottom")).to.equal("");
                expect(new ColSpanCell().draw(1)).to.equal("");
            });
        });

        describe("RowSpanCell", () => {
            let original;
            let tableOptions;

            beforeEach(() => {
                original = {
                    rowSpan: 3,
                    y: 0,
                    draw: spy()
                };
                tableOptions = {
                    rowHeights: [2, 3, 4, 5]
                };
            });

            it("drawing top of the next row", () => {
                const spanner = new RowSpanCell(original);
                spanner.x = 0;
                spanner.y = 1;
                spanner.init(tableOptions);
                spanner.draw("top");
                expect(original.draw).to.have.been.calledOnce.and.calledWith(2);
            });

            it("drawing line 0 of the next row", () => {
                const spanner = new RowSpanCell(original);
                spanner.x = 0;
                spanner.y = 1;
                spanner.init(tableOptions);
                spanner.draw(0);
                expect(original.draw).to.have.been.calledOnce.and.calledWith(3);
            });

            it("drawing line 1 of the next row", () => {
                const spanner = new RowSpanCell(original);
                spanner.x = 0;
                spanner.y = 1;
                spanner.init(tableOptions);
                spanner.draw(1);
                expect(original.draw).to.have.been.calledOnce.and.calledWith(4);
            });

            it("drawing top of two rows below", () => {
                const spanner = new RowSpanCell(original);
                spanner.x = 0;
                spanner.y = 2;
                spanner.init(tableOptions);
                spanner.draw("top");
                expect(original.draw).to.have.been.calledOnce.and.calledWith(6);
            });

            it("drawing line 0 of two rows below", () => {
                const spanner = new RowSpanCell(original);
                spanner.x = 0;
                spanner.y = 2;
                spanner.init(tableOptions);
                spanner.draw(0);
                expect(original.draw).to.have.been.calledOnce.and.calledWith(7);
            });

            it("drawing line 1 of two rows below", () => {
                const spanner = new RowSpanCell(original);
                spanner.x = 0;
                spanner.y = 2;
                spanner.init(tableOptions);
                spanner.draw(1);
                expect(original.draw).to.have.been.calledOnce.and.calledWith(8);
            });

            it("drawing bottom", () => {
                const spanner = new RowSpanCell(original);
                spanner.x = 0;
                spanner.y = 1;
                spanner.init(tableOptions);
                spanner.draw("bottom");
                expect(original.draw).to.have.been.calledOnce.and.calledWith("bottom");
            });
        });
    });
});
