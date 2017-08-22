describe("data", "yaml", "unit", () => {
    const { fs, data: { yaml }, util, x } = adone;
    const fixtures = new fs.Directory(__dirname, "fixtures");

    describe("alias nodes", () => {
        class TestClass {
            constructor(data) {
                for (const [k, v] of util.entries(data)) {
                    this[k] = v;
                }
            }
        }

        const TestClassYaml = new yaml.type.Type("!test", {
            kind: "mapping",
            construct(data) {
                return new TestClass(data);
            }
        });

        const TEST_SCHEMA = yaml.schema.create([TestClassYaml]);

        describe("Resolving of an alias node should result the resolved and contructed value of the anchored node", () => {
            specify("Simple built-in primitives", () => {
                assert.strictEqual(yaml.load('[&1 "foobar", *1]')[1], "foobar");
                assert.strictEqual(yaml.load("[&1 ~, *1]")[1], null);
                assert.strictEqual(yaml.load("[&1 true, *1]")[1], true);
                assert.strictEqual(yaml.load("[&1 42, *1]")[1], 42);
            });

            specify("Simple built-in objects", () => {
                assert.deepEqual(yaml.load("[&1 [a, b, c, d], *1]")[1], ["a", "b", "c", "d"]);
                assert.deepEqual(yaml.load("[&1 {a: b, c: d}, *1]")[1], { a: "b", c: "d" });
            });

            specify("Recursive built-in objects", () => {
                const actual = yaml.load("[&1 {self: *1}, *1]")[1];

                assert(actual === actual.self);
            });

            specify("JavaScript-specific objects (JS-YAML's own extension)", () => {
                const actual = yaml.load('[&1 !!js/function "function sum(a, b) { return a + b }", *1]')[1];

                assert.strictEqual(Object.prototype.toString.call(actual), "[object Function]");
                assert.strictEqual(actual(10, 5), 15);
            });

            specify("Simple custom objects", () => {
                const expected = new TestClass({ a: "b", c: "d" });
                const actual = yaml.load("[&1 !test {a: b, c: d}, *1]", { schema: TEST_SCHEMA })[1];

                assert(actual instanceof TestClass);
                assert.deepEqual(actual, expected);
            });

            // TODO: Not implemented yet (see issue #141)
            specify.skip("Recursive custom objects", () => {
                const actual = yaml.load("[&1 !test {self: *1}, *1]", { schema: TEST_SCHEMA })[1];

                assert(actual instanceof TestClass);
                assert(actual.self instanceof TestClass);
                assert(actual === actual.self);
            });
        });
    });

    specify("BOM strip", () => {
        assert.deepEqual(yaml.safeLoad("\uFEFFfoo: bar\n"), { foo: "bar" });
        assert.deepEqual(yaml.safeLoad("foo: bar\n"), { foo: "bar" });
    });

    describe("character set", () => {
        specify("Allow astral characters", () => {
            assert.deepEqual(yaml.load("𝑘𝑒𝑦: 𝑣𝑎𝑙𝑢𝑒"), { "𝑘𝑒𝑦": "𝑣𝑎𝑙𝑢𝑒" });
        });

        specify("Forbid non-printable characters", () => {
            assert.throws(() => {
                yaml.load("\x01");
            }, yaml.Exception);
            assert.throws(() => {
                yaml.load("\x7f");
            }, yaml.Exception);
            assert.throws(() => {
                yaml.load("\x9f");
            }, yaml.Exception);
        });

        specify("Forbid lone surrogates", () => {
            assert.throws(() => {
                yaml.load("\udc00\ud800");
            }, yaml.Exception);
        });

        specify("Allow non-printable characters inside quoted scalars", () => {
            assert.strictEqual(yaml.load('"\x7f\x9f\udc00\ud800"'), "\x7f\x9f\udc00\ud800");
        });

        specify("Forbid control sequences inside quoted scalars", () => {
            assert.throws(() => {
                yaml.load('"\x03"');
            }, yaml.Exception);
        });
    });

    describe("scalare style dump", () => {
        const indent = (string) => string.replace(/^.+/gm, "  " + "$&");

        context("Plain style", () => {
            specify("is preferred", () => {
                ["plain",
                    "hello world",
                    "pizza 3.14159",
                    // cannot be misinterpreted as a number
                    "127.0.0.1",
                    // quotes are allowed after the first character
                    'quoted"scalar',
                    'here\'s to "quotes"',
                    // additional allowed characters
                    "100% safe non-first characters? Of course!",
                    "Jack & Jill <well@example.com>"
                ].forEach((string) => {
                    assert.strictEqual(yaml.safeDump(string), `${string}\n`);
                });
            });

            specify("disallows flow indicators inside flow collections", () => {
                assert.strictEqual(yaml.safeDump({ quote: "mispell [sic]" }, { flowLevel: 0 }),
                    "{quote: 'mispell [sic]'}\n");
                assert.strictEqual(yaml.safeDump({ key: "no commas, either" }, { flowLevel: 0 }),
                    "{key: 'no commas, either'}\n");
            });
        });

        context("Single- and double-quoted styles", () => {
            specify("quote strings of ambiguous type", () => {
                assert.strictEqual(yaml.safeDump("Yes"), "'Yes'\n");
                assert.strictEqual(yaml.safeDump("true"), "'true'\n");
                assert.strictEqual(yaml.safeDump("42"), "'42'\n");
                assert.strictEqual(yaml.safeDump("99.9"), "'99.9'\n");
                assert.strictEqual(yaml.safeDump("127.0001"), "'127.0001'\n");
                assert.strictEqual(yaml.safeDump("1.23015e+3"), "'1.23015e+3'\n");
            });

            specify("quote leading/trailing whitespace", () => {
                assert.strictEqual(yaml.safeDump(" leading space"), "' leading space'\n");
                assert.strictEqual(yaml.safeDump("trailing space "), "'trailing space '\n");
            });

            specify("quote leading quotes", () => {
                assert.strictEqual(yaml.safeDump("'singles double'"), "'''singles double'''\n");
                assert.strictEqual(yaml.safeDump('"single double'), '\'"single double\'\n');
            });

            specify('escape \\ and " in double-quoted', () => {
                assert.strictEqual(yaml.safeDump('\u0007 escape\\ escaper"'), '"\\a escape\\\\ escaper\\""\n');
            });

            specify("escape non-printables", () => {
                assert.strictEqual(yaml.safeDump("a\nb\u0001c"), '"a\\nb\\x01c"\n');
            });
        });

        context("Literal style", () => {
            const content = "a\nb \n\n c\n  d";
            const indented = indent(content);

            specify("preserves trailing newlines using chomping", () => {
                assert.strictEqual(yaml.safeDump({ a: "\n", b: "\n\n", c: "c\n", d: "d\nd" }),
                    "a: |+\n\nb: |+\n\n\nc: |\n  c\nd: |-\n  d\n  d\n");
                assert.strictEqual(yaml.safeDump("\n"), "|+\n" + "\n");
                assert.strictEqual(yaml.safeDump("\n\n"), "|+\n" + "\n\n");

                assert.strictEqual(yaml.safeDump(content), `|-\n${indented}\n`);
                assert.strictEqual(yaml.safeDump(`${content}\n`), `|\n${indented}\n`);
                assert.strictEqual(yaml.safeDump(`${content}\n\n`), `|+\n${indented}\n\n`);
                assert.strictEqual(yaml.safeDump(`${content}\n\n\n`), `|+\n${indented}\n\n\n`);
            });

            specify("accepts leading whitespace", () => {
                assert.strictEqual(yaml.safeDump(`   ${content}`), `|2-\n   ${indented}\n`);
            });

            specify("falls back to quoting when required indent indicator is too large", () => {
                assert.strictEqual(yaml.safeDump(" these go\nup to\neleven", { indent: 11 }),
                    '" these go\\nup to\\neleven"\n');
            });

            specify("does not use block style for multiline key", () => {
                assert.strictEqual(yaml.safeDump({
                    "push\nand": {
                        you: "pull"
                    }
                }), '"push\\nand":\n  you: pull\n');
            });
        });

        context("Folded style", () => {
            {
                let content = "";
                let i = 1000;
                for (let para = 1; para <= 7; para++) {
                    content += "\n";
                    // indent paragraphs 3 and 4
                    if (para === 3 || para === 4) {
                        content += " ".repeat(para);
                    }
                    // vary the number of words on the last line
                    for (let count = 2 * (30 / 5) + para - 1; count > 0; count--) {
                        content += `${i} `;
                        if (i % 17 === 0) {
                            content += " ";
                        }
                        i++;
                    }
                }
                const wrapped = "\n" +
                    "1000 1001 1002 1003  1004 1005\n" +
                    "1006 1007 1008 1009 1010 1011 \n" +
                    "\n" +
                    "1012 1013 1014 1015 1016 1017\n" +
                    "1018 1019 1020  1021 1022 1023\n" +
                    "1024 \n" +
                    "   1025 1026 1027 1028 1029 1030 1031 1032 1033 1034 1035 1036 1037  1038 \n" +
                    "    1039 1040 1041 1042 1043 1044 1045 1046 1047 1048 1049 1050 1051 1052 1053 \n" +
                    "1054  1055 1056 1057 1058 1059\n" +
                    "1060 1061 1062 1063 1064 1065\n" +
                    "1066 1067 1068 1069 \n" +
                    "\n" +
                    "1070 1071  1072 1073 1074 1075\n" +
                    "1076 1077 1078 1079 1080 1081\n" +
                    "1082 1083 1084 1085 1086 \n" +
                    "\n" +
                    "1087 1088  1089 1090 1091 1092\n" +
                    "1093 1094 1095 1096 1097 1098\n" +
                    "1099 1100 1101 1102 1103 1104 ";
                const indented = indent(wrapped);

                const dumpNarrow = (s) => yaml.safeDump(s, { lineWidth: 30 + 2 });

                specify("wraps lines and ignores more-indented lines ", () => {
                    assert.strictEqual(dumpNarrow(content), `>-\n${indented}\n`);
                });

                specify("preserves trailing newlines using chomping", () => {
                    assert.strictEqual(dumpNarrow(`${content}\n`), `>\n${indented}\n`);
                    assert.strictEqual(dumpNarrow(`${content}\n\n`), `>+\n${indented}\n\n`);
                    assert.strictEqual(dumpNarrow(`${content}\n\n\n`), `>+\n${indented}\n\n\n`);
                });
            }
            // Dump and check that dump-then-load preserves content (is the identity function).
            const dump = (input, opts) => {
                const output = yaml.safeDump(input, opts);
                assert.strictEqual(yaml.safeLoad(output), input, "Dump then load should preserve content");
                return output;
            };

            specify("should not cut off a long word at the start of a line", () => {
                assert.strictEqual(
                    dump(`123\n${"1234567890".repeat(9)} hello\ngoodbye`),
                    `>-\n${indent(`123\n\n${"1234567890".repeat(9)}\nhello\n\ngoodbye\n`)}`
                );
            });

            specify("preserves consecutive spaces", () => {
                const alphabet = `a bc  def  ghi${" ".repeat(70)}jk  lmn o\n`
                    + ` p  qrstu     v${" ".repeat(80)}\nw x\n` + "yz  ";
                assert.strictEqual(
                    dump(alphabet),
                    `>-\n${indent(`a bc  def \nghi${" ".repeat(70)}jk \nlmn o\n p  qrstu     v${" ".repeat(80)}\nw x\n\nyz  \n`)}`
                );

                const indeed = `${"word. ".repeat(31)}\n${[2, 3, 5, 7, 11, 13, 17].map((n) => " ".repeat(n)).join("\n")}`;
                assert.strictEqual(
                    dump(indeed),
                    `>-\n${indent(`${[
                        ["word. word. word. word. word. word. word. word. word. word. word. word. word."],
                        ["word. word. word. word. word. word. word. word. word. word. word. word. word."],
                        ["word. word. word. word. word. "]
                    ].join("\n")}\n${[2, 3, 5, 7, 11, 13, 17].map((n) => " ".repeat(n)).join("\n")}\n`)}`
                );
            });

            const story = "Call me Ishmael. Some years ago—never mind how long precisely—"
                + "having little or no money in my purse, "
                + "and nothing particular to interest me on shore, "
                + "I thought I would sail about a little and see the watery part of the world...";
            const prefix = 'var short_story = "",';
            const line = `longer_story = "${story}";`;

            specify("should fold a long last line missing an ending newline", () => {
                const content = [prefix, line].join("\n");

                const lengths = dump(content).split("\n").map((s) => s.length);
                assert.deepEqual(lengths, [2, 23, 0, 69, 76, 80, 24, 0]);
            });

            specify("should not fold a more-indented last line", function functionName() {
                const content = [prefix, line, `    ${line}`].join("\n");

                const lengths = dump(content).split("\n").map((s) => s.length);
                assert.deepEqual(lengths, [2, 23, 0, 69, 76, 80, 24, 250, 0]);
            });

            specify("should not fold when lineWidth === -1", () => {
                const content = [prefix, line, line + line, line].join("\n");

                assert.strictEqual(dump(content, { lineWidth: -1 }), `|-\n${indent(content)}\n`);
            });

            specify("falls back to literal style when no lines are foldable", () => {
                const content = [prefix, `    ${line}`, `    ${line}`].join("\n");

                assert.strictEqual(dump(content), `|-\n${indent(content)}\n`);
            });
        });
    });

    describe("Resolving explicit tags on empty nodes", () => {
        specify("!!binary", () => {
            assert.throws(() => {
                yaml.load("!!binary");
            }, yaml.Exception);
        });

        specify("!!bool", () => {
            assert.throws(() => {
                yaml.load("!!bool");
            }, yaml.Exception);
        });

        specify("!!float", () => {
            assert.throws(() => {
                yaml.load("!!float");
            }, yaml.Exception);
        });

        specify("!!int", () => {
            assert.throws(() => {
                yaml.load("!!int");
            }, yaml.Exception);
        });

        specify("!!map", () => {
            assert.deepEqual(yaml.load("!!map"), {});
        });

        specify("!!merge", () => {
            assert.doesNotThrow(() => {
                yaml.load("? !!merge\n: []");
            });
        });

        specify("!!null", () => {
            // Fetch null from an array to reduce chance that null is returned because of another bug
            assert.strictEqual(yaml.load("- !!null")[0], null);
        });

        specify("!!omap", () => {
            assert.deepEqual(yaml.load("!!omap"), []);
        });

        specify("!!pairs", () => {
            assert.deepEqual(yaml.load("!!pairs"), []);
        });

        specify("!!seq", () => {
            assert.deepEqual(yaml.load("!!seq"), []);
        });

        specify("!!set", () => {
            assert.deepEqual(yaml.load("!!set"), {});
        });

        specify("!!str", () => {
            assert.strictEqual(yaml.load("!!str"), "");
        });

        specify("!!timestamp", () => {
            assert.throws(() => {
                yaml.load("!!timestamp");
            }, yaml.Exception);
        });

        specify("!!js/function", () => {
            assert.throws(() => {
                yaml.load("!!js/function");
            }, yaml.Exception);
        });

        specify("!!js/regexp", () => {
            assert.throws(() => {
                yaml.load("!!js/regexp");
            }, yaml.Exception);
        });

        specify("!!js/undefined", () => {
            // Fetch undefined from an array to reduce chance that undefined is returned because of another bug
            assert.strictEqual(yaml.load("- !!js/undefined")[0], undefined);
        });
    });

    specify("Mark", async () => {
        const file = fixtures.getVirtualFile("mark.txt");
        const content = await file.contents();

        for (const input of content.split("---\n").slice(1)) {
            assert(input.indexOf("*") >= 0);

            let index = 0;
            let line = 0;
            let column = 0;
            while (input[index] !== "*") {
                if (input[index] === "\n") {
                    line += 1;
                    column = 0;
                } else {
                    column += 1;
                }
                index += 1;
            }

            const mark = new yaml.Mark(file.path(), input, index, line, column);
            const snippet = mark.getSnippet(2, 79);

            assert(typeof snippet, "string");

            const temp = snippet.split("\n");
            assert.strictEqual(temp.length, 2);
            const [data, pointer] = temp;

            assert(data.length < 82);
            assert.strictEqual(data[pointer.length - 1], "*");
        }
    });

    describe("parse function security", () => {
        const badThings = [];
        before(() => {
            global.makeBadThing = function (thing) {
                badThings.push(thing);
            };
        });

        after(() => {
            delete global.makeBadThing;
        });

        specify("Function constructor must not allow to execute any code while parsing.", async () => {
            const file = fixtures.getVirtualFile("parse_function_security.yml");
            const content = await file.contents();

            assert.throws(() => {
                yaml.load(content);
            }, yaml.Exception);
            assert.deepEqual(badThings, []);
        });
    });

    context("single document error", () => {
        specify("Loading multidocument source using `load` should cause an error", () => {
            assert.throws(() => {
                yaml.load("--- # first document\n--- # second document\n");
            }, yaml.Exception);

            assert.throws(() => {
                yaml.load("---\nfoo: bar\n---\nfoo: bar\n");
            }, yaml.Exception);

            assert.throws(() => {
                yaml.load("foo: bar\n---\nfoo: bar\n");
            }, yaml.Exception);
        });
    });

    context("skip invalid", () => {
        const sample = {
            number: 42,
            undef: undefined,
            string: "hello",
            func(a, b) {
                return a + b;
            },
            regexp: /^hel+o/,
            array: [1, 2, 3]
        };


        const expected = {
            number: 42,
            string: "hello",
            array: [1, 2, 3]
        };

        specify("Dumper must throw an exception on invalid type when option `skipInvalid` is false.", () => {
            assert.throws(() => {
                yaml.safeDump(sample, { skipInvalid: false });
            }, x.IllegalState);
        });

        specify("Dumper must skip pairs and values with invalid types when option `skipInvalid` is true.", () => {
            assert.deepEqual(yaml.load(yaml.safeDump(sample, { skipInvalid: true })), expected);
        });
    });

    context("sort keys", () => {
        const sample = { b: 1, a: 2, c: 3 };
        const unsortedExpected = "b: 1\na: 2\nc: 3\n";
        const simpleExpected = "a: 2\nb: 1\nc: 3\n";
        const reverseExpected = "c: 3\nb: 1\na: 2\n";

        specify("Dumper should sort preserve key insertion order", () => {
            assert.deepEqual(yaml.safeDump(sample, { sortKeys: false }), unsortedExpected);
        });

        specify("Dumper should sort keys when sortKeys is true", () => {
            assert.deepEqual(yaml.safeDump(sample, { sortKeys: true }), simpleExpected);
        });

        specify("Dumper should sort keys by sortKeys function when specified", () => {
            assert.deepEqual(yaml.safeDump(sample, {
                sortKeys(a, b) {
                    return a < b ? 1 : a > b ? -1 : 0;
                }
            }), reverseExpected);
        });
    });

    context("tag multikind", () => {
        const tags = [{
            tag: "Include",
            type: "scalar"
        }, {
            tag: "Include",
            type: "mapping"
        }].map((fn) => {
            return new yaml.type.Type(`!${fn.tag}`, {
                kind: fn.type,
                resolve() {
                    return true;
                },
                construct(obj) {
                    return obj;
                }
            });
        });

        const schema = yaml.schema.create(tags);

        specify("Process tag with kind: scalar", () => {
            assert.deepEqual(yaml.safeLoad("!Include foobar", {
                schema
            }), "foobar");
        });

        specify("Process tag with kind: mapping", () => {
            assert.deepEqual(yaml.safeLoad("!Include\n  location: foobar", {
                schema
            }), { location: "foobar" });
        });
    });
});
