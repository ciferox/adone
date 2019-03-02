describe("is", "safeRegexp", () => {
    const {
        is: {
            safeRegexp
        }
    } = adone;

    const good = [
        /\bOakland\b/,
        /\b(Oakland|San Francisco)\b/i,
        /^\d+1337\d+$/i,
        /^\d+(1337|404)\d+$/i,
        /^\d+(1337|404)*\d+$/i,
        RegExp(Array(26).join("a?") + Array(26).join("a"))
    ];

    specify("safe regex", () => {
        good.forEach((re) => {
            assert.isTrue(safeRegexp(re));
        });
    });


    const bad = [
        /^(a?){25}(a){25}$/,
        RegExp(Array(27).join("a?") + Array(27).join("a")),
        /(x+x+)+y/,
        /foo|(x+x+)+y/,
        /(a+){10}y/,
        /(a+){2}y/,
        /(.*){1,32000}[bc]/
    ];

    specify("unsafe regex", () => {
        bad.forEach((re) => {
            assert.isFalse(safeRegexp(re));
        });
    });

    const invalid = [
        "*Oakland*",
        "hey(yoo))",
        "abcde(?>hellow)",
        "[abc"
    ];

    specify("invalid regex", () => {
        invalid.forEach((re) => {
            assert.isFalse(safeRegexp(re));
        });
    });
});
