describe("streams", "iconv", () => {
    const { stream: { iconv }, std: { stream: { Readable } }, is } = adone;

    // Create a source stream that feeds given array of chunks.
    const feeder = (chunks) => {
        if (!is.array(chunks)) {
            chunks = [chunks];
        }
        const opts = {};
        if (chunks.every((chunk) => {
            return is.string(chunk);
        })) {
            opts.encoding = "utf8";
        }

        const stream = new Readable(opts);
        const writeChunk = () => {
            try {
                if (chunks.length > 0) {
                    let chunk = chunks.shift();
                    if (is.array(chunk)) {
                        chunk = Buffer.from(chunk);
                    }
                    stream.push(chunk, opts.encoding);
                } else {
                    stream.push(null);
                    return;
                }
            } catch (e) {
                stream.emit("error", e);
            }
            process.nextTick(writeChunk);
        };
        stream._read = function () {
            writeChunk();
        };

        return stream;
    };

    const checkStreamOutput = (options) => {
        return function (done) {
            let res = [];

            const check = (err) => {
                try {
                    if (options.checkError) {
                        assert(err, "Expected error, but got success");
                        if (Object.prototype.toString.call(options.checkError) === "[object RegExp]") {
                            assert(options.checkError.test(err.message));
                        } else if (is.function(options.checkError)) {
                            options.checkError(err);
                        } else {
                            assert.fail(null, null, `Invalid type of options.checkError: ${typeof options.checkError}`);
                        }
                    } else {
                        assert.ifError(err);

                        if (options.checkOutput) {
                            if (options.outputType) {
                                const r = /^buffer-?(.*)/.exec(options.outputType);
                                if (r) {
                                    res = Buffer.concat(res);
                                    if (r[1]) {
                                        res = res.toString(r[1]);
                                    } // Convert to string to make comparing buffers easier.
                                } else if (options.outputType === "string") {
                                    res = res.join("");
                                }
                            }

                            options.checkOutput(res);
                        }
                    }
                    done();
                } catch (e) {
                    done(e);
                }
            };

            let stream;
            try {
                stream = options.createStream();
            } catch (e) {
                check(e);
                return;
            }

            stream.on("readable", () => {
                let chunk;
                try {
                    while (!is.null(chunk = stream.read())) {
                        if (options.outputType) {
                            if (/^buffer/.test(options.outputType)) {
                                assert(chunk instanceof Buffer);
                            } else {
                                assert.strictEqual(typeof chunk, options.outputType);
                            }
                        }
                        res.push(chunk);
                    }
                } catch (e) {
                    stream.emit("error", e);
                }
            });

            stream.on("error", check);
            stream.on("end", check);
        };
    };

    const checkEncodeStream = (opts) => {
        opts.createStream = () => {
            return feeder(opts.input)
                .pipe(iconv.encode(opts.encoding, opts.encodingOptions));
        };
        if (is.nil(opts.outputType)) {
            opts.outputType = "buffer-hex";
        }
        if (is.buffer(opts.output) && opts.outputType === "buffer-hex") {
            opts.output = opts.output.toString("hex");
        }

        opts.checkOutput = opts.checkOutput || function (res) {
            assert.equal(res, opts.output);
        };

        return checkStreamOutput(opts);
    };

    const checkDecodeStream = (opts) => {
        opts.createStream = function () {
            return feeder(opts.input)
                .pipe(iconv.decode(opts.encoding, opts.encodingOptions));
        };
        if (is.nil(opts.outputType)) {
            opts.outputType = "string";
        }
        opts.checkOutput = opts.checkOutput || ((res) => {
            assert.equal(res, opts.output);
        });

        return checkStreamOutput(opts);
    };

    it("Feeder outputs strings", checkStreamOutput({
        createStream() {
            return feeder(["abc", "def"]);
        },
        outputType: "string",
        checkOutput(res) {
            assert.equal(res, "abcdef");
        }
    }));

    it("Feeder outputs buffers", checkStreamOutput({
        createStream() {
            return feeder([[0x61], [0x62]]);
        },
        outputType: "buffer",
        checkOutput(res) {
            assert.equal(res.toString("hex"), "6162");
        }
    }));

    it("Feeder outputs buffers with encoding", checkStreamOutput({
        createStream() {
            return feeder([[0x61], [0x62, 0x63]]);
        },
        outputType: "buffer-hex",
        checkOutput(res) {
            assert.equal(res, "616263");
        }
    }));

    it("Simple stream encoding", checkEncodeStream({
        encoding: "us-ascii",
        input: ["hello ", "world!"],
        output: Buffer.from("hello world!")
    }));

    it("Simple stream decoding", checkDecodeStream({
        encoding: "us-ascii",
        input: [Buffer.from("hello "), Buffer.from("world!")],
        output: "hello world!"
    }));

    it("Stream encoder should error when fed with buffers", checkEncodeStream({
        encoding: "us-ascii",
        input: [Buffer.from("hello "), Buffer.from("world!")],
        checkError: /Iconv encoding stream needs strings as its input/
    }));

    it("Stream decoder should be ok when fed with strings", checkDecodeStream({
        encoding: "us-ascii",
        input: ["hello ", "world!"],
        output: Buffer.from("hello world!")
    }));

    it("Stream decoder should be error when fed with strings and 'decodeStrings: false' option is given", checkDecodeStream({
        encoding: "us-ascii",
        encodingOptions: { decodeStrings: false },
        input: ["hello ", "world!"],
        checkError: /Iconv decoding stream needs buffers as its input/
    }));

    it("Round-trip encoding and decoding", checkStreamOutput({
        createStream() {
            return feeder(["абв", "где"])
                .pipe(iconv.encode("windows-1251"))
                .pipe(iconv.decode("windows-1251"))
                .pipe(iconv.encode("windows-1251"))
                .pipe(iconv.decode("windows-1251"));
        },
        outputType: "string",
        checkOutput(res) {
            assert.equal(res, "абвгде");
        }
    }));

    it("Decoding of incomplete chars using internal modules: utf8", checkDecodeStream({
        encoding: "utf8",
        input: [[0xE4], [0xB8, 0x82]],
        output: "丂"
    }));

    it("Decoding of incomplete chars using internal modules: utf8 / surrogates", checkDecodeStream({
        encoding: "utf8",
        input: [[0xF0], [0x9F, 0x98], [0xBB]], // U+1F63B, 😻, SMILING CAT FACE WITH HEART-SHAPED EYES
        outputType: false, // Don't concat
        checkOutput(res) {
            assert.deepEqual(res, ["\uD83D\uDE3B"]);
        } // We should have only 1 chunk.
    }));

    it("Decoding of incomplete chars using internal modules: ucs2 / surrogates", checkDecodeStream({
        encoding: "ucs2",
        input: [[0x3D], [0xD8, 0x3B], [0xDE]], // U+1F63B, 😻, SMILING CAT FACE WITH HEART-SHAPED EYES
        outputType: false, // Don't concat
        checkOutput(res) {
            if (process.version < "v6.2.1") {
                assert.deepEqual(res, ["\uD83D\uDE3B"]); // We should have only 1 chunk.
            } else {
                // After a string_decoder rewrite in https://github.com/nodejs/node/pull/6777, which
                // was merged in Node v6.2.1, we don't merge chunks anymore.
                // Not really correct, but it seems we cannot do anything with it.
                assert.deepEqual(res, ["\uD83D", "\uDE3B"]);
            }
        }
    }));

    it("Encoding using internal modules: utf8", checkEncodeStream({
        encoding: "utf8",
        input: "丂",
        output: "e4b882"
    }));

    it("Encoding using internal modules: utf8 with surrogates", checkEncodeStream({
        encoding: "utf8",
        input: ["\uD83D\uDE3B"],
        output: "f09f98bb"
    }));

    it("Decoding of incomplete chars in DBCS (gbk)", checkDecodeStream({
        encoding: "gbk",
        input: [[0x61, 0x81], [0x40, 0x61]],
        output: "a丂a"
    }));

    it("Decoding of incomplete chars at the end of the stream in DBCS (gbk)", checkDecodeStream({
        encoding: "gbk",
        input: [[0x61, 0x81]],
        output: "a�"
    }));

    it("Decoding of uneven length buffers from UTF-16LE", checkDecodeStream({
        encoding: "UTF-16LE",
        input: [[0x61], [0x0]],
        output: "a"
    }));

    it("Decoding of uneven length buffers from UTF-16BE", checkDecodeStream({
        encoding: "UTF-16BE",
        input: [[0x0], [0x61]],
        output: "a"
    }));

    it("Decoding of uneven length buffers from UTF-16BE - 2", checkDecodeStream({
        encoding: "UTF-16BE",
        input: [[0x00, 0x61, 0x00], [0x62, 0x00, 0x63]],
        output: "abc"
    }));

    it("Decoding of uneven length buffers from UTF-16", checkDecodeStream({
        encoding: "UTF-16",
        input: [[0x61], [0x0], [0x20], [0x0]],
        output: "a "
    }));

    it("Encoding base64 between chunks", checkEncodeStream({
        encoding: "base64",
        input: ["aGV", "sbG8gd2", "9ybGQ="],
        output: Buffer.from("hello world").toString("hex")
    }));

    it("Decoding of UTF-7 with base64 between chunks", checkDecodeStream({
        encoding: "UTF-7",
        input: [Buffer.from("+T2"), Buffer.from("BZf"), Buffer.from("Q hei+AN8-t")],
        output: "\u4F60\u597D heißt"
    }));

    it("Encoding of UTF-7-IMAP with base64 between chunks", checkEncodeStream({
        encoding: "UTF-7-IMAP",
        input: ["\uffff", "\uedca", "\u9876", "\u5432", "\u1fed"],
        output: Buffer.from("&,,,typh2VDIf7Q-").toString("hex")
    }));

    it("Decoding of UTF-7-IMAP with base64 between chunks", checkDecodeStream({
        encoding: "UTF-7-IMAP",
        input: [Buffer.from("&T2"), Buffer.from("BZf"), Buffer.from("Q hei&AN8-t")],
        output: "\u4F60\u597D heißt"
    }));
});
