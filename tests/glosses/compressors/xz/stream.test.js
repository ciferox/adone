const { std: { fs, path }, collection: { BufferList } } = adone;
const helpers = require("./helpers.js");
const { lzma, xz } = adone.compressor;

describe("glosses", "compressors", "xz", "stream", () => {
    function commonFixturePath(relPath) {
        return path.join(__dirname, "../..", "fixtures", relPath);
    }

    function fixturePath(relPath) {
        return path.join(__dirname, "fixtures", relPath);
    }

    let randomData;
    let x86BinaryData;
    let hamlet;
    let largeRandom;

    function encodeAndDecode(enc, dec, done, data) {
        data = data || randomData;

        data.duplicate().pipe(enc).pipe(dec).pipe(new BufferList((err, buf) => {
            assert.isOk(helpers.bufferEqual(data, buf));
            done(err);
        }));
    }

    before("read random test data", (done) => {
        randomData = new BufferList(done);
        fs.createReadStream(commonFixturePath("small")).pipe(randomData);
    });

    before("read large random test data", (done) => {
        largeRandom = new BufferList(done);
        fs.createReadStream(commonFixturePath("big")).pipe(largeRandom);
    });

    before("read hamlet.txt test data", (done) => {
        hamlet = new BufferList(done);
        fs.createReadStream(fixturePath("hamlet.txt.xz")).pipe(xz.decompressStream()).pipe(hamlet);
    });

    before("read an executable file", (done) => {
        /* process.execPath is e.g. /usr/bin/node
         * it does not matter for functionality testing whether
         * this is actually x86 code, only for compression ratio */
        x86BinaryData = new BufferList(() => {
            x86BinaryData = new BufferList(x86BinaryData.slice(0, 20480));
            return done();
        });

        fs.createReadStream(process.execPath).pipe(x86BinaryData);
    });

    describe("#autoDecoder", () => {
        it("should be able to decode .lzma in async mode", (done) => {
            const stream = xz.decompressStream();
            stream.on("end", done);
            stream.on("data", () => { });

            if (lzma.asyncCodeAvailable) {
                assert.isOk(!stream.sync);
            }

            fs.createReadStream(fixturePath("hamlet.txt.lzma")).pipe(stream);
        });

        it("should be able to decode .xz in async mode", (done) => {
            const stream = xz.decompressStream();
            stream.on("end", done);
            stream.on("data", () => { });

            if (xz.asyncCodeAvailable) {
                assert.isOk(!stream.sync);
            }

            fs.createReadStream(fixturePath("hamlet.txt.xz")).pipe(stream);
        });

        it("should be able to decode .xz in sync mode", (done) => {
            const stream = xz.decompressStream({ sync: true });
            stream.on("end", done);
            stream.on("data", () => { });

            assert.isOk(stream.sync);

            fs.createReadStream(fixturePath("hamlet.txt.xz")).pipe(stream);
        });

        it("should bark loudly when given non-decodable data in async mode", (done) => {
            const stream = xz.decompressStream();
            let sawError = false;

            stream.on("error", () => {
                sawError = true;
            });
            stream.on("end", () => {
                assert.isOk(sawError);
                done();
            });
            stream.on("data", () => { });

            fs.createReadStream(commonFixturePath("small")).pipe(stream);
        });

        it("should bark loudly when given non-decodable data in sync mode", (done) => {
            const stream = xz.decompressStream({ sync: true });
            let sawError = false;

            stream.on("error", () => {
                sawError = true;
            });
            stream.on("end", () => {
                assert.isOk(sawError);
                done();
            });
            stream.on("data", () => { });

            fs.createReadStream(commonFixturePath("small")).pipe(stream);
        });
    });

    describe("#aloneEncoder", () => {
        it("should be undone by autoDecoder in async mode", (done) => {
            const enc = lzma.compressStream();
            const dec = xz.decompressStream();
            encodeAndDecode(enc, dec, done);
        });

        it("should be undone by autoDecoder in sync mode", (done) => {
            const enc = lzma.compressStream({ sync: true });
            const dec = xz.decompressStream({ sync: true });
            encodeAndDecode(enc, dec, done);
        });
    });

    describe("#easyEncoder", () => {
        [
            { value: lzma.PRESET_EXTREME, name: "e" },
            { value: 0, name: "" }
        ].map((presetFlag) => {
            [
                1, 3, 4, 6, 7, 9
            ].map((preset) => { // test only some presets
                [
                    { file: hamlet, name: "Hamlet" },
                    { file: randomData, name: "random test data" },
                    { file: largeRandom, name: "large random test data" },
                    { file: x86BinaryData, name: "x86 binary data" }
                ].map((entry) => {
                    [
                        { sync: true, name: "sync" },
                        { sync: false, name: "async" }
                    ].map(function (syncInfo) {
                        const info = `with ${entry.name}, preset = ${preset}${presetFlag.name}`;
                        it(`should be undone by autoDecoder in ${syncInfo.name} mode ${info}`, (done) => {
                            if (preset >= 7 && process.env.APPVEYOR) {
                                // Sometimes there’s not enough memory on AppVeyor machines. :-(
                                this.skip();
                                return;
                            }

                            const enc = xz.compressStream({
                                preset: preset | presetFlag.value,
                                sync: syncInfo.sync
                            });

                            const dec = xz.decompressStream();

                            encodeAndDecode(enc, dec, done, entry.file);
                        });
                    });
                });
            });
        });

        it("should correctly encode the empty string in async MT mode", (done) => {
            const enc = xz.compressStream({ threads: 2 });
            const dec = xz.decompressStream();
            encodeAndDecode(enc, dec, done, new BufferList(""));
        });

        it("should correctly encode the empty string in async MT mode with default threading", (done) => {
            const enc = xz.compressStream({ threads: 0 });
            const dec = xz.decompressStream();
            encodeAndDecode(enc, dec, done, new BufferList(""));
        });

        it("should correctly encode the empty string in sync MT mode", (done) => {
            const enc = xz.compressStream({ threads: 2, sync: true });
            const dec = xz.decompressStream();
            encodeAndDecode(enc, dec, done, new BufferList(""));
        });

        it("should correctly encode the empty string in async mode", (done) => {
            const enc = xz.compressStream();
            const dec = xz.decompressStream();
            encodeAndDecode(enc, dec, done, new BufferList(""));
        });

        it("should correctly encode the empty string in sync mode", (done) => {
            const enc = xz.compressStream({ sync: true });
            const dec = xz.decompressStream({ sync: true });
            encodeAndDecode(enc, dec, done, new BufferList(""));
        });

        it("should be reasonably fast for one big chunk", function (done) {
            // “node createData.js | xz -9 > /dev/null” takes about 120ms for me.
            this.timeout(360); // three times as long as the above shell pipeline
            const outstream = new helpers.NullStream();
            outstream.on("finish", done);
            const enc = xz.compressStream();
            enc.pipe(outstream);
            let x = 0;
            let y = 0;
            let str = "";
            for (let i = 0; i < 1000; ++i) {
                const data = { type: "position", x, y, i };
                str += `${JSON.stringify(data)},\n`;
                x += (i * 101) % 307;
                y += (i * 211) % 307;
            }
            enc.end(str);
        });

        it("should be reasonably fast for many small chunks", function (done) {
            // “node createData.js | xz -9 > /dev/null” takes about 120ms for me.
            this.timeout(360); // three times as long as the above shell pipeline
            const outstream = new helpers.NullStream();
            outstream.on("finish", done);
            const enc = xz.compressStream();
            enc.pipe(outstream);
            let x = 0;
            let y = 0;
            for (let i = 0; i < 1000; ++i) {
                const data = { type: "position", x, y, i };
                enc.write(`${JSON.stringify(data)},\n`);
                x += (i * 101) % 307;
                y += (i * 211) % 307;
            }
            enc.end();
        });
    });

    describe("#streamEncoder", () => {
        it("should be undone by autoDecoder in async mode using the x86 filter", (done) => {
            const enc = xz.createStream("streamEncoder", {
                filters: [
                    { id: lzma.FILTER_X86 },
                    { id: lzma.FILTER_LZMA2 }
                ],
                check: lzma.CHECK_SHA256
            });
            const dec = xz.decompressStream();

            encodeAndDecode(enc, dec, done, x86BinaryData);
        });

        it("should be undone by autoDecoder in sync mode using the x86 filter", (done) => {
            const enc = xz.createStream("streamEncoder", {
                filters: [
                    { id: lzma.FILTER_X86 },
                    { id: lzma.FILTER_LZMA2 }
                ],
                check: lzma.CHECK_SHA256,
                sync: true
            });
            const dec = xz.decompressStream({ sync: true });

            encodeAndDecode(enc, dec, done, x86BinaryData);
        });

        it("should be undone by autoDecoder in async mode using the x86 filter in MT mode", (done) => {
            const enc = xz.createStream("streamEncoder", {
                filters: [
                    { id: lzma.FILTER_X86 },
                    { id: lzma.FILTER_LZMA2 }
                ],
                check: lzma.CHECK_SHA256,
                threads: 2
            });
            const dec = xz.decompressStream();

            encodeAndDecode(enc, dec, done, x86BinaryData);
        });

        it("should be undone by autoDecoder in sync mode using the x86 filter in MT mode", (done) => {
            const enc = xz.createStream("streamEncoder", {
                filters: [
                    { id: lzma.FILTER_X86 },
                    { id: lzma.FILTER_LZMA2 }
                ],
                check: lzma.CHECK_SHA256,
                sync: true,
                threads: 2
            });
            const dec = xz.decompressStream({ sync: true });

            encodeAndDecode(enc, dec, done, x86BinaryData);
        });

        it("should be undone by streamDecoder in async mode using the delta filter", (done) => {
            const enc = xz.createStream("streamEncoder", {
                filters: [
                    { id: lzma.FILTER_DELTA, options: { dist: 2 } },
                    { id: lzma.FILTER_LZMA2 }
                ],
                check: lzma.CHECK_SHA256
            });
            const dec = xz.decompressStream();

            encodeAndDecode(enc, dec, done, x86BinaryData);
        });

        it("should be undone by streamDecoder in sync mode using the delta filter", (done) => {
            const enc = xz.createStream("streamEncoder", {
                filters: [
                    { id: lzma.FILTER_DELTA, options: { dist: 2 } },
                    { id: lzma.FILTER_LZMA2 }
                ],
                check: lzma.CHECK_SHA256,
                sync: true
            });
            const dec = xz.createStream("streamDecoder", { sync: true });

            encodeAndDecode(enc, dec, done, x86BinaryData);
        });

        it("should fail for an invalid combination of filter objects", () => {
            assert.throws(() => {
                xz.createStream("streamEncoder", {
                    filters: [
                        { id: lzma.FILTER_LZMA2 },
                        { id: lzma.FILTER_X86 }
                    ]
                });
            });
        });

        it("should fail for filters which do not expect options", () => {
            assert.throws(() => {
                xz.createStream("streamEncoder", {
                    filters: [
                        { id: lzma.FILTER_X86, options: { Banana: "Banana" } },
                        { id: lzma.FILTER_LZMA2 }
                    ]
                });
            });
        });
    });

    describe("#streamDecoder", () => {
        it("should accept an memlimit argument", () => {
            const memlimit = 20 << 20; /* 20 MB */
            const s = xz.createStream("streamDecoder", { memlimit, sync: true });

            assert.strictEqual(s.memlimitGet(), memlimit);
        });

        it("should fail when the memlimit argument is invalid", () => {
            assert.throws(() => {
                xz.createStream("streamDecorer", { memlimit: "ABC" });
            });
        });
    });

    describe("#rawEncoder", () => {
        const rawFilters = [
            { id: lzma.FILTER_X86 },
            { id: lzma.FILTER_LZMA2, options: { dictSize: 1 << 24 /* 16 MB */ } }
        ];

        it("should be undone by rawDecoder in async mode", (done) => {
            const enc = xz.createStream("rawEncoder", { filters: rawFilters });
            const dec = xz.createStream("rawDecoder", { filters: rawFilters });

            encodeAndDecode(enc, dec, done);
        });

        it("should be undone by rawDecoder in sync mode", (done) => {
            const enc = xz.createStream("rawEncoder", { filters: rawFilters, sync: true });
            const dec = xz.createStream("rawDecoder", { filters: rawFilters, sync: true });

            encodeAndDecode(enc, dec, done);
        });
    });

    describe("#memusage", () => {
        it("should return a meaningful value when decoding", (done) => {
            const stream = xz.decompressStream({ sync: true });
            stream.on("end", done);
            stream.on("data", () => { });

            fs.createReadStream(fixturePath("hamlet.txt.lzma")).pipe(stream);
            assert.isOk(stream.memusage() > 0);
        });

        it("should return null when encoding", () => {
            const stream = xz.compressStream({ sync: true });

            assert.strictEqual(stream.memusage(), null);
        });

        it("should fail when called with null or {} as the this object", () => {
            const stream = xz.decompressStream({ sync: true });
            assert.throws(stream.nativeStream.memusage.bind(null));
            assert.throws(stream.nativeStream.memusage.bind({}));
        });
    });

    describe("#memlimitGet/#memlimitSet", () => {
        it("should set values of memory limits", (done) => {
            const stream = xz.decompressStream({ sync: true });
            stream.on("end", done);
            stream.on("data", () => { });

            assert.isOk(stream.memlimitGet() > 0);
            stream.memlimitSet(1 << 30);
            assert.equal(stream.memlimitGet(), 1 << 30);
            fs.createReadStream(fixturePath("hamlet.txt.lzma")).pipe(stream);
        });

        it("should fail for invalid memory limit specifications", () => {
            const stream = xz.decompressStream({ sync: true });

            // use undefined because that’s never converted to Number
            assert.throws(() => {
                stream.memlimitSet(undefined);
            });
        });
    });

    describe("#totalIn/#totalOut", () => {
        it("should return meaningful values during the coding process", (done) => {
            const stream = xz.decompressStream({ sync: true });
            let valuesWereSet = false;

            stream.on("end", () => {
                assert(valuesWereSet);
                done();
            });

            stream.on("data", () => {
                valuesWereSet = valuesWereSet || stream.totalIn() > 0 && stream.totalOut() > 0;
            });

            fs.createReadStream(fixturePath("hamlet.txt.lzma")).pipe(stream);
        });
    });

    describe("bufsize", () => {
        it("Should only accept positive integers", () => {
            const stream = xz.compressStream({ sync: true });

            assert.throws(() => {
                stream.bufsize = "Not numeric";
            }, /bufsize must be a positive number/);

            assert.throws(() => {
                stream.bufsize = 0;
            }, /bufsize must be a positive number/);

            assert.throws(() => {
                stream.bufsize = -65536;
            }, /bufsize must be a positive number/);
        });

        it("Should default to 64k", () => {
            const stream = xz.compressStream({ sync: true });

            assert.strictEqual(stream.bufsize, 65536);
        });

        it("Should accept values from options", () => {
            const stream = xz.compressStream({ sync: true, bufsize: 16384 });

            assert.strictEqual(stream.bufsize, 16384);
        });

        it("Should be overridable", () => {
            const stream = xz.decompressStream({ sync: true });

            stream.bufsize = 8192;
            assert.strictEqual(stream.bufsize, 8192);
        });
    });

    describe("multi-stream files", () => {
        const zeroes = Buffer.alloc(16);

        it("can be decoded by #autoDecoder", (done) => {
            const enc1 = xz.compressStream({ sync: true });
            const enc2 = xz.compressStream({ sync: true });
            const dec = xz.decompressStream({ sync: true });

            dec.pipe(new BufferList((err, buf) => {
                assert.ifError(err);
                assert.strictEqual(buf.toString(), "abcdef");
                done();
            }));

            enc1.pipe(dec, { end: false });
            enc1.end("abc", () => {
                enc2.pipe(dec, { end: true });
                enc2.end("def");
            });
        });

        it("can be decoded by #autoDecoder with padding", async () => {
            const abc = await xz.compress("abc", { sync: true });
            const def = await xz.compress("def", { sync: true });
            const result = await xz.decompress(Buffer.concat([abc, zeroes, def]), { sync: true });
            expect(result.toString()).to.be.equal("abcdef");
        });

        it("supports padding without multi-stream files", async () => {
            const abc = await xz.compress("abc", { sync: true });
            const result = await xz.decompress(Buffer.concat([abc, zeroes]), { sync: true });
            expect(result.toString()).to.be.equal("abc");
        });
    });

    after("should not have any open async streams", async () => {
        await adone.promise.delay(100);
        assert.equal(adone.bind("lzma.node").Stream.curAsyncStreamsCount, 0);
    });
});
