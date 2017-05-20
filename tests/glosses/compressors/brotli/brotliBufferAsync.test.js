const {
    compressor: { brotli },
    std: { fs, path }
} = adone;

function testBufferAsync(method, type, bufferFile, resultFile, done, params) {
    params = params || {};
    const buffer = fs.readFileSync(path.join(__dirname, "/fixtures/", bufferFile));
    const result = fs.readFileSync(path.join(__dirname, "/fixtures/", resultFile));
    if (type === "compress") {
        method(buffer, params).then((output) => {
            expect(Buffer.compare(output, result)).to.be.equal(0);

        }).then(done, done);
    }

    if (type === "decompress") {
        method(buffer).then((output) => {
            expect(Buffer.compare(output, result)).to.be.equal(0);
        }).then(done, done);
    }
}

describe("Brotli Buffer Async", () => {
    describe("compress", () => {
        it("should compress binary data", (done) => {
            testBufferAsync(brotli.compress, "compress", "data10k.bin", "data10k.bin.compressed", done);
        });

        it("should compress binary data with a custom dictionary", (done) => {
            testBufferAsync(brotli.compress, "compress", "data10k.bin", "data10k.bin.compressed.dict", done, { dictionary: Buffer.from("0123456789") });
        });

        it("should compress text data", (done) => {
            testBufferAsync(brotli.compress, "compress", "data.txt", "data.txt.compressed", done);
        });

        it("should compress text data with quality=3", (done) => {
            testBufferAsync(brotli.compress, "compress", "data.txt", "data.txt.compressed.03", done, { quality: 3 });
        });

        it("should compress text data with quality=9", (done) => {
            testBufferAsync(brotli.compress, "compress", "data.txt", "data.txt.compressed.09", done, { quality: 9 });
        });

        it("should compress an empty buffer", (done) => {
            testBufferAsync(brotli.compress, "compress", "empty", "empty.compressed", done);
        });

        it("should compress a large buffer", function (done) {
            this.timeout(30000);
            testBufferAsync(brotli.compress, "compress", "large.txt", "large.txt.compressed", done);
        });
    });

    describe("decompress", () => {
        it("should decompress binary data", (done) => {
            testBufferAsync(brotli.decompress, "decompress", "data10k.bin.compressed", "data10k.bin", done);
        });

        it("should decompress binary data with a custom dictionary", (done) => {
            testBufferAsync(brotli.decompress, "decompress", "data10k.bin.compressed.dict", "data10k.bin", done, { dictionary: Buffer.from("0123456789") });
        });

        it("should decompress text data", (done) => {
            testBufferAsync(brotli.decompress, "decompress", "data.txt.compressed", "data.txt", done);
        });

        it("should decompress to an empty buffer", (done) => {
            testBufferAsync(brotli.decompress, "decompress", "empty.compressed", "empty", done);
        });

        it("should decompress to a large buffer", function (done) {
            this.timeout(3000);
            testBufferAsync(brotli.decompress, "decompress", "large.compressed", "large", done);
        });

        it("should decompress to another large buffer", (done) => {
            testBufferAsync(brotli.decompress, "decompress", "large.txt.compressed", "large.txt", done);
        });
    });
});
