const {
    compressor: { brotli },
    std: { fs, path }
} = adone;


function testBufferSync(method, bufferFile, resultFile, params) {
    params = params || {};
    const buffer = fs.readFileSync(path.join(__dirname, "/fixtures/", bufferFile));
    const result = fs.readFileSync(path.join(__dirname, "/fixtures/", resultFile));
    const output = method(buffer, params);
    expect(output).to.eql(result);
}

describe("Brotli Buffer Sync", function () {
    describe("compress", function () {
        it("should compress binary data", function () {
            testBufferSync(brotli.compress.sync, "data10k.bin", "data10k.bin.compressed");
        });

        it("should compress text data", function () {
            testBufferSync(brotli.compress.sync, "data.txt", "data.txt.compressed");
        });

        it("should compress text data with quality=3", function () {
            testBufferSync(brotli.compress.sync, "data.txt", "data.txt.compressed.03", { quality: 3 });
        });

        it("should compress text data with quality=9", function () {
            testBufferSync(brotli.compress.sync, "data.txt", "data.txt.compressed.09", { quality: 9 });
        });

        it("should compress an empty buffer", function () {
            testBufferSync(brotli.compress.sync, "empty", "empty.compressed");
        });

        it("should compress a large buffer", function () {
            this.timeout(30000);
            testBufferSync(brotli.compress.sync, "large.txt", "large.txt.compressed");
        });
    });

    describe("decompress", function () {
        it("should decompress binary data", function () {
            testBufferSync(brotli.decompress.sync, "data10k.bin.compressed", "data10k.bin");
        });

        it("should decompress text data", function () {
            testBufferSync(brotli.decompress.sync, "data.txt.compressed", "data.txt");
        });

        it("should decompress to an empty buffer", function () {
            testBufferSync(brotli.decompress.sync, "empty.compressed", "empty");
        });

        it("should decompress to a large buffer", function () {
            testBufferSync(brotli.decompress.sync, "large.compressed", "large");
        });

        it("should decompress to another large buffer", function () {
            testBufferSync(brotli.decompress.sync, "large.txt.compressed", "large.txt");
        });
    });
});
