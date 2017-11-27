describe("util", "splitString", () => {
    const { splitString } = adone.util;

    it("should split a string on the given character", () => {
        assert.deepEqual(splitString("a/b/c", "/"), ["a", "b", "c"]);
    });

    it("should not split on an escaped character", () => {
        assert.deepEqual(splitString("a/b/c\\/d", "/"), ["a", "b", "c/d"]);
    });

    it("should split a string on dots by default", () => {
        assert.deepEqual(splitString("a.b.c"), ["a", "b", "c"]);
    });

    it("should respect double-quoted strings", () => {
        assert.deepEqual(splitString('"b.c"'), ["b.c"]);
        assert.deepEqual(splitString('a."b.c"'), ["a", "b.c"]);
        assert.deepEqual(splitString('a".b.c"'), ["a.b.c"]);
        assert.deepEqual(splitString('a."b.c".d'), ["a", "b.c", "d"]);
        assert.deepEqual(splitString('a."b.c".d.".e.f.g.".h'), ["a", "b.c", "d", ".e.f.g.", "h"]);
    });

    it("should respect singlequoted strings", () => {
        assert.deepEqual(splitString("'b.c'"), ["b.c"]);
        assert.deepEqual(splitString("a.'b.c'"), ["a", "b.c"]);
        assert.deepEqual(splitString("a.'b.c'.d"), ["a", "b.c", "d"]);
        assert.deepEqual(splitString("a.'b.c'.d.'.e.f.g.'.h"), ["a", "b.c", "d", ".e.f.g.", "h"]);
    });

    it("should respect strings in backticks", () => {
        assert.deepEqual(splitString("`b.c`"), ["b.c"]);
        assert.deepEqual(splitString("a.`b.c`"), ["a", "b.c"]);
        assert.deepEqual(splitString("a.`b.c`.d"), ["a", "b.c", "d"]);
        assert.deepEqual(splitString("a.`b.c`.d.`.e.f.g.`.h"), ["a", "b.c", "d", ".e.f.g.", "h"]);
    });

    it("should respect strings in “” double quotes", () => {
        assert.deepEqual(splitString("“b.c”"), ["b.c"]);
        assert.deepEqual(splitString("a.“b.c”"), ["a", "b.c"]);
        assert.deepEqual(splitString("a.“b.c”.d"), ["a", "b.c", "d"]);
        assert.deepEqual(splitString("a.“b.c”.d.“.e.f.g.”.h"), ["a", "b.c", "d", ".e.f.g.", "h"]);
    });

    it("should not split on escaped dots", () => {
        assert.deepEqual(splitString("a.b.c\\.d"), ["a", "b", "c.d"]);
    });

    it("should keep escaping when followed by a backslash", () => {
        assert.deepEqual(splitString("a.b.c\\\\.d"), ["a", "b", "c\\\\", "d"]);
        assert.deepEqual(splitString("a.b.c\\\\d"), ["a", "b", "c\\\\d"]);
    });

    it("should retain unclosed double quotes in the results", () => {
        assert.deepEqual(splitString('a."b.c'), ["a", '"b', "c"]);
    });

    it("should retain unclosed single quotes in the results", () => {
        assert.deepEqual(splitString("brian's"), ["brian's"]);
        assert.deepEqual(splitString("a.'b.c"), ["a", "'b", "c"]);
    });

    describe("options", () => {
        it("should keep double quotes", () => {
            assert.deepEqual(splitString('a."b.c".d', { keepDoubleQuotes: true }), ["a", '"b.c"', "d"]);
        });

        it("should keep “” double quotes", () => {
            assert.deepEqual(splitString("a.“b.c”.d", { keepDoubleQuotes: true }), ["a", "“b.c”", "d"]);
        });

        it("should not split inside brackets", () => {
            const opts = { brackets: true };
            assert.deepEqual(splitString("a.(b.c).d", opts), ["a", "(b.c)", "d"]);
            assert.deepEqual(splitString("a.[(b.c)].d", opts), ["a", "[(b.c)]", "d"]);
            assert.deepEqual(splitString("a.[b.c].d", opts), ["a", "[b.c]", "d"]);
            assert.deepEqual(splitString("a.{b.c}.d", opts), ["a", "{b.c}", "d"]);
            assert.deepEqual(splitString("a.<b.c>.d", opts), ["a", "<b.c>", "d"]);
        });

        it("should support nested brackets", () => {
            const opts = { brackets: true };
            assert.deepEqual(splitString("a.{b.{c}.d}.e", opts), ["a", "{b.{c}.d}", "e"]);
            assert.deepEqual(splitString("a.{b.{c.d}.e}.f", opts), ["a", "{b.{c.d}.e}", "f"]);
            assert.deepEqual(splitString("a.{[b.{{c.d}}.e]}.f", opts), ["a", "{[b.{{c.d}}.e]}", "f"]);
        });

        it("should support escaped brackets", () => {
            const opts = { brackets: true };
            assert.deepEqual(splitString("a.\\{b.{c.c}.d}.e", opts), ["a", "{b", "{c.c}", "d}", "e"]);
            assert.deepEqual(splitString("a.{b.c}.\\{d.e}.f", opts), ["a", "{b.c}", "{d", "e}", "f"]);
        });

        it("should support quoted brackets", () => {
            const opts = { brackets: true };
            assert.deepEqual(splitString('a.{b.c}."{d.e}".f', opts), ["a", "{b.c}", "{d.e}", "f"]);
            assert.deepEqual(splitString('a.{b.c}.{"d.e"}.f', opts), ["a", "{b.c}", '{"d.e"}', "f"]);
        });

        it("should ignore imbalanced brackets", () => {
            const opts = { brackets: true };
            assert.deepEqual(splitString("a.{b.c", opts), ["a", "{b", "c"]);
            assert.deepEqual(splitString("a.{a.{b.c}.d", opts), ["a", "{a.{b.c}", "d"]);
        });

        it("should keep single quotes", () => {
            assert.deepEqual(splitString("a.'b.c'.d", { keepSingleQuotes: true }), ["a", "'b.c'", "d"]);
        });

        it("should keep escape characters", () => {
            assert.deepEqual(splitString("a.b\\.c", { keepEscaping: true }), ["a", "b\\.c"]);
        });

        it("should split on a custom separator", () => {
            assert.deepEqual(splitString("a,b,c", { sep: "," }), ["a", "b", "c"]);
        });

        it("should allow custom quotes array", () => {
            assert.deepEqual(splitString("a.^b.c^", { quotes: ["^"] }), ["a", "b.c"]);
        });

        it("should allow custom quotes object", () => {
            assert.deepEqual(splitString("a.^b.c$", { quotes: { "^": "$" } }), ["a", "b.c"]);
        });
    });

    describe("function", () => {
        it("should call a custom function on every token", () => {
            const fn = (tok, tokens) => {
                if (tok.escaped && tok.val === "b") {
                    tok.val = "\\b";
                    return;
                }

                if (!/[@!*+]/.test(tok.val)) {
                    return;
                }
                const stack = [];
                let val = tok.val;
                const str = tok.str;
                let i = tok.idx;

                while (++i < str.length) {
                    const ch = str[i];
                    if (ch === "(") {
                        stack.push(ch);
                    }

                    if (ch === ")") {
                        stack.pop();
                        if (!stack.length) {
                            val += ch;
                            break;
                        }
                    }
                    val += ch;
                }

                tok.split = false;
                tok.val = val;
                tok.idx = i;
            };

            const opts = { sep: ",", brackets: null };
            assert.deepEqual(splitString("a,(\\b,c)", opts, fn), ["a", "(\\b", "c)"]);
            assert.deepEqual(splitString("a,(b,c)", opts, fn), ["a", "(b", "c)"]);
            assert.deepEqual(splitString("a,@(b,c)", opts, fn), ["a", "@(b,c)"]);
            assert.deepEqual(splitString("a,@(b,(a,b)c)", opts, fn), ["a", "@(b,(a,b)c)"]);
            assert.deepEqual(splitString("a,@(b,(a,b)c),z", opts, fn), ["a", "@(b,(a,b)c)", "z"]);
            assert.deepEqual(splitString("a,+(b,c)", opts, fn), ["a", "+(b,c)"]);
            assert.deepEqual(splitString("a,*(b|c,d)", opts, fn), ["a", "*(b|c,d)"]);
        });
    });
});
