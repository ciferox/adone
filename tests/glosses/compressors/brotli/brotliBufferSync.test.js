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

describe("Brotli Buffer Sync", () => {
    describe("compress", () => {
        it("should compress binary data", () => {
            testBufferSync(brotli.compress.sync, "data10k.bin", "data10k.bin.compressed");
        });

        it("should compress binary data with a custom dictionary", () => {
            testBufferSync(brotli.compress.sync, "data10k.bin", "data10k.bin.compressed.dict", { dictionary: Buffer.from("0123456789") });
        });

        it("should compress text data", () => {
            testBufferSync(brotli.compress.sync, "data.txt", "data.txt.compressed");
        });

        it("should compress text data with quality=3", () => {
            testBufferSync(brotli.compress.sync, "data.txt", "data.txt.compressed.03", { quality: 3 });
        });

        it("should compress text data with quality=9", () => {
            testBufferSync(brotli.compress.sync, "data.txt", "data.txt.compressed.09", { quality: 9 });
        });

        it("should compress an empty buffer", () => {
            testBufferSync(brotli.compress.sync, "empty", "empty.compressed");
        });

        it("should compress a large buffer", function () {
            this.timeout(30000);
            testBufferSync(brotli.compress.sync, "large.txt", "large.txt.compressed");
        });
    });

    describe("decompress", () => {
        it("should decompress binary data", () => {
            testBufferSync(brotli.decompress.sync, "data10k.bin.compressed", "data10k.bin");
        });

        it("should decompress binary data with a custom dictionary", () => {
            testBufferSync(brotli.decompress.sync, "data10k.bin.compressed.dict", "data10k.bin", { dictionary: Buffer.from("0123456789") });
        });

        it("should decompress text data", () => {
            testBufferSync(brotli.decompress.sync, "data.txt.compressed", "data.txt");
        });

        it("should decompress to an empty buffer", () => {
            testBufferSync(brotli.decompress.sync, "empty.compressed", "empty");
        });

        it("should decompress to a large buffer", () => {
            testBufferSync(brotli.decompress.sync, "large.compressed", "large");
        });

        it("should decompress to another large buffer", () => {
            testBufferSync(brotli.decompress.sync, "large.txt.compressed", "large.txt");
        });
    });
});
