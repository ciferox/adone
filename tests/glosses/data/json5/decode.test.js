const sinon = require("sinon");

const {
    data: { json5 }
} = adone;


describe("data", "json5", "decode", () => {
    describe("decode(text)", () => {
        it("objects", () => {
            assert.deepEqual(json5.decode("{}"), {}, "decodes empty objects");

            assert.deepEqual(
                json5.decode('{"a":1}'),
                { a: 1 },
                "decodes double string property names"
            );

            assert.deepEqual(
                json5.decode("{'a':1}"),
                { a: 1 },
                "decodes single string property names"
            );

            assert.deepEqual(
                json5.decode("{a:1}"),
                { a: 1 },
                "decodes unquoted property names"
            );

            assert.deepEqual(
                json5.decode("{$_:1,_$:2,a\u200C:3}"),
                { $_: 1, _$: 2, "a\u200C": 3 },
                "decodes special character property names"
            );

            assert.deepEqual(
                json5.decode("{ùńîċõďë:9}"),
                { ùńîċõďë: 9 },
                "decodes unicode property names"
            );

            assert.deepEqual(
                json5.decode("{\\u0061\\u0062:1,\\u0024\\u005F:2,\\u005F\\u0024:3}"),
                { ab: 1, $_: 2, _$: 3 },
                "decodes escaped property names"
            );

            assert.deepEqual(
                json5.decode("{abc:1,def:2}"),
                { abc: 1, def: 2 },
                "decodes multiple properties"
            );

            assert.deepEqual(
                json5.decode("{a:{b:2}}"),
                { a: { b: 2 } },
                "decodes nested objects"
            );
        });

        it("arrays", () => {
            assert.deepEqual(
                json5.decode("[]"),
                [],
                "decodes empty arrays"
            );

            assert.deepEqual(
                json5.decode("[1]"),
                [1],
                "decodes array values"
            );

            assert.deepEqual(
                json5.decode("[1,2]"),
                [1, 2],
                "decodes multiple array values"
            );

            assert.deepEqual(
                json5.decode("[1,[2,3]]"),
                [1, [2, 3]],
                "decodes nested arrays"
            );
        });

        it("nulls", () => {
            assert.equal(
                json5.decode("null"),
                null,
                "decodes nulls"
            );


        });

        it("Booleans", () => {
            assert.equal(
                json5.decode("true"),
                true,
                "decodes true"
            );

            assert.equal(
                json5.decode("false"),
                false,
                "decodes false"
            );


        });

        it("numbers", () => {
            assert.deepEqual(
                json5.decode("[0,0.,0e0]"),
                [0, 0, 0],
                "decodes leading zeroes"
            );

            assert.deepEqual(
                json5.decode("[1,23,456,7890]"),
                [1, 23, 456, 7890],
                "decodes integers"
            );

            assert.deepEqual(
                json5.decode("[-1,+2,-.1,-0]"),
                [-1, +2, -0.1, -0],
                "decodes signed numbers"
            );

            assert.deepEqual(
                json5.decode("[.1,.23]"),
                [0.1, 0.23],
                "decodes leading decimal points"
            );

            assert.deepEqual(
                json5.decode("[1.0,1.23]"),
                [1, 1.23],
                "decodes fractional numbers"
            );

            assert.deepEqual(
                json5.decode("[1e0,1e1,1e01,1.e0,1.1e0,1e-1,1e+1]"),
                [1, 10, 10, 1, 1.1, 0.1, 10],
                "decodes exponents"
            );

            assert.deepEqual(
                json5.decode("[0x1,0x10,0xff,0xFF]"),
                [1, 16, 255, 255],
                "decodes hexadecimal numbers"
            );

            assert.deepEqual(
                json5.decode("[Infinity,-Infinity]"),
                [Infinity, -Infinity],
                "decodes signed and unsigned Infinity"
            );

            assert.ok(
                isNaN(json5.decode("NaN")),
                "decodes NaN"
            );

            assert.ok(
                isNaN(json5.decode("-NaN")),
                "decodes signed NaN"
            );
        });

        describe("strings", () => {
            it("common", () => {
                assert.equal(
                    json5.decode('"abc"'),
                    "abc",
                    "decodes double quoted strings"
                );

                assert.equal(
                    json5.decode("'abc'"),
                    "abc",
                    "decodes single quoted strings"
                );

                assert.deepEqual(
                    json5.decode("['\"',\"'\"]"),
                    ['"', "'"],
                    "decodes quotes in strings");

                assert.equal(
                    json5.decode("'\\b\\f\\n\\r\\t\\v\\0\\x0f\\u01fF\\\n\\\r\n\\\r\\\u2028\\\u2029\\a\\'\\\"'"),
                    "\b\f\n\r\t\v\0\x0f\u01FF\a'\"", // eslint-disable-line no-useless-escape
                    "decodes escpaed characters"
                );
            });

            it("decodes line and paragraph separators with a warning", () => {
                const mock = sinon.mock(console);
                mock
                    .expects("warn")
                    .twice()
                    .calledWithMatch("not valid ECMAScript");

                assert.deepStrictEqual(
                    json5.decode("'\u2028\u2029'"),
                    "\u2028\u2029"
                );

                mock.verify();
                mock.restore();
            });
        });

        it("comments", () => {
            assert.deepEqual(
                json5.decode("{//comment\n}"),
                {},
                "decodes single-line comments"
            );

            assert.deepEqual(
                json5.decode("{}//comment"),
                {},
                "decodes single-line comments at end of input"
            );

            assert.deepEqual(
                json5.decode("{/*comment\n** */}"),
                {},
                "decodes multi-line comments"
            );
        });

        it("whitespace", () => {
            assert.deepEqual(
                json5.decode("{\t\v\f \u00A0\uFEFF\n\r\u2028\u2029\u2003}"),
                {},
                "decodes whitespace"
            );
        });
    });

    it("decode(text, reviver)", () => {
        assert.deepEqual(
            json5.decode("{a:1,b:2}", (k, v) => (k === "a") ? "revived" : v),
            { a: "revived", b: 2 },
            "modifies property values"
        );

        assert.deepEqual(
            json5.decode("{a:{b:2}}", (k, v) => (k === "b") ? "revived" : v),
            { a: { b: "revived" } },
            "modifies nested object property values"
        );

        assert.deepEqual(
            json5.decode("{a:1,b:2}", (k, v) => (k === "a") ? undefined : v),
            { b: 2 },
            "deletes property values"
        );

        assert.deepEqual(
            json5.decode("[0,1,2]", (k, v) => (k === "1") ? "revived" : v),
            [0, "revived", 2],
            "modifies array values"
        );

        assert.deepEqual(
            json5.decode("[0,[1,2,3]]", (k, v) => (k === "2") ? "revived" : v),
            [0, [1, 2, "revived"]],
            "modifies nested array values"
        );

        assert.deepEqual(
            json5.decode("[0,1,2]", (k, v) => (k === "1") ? undefined : v),
            [0, , 2], // eslint-disable-line no-sparse-arrays
            "deletes array values"
        );

        assert.equal(
            json5.decode("1", (k, v) => (k === "") ? "revived" : v),
            "revived",
            "modifies the root value"
        );

        assert.deepEqual(
            json5.decode("{a:{b:2}}", function (k, v) {
                return (k === "b" && this.b) ? "revived" : v;
            }),
            { a: { b: "revived" } },
            "sets `this` to the parent value"
        );
    });
});
