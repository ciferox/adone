const {
    text
} = adone;

const { width, unicode: { isFullWidthCodePoint } } = text;

describe("stripAnsi()", () => {
    it("strip color from string", () => {
        assert.equal(text.stripAnsi("\u001b[0m\u001b[4m\u001b[42m\u001b[31mfoo\u001b[39m\u001b[49m\u001b[24mfoo\u001b[0m"), "foofoo");
    });

    it("strip color from ls command", () => {
        assert.equal(text.stripAnsi("\u001b[00;38;5;244m\u001b[m\u001b[00;38;5;33mfoo\u001b[0m"), "foo");
    });
    it("strip reset;setfg;setbg;italics;strike;underline sequence from string", () => {
        assert.equal(text.stripAnsi("\x1b[0;33;49;3;9;4mbar\x1b[0m"), "bar");
    });
});

describe("hasAnsi()", () => {
    it("with ansi", () => {
        assert.isTrue(text.hasAnsi("foo\u001B[4mcake\u001B[0m"));
    });

    it("without ansi", () => {
        assert.isFalse(text.hasAnsi("cake"));
    });
});

describe("Unicode", () => {
    describe("Full width", () => {
        it("check", () => {
            assert.isTrue(isFullWidthCodePoint("あ".codePointAt(0)));
            assert.isTrue(isFullWidthCodePoint("谢".codePointAt(0)));
            assert.isTrue(isFullWidthCodePoint("고".codePointAt(0)));
            assert.isFalse(isFullWidthCodePoint("a".codePointAt(0)));
            assert.isTrue(isFullWidthCodePoint(0x1f251));
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


describe("stripLastNewline", () => {
    const { stripLastNewline } = adone.text;
    it("string", () => {
        assert.equal(stripLastNewline("foo\n"), "foo");
        assert.equal(stripLastNewline("foo\nbar\n"), "foo\nbar");
        assert.equal(stripLastNewline("foo\n\n\n"), "foo\n\n");
        assert.equal(stripLastNewline("foo\r\n"), "foo");
        assert.equal(stripLastNewline("foo\r"), "foo");
        assert.equal(stripLastNewline("foo\n\r\n"), "foo\n");
    });

    it("buffer", () => {
        assert.equal(stripLastNewline(Buffer.from("foo\n")).toString(), "foo");
        assert.equal(stripLastNewline(Buffer.from("foo\nbar\n")).toString(), "foo\nbar");
        assert.equal(stripLastNewline(Buffer.from("foo\n\n\n").toString()), "foo\n\n");
        assert.equal(stripLastNewline(Buffer.from("foo\r\n")).toString(), "foo");
        assert.equal(stripLastNewline(Buffer.from("foo\r")).toString(), "foo");
        assert.equal(stripLastNewline(Buffer.from("foo\n\r\n")).toString(), "foo\n");
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
