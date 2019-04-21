describe("util", "tokenizeRegexp", () => {
    const {
        util: {
            tokenizeRegexp
        }
    } = adone;

    const {
        types
    } = tokenizeRegexp;

    const {
        sets,
        util
    } = adone.getPrivate(tokenizeRegexp);

    describe("Regexp Tokenizer", () => {
        const char = (c) => {
            return { type: types.CHAR, value: c.charCodeAt(0) };
        };

        const charStr = (str) => {
            return str.split("").map(char);
        };

        describe("No special characters", () => {
            const t = tokenizeRegexp("walnuts");

            specify("List of char tokens", () => {
                assert.deepEqual(t, {
                    type: types.ROOT,
                    stack: charStr("walnuts")
                });
            });
        });

        describe("Positionals", () => {
            describe("^ and $ in", () => {
                describe("one liner", () => {
                    const t = tokenizeRegexp("^yes$");

                    specify("Positionals at beginning and end", () => {
                        assert.deepEqual(t, {
                            type: types.ROOT,
                            stack: [
                                { type: types.POSITION, value: "^" },
                                char("y"),
                                char("e"),
                                char("s"),
                                { type: types.POSITION, value: "$" }
                            ]
                        });
                    });
                });
            });

            describe("\\b and \\B", () => {
                const t = tokenizeRegexp("\\bbeginning\\B");

                specify("Word boundary at beginning", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [
                            { type: types.POSITION, value: "b" },
                            char("b"),
                            char("e"),
                            char("g"),
                            char("i"),
                            char("n"),
                            char("n"),
                            char("i"),
                            char("n"),
                            char("g"),
                            { type: types.POSITION, value: "B" }
                        ]
                    });
                });
            });
        });

        describe("Predefined sets", () => {
            const t = tokenizeRegexp("\\w\\W\\d\\D\\s\\S.");

            specify("Words set", () => {
                assert.array(t.stack);
                assert.deepEqual(t.stack[0], sets.words());
            });

            specify("Non-Words set", () => {
                assert.array(t.stack);
                assert.deepEqual(t.stack[1], sets.notWords());
            });

            specify("Integer set", () => {
                assert.array(t.stack);
                assert.deepEqual(t.stack[2], sets.ints());
            });

            specify("Non-Integer set", () => {
                assert.array(t.stack);
                assert.deepEqual(t.stack[3], sets.notInts());
            });

            specify("Whitespace set", () => {
                assert.array(t.stack);
                assert.deepEqual(t.stack[4], sets.whitespace());
            });

            specify("Non-Whitespace set", () => {
                assert.array(t.stack);
                assert.deepEqual(t.stack[5], sets.notWhitespace());
            });

            specify("Any character set", () => {
                assert.array(t.stack);
                assert.deepEqual(t.stack[6], sets.anyChar());
            });
        });

        describe("Custom sets", () => {
            const t = tokenizeRegexp("[$!a-z123] thing [^0-9]");

            specify("Class contains all characters and range", () => {
                assert.deepEqual(t, {
                    type: types.ROOT,
                    stack: [
                        { type: types.SET,
                            set: [
                                char("$"),
                                char("!"),
                                { type: types.RANGE,
                                    from: "a".charCodeAt(0),
                                    to: "z".charCodeAt(0)
                                },
                                char("1"),
                                char("2"),
                                char("3")
                            ],
                            not: false
                        },

                        char(" "),
                        char("t"),
                        char("h"),
                        char("i"),
                        char("n"),
                        char("g"),
                        char(" "),

                        { type: types.SET,
                            set: [{
                                type: types.RANGE,
                                from: "0".charCodeAt(0),
                                to: "9".charCodeAt(0)
                            }],
                            not: true
                        }
                    ]
                });
            });

            describe("Whitespace characters", () => {
                const t = tokenizeRegexp("[\t\r\n\u2028\u2029 ]");

                specify("Class contains some whitespace characters (not included in .)", () => {
                    const LINE_SEPARATOR = String.fromCharCode(8232); // \u2028
                    const PAGE_SEPARATOR = String.fromCharCode(8233); // \u2029

                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [
                            {
                                type: types.SET,
                                set: [
                                    char("\t"),
                                    char("\r"),
                                    char("\n"),
                                    char(LINE_SEPARATOR),
                                    char(PAGE_SEPARATOR),
                                    char(" ")
                                ],
                                not: false
                            }
                        ]
                    });
                });
            });
        });

        describe("Two sets in a row with dash in between", () => {
            const t = tokenizeRegexp("[01]-[ab]");

            specify("Contains both classes and no range", () => {
                assert.deepEqual(t, {
                    type: types.ROOT,
                    stack: [
                        { type: types.SET,
                            set: charStr("01"),
                            not: false
                        },
                        char("-"),
                        { type: types.SET,
                            set: charStr("ab"),
                            not: false
                        }
                    ]
                });
            });
        });

        describe("| (Pipe)", () => {
            const t = tokenizeRegexp("foo|bar|za");

            specify("Returns root object with options", () => {
                assert.deepEqual(t, {
                    type: types.ROOT,
                    options: [
                        charStr("foo"),
                        charStr("bar"),
                        charStr("za")
                    ]
                });
            });
        });

        describe("Group", () => {
            describe("with no special characters", () => {
                const t = tokenizeRegexp("hey (there)");

                specify("Token list contains group token", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [
                            char("h"),
                            char("e"),
                            char("y"),
                            char(" "),
                            { type: types.GROUP,
                                remember: true,
                                stack: charStr("there")
                            }
                        ]
                    });
                });
            });

            describe("that is not remembered", () => {
                const t = tokenizeRegexp("(?:loner)");

                specify("Remember is false on the group object", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [{
                            type: types.GROUP,
                            remember: false,
                            stack: charStr("loner")
                        }]
                    });
                });
            });

            describe("matched previous clause if not followed by this", () => {
                const t = tokenizeRegexp("what(?!ever)");

                specify("Returns a group", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [
                            char("w"),
                            char("h"),
                            char("a"),
                            char("t"),
                            { type: types.GROUP,
                                remember: false,
                                notFollowedBy: true,
                                stack: charStr("ever")
                            }
                        ]
                    });
                });
            });

            describe("matched next clause", () => {
                const t = tokenizeRegexp("hello(?= there)");

                specify("Returns a group", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [
                            char("h"),
                            char("e"),
                            char("l"),
                            char("l"),
                            char("o"),
                            { type: types.GROUP,
                                remember: false,
                                followedBy: true,
                                stack: charStr(" there")
                            }
                        ]
                    });
                });
            });

            describe("with subgroup", () => {
                const t = tokenizeRegexp("a(b(c|(?:d))fg) @_@");

                specify("Groups within groups", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [
                            char("a"),
                            { type: types.GROUP,
                                remember: true,
                                stack: [
                                    char("b"),
                                    { type: types.GROUP,
                                        remember: true,
                                        options: [
                                            [char("c")],
                                            [{ type: types.GROUP,
                                                remember: false,
                                                stack: charStr("d") }]
                                        ] },
                                    char("f"),
                                    char("g")
                                ] },

                            char(" "),
                            char("@"),
                            char("_"),
                            char("@")
                        ]
                    });
                });
            });
        });

        describe("Custom repetition with", () => {
            describe("exact amount", () => {
                const t = tokenizeRegexp("(?:pika){2}");

                specify("Min and max are the same", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [
                            { type: types.REPETITION, min: 2, max: 2,
                                value: {
                                    type: types.GROUP,
                                    remember: false,
                                    stack: charStr("pika")
                                }
                            }
                        ]
                    });
                });
            });

            describe("minimum amount only", () => {
                const t = tokenizeRegexp("NO{6,}");

                specify("To infinity", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [
                            char("N"),
                            { type: types.REPETITION, min: 6, max: Infinity,
                                value: char("O") }
                        ]
                    });
                });
            });

            describe("both minimum and maximum", () => {
                const t = tokenizeRegexp("pika\\.\\.\\. chu{3,20}!{1,2}");

                specify("Min and max differ and min < max", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: charStr("pika... ch").concat([
                            { type: types.REPETITION, min: 3, max: 20, value: char("u") },
                            { type: types.REPETITION, min: 1, max: 2, value: char("!") }
                        ])
                    });
                });

            });

            describe("Brackets around a non-repetitional", () => {
                const t = tokenizeRegexp("a{mustache}");

                specify("Returns a non-repetitional", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: charStr("a{mustache}")
                    });
                });
            });
        });

        describe("Predefined repetitional", () => {
            describe("? (Optional)", () => {
                const t = tokenizeRegexp("hey(?: you)?");

                specify("Get back correct min and max", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: charStr("hey").concat([
                            { type: types.REPETITION, min: 0, max: 1,
                                value: {
                                    type: types.GROUP, remember: false,
                                    stack: charStr(" you")
                                }
                            }
                        ])
                    });
                });
            });

            describe("+ (At least one)", () => {
                const t = tokenizeRegexp("(no )+");

                specify("Correct min and max", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [{
                            type: types.REPETITION, min: 1, max: Infinity,
                            value: {
                                type: types.GROUP, remember: true,
                                stack: charStr("no ")
                            }
                        }]
                    });
                });
            });

            describe("* (Any amount)", () => {
                const t = tokenizeRegexp("XF*D");

                specify("0 to Infinity", () => {
                    assert.deepEqual(t, {
                        type: types.ROOT,
                        stack: [
                            char("X"),
                            { type: types.REPETITION, min: 0, max: Infinity,
                                value: char("F") },
                            char("D")
                        ]
                    });
                });
            });
        });

        describe("Reference", () => {
            const t = tokenizeRegexp("<(\\w+)>\\w*<\\1>");

            specify("Reference a group", () => {
                assert.deepEqual(t, {
                    type: types.ROOT,
                    stack: [
                        char("<"),
                        { type: types.GROUP, remember: true,
                            stack: [{
                                type: types.REPETITION, min: 1, max: Infinity,
                                value: sets.words() }] },
                        char(">"),
                        { type: types.REPETITION, min: 0, max: Infinity,
                            value: sets.words() },
                        char("<"),
                        { type: types.REFERENCE, value: 1 },
                        char(">")
                    ]
                });
            });
        });
    });

    describe("errors", () => {
        const topicMacro = (regexp) => {
            try {
                tokenizeRegexp(regexp);
            } catch (err) {
                return err;
            }
        };

        const macro = (regexp, name, message) => {
            return () => {
                const err = topicMacro(regexp);
                assert.ok(err);
                assert.property(err, "message");
                assert.equal(err.message, `Invalid regular expression: /${regexp}/: ${message}`);
            };
        };

        describe("Bad repetition at beginning of", () => {
            describe("regexp", () => {
                specify("regexp", macro("?what", "Nothing to repeat", "Nothing to repeat at column 0"));

                specify("group", macro("foo(*\\w)", "Nothing to repeat", "Nothing to repeat at column 4"));

                specify("pipe", macro("foo|+bar", "Nothing to repeat", "Nothing to repeat at column 4"));

                specify("with custom repetitional", macro("ok({3}no)", "Nothing to repeat", "Nothing to repeat at column 3"));
            });
        });

        describe("Bad grouping", () => {
            specify("unmatched", macro("hey(yoo))", "Unmatched )", "Unmatched ) at column 8"));

            specify("unclosed", macro("(", "Unterminated group", "Unterminated group"));
        });

        specify("Wrong group type", macro("abcde(?>hellow)", "Invalid character", "Invalid group, character '>' after '?' at column 7"));

        specify("Bad custom character set", macro("[abc", "Unterminated character class", "Unterminated character class"));
    });

    describe("util", () => {
        describe("strToChars", () => {
            describe("Convert escaped chars in str to their unescaped versions", () => {
                specify("Returned string has converted characters", () => {
                    const str = util.strToChars("\\xFF hellow \\u00A3 \\50 there \\cB \\n \\w [\\b]");
                    assert.equal(str, "\xFF hellow \u00A3 \\( there  \n \\w \u0008");
                });
            });

            describe("Escaped chars in regex source remain espaced", () => {
                specify("Returned string has escaped characters", () => {
                    const str = util.strToChars(/\\xFF hellow \\u00A3 \\50 there \\cB \\n \\w/.source);
                    assert.equal(str, "\\\\xFF hellow \\\\u00A3 \\\\50 there \\\\cB \\\\n \\\\w");
                });
            });
        });

        describe("tokenizeClass", () => {

            describe("Class tokens", () => {
                const t = util.tokenizeClass("\\w\\d$\\s\\]\\B\\W\\D\\S.+-] will ignore");
                specify("Get a words set token", () => {
                    assert.array(t[0]);
                    assert.deepEqual(t[0][0], sets.words());
                });

                specify("Get an integers set token", () => {
                    assert.array(t[0]);
                    assert.deepEqual(t[0][1], sets.ints());
                });

                specify("Get some char tokens", () => {
                    assert.array(t[0]);
                    assert.deepEqual(t[0][2], { type: types.CHAR, value: 36 });
                    assert.deepEqual(t[0][4], { type: types.CHAR, value: 93 });
                    assert.deepEqual(t[0][5], { type: types.CHAR, value: 66 });
                });

                specify("Get a whitespace set token", () => {
                    assert.array(t[0]);
                    assert.deepEqual(t[0][3], sets.whitespace());
                });

                specify("Get negated sets", () => {
                    assert.array(t[0]);
                    assert.deepEqual(t[0][6], sets.notWords());
                    assert.deepEqual(t[0][7], sets.notInts());
                    assert.deepEqual(t[0][8], sets.notWhitespace());
                });

                specify("Get correct char tokens at end of set", () => {
                    assert.array(t[0]);
                    assert.deepEqual(t[0][9], { type: types.CHAR, value: 46 });
                    assert.deepEqual(t[0][10], { type: types.CHAR, value: 43 });
                    assert.deepEqual(t[0][11], { type: types.CHAR, value: 45 });
                });

                specify("Get correct position of closing brace", () => {
                    assert.isNumber(t[1]);
                    assert.equal(t[1], 21);
                });
            });

            describe("Ranges", () => {
                const t = util.tokenizeClass("a-z0-9]");

                specify("Get alphabetic range", () => {
                    assert.array(t[0]);
                    assert.deepEqual(t[0][0], {
                        type: types.RANGE,
                        from: 97,
                        to: 122
                    });
                });

                specify("Get numeric range", () => {
                    assert.array(t[0]);
                    assert.deepEqual(t[0][1], {
                        type: types.RANGE,
                        from: 48,
                        to: 57
                    });
                });

            });

            describe("Ranges with escaped characters", () => {
                const t = util.tokenizeClass("\\\\-~]");

                specify("Get escaped backslash range", () => {
                    assert.array(t[0]);
                    assert.deepEqual(t[0][0], {
                        type: types.RANGE,
                        from: 92,
                        to: 126
                    });
                });
            });
        });
    });
});
