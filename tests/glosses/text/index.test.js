const { text } = adone;
const { width, ansi: { escapeCodesRegexp, stripEscapeCodes }, unicode: { isFullWidthCodePoint } } = text;

const ansiCodes = require(adone.std.path.join(__dirname, "fixtures/ansi-codes"));
const consumptionChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+1234567890-=[]{};\':"./>?,<\\|';
describe("text", () => {
    describe("ANSI", () => {
        describe("Escape Codes", () => {
            describe("Regexp", () => {
                // testing against codes found at: http://ascii-table.com/ansi-escape-sequences-vt-100.php
                it("match ansi code in a string", () => {
                    assert.true(escapeCodesRegexp().test("foo\u001b[4mcake\u001b[0m"));
                    assert.true(escapeCodesRegexp().test("\u001b[4mcake\u001b[0m"));
                    assert.true(escapeCodesRegexp().test("foo\u001b[4mcake\u001b[0m"));
                    assert.true(escapeCodesRegexp().test("\u001b[0m\u001b[4m\u001b[42m\u001b[31mfoo\u001b[39m\u001b[49m\u001b[24mfoo\u001b[0m"));
                    assert.true(escapeCodesRegexp().test("foo\u001b[mfoo"));
                });

                it("match ansi code from ls command", () => {
                    assert.true(escapeCodesRegexp().test("\u001b[00;38;5;244m\u001b[m\u001b[00;38;5;33mfoo\u001b[0m"));
                });

                it("match reset;setfg;setbg;italics;strike;underline sequence in a string", () => {
                    assert.true(escapeCodesRegexp().test("\u001b[0;33;49;3;9;4mbar\u001b[0m"));
                    assert.equal("foo\u001b[0;33;49;3;9;4mbar".match(escapeCodesRegexp())[0], "\u001b[0;33;49;3;9;4m");
                });

                it("match clear tabs sequence in a string", () => {
                    assert.true(escapeCodesRegexp().test("foo\u001b[0gbar"));
                    assert.equal("foo\u001b[0gbar".match(escapeCodesRegexp())[0], "\u001b[0g");
                });

                it("match clear line from cursor right in a string", () => {
                    assert.true(escapeCodesRegexp().test("foo\u001b[Kbar"));
                    assert.equal("foo\u001b[Kbar".match(escapeCodesRegexp())[0], "\u001b[K");
                });

                it("match clear screen in a string", () => {
                    assert.true(escapeCodesRegexp().test("foo\u001b[2Jbar"));
                    assert.equal("foo\u001b[2Jbar".match(escapeCodesRegexp())[0], "\u001b[2J");
                });

                // testing against extended codes (excluding codes ending in 0-9)
                for (const codeSet in ansiCodes) {
                    for (const code in ansiCodes[codeSet]) {
                        const codeInfo = ansiCodes[codeSet][code];
                        const skip = /[0-9]$/.test(code);
                        const skipText = skip ? "[SKIP] " : "";
                        const ecode = `\u001b${code}`;

                        it(`${skipText + code} -> ${codeInfo[0]}`, () => {
                            if (skip) {
                                return;
                            }

                            const string = `hel${ecode}lo`;

                            assert.true(escapeCodesRegexp().test(string));
                            assert.equal(string.match(escapeCodesRegexp())[0], ecode);
                            assert.equal(string.replace(escapeCodesRegexp(), ""), "hello");
                        });

                        it(`${skipText + code} should not overconsume`, () => {
                            if (skip) {
                                return;
                            }

                            for (let i = 0; i < consumptionChars.length; i++) {
                                const c = consumptionChars[i];
                                const string = ecode + c;

                                assert.true(escapeCodesRegexp().test(string));
                                assert.equal(string.match(escapeCodesRegexp())[0], ecode);
                                assert.equal(string.replace(escapeCodesRegexp(), ""), c);
                            }
                        });
                    }
                }
            });
            describe("Strip", () => {
                it("strip color from string", () => {
                    assert.equal(stripEscapeCodes("\u001b[0m\u001b[4m\u001b[42m\u001b[31mfoo\u001b[39m\u001b[49m\u001b[24mfoo\u001b[0m"), "foofoo");
                });

                it("strip color from ls command", () => {
                    assert.equal(stripEscapeCodes("\u001b[00;38;5;244m\u001b[m\u001b[00;38;5;33mfoo\u001b[0m"), "foo");
                });
                it("strip reset;setfg;setbg;italics;strike;underline sequence from string", () => {
                    assert.equal(stripEscapeCodes("\x1b[0;33;49;3;9;4mbar\x1b[0m"), "bar");
                });
            });
        });
    });

    describe("Unicode", () => {
        describe("Full width", () => {
            it("check", () => {
                assert.true(isFullWidthCodePoint("あ".codePointAt(0)));
                assert.true(isFullWidthCodePoint("谢".codePointAt(0)));
                assert.true(isFullWidthCodePoint("고".codePointAt(0)));
                assert.false(isFullWidthCodePoint("a".codePointAt(0)));
                assert.true(isFullWidthCodePoint(0x1f251));
            });
        });
    });

    describe("Common", () => {
        describe("Text width", () => {
            it("main", () => {
                assert.equal(width("abcde"), 5);
                assert.equal(width("古池や"), 6);
                assert.equal(width("あいうabc"), 9);
                assert.equal(width("ノード.js"), 9);
                assert.equal(width("你好"), 4);
                assert.equal(width("안녕하세요"), 10);
                assert.equal(width("A\ud83c\ude00BC"), 5, "surrogate");
                assert.equal(width("\u001b[31m\u001b[39m"), 0);
            });

            it("ignores control characters", () => {
                assert.equal(width(String.fromCharCode(0)), 0);
                assert.equal(width(String.fromCharCode(31)), 0);
                assert.equal(width(String.fromCharCode(127)), 0);
                assert.equal(width(String.fromCharCode(134)), 0);
                assert.equal(width(String.fromCharCode(159)), 0);
                assert.equal(width("\u001b"), 0);
            });
        });
    });


    describe("stripEof", () => {
        const { stripEof } = adone.text;
        it("string", () => {
            assert.equal(stripEof("foo\n"), "foo");
            assert.equal(stripEof("foo\nbar\n"), "foo\nbar");
            assert.equal(stripEof("foo\n\n\n"), "foo\n\n");
            assert.equal(stripEof("foo\r\n"), "foo");
            assert.equal(stripEof("foo\r"), "foo");
            assert.equal(stripEof("foo\n\r\n"), "foo\n");
        });

        it("buffer", () => {
            assert.equal(stripEof(Buffer.from("foo\n")).toString(), "foo");
            assert.equal(stripEof(Buffer.from("foo\nbar\n")).toString(), "foo\nbar");
            assert.equal(stripEof(Buffer.from("foo\n\n\n").toString()), "foo\n\n");
            assert.equal(stripEof(Buffer.from("foo\r\n")).toString(), "foo");
            assert.equal(stripEof(Buffer.from("foo\r")).toString(), "foo");
            assert.equal(stripEof(Buffer.from("foo\n\r\n")).toString(), "foo\n");
        });
    });

    it("toCamelCase", () => {
        assert.equal(text.toCamelCase("foo"), "foo");
        assert.equal(text.toCamelCase("foo-bar"), "fooBar");
        assert.equal(text.toCamelCase("foo-bar-baz"), "fooBarBaz");
        assert.equal(text.toCamelCase("foo--bar"), "fooBar");
        assert.equal(text.toCamelCase("--foo-bar"), "fooBar");
        assert.equal(text.toCamelCase("--foo--bar"), "fooBar");
        assert.equal(text.toCamelCase("FOO-BAR"), "fooBar");
        assert.equal(text.toCamelCase("FOÈ-BAR"), "foèBar");
        assert.equal(text.toCamelCase("-foo-bar-"), "fooBar");
        assert.equal(text.toCamelCase("--foo--bar--"), "fooBar");
        assert.equal(text.toCamelCase("foo.bar"), "fooBar");
        assert.equal(text.toCamelCase("foo..bar"), "fooBar");
        assert.equal(text.toCamelCase("..foo..bar.."), "fooBar");
        assert.equal(text.toCamelCase("foo_bar"), "fooBar");
        assert.equal(text.toCamelCase("__foo__bar__"), "fooBar");
        assert.equal(text.toCamelCase("__foo__bar__"), "fooBar");
        assert.equal(text.toCamelCase("foo bar"), "fooBar");
        assert.equal(text.toCamelCase("  foo  bar  "), "fooBar");
        assert.equal(text.toCamelCase("-"), "-");
        assert.equal(text.toCamelCase(" - "), "-");
        assert.equal(text.toCamelCase("fooBar"), "fooBar");
        assert.equal(text.toCamelCase("fooBar-baz"), "fooBarBaz");
        assert.equal(text.toCamelCase("foìBar-baz"), "foìBarBaz");
        assert.equal(text.toCamelCase("fooBarBaz-bazzy"), "fooBarBazBazzy");
        assert.equal(text.toCamelCase("FBBazzy"), "fbBazzy");
        assert.equal(text.toCamelCase("F"), "f");
        assert.equal(text.toCamelCase("FooBar"), "fooBar");
        assert.equal(text.toCamelCase("Foo"), "foo");
        assert.equal(text.toCamelCase("FOO"), "foo");
        assert.equal(text.toCamelCase("foo", "bar"), "fooBar");
        assert.equal(text.toCamelCase("foo", "-bar"), "fooBar");
        assert.equal(text.toCamelCase("foo", "-bar", "baz"), "fooBarBaz");
        assert.equal(text.toCamelCase("", ""), "");
        assert.equal(text.toCamelCase("--"), "");
        assert.equal(text.toCamelCase(""), "");
        assert.equal(text.toCamelCase("--__--_--_"), "");
        assert.equal(text.toCamelCase("---_", "--", "", "-_- "), "");
        assert.equal(text.toCamelCase("foo bar?"), "fooBar?");
        assert.equal(text.toCamelCase("foo bar!"), "fooBar!");
        assert.equal(text.toCamelCase("foo bar$"), "fooBar$");
        assert.equal(text.toCamelCase("foo-bar#"), "fooBar#");
        assert.equal(text.toCamelCase("XMLHttpRequest"), "xmlHttpRequest");
        assert.equal(text.toCamelCase("AjaxXMLHttpRequest"), "ajaxXmlHttpRequest");
        assert.equal(text.toCamelCase("Ajax-XMLHttpRequest"), "ajaxXmlHttpRequest");
    });

    it("capitalize", () => {
        assert.equal(text.capitalize(""), "");
        assert.equal(text.capitalize("foobar"), "Foobar");
        assert.equal(text.capitalize("foo bar"), "Foo bar");
    });

    it("capitalizeWords", () => {
        assert.equal(text.capitalizeWords(""), "");
        assert.equal(text.capitalizeWords("foobar"), "Foobar");
        assert.equal(text.capitalizeWords("foo bar"), "Foo Bar");
        assert.equal(text.capitalizeWords("everything-happens"), "Everything-Happens");
        assert.equal(text.capitalizeWords("it's a nice day"), "It's A Nice Day");
    });
});
