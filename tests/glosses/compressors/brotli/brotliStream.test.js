const {
    compressor: { brotli },
    std: {
        stream: { Writable },
        fs,
        path
    }
} = adone;

class BufferWriter extends Writable {
    constructor() {
        super();
        this.data = Buffer.alloc(0);
    }

    _write(chunk, enc, callback) {
        this.data = Buffer.concat([this.data, chunk], this.data.length + chunk.length);
        callback();
    }
}

const testStream = (method, bufferFile, resultFile, done, params) => {
    const writeStream = new BufferWriter();

    const emit = writeStream.emit;
    writeStream.emit = function (...args) {
        return emit.apply(this, args);
    };

    fs.createReadStream(path.join(__dirname, "/fixtures/", bufferFile))
        .pipe(method(params))
        .pipe(writeStream);

    writeStream.on("finish", () => {
        const result = fs.readFileSync(path.join(__dirname, "/fixtures/", resultFile));
        expect(Buffer.compare(writeStream.data, result)).to.be.equal(0);
        done();
    });
};

describe("Brotli Stream", () => {
    describe("compress", () => {
        it("should compress binary data", (done) => {
            testStream(brotli.compressStream, "data10k.bin", "data10k.bin.compressed", done);
        });

        it("should compress binary data", (done) => {
            testStream(brotli.compressStream, "data10k.bin", "data10k.bin.compressed.dict", done, { dictionary: Buffer.from("0123456789") });
        });

        it("should compress text data", (done) => {
            testStream(brotli.compressStream, "data.txt", "data.txt.compressed", done);
        });

        it("should compress text data with quality=3", (done) => {
            testStream(brotli.compressStream, "data.txt", "data.txt.compressed.03", done, { quality: 3 });
        });

        it("should compress text data with quality=9", (done) => {
            testStream(brotli.compressStream, "data.txt", "data.txt.compressed.09", done, { quality: 9 });
        });

        it("should compress an empty buffer", (done) => {
            testStream(brotli.compressStream, "empty", "empty.compressed", done);
        });

        it("should compress a large buffer", function (done) {
            this.timeout(30000);
            testStream(brotli.compressStream, "large.txt", "large.txt.compressed", done);
        });

        it("should flush data", (done) => {
            const buf1 = Buffer.from("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
            const buf2 = Buffer.from("Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.");

            const stream = brotli.compressStream();
            const writeStream = new BufferWriter();

            stream
                .pipe(brotli.decompressStream())
                .pipe(writeStream);

            stream.write(buf1);
            stream.flush();
            stream.once("data", () => {
                stream.end(buf2);
            });

            writeStream.on("finish", () => {
                expect(writeStream.data).to.deep.equal(Buffer.concat([buf1, buf2]));
                done();
            });
        });
    });

    describe("decompress", () => {
        it("should decompress binary data", (done) => {
            testStream(brotli.decompressStream, "data10k.bin.compressed", "data10k.bin", done);
        });

        it("should decompress binary data", (done) => {
            testStream(brotli.decompressStream, "data10k.bin.compressed.dict", "data10k.bin", done, { dictionary: Buffer.from("0123456789") });
        });

        it("should decompress text data", (done) => {
            testStream(brotli.decompressStream, "data.txt.compressed", "data.txt", done);
        });

        it("should decompress to an empty buffer", (done) => {
            testStream(brotli.decompressStream, "empty.compressed", "empty", done);
        });

        it("should decompress to a large buffer", function (done) {
            this.timeout(30000);
            testStream(brotli.decompressStream, "large.compressed", "large", done);
        });

        it("should decompress to another large buffer", (done) => {
            testStream(brotli.decompressStream, "large.txt.compressed", "large.txt", done);
        });
    });
});
