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

describe("Brotli Buffer Async", function () {
    describe("compress", function () {
        it("should compress binary data", function (done) {
            testBufferAsync(brotli.compress, "compress", "data10k.bin", "data10k.bin.compressed", done);
        });

        it("should compress text data", function (done) {
            testBufferAsync(brotli.compress, "compress", "data.txt", "data.txt.compressed", done);
        });

        it("should compress text data with quality=3", function (done) {
            testBufferAsync(brotli.compress, "compress", "data.txt", "data.txt.compressed.03", done, { quality: 3 });
        });

        it("should compress text data with quality=9", function (done) {
            testBufferAsync(brotli.compress, "compress", "data.txt", "data.txt.compressed.09", done, { quality: 9 });
        });

        it("should compress an empty buffer", function (done) {
            testBufferAsync(brotli.compress, "compress", "empty", "empty.compressed", done);
        });

        it("should compress a large buffer", function (done) {
            this.timeout(30000);
            testBufferAsync(brotli.compress, "compress", "large.txt", "large.txt.compressed", done);
        });
    });

    describe("decompress", function () {
        it("should decompress binary data", function (done) {
            testBufferAsync(brotli.decompress, "decompress", "data10k.bin.compressed", "data10k.bin", done);
        });

        it("should decompress text data", function (done) {
            testBufferAsync(brotli.decompress, "decompress", "data.txt.compressed", "data.txt", done);
        });

        it("should decompress to an empty buffer", function (done) {
            testBufferAsync(brotli.decompress, "decompress", "empty.compressed", "empty", done);
        });

        it("should decompress to a large buffer", function (done) {
            testBufferAsync(brotli.decompress, "decompress", "large.compressed", "large", done);
        });

        it("should decompress to another large buffer", function (done) {
            testBufferAsync(brotli.decompress, "decompress", "large.txt.compressed", "large.txt", done);
        });
    });
});
