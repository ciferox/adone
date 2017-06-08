describe("data", "yaml", "issues", () => {
    const { fs, data: { yaml } } = adone;
    const fixtures = new fs.Directory(__dirname, "fixtures", "issues");

    specify("Parse failed when no document start present - 8", async () => {
        const file = fixtures.getVirtualFile("0008.yml");
        const content = await file.content();
        expect(() => {
            yaml.safeLoad(content);
        }).not.to.throw();
    });

    specify('Non-specific "!" tags should resolve to !!str - 17', async () => {
        const file = fixtures.getVirtualFile("0017.yml");
        const data = yaml.safeLoad(await file.content());
        expect(data).to.be.a("string");
    });

    specify("Timestamp parsing is one month off - 19", async () => {
        const file = fixtures.getVirtualFile("0019.yml");
        const data = yaml.safeLoad(await file.content());
        expect(data.xmas.getTime()).to.be.equal(Date.UTC(2011, 11, 24));
    });

    it("should convert new line into white space - 26", async () => {
        const file = fixtures.getVirtualFile("0026.yml");
        const data = yaml.safeLoad(await file.content());
        expect(data.test).to.be.equal("a b c\n");
    });

    specify("refactor compact variant of MarkedYAMLError.toString - 33", async () => {
        const file = fixtures.getVirtualFile("0033.yml");
        const content = await file.content();
        expect(() => {
            yaml.safeLoad(content);
        }).to.throw();
    });

    specify("Timestamps are incorrectly parsed in local time - 46", async () => {
        const file = fixtures.getVirtualFile("0046.yml");
        const data = yaml.safeLoad(await file.content());
        const { date1, date2 } = data;

        // 2010-10-20T20:45:00Z
        expect(date1.getUTCFullYear()).to.be.equal(2010);
        expect(date1.getUTCMonth()).to.be.equal(9);
        expect(date1.getUTCDate()).to.be.equal(20);
        expect(date1.getUTCHours()).to.be.equal(20);
        expect(date1.getUTCMinutes()).to.be.equal(45);
        expect(date1.getUTCSeconds()).to.be.equal(0);

        // 2010-10-20T20:45:00+0100
        expect(date2.getUTCFullYear()).to.be.equal(2010);
        expect(date2.getUTCMonth()).to.be.equal(9);
        expect(date2.getUTCDate()).to.be.equal(20);
        expect(date2.getUTCHours()).to.be.equal(19);
        expect(date2.getUTCMinutes()).to.be.equal(45);
        expect(date2.getUTCSeconds()).to.be.equal(0);
    });

    specify("Incorrect utf-8 handling on require('file.yaml') - 54", async () => {
        const file = fixtures.getVirtualFile("0054.yml");
        const data = yaml.safeLoad(await file.content());
        const expected = "у".repeat(101);  // russian 'у'
        expect(data).to.have.lengthOf(41);
        for (const line of data) {
            expect(line).to.be.equal(expected);
        }
    });

    specify("Invalid errors/warnings of invalid indentation on flow scalars - 63", async () => {
        const sources = [
            "text:\n    hello\n  world",   // plain style
            "text:\n    'hello\n  world'", // single-quoted style
            'text:\n    "hello\n  world"'  // double-quoted style
        ];
        const expected = { text: "hello world" };

        expect(() => {
            yaml.load(sources[0]);
        }).not.to.throw();
        expect(() => {
            yaml.load(sources[1]);
        }).not.to.throw();
        expect(() => {
            yaml.load(sources[2]);
        }).not.to.throw();

        expect(yaml.load(sources[0])).to.be.deep.equal(expected);
        expect(yaml.load(sources[1])).to.be.deep.equal(expected);
        expect(yaml.load(sources[2])).to.be.deep.equal(expected);
    });

    specify("Wrong error message when yaml file contains tabs - 64", async () => {
        const file = fixtures.getVirtualFile("0054.yml");
        const data = yaml.safeLoad(await file.content());
        expect(() => {
            yaml.safeLoad(data);
        }).not.to.throw();
    });

    specify("Prevent adding unnecessary space character to end of a line within block collections - 68", async () => {
        expect(yaml.dump({ data: ["foo", "bar", "baz"] })).to.be.equal("data:\n  - foo\n  - bar\n  - baz\n");
        expect(yaml.dump({ foo: { bar: ["baz"] } })).to.be.equal("foo:\n  bar:\n    - baz\n");
    });

    specify("Dumper should take into account booleans syntax from YAML 1.0/1.1 - 85", async () => {
        const DEPRECATED_BOOLEANS_SYNTAX = [
            "y", "Y", "yes", "Yes", "YES", "on", "On", "ON",
            "n", "N", "no", "No", "NO", "off", "Off", "OFF"
        ];
        for (const string of DEPRECATED_BOOLEANS_SYNTAX) {
            const dump = yaml.dump(string).trim();
            expect(((dump === `'${string}'`) || (dump === `"${string}"`))).to.be.true;
        }
    });

    specify('Invalid parse error on whitespace between quoted scalar keys and ":" symbol in mappings - 92', async () => {
        expect(() => {
            yaml.load('{ "field1" : "v1", "field2": "v2" }');
        }).not.to.throw();
    });

    specify("Unwanted line breaks in folded scalars - 93", async () => {
        const file = fixtures.getVirtualFile("0093.yml");
        const data = yaml.safeLoad(await file.content());
        expect(data.first).to.be.equal("a b\n  c\n  d\ne f\n");
        expect(data.second).to.be.equal("a b\n  c\n\n  d\ne f\n");
        expect(data.third).to.be.equal("a b\n\n  c\n  d\ne f\n");
    });

    specify("Empty block scalars loaded wrong - 95", async () => {
        expect(yaml.load("a: |\nb: .")).to.be.deep.equal({ a: "", b: "." });
        expect(yaml.load("a: |+\nb: .")).to.be.deep.equal({ a: "", b: "." });
        expect(yaml.load("a: |-\nb: .")).to.be.deep.equal({ a: "", b: "." });

        expect(yaml.load("a: >\nb: .")).to.be.deep.equal({ a: "", b: "." });
        expect(yaml.load("a: >+\nb: .")).to.be.deep.equal({ a: "", b: "." });
        expect(yaml.load("a: >-\nb: .")).to.be.deep.equal({ a: "", b: "." });

        expect(yaml.load("a: |\n\nb: .")).to.be.deep.equal({ a: "", b: "." });
        expect(yaml.load("a: |+\n\nb: .")).to.be.deep.equal({ a: "\n", b: "." });
        expect(yaml.load("a: |-\n\nb: .")).to.be.deep.equal({ a: "", b: "." });

        expect(yaml.load("a: >\n\nb: .")).to.be.deep.equal({ a: "", b: "." });
        expect(yaml.load("a: >+\n\nb: .")).to.be.deep.equal({ a: "\n", b: "." });
        expect(yaml.load("a: >-\n\nb: .")).to.be.deep.equal({ a: "", b: "." });
    });

    specify("Literal scalars have an unwanted leading line break - 108", async () => {
        expect(yaml.load("|\n  foobar\n")).to.be.equal("foobar\n");
        expect(yaml.load("|\n  hello\n  world\n")).to.be.equal("hello\nworld\n");
        expect(yaml.load("|\n  war never changes\n")).to.be.equal("war never changes\n");
    });

    specify("Circular and cross references - 110", async () => {
        const source = {
            a: { a: 1 },
            b: [1, 2],
            c: {},
            d: []
        };
        source.crossObject = source.a;
        source.crossArray = source.b;
        source.c.circularObject = source;
        source.d.push(source.d);
        source.d.push(source);

        const obtained = yaml.load(yaml.dump(source));

        expect(obtained.crossObject).to.be.equal(obtained.a);
        expect(obtained.crossArray).to.be.equal(obtained.b);
        expect(obtained.c.circularObject).to.be.equal(obtained);
        expect(obtained.d[0]).to.be.equal(obtained.d);
        expect(obtained.d[1]).to.be.equal(obtained);
    });

    specify('Plain scalar "constructor" parsed as `null` - 112', async () => {
        expect(yaml.load("constructor")).to.be.equal("constructor");
        expect(yaml.load("constructor: value")).to.be.deep.equal({ constructor: "value" });
        expect(yaml.load("key: constructor")).to.be.deep.equal({ key: "constructor" });
        expect(yaml.load("{ constructor: value }")).to.be.deep.equal({ constructor: "value" });
        expect(yaml.load("{ key: constructor }")).to.be.deep.equal({ key: "constructor" });
    });

    specify("Negative zero loses the sign after dump - 117", async () => {
        expect(yaml.dump(-0)).to.be.equal("-0.0\n");
    });

    specify("RegExps should be properly closed - 123", async () => {
        expect(() => {
            yaml.load("!!js/regexp /fo");
        }).to.throw();
        expect(() => {
            yaml.load("!!js/regexp /fo/q");
        }).to.throw();
        expect(() => {
            yaml.load("!!js/regexp /fo/giii");
        }).to.throw();

        const regexp = yaml.load("!!js/regexp /fo/g/g");  // 172
        expect(regexp).to.be.a("regexp");
        expect(regexp.toString()).to.be.equal("/fo\\/g/g");
    });

    specify("Infinite loop when attempting to parse multi-line scalar document that is not indented - 144", async () => {
        expect(yaml.load("--- |\nfoo\n")).to.be.equal("foo\n");
    });

    specify("Indentation warning on empty lines within quoted scalars and flow collections - 154", async () => {
        expect(() => {
            yaml.load("- 'hello\n\n  world'");
        }).not.to.throw();
        expect(() => {
            yaml.load('- "hello\n\n  world"');
        }).not.to.throw();
        expect(() => {
            yaml.load("- [hello,\n\n  world]");
        }).not.to.throw();
        expect(() => {
            yaml.load("- {hello: world,\n\n  foo: bar}");
        }).not.to.throw();
    });

    specify("Named null - 155", async () => {
        expect(yaml.load("---\ntest: !!null \nfoo: bar")).to.be.deep.equal({ test: null, foo: "bar" });
    });

    specify("Resolving of empty nodes are skipped in some cases - 156", async () => {
        class SuccessSignal extends Error { }

        const TestClassYaml = new yaml.type.Type("!test", {
            kind: "scalar",
            resolve() {
                throw new SuccessSignal();
            }
        });

        const TEST_SCHEMA = yaml.schema.create([TestClassYaml]);

        expect(() => {
            yaml.load("- foo: !test\n- bar: baz", { schema: TEST_SCHEMA });
        }).to.throw(SuccessSignal);
    });

    specify("Correct encoding of UTF-16 surrogate pairs - 160", async () => {
        expect(yaml.load('"\\U0001F431"')).to.be.equal("🐱");
    });

    specify("Don\'t throw on warning - 194", async () => {
        const file = fixtures.getVirtualFile("0194.yml");
        const content = await file.content();
        const data = yaml.safeLoad(content);

        expect(data).to.be.deep.equal({ foo: { bar: true } });

        const onWarning = spy();
        yaml.safeLoad(content, { onWarning });
        expect(onWarning).to.have.been.calledOnce;
    });

    specify("Don\'t throw on warning - 203", async () => {
        const file = fixtures.getVirtualFile("0203.yml");
        const data = yaml.safeLoad(await file.content());
        expect(data).to.be.deep.equal({ test: "\n\nHello\nworld" });
    });

    specify("Duplicated objects within array - 205", async () => {
        {
            const obj = { test: "canary" };
            const arrayWithRefs = [obj, obj];

            const obtained = yaml.load(yaml.dump(arrayWithRefs));

            expect(obtained[0].test).to.be.equal("canary");
            expect(obtained[0]).to.be.equal(obtained[1]);
        }
        {
            const array = [0, 1];
            const arrayWithRefs = [array, array];

            const obtained = yaml.load(yaml.dump(arrayWithRefs));

            expect(obtained[0][0]).to.be.equal(0);
            expect(obtained[0][1]).to.be.equal(1);
            expect(obtained[0]).to.be.equal(obtained[1]);
        }
    });

    context("217", () => {
        // Simplistic check for folded style header at the end of the first line.
        const isFolded = (s) => s.search(/^[^\n]*>[\-+]?\n/) !== -1;

        // Runs one cycle of dump then load. Also checks that dumped result is folded.
        const loadAfterDump = (input) => {
            const output = yaml.dump(input);
            if (!isFolded(output)) {
                assert.fail(output, "(first line should end with >-, >, or >+)",
                    "Test cannot continue: folded style was expected");
            }
            return yaml.load(output);
        };

        specify("Folding Javascript functions preserves content", async () => {
            const assertFunctionPreserved = (functionString, inputs, expectedOutputs, name) => {
                const f = yaml.load(`!<tag:yaml.org,2002:js/function> "${functionString}"`);
                assert.strictEqual(typeof f, "function", `${name} should be loaded as a function`);

                assert.deepEqual(inputs.map(f), expectedOutputs,
                    `${name} should be loaded correctly`);

                assert.deepEqual(inputs.map(loadAfterDump(f)), expectedOutputs,
                    `${name} should be dumped then loaded correctly`);
            };

            // Backslash-escapes double quotes and newlines.
            const escapeFnString = (s) => s.replace(/"/g, '\\"').replace(/\n/g, "\\n");

            const fnFactorial = escapeFnString(
                "function factorial(start) {\n" +
                '// Non-indented long line to trigger folding: throw new Error("bad fold"); throw new Error("bad fold");\n' +
                '  var extra_long_string = "try to trick the dumper into creating a syntax error by folding this string";\n' +
                '  var extra_long_string1 = "try to trick the dumper into creating a syntax error by folding this string";\n' +
                'var extra_long_string2 = "this long string is fine to fold because it is not more-indented";\n' +
                "function fac (n) {\n" +
                "if (n <= 0) return 1; return n * fac(n-1); // here is a long line that can be safely folded\n" +
                "}\n" +
                "return fac(start);\n" +
                "}\n");

            const fnCollatz = escapeFnString(
                "function collatz(start) {\n" +
                '  var longString = "another long more-indented string that will cause a syntax error if folded";\n' +
                "var result = [];\n" +
                "function go(n) { result.push(n); return (n === 1) ? result : go(n % 2 === 0  ?  n / 2  :  3 * n + 1); }\n" +
                "return go(start >= 1 ? Math.floor(start) : 1);\n" +
                "}");

            const fnRot13 = escapeFnString(
                // single-line function.
                // note the "{return" is so the line doesn't start with a space.
                'function rot13(s) {return String.fromCharCode.apply(null, s.split("")' +
                ".map(function (c) { return ((c.toLowerCase().charCodeAt(0) - 97) + 13) % 26 + 97; })); }"
            );

            assertFunctionPreserved(fnFactorial,
                [0, 1, 2, 3, 5, 7, 12],
                [1, 1, 2, 6, 120, 5040, 479001600],
                "Factorial function");

            assertFunctionPreserved(fnCollatz,
                [6, 19],
                [[6, 3, 10, 5, 16, 8, 4, 2, 1],
                [19, 58, 29, 88, 44, 22, 11, 34, 17, 52, 26, 13, 40, 20, 10, 5, 16, 8, 4, 2, 1]
                ], "Hailstone sequence function");

            assertFunctionPreserved(fnRot13,
                ["nggnpxngqnja", "orjnergurvqrfbsznepu"],
                ["attackatdawn", "bewaretheidesofmarch"]
                , "ROT13");
        });

        specify("Folding long regular expressions preserves content", async () => {
            // Tests loading a regex, then tests dumping and loading.
            const assertRegexPreserved = (string, stringPattern) => {
                assert.strictEqual(string.search(stringPattern), 0,
                    "The test itself has errors: regex did not match its string");

                const loadedRe = yaml.load(`"key": !<tag:yaml.org,2002:js/regexp> /${
                    stringPattern}/`).key;
                assert.strictEqual(loadedRe.exec(string)[0], string,
                    "Loaded regex did not match the original string");

                assert.strictEqual(
                    loadAfterDump({ key: new RegExp(stringPattern) }).key.exec(string)[0],
                    string,
                    "Dumping and loading did not preserve the regex");
            };

            const s1 = "This is a very long regular expression. " +
                "It's so long that it is longer than 80 characters per line.";
            const s1Pattern = "^This is a very long regular expression\\. " +
                "It's so long that it is longer than 80 characters per line\\.$";

            assertRegexPreserved(s1, s1Pattern);
        });

        specify("Strings are folded as usual", async () => {
            const doc = yaml.load('"key": |\n  It is just a very long string. It should be folded because the dumper ' +
                "fold lines that are exceed limit in 80 characters per line.");
            const dump = yaml.dump(doc);
            assert(Math.max.apply(null, dump.split("\n").map((str) => {
                return str.length;
            })) <= 80);
        });
    });

    specify("Float type dumper should not miss dot - 220", async () => {
        expect(5e-100.toString(10)).to.be.equal("5e-100");
        expect(0.5e-100.toString(10)).to.be.equal("5e-101");

        expect(yaml.dump(0.5e-100)).to.be.equal("5.e-101\n");
        expect(yaml.load(yaml.dump(5e-100))).to.be.equal(5e-100);
    });

    specify.skip("Block scalar chomping does not work on zero indent - 221", async () => {
        expect(() => {
            yaml.load("|-\nfoo\nbar");
        }).to.throw(yaml.Exception);
        expect(yaml.dump("foo\nbar")).to.be.equal("|-\n  foo\nbar");
    });

    context("235", () => {
        specify("Flow style does not dump with block literals.", async () => {
            expect(yaml.dump({ a: "\n" }, { flowLevel: 0 })).to.be.equal('{a: "\\n"}\n');
        });

        specify("Ok to dump block-style literals when not yet flowing.", async () => {
            // cf. example 8.6 from the YAML 1.2 spec
            expect(yaml.dump({ a: "\n" }, { flowLevel: 2 })).to.be.equal("a: |+\n\n");
        });
    });

    context("243", () => {
        specify("Duplicated mapping key errors on top level throw at beginning of key", async () => {
            const file = fixtures.getVirtualFile("0243_basic.yml");
            const content = await file.content();
            const lines = content.split(/\r?\n/);
            try {
                yaml.safeLoad(content);
            } catch (err) {
                expect(lines[err.mark.line]).to.be.equal("duplicate: # 2");
                return;
            }
            throw new Error("didnt throw");
        });

        specify("Duplicated mapping key errors inside of mapping values throw at beginning of key", async () => {
            const file = fixtures.getVirtualFile("0243_nested.yml");
            const content = await file.content();
            const lines = content.split(/\r?\n/);
            try {
                yaml.safeLoad(content);
            } catch (err) {
                expect(lines[err.mark.line]).to.be.equal("  duplicate: # 2");
                return;
            }
            throw new Error("didnt throw");
        });
    });

    context("248", () => {
        specify("Listener informed on a very simple scalar.", async () => {
            const history = [];
            yaml.load("a_simple_scalar", {
                listener: (event, state) => {
                    history.push([event, state.position]);
                }
            });
            // 2 open events then 2 close events
            expect(history).to.have.lengthOf(4);
            expect(history).to.be.deep.equal([
                ["open", 0],
                ["open", 0],
                ["close", 16],
                ["close", 16]
            ]);
        });
    });

    specify("Dumper should not take into account booleans syntax from YAML 1.0/1.1 in noCompatMode - 266", async () => {
        const DEPRECATED_BOOLEANS_SYNTAX = [
            "y", "Y", "yes", "Yes", "YES", "on", "On", "ON",
            "n", "N", "no", "No", "NO", "off", "Off", "OFF"
        ];
        for (const string of DEPRECATED_BOOLEANS_SYNTAX) {
            const dump = yaml.dump(string, { noCompatMode: true }).trim();

            expect(dump).to.be.equal(string);
        }
    });

    specify("Loader should not strip quotes before newlines - 303", async () => {
        const withSpace = yaml.load("'''foo'' '");
        const withNewline = yaml.load("'''foo''\n'");
        expect(withSpace).to.be.equal("'foo' ");
        expect(withNewline).to.be.equal("'foo' ");
    });

    specify("should allow cast integers as !!float - 333", async () => {
        const file = fixtures.getVirtualFile("0333.yml");
        const data = yaml.safeLoad(await file.content());
        expect(data).to.be.deep.equal({
            negative: -1,
            zero: 0,
            positive: 23000
        });
    });

    specify("Don't throw on warning", async () => {
        const src = fixtures.getVirtualFile("0335.yml");

        expect(yaml.safeLoad(await src.content())).to.be.deep.equal({
            not_num_1: "-_123",
            not_num_2: "_123",
            not_num_3: "123_",
            not_num_4: "0b00_",
            not_num_5: "0x00_",
            not_num_6: "011_"
        });
    });

    context("0342", () => {
        const simpleArray = ["a", "b"];
        const arrayOfSimpleObj = [{ a: 1 }, { b: 2 }];
        const arrayOfObj = [{ a: 1, b: "abc" }, { c: "def", d: 2 }];

        specify("space should be added for array, regardless of indent", () => {
            assert.deepEqual(
                yaml.dump(simpleArray, { indent: 1 }),
                "- a\n- b\n"
            );
            assert.deepEqual(
                yaml.dump(simpleArray, { indent: 2 }),
                "- a\n- b\n"
            );
            assert.deepEqual(
                yaml.dump(simpleArray, { indent: 3 }),
                "- a\n- b\n"
            );
            assert.deepEqual(
                yaml.dump(simpleArray, { indent: 4 }),
                "- a\n- b\n"
            );
        });

        specify("array of objects should not wrap at indentation of 2", () => {
            assert.deepEqual(
                yaml.dump(arrayOfSimpleObj, { indent: 2 }),
                "- a: 1\n- b: 2\n"
            );
            assert.deepEqual(
                yaml.dump(arrayOfObj, { indent: 2 }),
                "- a: 1\n  b: abc\n- c: def\n  d: 2\n"
            );
        });

        specify("EOL space should not be added on array of objects at indentation of 3", () => {
            assert.deepEqual(
                yaml.dump(arrayOfSimpleObj, { indent: 3 }),
                "-\n   a: 1\n-\n   b: 2\n"
            );
            assert.deepEqual(
                yaml.dump(arrayOfObj, { indent: 3 }),
                "-\n   a: 1\n   b: abc\n-\n   c: def\n   d: 2\n"
            );
        });

        specify("EOL space should not be added on array of objects at indentation of 4", () => {
            assert.deepEqual(
                yaml.dump(arrayOfSimpleObj, { indent: 4 }),
                "-\n    a: 1\n-\n    b: 2\n"
            );
            assert.deepEqual(
                yaml.dump(arrayOfObj, { indent: 4 }),
                "-\n    a: 1\n    b: abc\n-\n    c: def\n    d: 2\n"
            );
        });
    });
});
