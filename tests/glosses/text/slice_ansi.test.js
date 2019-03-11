const {
    cli: { chalk, esc },
    text: { sliceAnsi }
} = adone;

describe("sliceNasi", () => {
    const SURROGATE_PAIR_CHARACTER = "\uD867\uDE3D"; // === "\u{29E3D}"

    describe("ordinary string only", () => {
        const stringToArrayConsideringSurrogatePair = (str) => {
            return str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
        };

        /**
         * fn('abc') -> [0, 1, 2]
         */
        const generateBeginIndexes = (str) => {
            return stringToArrayConsideringSurrogatePair(str).map((_, i) => i).concat([str.length, str.length + 1]);
        };

        const generateEndIndexes = (str) => {
            return generateBeginIndexes(str).concat([undefined]);
        };

        describe("working like `string.slice`", () => {
            const strings = [
                "abcde",
                "あいうえお",
                "aあbいc",
                "あaいbう"
            ];

            strings.forEach((str) => {
                generateBeginIndexes(str).forEach((begin) => {
                    generateEndIndexes(str).forEach((end) => {
                        const nativeSlice = str.slice(begin, end);
                        const title = `sliceAnsi("${str}", ${begin}, ${end}) === ` +
                            ` "${str}".slice(${begin}, ${end}) === ` +
                            `"${nativeSlice}"`;

                        it(title, () => {
                            assert.strictEqual(sliceAnsi(str, begin, end), nativeSlice);
                        });
                    });
                });
            });
        });

        describe("consideration of surrogate pair", () => {
            it("works", () => {
                const str = SURROGATE_PAIR_CHARACTER.repeat(3);
                assert.strictEqual(sliceAnsi(str, 0, 1), SURROGATE_PAIR_CHARACTER);
                assert.strictEqual(sliceAnsi(str, 0, 2), SURROGATE_PAIR_CHARACTER.repeat(2));
                assert.strictEqual(sliceAnsi(str, 0, 3), SURROGATE_PAIR_CHARACTER.repeat(3));
                assert.strictEqual(sliceAnsi(str, 0, 4), SURROGATE_PAIR_CHARACTER.repeat(3));
                assert.strictEqual(sliceAnsi(str, 1, 3), SURROGATE_PAIR_CHARACTER.repeat(2));
                assert.strictEqual(sliceAnsi(str, 1, 4), SURROGATE_PAIR_CHARACTER.repeat(2));
                assert.strictEqual(sliceAnsi(str, 2, 4), SURROGATE_PAIR_CHARACTER);
                assert.strictEqual(sliceAnsi(str, 3, 4), "");
                assert.strictEqual(sliceAnsi(str, 4, 4), "");
            });
        });
    });

    describe("16 colors included", () => {
        describe('single color string, such as `red("abc")`', () => {
            [
                "foreground",
                "background"
            ].forEach((describeTitle) => {
                describe(describeTitle, () => {
                    let wrapToRed;
                    if (describeTitle === "foreground") {
                        wrapToRed = (str) => chalk.red(str);
                    } else if (describeTitle === "background") {
                        wrapToRed = (str) => chalk.bgRed(str);
                    }

                    const str = wrapToRed("abc");

                    it('(str, 0, 0) === ""', () => {
                        assert.strictEqual(sliceAnsi(str, 0, 0), "");
                    });

                    it('(str, 0, 1) === red("a")', () => {
                        assert.strictEqual(sliceAnsi(str, 0, 1), wrapToRed("a"));
                    });

                    it('(str, 0, 2) === red("ab")', () => {
                        assert.strictEqual(sliceAnsi(str, 0, 2), wrapToRed("ab"));
                    });

                    it('(str, 0, 3) === red("abc")', () => {
                        assert.strictEqual(sliceAnsi(str, 0, 3), wrapToRed("abc"));
                    });

                    it('(str, 0, 4) === red("abc")', () => {
                        assert.strictEqual(sliceAnsi(str, 0, 3), wrapToRed("abc"));
                    });

                    it('(str, 0) === red("abc")', () => {
                        assert.strictEqual(sliceAnsi(str, 0), wrapToRed("abc"));
                    });

                    it('(str, 2, 2) === ""', () => {
                        assert.strictEqual(sliceAnsi(str, 2, 2), "");
                    });

                    it('(str, 2, 3) === red("c")', () => {
                        assert.strictEqual(sliceAnsi(str, 2, 3), wrapToRed("c"));
                    });

                    it('(str, 2, 4) === red("c")', () => {
                        assert.strictEqual(sliceAnsi(str, 2, 4), wrapToRed("c"));
                    });
                });
            });
        });

        describe('different colors are adjacent, such as `red("ab") + green("cd")`', () => {
            const str = chalk.red("ab") + chalk.green("cd");

            it('(str, 1, 1) === ""', () => {
                assert.strictEqual(sliceAnsi(str, 1, 1), "");
            });

            it('(str, 1, 2) === red("b")', () => {
                assert.strictEqual(sliceAnsi(str, 1, 2), chalk.red("b"));
            });

            it('(str, 1, 3) === red("b") + green("c")', () => {
                assert.strictEqual(sliceAnsi(str, 1, 3), chalk.red("b") + chalk.green("c"));
            });

            it('(str, 1, 4) === red("b") + green("cd")', () => {
                assert.strictEqual(sliceAnsi(str, 1, 4), chalk.red("b") + chalk.green("cd"));
            });

            it('(str, 1, 5) === red("b") + green("cd")', () => {
                assert.strictEqual(sliceAnsi(str, 1, 4), chalk.red("b") + chalk.green("cd"));
            });

            it('(str, 1) === red("b") + green("cd")', () => {
                assert.strictEqual(sliceAnsi(str, 1, 4), chalk.red("b") + chalk.green("cd"));
            });
        });

        describe('ordinary string and colored string are adjacent, such as `"a" + red("b") + "c" + green("d")`', () => {
            const str = `a${chalk.red("b")}c${chalk.green("d")}`;

            it('(str, 0, 0) === ""', () => {
                assert.strictEqual(sliceAnsi(str, 0, 0), "");
            });

            it('(str, 0, 1) === "a"', () => {
                assert.strictEqual(sliceAnsi(str, 0, 1), "a");
            });

            it('(str, 0, 2) === "a" + red("b")', () => {
                assert.strictEqual(sliceAnsi(str, 0, 2), `a${chalk.red("b")}`);
            });

            it('(str, 0, 3) === "a" + red("b") + "c"', () => {
                assert.strictEqual(sliceAnsi(str, 0, 3), `a${chalk.red("b")}c`);
            });

            it('(str, 0, 4) === "a" + red("b") + "c" + green("d")', () => {
                assert.strictEqual(sliceAnsi(str, 0, 4), `a${chalk.red("b")}c${chalk.green("d")}`);
            });

            it('(str, 0, 5) === "a" + red("b") + "c" + green("d")', () => {
                assert.strictEqual(sliceAnsi(str, 0, 4), `a${chalk.red("b")}c${chalk.green("d")}`);
            });

            it('(str, 0) === "a" + red("b") + "c" + green("d")', () => {
                assert.strictEqual(sliceAnsi(str, 0, 4), `a${chalk.red("b")}c${chalk.green("d")}`);
            });

            it('(str, 1, 1) === ""', () => {
                assert.strictEqual(sliceAnsi(str, 1, 1), "");
            });

            it('(str, 1, 2) === red("b")', () => {
                assert.strictEqual(sliceAnsi(str, 1, 2), chalk.red("b"));
            });

            it('(str, 1, 3) === red("b") + "c"', () => {
                assert.strictEqual(sliceAnsi(str, 1, 3), `${chalk.red("b")}c`);
            });
        });
    });

    describe('256 colors included, such as `"a" + 256("bc") + red("d")`', () => {
        [
            "foreground",
            "background"
        ].forEach((describeTitle) => {
            describe(describeTitle, () => {
                let wrapTo256;
                if (describeTitle === "foreground") {
                    wrapTo256 = (str) => `\u001b[38;5;001m${str}\u001b[39m`;
                } else if (describeTitle === "background") {
                    wrapTo256 = (str) => `\u001b[48;5;001m${str}\u001b[49m`;
                }

                const str = `a${wrapTo256("bc")}${chalk.red("d")}`;

                it('(str, 0, 0) === ""', () => {
                    assert.strictEqual(sliceAnsi(str, 0, 0), "");
                });

                it('(str, 0, 1) === "a"', () => {
                    assert.strictEqual(sliceAnsi(str, 0, 1), "a");
                });

                it('(str, 0, 2) === "a" + 256("b")', () => {
                    assert.strictEqual(sliceAnsi(str, 0, 2), `a${wrapTo256("b")}`);
                });

                it('(str, 0, 3) === "a" + 256("bc")', () => {
                    assert.strictEqual(sliceAnsi(str, 0, 3), `a${wrapTo256("bc")}`);
                });

                it('(str, 0, 4) === "a" + 256("bc") + "d"', () => {
                    assert.strictEqual(sliceAnsi(str, 0, 4), `a${wrapTo256("bc")}${chalk.red("d")}`);
                });

                it('(str, 0, 5) === "a" + 256("bc") + "d"', () => {
                    assert.strictEqual(sliceAnsi(str, 0, 5), `a${wrapTo256("bc")}${chalk.red("d")}`);
                });

                it('(str, 0) === "a" + 256("bc") + "d"', () => {
                    assert.strictEqual(sliceAnsi(str, 0, 4), `a${wrapTo256("bc")}${chalk.red("d")}`);
                });

                it('(str, 2, 2) === ""', () => {
                    assert.strictEqual(sliceAnsi(str, 2, 2), "");
                });

                it('(str, 2, 3) === 256("c")', () => {
                    assert.strictEqual(sliceAnsi(str, 2, 3), wrapTo256("c"));
                });

                it('(str, 2, 4) === 256("c") + red("d")', () => {
                    assert.strictEqual(sliceAnsi(str, 2, 4), wrapTo256("c") + chalk.red("d"));
                });

                it('(str, 2, 5) === 256("c") + red("d")', () => {
                    assert.strictEqual(sliceAnsi(str, 2, 5), wrapTo256("c") + chalk.red("d"));
                });

                it('(str, 3, 3) === ""', () => {
                    assert.strictEqual(sliceAnsi(str, 3, 3), "");
                });

                it('(str, 3, 4) === red("d")', () => {
                    assert.strictEqual(sliceAnsi(str, 3, 4), chalk.red("d"));
                });
            });
        });
    });

    describe("other SGR effects included", () => {
        [
            "bold",
            "dim",
            "italic",
            "underline",
            "inverse",
            "hidden",
            "strikethrough"
        ].forEach((chalkMethodName) => {
            describe(`${chalkMethodName}, such as \`"a" + ${chalkMethodName}("bc") + "d"\``, () => {
                const str = `a${chalk[chalkMethodName]("bc")}d`;

                it('(str, 0, 0) === ""', () => {
                    assert.strictEqual(sliceAnsi(str, 0, 0), "");
                });

                it('(str, 0, 1) === "a"', () => {
                    assert.strictEqual(sliceAnsi(str, 0, 1), "a");
                });

                it(`(str, 0, 2) === "a" + ${chalkMethodName}("b")`, () => {
                    assert.strictEqual(sliceAnsi(str, 0, 2), `a${chalk[chalkMethodName]("b")}`);
                });

                it(`(str, 0, 3) === "a" + ${chalkMethodName}("bc")`, () => {
                    assert.strictEqual(sliceAnsi(str, 0, 3), `a${chalk[chalkMethodName]("bc")}`);
                });

                it(`(str, 0, 4) === "a" + ${chalkMethodName}("bc") + "d"`, () => {
                    assert.strictEqual(sliceAnsi(str, 0, 4), `a${chalk[chalkMethodName]("bc")}d`);
                });

                it(`(str, 0, 5) === "a" + ${chalkMethodName}("bc") + "d"`, () => {
                    assert.strictEqual(sliceAnsi(str, 0, 4), `a${chalk[chalkMethodName]("bc")}d`);
                });

                it(`(str, 0) === "a" + ${chalkMethodName}("bc") + "d"`, () => {
                    assert.strictEqual(sliceAnsi(str, 0, 4), `a${chalk[chalkMethodName]("bc")}d`);
                });

                it('(str, 2, 2) === ""', () => {
                    assert.strictEqual(sliceAnsi(str, 2, 2), "");
                });

                it(`(str, 2, 3) === ${chalkMethodName}("c")`, () => {
                    assert.strictEqual(sliceAnsi(str, 2, 3), chalk[chalkMethodName]("c"));
                });

                it(`(str, 2, 4) === ${chalkMethodName}("c") + "d"`, () => {
                    assert.strictEqual(sliceAnsi(str, 2, 4), `${chalk[chalkMethodName]("c")}d`);
                });

                it('(str, 3, 3) === ""', () => {
                    assert.strictEqual(sliceAnsi(str, 3, 3), "");
                });

                it('(str, 3, 4) === "d"', () => {
                    assert.strictEqual(sliceAnsi(str, 3, 4), "d");
                });
            });
        });

        describe('reset, such as `"<red><underline>ab<reset>cd"`', () => {
            const { red, underline } = esc;
            const resetAnsi = "\u001b[0m";
            const str = `${red.open}${underline.open}ab${resetAnsi}cd`;

            it('(str, 0, 2) === "<red><underline>ab</underline></red>"', () => {
                assert.strictEqual(sliceAnsi(str, 0, 2), chalk.red.underline("ab"));
            });

            it('(str, 0, 3) === "<red><underline>ab<reset>c"', () => {
                assert.strictEqual(sliceAnsi(str, 0, 3), `${red.open}${underline.open}ab${resetAnsi}c`);
            });
        });
    });

    //
    // CAUTION:
    //   "chalk" makes a strange working when it gains multiple SGR effects.
    //
    //   For example, `chalk.dim.bold('X')` returns '\u001b[2m\u001b[1mX\u001b[2m\u001b[22m'.
    //   At least the back "\u001b[2m" appears unnecessary for me.
    //
    //   Therefore, if the multiple SGR effects exist, does not use "chalk" for testing.
    //   And does not comply with "chalk"'s specifications.
    //
    describe("multiple SGR effects are applied", () => {
        describe('2 effects, such as "<red>a<underline>bc</underline>d</red>"', () => {
            const { red, underline } = esc;
            const str = `${red.open}a${underline.open}bc${underline.close}d${red.close}`;

            it('(str, 0, 0) === ""', () => {
                assert.strictEqual(sliceAnsi(str, 0, 0), "");
            });

            it('(str, 0, 1) === "<red>a</red>"', () => {
                assert.strictEqual(sliceAnsi(str, 0, 1), `${red.open}a${red.close}`);
            });

            it('(str, 0, 2) === "<red>a<underline>b</underline></red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 0, 2),
                    `${red.open}a${underline.open}b${underline.close}${red.close}`
                );
            });

            it('(str, 0, 3) === "<red>a<underline>bc</underline></red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 0, 3),
                    `${red.open}a${underline.open}bc${underline.close}${red.close}`
                );
            });

            it('(str, 0, 4) === "<red>a<underline>bc</underline>d</red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 0, 4),
                    `${red.open}a${underline.open}bc${underline.close}d${red.close}`
                );
            });

            it('(str, 0, 5) === "<red>a<underline>bc</underline>d</red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 0, 4),
                    `${red.open}a${underline.open}bc${underline.close}d${red.close}`
                );
            });

            it('(str, 0) === "<red>a<underline>bc</underline>d</red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 0, 4),
                    `${red.open}a${underline.open}bc${underline.close}d${red.close}`
                );
            });

            it('(str, 1, 1) === ""', () => {
                assert.strictEqual(sliceAnsi(str, 1, 1), "");
            });

            it('(str, 1, 2) === "<red><underline>b</underline></red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 1, 2),
                    `${red.open}${underline.open}b${underline.close}${red.close}`
                );
            });

            it('(str, 1, 3) === "<red><underline>bc</underline></red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 1, 3),
                    `${red.open}${underline.open}bc${underline.close}${red.close}`
                );
            });

            it('(str, 1, 4) === "<red><underline>bc</underline>d</red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 1, 4),
                    `${red.open}${underline.open}bc${underline.close}d${red.close}`
                );
            });

            it('(str, 2, 2) === ""', () => {
                assert.strictEqual(sliceAnsi(str, 2, 2), "");
            });

            it('(str, 2, 3) === "<red><underline>c</underline></red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 2, 3),
                    `${red.open}${underline.open}c${underline.close}${red.close}`
                );
            });

            it('(str, 2, 4) === "<red><underline>c</underline>d</red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 2, 4),
                    `${red.open}${underline.open}c${underline.close}d${red.close}`
                );
            });

            it('(str, 3, 3) === ""', () => {
                assert.strictEqual(sliceAnsi(str, 3, 3), "");
            });

            it('(str, 3, 4) === "<red>d</red>"', () => {
                assert.strictEqual(
                    sliceAnsi(str, 3, 4),
                    `${red.open}d${red.close}`
                );
            });
        });

        describe('2 effects, such as "<dim><bold>ab</bold></dim>"', () => {
            const { dim, bold } = esc;
            const str = `${dim.open}${bold.open}ab${bold.close}${dim.close}`;

            it('(str, 0, 0) === ""', () => {
                assert.strictEqual(sliceAnsi(str, 0, 0), "");
            });

            it("(str, 0, 1) === <dim><bold>a</bold></dim>", () => {
                assert.strictEqual(
                    sliceAnsi(str, 0, 1),
                    `${dim.open}${bold.open}a${bold.close}${dim.close}`
                );
            });

            it("(str, 1, 2) === <dim><bold>b</bold></dim>", () => {
                assert.strictEqual(
                    sliceAnsi(str, 1, 2),
                    `${dim.open}${bold.open}b${bold.close}${dim.close}`
                );
            });

            it('(str, 2, 3) === ""', () => {
                assert.strictEqual(sliceAnsi(str, 2, 3), "");
            });
        });
    });
});
