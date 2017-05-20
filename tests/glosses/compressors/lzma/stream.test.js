import * as helpers from "./helpers";

const { std: { fs, path }, compressor: { lzma, xz }, collection: { BufferList } } = adone;

describe("glosses", "compressors", "lzma", "stream", () => {
    const commonFixturePath = (relPath) => path.join(__dirname, "../..", "fixtures", relPath);

    const fixturePath = (relPath) => path.join(__dirname, "fixtures", relPath);

    let randomData;
    let hamlet;

    const encodeAndDecode = (enc, dec, done, data) => {
        data = data || randomData;

        data.duplicate().pipe(enc).pipe(dec).pipe(new BufferList((err, buf) => {
            assert.isOk(helpers.bufferEqual(data, buf));
            done(err);
        }));
    };

    before("read random test data", (done) => {
        randomData = new BufferList(done);
        fs.createReadStream(commonFixturePath("small")).pipe(randomData);
    });

    before("read hamlet.txt test data", (done) => {
        hamlet = new BufferList(done);
        fs.createReadStream(fixturePath("hamlet.txt.xz")).pipe(xz.decompressStream()).pipe(hamlet);
    });

    describe("#autoDecoder", () => {
        it("should be able to decode .lzma in async mode", (done) => {
            const stream = lzma.decompressStream();
            stream.on("end", done);
            stream.on("data", adone.noop);

            if (lzma.asyncCodeAvailable) {
                assert.isOk(!stream.sync);
            }

            fs.createReadStream(fixturePath("hamlet.txt.lzma")).pipe(stream);
        });

        it("should be able to decode .lzma in sync mode", (done) => {
            const stream = lzma.decompressStream({ sync: true });
            stream.on("end", done);
            stream.on("data", adone.noop);

            assert.isOk(stream.sync);

            fs.createReadStream(fixturePath("hamlet.txt.lzma")).pipe(stream);
        });

        it("should bark loudly when given non-decodable data in async mode", (done) => {
            const stream = lzma.decompressStream();
            let sawError = false;

            stream.on("error", () => {
                sawError = true;
            });
            stream.on("end", () => {
                assert.isOk(sawError);
                done();
            });
            stream.on("data", adone.noop);

            fs.createReadStream(commonFixturePath("small")).pipe(stream);
        });

        it("should bark loudly when given non-decodable data in sync mode", (done) => {
            const stream = lzma.decompressStream({ sync: true });
            let sawError = false;

            stream.on("error", () => {
                sawError = true;
            });
            stream.on("end", () => {
                assert.isOk(sawError);
                done();
            });
            stream.on("data", adone.noop);

            fs.createReadStream(commonFixturePath("small")).pipe(stream);
        });
    });

    describe("#aloneEncoder", () => {
        it("should be undone by aloneDecoder in async mode", (done) => {
            const enc = lzma.compressStream();
            const dec = lzma.decompressStream();
            encodeAndDecode(enc, dec, done);
        });

        it("should be undone by aloneDecoder in sync mode", (done) => {
            const enc = lzma.compressStream({ sync: true });
            const dec = lzma.decompressStream({ sync: true });
            encodeAndDecode(enc, dec, done);
        });
    });

    describe("createStream", () => {
        it("should be the same as xz.createStream", () => {
            assert.equal(xz.createStream, lzma.createStream);
        });
    });

    describe("#memusage", () => {
        it("should return a meaningful value when decoding", (done) => {
            const stream = lzma.decompressStream({ sync: true });
            stream.on("end", done);
            stream.on("data", adone.noop);

            fs.createReadStream(fixturePath("hamlet.txt.lzma")).pipe(stream);
            assert.isOk(stream.memusage() > 0);
        });

        it("should return null when encoding", () => {
            const stream = lzma.compressStream({ sync: true });

            assert.strictEqual(stream.memusage(), null);
        });

        it("should fail when called with null or {} as the this object", () => {
            const stream = lzma.decompressStream({ sync: true });
            assert.throws(stream.nativeStream.memusage.bind(null));
            assert.throws(stream.nativeStream.memusage.bind({}));
        });
    });

    describe("#memlimitGet/#memlimitSet", () => {
        it("should set values of memory limits", (done) => {
            const stream = lzma.decompressStream({ sync: true });
            stream.on("end", done);
            stream.on("data", adone.noop);

            assert.isOk(stream.memlimitGet() > 0);
            stream.memlimitSet(1 << 30);
            assert.equal(stream.memlimitGet(), 1 << 30);
            fs.createReadStream(fixturePath("hamlet.txt.lzma")).pipe(stream);
        });

        it("should fail for invalid memory limit specifications", () => {
            const stream = lzma.decompressStream({ sync: true });

            // use undefined because that’s never converted to Number
            assert.throws(() => {
                stream.memlimitSet(undefined);
            });
        });
    });

    describe("#totalIn/#totalOut", () => {
        it("should return meaningful values during the coding process", (done) => {
            const stream = lzma.decompressStream({ sync: true });
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
            const stream = lzma.compressStream({ sync: true });

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
            const stream = lzma.compressStream({ sync: true });

            assert.strictEqual(stream.bufsize, 65536);
        });

        it("Should accept values from options", () => {
            const stream = lzma.compressStream({ sync: true, bufsize: 16384 });

            assert.strictEqual(stream.bufsize, 16384);
        });

        it("Should be overridable", () => {
            const stream = lzma.decompressStream({ sync: true });

            stream.bufsize = 8192;
            assert.strictEqual(stream.bufsize, 8192);
        });
    });

    after("should not have any open async streams", async () => {
        await adone.promise.delay(100);
        assert.equal(adone.bind("lzma.node").Stream.curAsyncStreamsCount, 0);
    });
});
