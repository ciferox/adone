const {
    data: { json5 }
} = adone;

describe("data", "json5", () => {
    describe("decode()", () => {
        describe("errors", () => {
            it("throws on empty documents", () => {
                const err = assert.throws(() => json5.decode(""));
                assert.ok(err instanceof SyntaxError &&
                    /^JSON5: invalid end of input/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 1);
            });

            it("throws on documents with only comments", () => {
                const err = assert.throws(() => json5.decode("//a"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid end of input/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 4
                );
            });

            it("throws on incomplete single line comments", () => {
                const err = assert.throws(() => json5.decode("/a"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid character 'a'/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 2
                );
            });

            it("throws on unterminated multiline comments", () => {
                const err = assert.throws(() => json5.decode("/*"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid end of input/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 3
                );
            });

            it("throws on unterminated multiline comment closings", () => {
                const err = assert.throws(() => json5.decode("/**"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid end of input/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 4
                );
            });

            it("throws on invalid characters in values", () => {
                const err = assert.throws(() => json5.decode("a"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid character 'a'/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 1
                );
            });

            it("throws on invalid characters in identifier start escapes", () => {
                const err = assert.throws(() => json5.decode("{\\a:1}"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid character 'a'/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 3
                );
            });

            it("throws on invalid identifier start characters", () => {
                const err = assert.throws(() => json5.decode("{\\u0021:1}"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid identifier character/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 2
                );
            });

            it("throws on invalid characters in identifier continue escapes", () => {
                const err = assert.throws(() => json5.decode("{a\\a:1}"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid character 'a'/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 4
                );
            });

            it("throws on invalid identifier continue characters", () => {
                const err = assert.throws(() => json5.decode("{a\\u0021:1}"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid identifier character/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 3
                );
            });

            it("throws on invalid characters following a sign", () => {
                const err = assert.throws(() => json5.decode("-a"));
                assert.ok(
                    err instanceof SyntaxError &&
                    /^JSON5: invalid character 'a'/.test(err.message) &&
                    err.lineNumber === 1 &&
                    err.columnNumber === 2
                );
            });

            it("throws on invalid characters following a leading decimal point", () => {
                const err = assert.throws(() => json5.decode(".a"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character 'a'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 2
                );
            });

            it("throws on invalid characters following an exponent indicator", () => {
                const err = assert.throws(() => json5.decode("1ea"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character 'a'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 3
                );
            });

            it("throws on invalid characters following an exponent sign", () => {
                const err = assert.throws(() => json5.decode("1e-a"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character 'a'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 4
                );
            });

            it("throws on invalid characters following a hexidecimal indicator", () => {
                const err = assert.throws(() => json5.decode("0xg"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character 'g'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 3
                );
            });

            it("throws on invalid new lines in strings", () => {
                const err = assert.throws(() => json5.decode('"\n"'));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character '\\n'/.test(err.message) &&
                        err.lineNumber === 2 &&
                        err.columnNumber === 0
                );
            });

            it("throws on unterminated strings", () => {
                const err = assert.throws(() => json5.decode('"'));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid end of input/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 2
                );
            });

            it("throws on invalid identifier start characters in property names", () => {
                const err = assert.throws(() => json5.decode("{!:1}"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character '!'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 2
                );
            });

            it("throws on invalid characters following a property name", () => {
                const err = assert.throws(() => json5.decode("{a!1}"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character '!'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 3
                );
            });

            it("throws on invalid characters following a property value", () => {
                const err = assert.throws(() => json5.decode("{a:1!}"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character '!'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 5
                );
            });

            it("throws on invalid characters following an array value", () => {
                const err = assert.throws(() => json5.decode("[1!]"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character '!'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 3
                );
            });

            it("throws on invalid characters in literals", () => {
                const err = assert.throws(() => json5.decode("tru!"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character '!'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 4
                );
            });

            it("throws on unterminated escapes", () => {
                const err = assert.throws(() => json5.decode('"\\'));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid end of input/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 3
                );
            });

            it("throws on invalid first digits in hexadecimal escapes", () => {
                const err = assert.throws(() => json5.decode('"\\xg"'));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character 'g'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 4
                );
            });

            it("throws on invalid second digits in hexadecimal escapes", () => {
                const err = assert.throws(() => json5.decode('"\\x0g"'));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character 'g'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 5
                );
            });

            it("throws on invalid unicode escapes", () => {
                const err = assert.throws(() => json5.decode('"\\u000g"'));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character 'g'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 7
                );
            });

            it("throws on escaped digits other than 0", () => {
                for (let i = 1; i <= 9; i++) {
                    const err = assert.throws(() => json5.decode(`'\\${i}'`));
                    assert.ok(
                        err instanceof SyntaxError &&
                            /^JSON5: invalid character '\d'/.test(err.message) &&
                            err.lineNumber === 1 &&
                            err.columnNumber === 3
                    );
                }
            });

            it("throws on octal escapes", () => {
                const err = assert.throws(() => json5.decode("'\\01'"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character '1'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 4
                );
            });

            it("throws on multiple values", () => {
                const err = assert.throws(() => json5.decode("1 2"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character '2'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 3
                );
            });

            it("throws with control characters escaped in the message", () => {
                const err = assert.throws(() => json5.decode("\x01"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid character '\\x01'/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 1
                );
            });

            it("throws on unclosed objects before property names", () => {
                const err = assert.throws(() => json5.decode("{"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid end of input/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 2
                );
            });

            it("throws on unclosed objects after property names", () => {
                const err = assert.throws(() => json5.decode("{a"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid end of input/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 3
                );
            });

            it("throws on unclosed objects before property values", () => {
                const err = assert.throws(() => json5.decode("{a:"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid end of input/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 4
                );
            });

            it("throws on unclosed objects after property values", () => {
                const err = assert.throws(() => json5.decode("{a:1"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid end of input/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 5
                );
            });

            it("throws on unclosed arrays before values", () => {
                const err = assert.throws(() => json5.decode("["));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid end of input/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 2
                );
            });

            it("throws on unclosed arrays after values", () => {
                const err = assert.throws(() => json5.decode("[1"));
                assert.ok(
                    err instanceof SyntaxError &&
                        /^JSON5: invalid end of input/.test(err.message) &&
                        err.lineNumber === 1 &&
                        err.columnNumber === 3
                );
            });
        });
    });
});
