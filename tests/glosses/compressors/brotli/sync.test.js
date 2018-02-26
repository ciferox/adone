const {
    is,
    std: { fs, path },
    compressor: { brotli }
} = adone;

const testBufferSync = (method, bufferFile, resultFile, params) => {
    params = params || {};
    const buffer = fs.readFileSync(path.join(__dirname, "/fixtures/", bufferFile));
    const result = fs.readFileSync(path.join(__dirname, "/fixtures/", resultFile));
    const output = method(buffer, params);
    expect(output).to.deep.equal(result);
};

describe("compressor", "brotli", "sync", () => {
    describe("compress", () => {
        it("should compress binary data", () => {
            testBufferSync(brotli.compressSync, "data10k.bin", "data10k.bin.compressed");
        });

        it("should compress text data", () => {
            testBufferSync(brotli.compressSync, "data.txt", "data.txt.compressed");
        });

        it("should compress text data with quality=3", () => {
            testBufferSync(brotli.compressSync, "data.txt", "data.txt.compressed.03", { quality: 3 });
        });

        it("should compress text data with quality=9", () => {
            testBufferSync(brotli.compressSync, "data.txt", "data.txt.compressed.09", { quality: 9 });
        });

        it("should compress an empty buffer", () => {
            testBufferSync(brotli.compressSync, "empty", "empty.compressed");
        });

        it("should compress a random buffer", function () {
            this.timeout(30000);
            testBufferSync(brotli.compressSync, "rand", "rand.compressed");
        });

        it("should compress a large buffer", function () {
            this.timeout(30000);
            testBufferSync(brotli.compressSync, "large.txt", "large.txt.compressed");
        });
    });

    describe("decompress", () => {
        it("should decompress binary data", () => {
            testBufferSync(brotli.decompressSync, "data10k.bin.compressed", "data10k.bin");
        });

        it("should decompress text data", () => {
            testBufferSync(brotli.decompressSync, "data.txt.compressed", "data.txt");
        });

        it("should decompress to an empty buffer", () => {
            testBufferSync(brotli.decompressSync, "empty.compressed", "empty");
        });

        it("should decompress to a large buffer", function () {
            this.timeout(30000);
            testBufferSync(brotli.decompressSync, "large.compressed", "large");
        });

        it("should decompress to another large buffer", function () {
            this.timeout(30000);
            testBufferSync(brotli.decompressSync, "large.txt.compressed", "large.txt");
        });
    });
});
