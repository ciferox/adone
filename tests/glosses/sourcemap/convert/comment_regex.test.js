/* eslint-disable func-style */

const {
    sourcemap: { convert }
} = adone;

function comment(prefix, suffix) {
    const rx = convert.getCommentRegex();
    return rx.test(`${prefix}sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9${suffix}`);
}

function commentWithCharSet(prefix, suffix, sep) {
    sep = sep || ":";
    const rx = convert.getCommentRegex();
    return rx.test(`${prefix}sourceMappingURL=data:application/json;charset${sep}utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlcyI6WyJmdW5jdGlvbiBmb28oKSB7XG4gY29uc29sZS5sb2coXCJoZWxsbyBJIGFtIGZvb1wiKTtcbiBjb25zb2xlLmxvZyhcIndobyBhcmUgeW91XCIpO1xufVxuXG5mb28oKTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSJ9${suffix}`);
}

describe("sourcemap", "convert", "comment regex", () => {
    // Source Map v2 Tests
    it("comment regex old spec - @", () => {
        [
            "//@ ",
            "  //@ ", // with leading space
            "\t//@ ", // with leading tab
            "//@ ", // with leading text
            "/*@ ", // multi line style
            "  /*@ ", // multi line style with leading spaces
            "\t/*@ ", // multi line style with leading tab
            "/*@ " // multi line style with leading text
        ].forEach((x) => {
            assert.ok(comment(x, ""), `matches ${x}`);
            assert.ok(commentWithCharSet(x, ""), `matches ${x} with charset`);
            assert.ok(commentWithCharSet(x, "", "="), `matches ${x} with charset`);
        });

        [
            " @// @",
            " @/* @"
        ].forEach((x) => {
            assert.ok(!comment(x, ""), `should not match ${x}`);
        });
    });

    it("comment regex new spec - #", () => {
        [
            "  //# ", // with leading spaces
            "\t//# ", // with leading tab
            "//# ", // with leading text
            "/*# ", // multi line style
            "  /*# ", // multi line style with leading spaces
            "\t/*# ", // multi line style with leading tab
            "/*# " // multi line style with leading text
        ].forEach((x) => {
            assert.ok(comment(x, ""), `matches ${x}`);
            assert.ok(commentWithCharSet(x, ""), `matches ${x} with charset`);
            assert.ok(commentWithCharSet(x, "", "="), `matches ${x} with charset`);
        });

        [
            " #// #",
            " #/* #"
        ].forEach((x) => {
            assert.ok(!comment(x, ""), `should not match ${x}`);
        });
    });

    function mapFileCommentWrap(s1, s2) {
        const mapFileRx = convert.getMapFileCommentRegex();
        return mapFileRx.test(`${s1}sourceMappingURL=foo.js.map${s2}`);
    }

    it("mapFileComment regex old spec - @", () => {

        [
            ["//@ ", ""],
            ["  //@ ", ""], // with leading spaces
            ["\t//@ ", ""], // with a leading tab
            ["///@ ", ""], // with a leading text
            [";//@ ", ""], // with a leading text
            ["return//@ ", ""] // with a leading text
        ].forEach((x) => {
            assert.ok(mapFileCommentWrap(x[0], x[1]), `matches ${x.join(" :: ")}`);
        });

        [
            [" @// @", ""],
            ["var sm = `//@ ", "`"], // not inside a string
            ['var sm = "//@ ', '"'], // not inside a string
            ["var sm = '//@ ", "'"], // not inside a string
            ["var sm = ' //@ ", "'"] // not inside a string
        ].forEach((x) => {
            assert.ok(!mapFileCommentWrap(x[0], x[1]), `does not match ${x.join(" :: ")}`);
        });
    });

    it("mapFileComment regex new spec - #", () => {
        [
            ["//# ", ""],
            ["  //# ", ""], // with leading space
            ["\t//# ", ""], // with leading tab
            ["///# ", ""], // with leading text
            [";//# ", ""], // with leading text
            ["return//# ", ""] // with leading text
        ].forEach((x) => {
            assert.ok(mapFileCommentWrap(x[0], x[1]), `matches ${x.join(" :: ")}`);
        });

        [
            [" #// #", ""],
            ["var sm = `//# ", "`"], // not inside a string
            ['var sm = "//# ', '"'], // not inside a string
            ["var sm = '//# ", "'"], // not inside a string
            ["var sm = ' //# ", "'"] // not inside a string
        ].forEach((x) => {
            assert.ok(!mapFileCommentWrap(x[0], x[1]), `does not match ${x.join(" :: ")}`);
        });
    });

    it("mapFileComment regex /* */ old spec - @", () => {
        [["/*@ ", "*/"],
        ["  /*@ ", "  */ "], // with leading spaces
        ["\t/*@ ", " \t*/\t "], // with a leading tab
        ["leading string/*@ ", "*/"], // with a leading string
        ["/*@ ", " \t*/\t "] // with trailing whitespace
        ].forEach((x) => {
            assert.ok(mapFileCommentWrap(x[0], x[1]), `matches ${x.join(" :: ")}`);
        });

        [["/*@ ", " */ */ "], // not the last thing on its line 
        ["/*@ ", " */ more text "] // not the last thing on its line 
        ].forEach((x) => {
            assert.ok(!mapFileCommentWrap(x[0], x[1]), `does not match ${x.join(" :: ")}`);
        });
    });

    it("mapFileComment regex /* */ new spec - #", () => {
        [["/*# ", "*/"],
        ["  /*# ", "  */ "], // with leading spaces
        ["\t/*# ", " \t*/\t "], // with a leading tab
        ["leading string/*# ", "*/"], // with a leading string
        ["/*# ", " \t*/\t "] // with trailing whitespace
        ].forEach((x) => {
            assert.ok(mapFileCommentWrap(x[0], x[1]), `matches ${x.join(" :: ")}`);
        });

        [["/*# ", " */ */ "], // not the last thing on its line 
        ["/*# ", " */ more text "] // not the last thing on its line 
        ].forEach((x) => {
            assert.ok(!mapFileCommentWrap(x[0], x[1]), `does not match ${x.join(" :: ")}`);
        });
    });
});
