describe("database", "redis", "unit", "parsers", () => {
    const { is, database: { redis } } = adone;
    const { parser: { createParser } } = adone.private(redis);

    const assert = adone.std.assert;
    const parsers = ["javascript", "hiredis"];

    // Mock the not needed return functions
    const returnReply = () => {
        throw new adone.exception.Exception("failed");
    };
    const returnError = () => {
        throw new adone.exception.Exception("failed");
    };
    const returnFatalError = () => {
        throw new adone.exception.Exception("failed");
    };

    describe("general parser functionality", () => {

        it("use default values", () => {
            const parser = createParser({
                returnReply,
                returnError
            });
            assert.strictEqual(parser.returnError, parser.returnFatalError);
            assert.strictEqual(parser.name, "hiredis");
        });

        it("auto parser", () => {
            const parser = createParser({
                returnReply,
                returnError,
                name: "auto"
            });
            assert.strictEqual(parser.name, "hiredis");
        });

        it("auto parser v2", () => {
            const parser = createParser({
                returnReply,
                returnError,
                name: null
            });
            assert.strictEqual(parser.name, "hiredis");
        });

        it("fail for missing options", () => {
            assert.throws(() => {
                createParser({
                    returnReply,
                    returnBuffers: true
                });
            }, (err) => {
                assert.strictEqual(err.message, "Please provide all return functions while initiating the parser");
                return true;
            });

        });

    });

    parsers.forEach((parserName) => {

        describe(parserName, () => {

            it("handles multi-bulk reply and check context binding", () => {
                let replyCount = 0;
                const Abc = function () { };
                Abc.prototype.checkReply = function (reply) {
                    assert.strictEqual(typeof this.log, "function");
                    assert.deepEqual(reply, [["a"]], "Expecting multi-bulk reply of [[\"a\"]]");
                    replyCount++;
                };
                Abc.prototype.log = console.log;
                const test = new Abc();
                const parser = createParser({
                    returnReply(reply) {
                        test.checkReply(reply);
                    },
                    returnError,
                    returnFatalError,
                    name: parserName
                });

                parser.execute(Buffer.from("*1\r\n*1\r\n$1\r\na\r\n"));
                assert.strictEqual(replyCount, 1);

                parser.execute(Buffer.from("*1\r\n*1\r"));
                parser.execute(Buffer.from("\n$1\r\na\r\n"));
                assert.strictEqual(replyCount, 2);

                parser.execute(Buffer.from("*1\r\n*1\r\n"));
                parser.execute(Buffer.from("$1\r\na\r\n"));

                assert.equal(replyCount, 3, "check reply should have been called three times");
            });

            it("parser error", () => {
                let replyCount = 0;
                const Abc = function () { };
                Abc.prototype.checkReply = function (reply) {
                    assert.strictEqual(typeof this.log, "function");
                    assert.strictEqual(reply.message, "Protocol error, got \"a\" as reply type byte");
                    replyCount++;
                };
                Abc.prototype.log = console.log;
                const test = new Abc();
                const parser = createParser({
                    returnReply,
                    returnError,
                    returnFatalError(err) {
                        test.checkReply(err);
                    },
                    name: parserName
                });

                parser.execute(Buffer.from("a*1\r*1\r$1`zasd\r\na"));
                assert.equal(replyCount, 1);
            });

            it("parser error resets the buffer", () => {
                let replyCount = 0;
                let errCount = 0;
                const checkReply = (reply) => {
                    assert.strictEqual(reply.length, 1);
                    assert(is.buffer(reply[0]));
                    assert.strictEqual(reply[0].toString(), "CCC");
                    replyCount++;
                };
                const checkError = (err) => {
                    assert.strictEqual(err.message, "Protocol error, got \"b\" as reply type byte");
                    errCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError: checkError,
                    name: parserName,
                    returnBuffers: true
                });

                // The chunk contains valid data after the protocol error
                parser.execute(Buffer.from("*1\r\n+CCC\r\nb$1\r\nz\r\n+abc\r\n"));
                assert.strictEqual(replyCount, 1);
                assert.strictEqual(errCount, 1);
                parser.execute(Buffer.from("*1\r\n+CCC\r\n"));
                assert.strictEqual(replyCount, 2);
            });

            it("parser error v3 without returnFatalError specified", () => {
                let replyCount = 0;
                let errCount = 0;
                const checkReply = (reply) => {
                    assert.strictEqual(reply[0], "OK");
                    replyCount++;
                };
                const checkError = (err) => {
                    assert.strictEqual(err.message, "Protocol error, got \"\\n\" as reply type byte");
                    errCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError: checkError,
                    name: parserName
                });

                parser.execute(Buffer.from("*1\r\n+OK\r\n\n+zasd\r\n"));
                assert.strictEqual(replyCount, 1);
                assert.strictEqual(errCount, 1);
            });

            it("should handle \\r and \\n characters properly", () => {
                // If a string contains \r or \n characters it will always be send as a bulk string
                let replyCount = 0;
                const entries = ["foo\r", "foo\r\nbar", "\r\nfoo", "foo\r\n"];
                const checkReply = (reply) => {
                    assert.strictEqual(reply, entries[replyCount]);
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName
                });

                parser.execute(Buffer.from("$4\r\nfoo\r\r\n$8\r\nfoo\r\nbar\r\n$5\r\n\r\n"));
                assert.strictEqual(replyCount, 2);
                parser.execute(Buffer.from("foo\r\n$5\r\nfoo\r\n\r\n"));
                assert.strictEqual(replyCount, 4);
            });

            it("line breaks in the beginning of the last chunk", () => {
                let replyCount = 0;
                const checkReply = (reply) => {
                    assert.deepEqual(reply, [["a"]], "Expecting multi-bulk reply of [[\"a\"]]");
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName
                });

                parser.execute(Buffer.from("*1\r\n*1\r\n$1\r\na"));
                assert.equal(replyCount, 0);

                parser.execute(Buffer.from("\r\n*1\r\n*1\r"));
                assert.equal(replyCount, 1);
                parser.execute(Buffer.from("\n$1\r\na\r\n*1\r\n*1\r\n$1\r\na\r\n"));

                assert.equal(replyCount, 3, "check reply should have been called three times");
            });

            it("multiple chunks in a bulk string", () => {
                let replyCount = 0;
                const checkReply = (reply) => {
                    assert.strictEqual(reply, "abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij");
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName
                });

                parser.execute(Buffer.from("$100\r\nabcdefghij"));
                parser.execute(Buffer.from("abcdefghijabcdefghijabcdefghij"));
                parser.execute(Buffer.from("abcdefghijabcdefghijabcdefghij"));
                parser.execute(Buffer.from("abcdefghijabcdefghijabcdefghij"));
                assert.strictEqual(replyCount, 0);
                parser.execute(Buffer.from("\r\n"));
                assert.strictEqual(replyCount, 1);

                parser.execute(Buffer.from("$100\r"));
                parser.execute(Buffer.from("\nabcdefghijabcdefghijabcdefghijabcdefghij"));
                parser.execute(Buffer.from("abcdefghijabcdefghijabcdefghij"));
                parser.execute(Buffer.from("abcdefghijabcdefghij"));
                assert.strictEqual(replyCount, 1);
                parser.execute(Buffer.from(
                    "abcdefghij\r\n" +
                    "$100\r\nabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij\r\n" +
                    "$100\r\nabcdefghijabcdefghijabcdefghijabcdefghij"
                ));
                assert.strictEqual(replyCount, 3);
                parser.execute(Buffer.from("abcdefghijabcdefghijabcdefghij"));
                parser.execute(Buffer.from("abcdefghijabcdefghijabcdefghij\r"));
                assert.strictEqual(replyCount, 3);
                parser.execute(Buffer.from("\n"));

                assert.equal(replyCount, 4, "check reply should have been called three times");
            });

            it("multiple chunks with arrays different types", () => {
                let replyCount = 0;
                const predefinedData = [
                    "abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij",
                    "test",
                    100,
                    new Error("Error message"),
                    ["The force awakens"]
                ];
                const checkReply = (reply) => {
                    for (let i = 0; i < reply.length; i++) {
                        if (i < 3) {
                            assert.strictEqual(reply[i], predefinedData[i]);
                        } else {
                            assert.deepEqual(reply[i], predefinedData[i]);
                        }
                    }
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName,
                    returnBuffers: false
                });

                parser.execute(Buffer.from("*5\r\n$100\r\nabcdefghij"));
                parser.execute(Buffer.from("abcdefghijabcdefghijabcdefghij"));
                parser.execute(Buffer.from("abcdefghijabcdefghijabcdefghij"));
                parser.execute(Buffer.from("abcdefghijabcdefghijabcdefghij\r\n"));
                parser.execute(Buffer.from("+test\r"));
                parser.execute(Buffer.from("\n:100"));
                parser.execute(Buffer.from("\r\n-Error message"));
                parser.execute(Buffer.from("\r\n*1\r\n$17\r\nThe force"));
                assert.strictEqual(replyCount, 0);
                parser.execute(Buffer.from(" awakens\r\n$5"));
                assert.strictEqual(replyCount, 1);
            });

            it("return normal errors", () => {
                let replyCount = 0;
                const checkReply = (reply) => {
                    assert.equal(reply.message, "Error message");
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: returnError,
                    returnError: checkReply,
                    returnFatalError,
                    name: parserName
                });

                parser.execute(Buffer.from("-Error "));
                parser.execute(Buffer.from("message\r\n*3\r\n$17\r\nThe force"));
                assert.strictEqual(replyCount, 1);
                parser.execute(Buffer.from(" awakens\r\n$5"));
                assert.strictEqual(replyCount, 1);
            });

            it("return null for empty arrays and empty bulk strings", () => {
                let replyCount = 0;
                const checkReply = (reply) => {
                    assert.equal(reply, null);
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName
                });

                parser.execute(Buffer.from("$-1\r\n*-"));
                assert.strictEqual(replyCount, 1);
                parser.execute(Buffer.from("1"));
                assert.strictEqual(replyCount, 1);
                parser.execute(Buffer.from("\r\n$-"));
                assert.strictEqual(replyCount, 2);
            });

            it("return value even if all chunks are only 1 character long", () => {
                let replyCount = 0;
                const checkReply = (reply) => {
                    assert.equal(reply, 1);
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName
                });

                parser.execute(Buffer.from(":"));
                assert.strictEqual(replyCount, 0);
                parser.execute(Buffer.from("1"));
                assert.strictEqual(replyCount, 0);
                parser.execute(Buffer.from("\r"));
                assert.strictEqual(replyCount, 0);
                parser.execute(Buffer.from("\n"));
                assert.strictEqual(replyCount, 1);
            });

            it("do not return before \\r\\n", () => {
                let replyCount = 0;
                const checkReply = (reply) => {
                    assert.equal(reply, 1);
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName
                });

                parser.execute(Buffer.from(":1\r\n:"));
                assert.strictEqual(replyCount, 1);
                parser.execute(Buffer.from("1"));
                assert.strictEqual(replyCount, 1);
                parser.execute(Buffer.from("\r"));
                assert.strictEqual(replyCount, 1);
                parser.execute(Buffer.from("\n"));
                assert.strictEqual(replyCount, 2);
            });

            it("return data as buffer if requested", () => {
                let replyCount = 0;
                const checkReply = (reply) => {
                    if (is.array(reply)) {
                        reply = reply[0];
                    }
                    assert(is.buffer(reply));
                    assert.strictEqual(reply.inspect(), Buffer.from("test").inspect());
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName,
                    returnBuffers: true
                });

                parser.execute(Buffer.from("+test\r\n"));
                assert.strictEqual(replyCount, 1);
                parser.execute(Buffer.from("$4\r\ntest\r\n"));
                assert.strictEqual(replyCount, 2);
                parser.execute(Buffer.from("*1\r\n$4\r\ntest\r\n"));
                assert.strictEqual(replyCount, 3);
            });

            it("handle special case buffer sizes properly", () => {
                let replyCount = 0;
                const entries = ["test test ", "test test test test ", 1234];
                const checkReply = (reply) => {
                    assert.strictEqual(reply, entries[replyCount]);
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName
                });
                parser.execute(Buffer.from("$10\r\ntest "));
                assert.strictEqual(replyCount, 0);
                parser.execute(Buffer.from("test \r\n$20\r\ntest test test test \r\n:1234\r"));
                assert.strictEqual(replyCount, 2);
                parser.execute(Buffer.from("\n"));
                assert.strictEqual(replyCount, 3);
            });

            it("return numbers as strings", () => {
                let replyCount = 0;
                const entries = ["123", "590295810358705700002", "-99999999999999999"];
                const checkReply = (reply) => {
                    assert.strictEqual(typeof reply, "string");
                    assert.strictEqual(reply, entries[replyCount]);
                    replyCount++;
                };
                const parser = createParser({
                    returnReply: checkReply,
                    returnError,
                    returnFatalError,
                    name: parserName,
                    stringNumbers: true
                });
                parser.execute(Buffer.from(":123\r\n:590295810358705700002\r\n:-99999999999999999\r\n"));
                assert.strictEqual(replyCount, 3);
            });
        });
    });
});
