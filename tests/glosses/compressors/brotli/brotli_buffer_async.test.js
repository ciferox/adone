const { std: { fs, path }, compressor: { brotli } } = adone;

const testBufferAsync = (method, bufferFile, resultFile, done, params) => {
    params = params || {};
    const buffer = fs.readFileSync(path.join(__dirname, "/fixtures/", bufferFile));
    const result = fs.readFileSync(path.join(__dirname, "/fixtures/", resultFile));

    method(buffer, params).then((output) => {
        expect(Buffer.compare(output, result)).to.be.equal(0);
        done();
    });
};

describe("Brotli Buffer Async", () => {
    describe("compress", () => {
        it("should compress binary data", (done) => {
            testBufferAsync(brotli.compress, "data10k.bin", "data10k.bin.compressed", done);
        });

        it("should compress binary data with a custom dictionary", (done) => {
            testBufferAsync(brotli.compress, "data10k.bin", "data10k.bin.compressed.dict", done, { dictionary: Buffer.from("0123456789") });
        });

        it("should compress text data", (done) => {
            testBufferAsync(brotli.compress, "data.txt", "data.txt.compressed", done);
        });

        it("should compress text data with quality=3", (done) => {
            testBufferAsync(brotli.compress, "data.txt", "data.txt.compressed.03", done, { quality: 3 });
        });

        it("should compress text data with quality=9", (done) => {
            testBufferAsync(brotli.compress, "data.txt", "data.txt.compressed.09", done, { quality: 9 });
        });

        it("should compress an empty buffer", (done) => {
            testBufferAsync(brotli.compress, "empty", "empty.compressed", done);
        });

        it("should compress a large buffer", function (done) {
            if (process.env.SKIP_LARGE_BUFFER_TEST) {
                this.skip();
            }

            this.timeout(30000);
            testBufferAsync(brotli.compress, "large.txt", "large.txt.compressed", done);
        });
    });

    describe("decompress", () => {
        it("should decompress binary data", (done) => {
            testBufferAsync(brotli.decompress, "data10k.bin.compressed", "data10k.bin", done);
        });

        it("should decompress binary data with a custom dictionary", (done) => {
            testBufferAsync(brotli.decompress, "data10k.bin.compressed.dict", "data10k.bin", done, { dictionary: Buffer.from("0123456789") });
        });

        it("should decompress text data", (done) => {
            testBufferAsync(brotli.decompress, "data.txt.compressed", "data.txt", done);
        });

        it("should decompress to an empty buffer", (done) => {
            testBufferAsync(brotli.decompress, "empty.compressed", "empty", done);
        });

        it("should decompress to a large buffer", function (done) {
            this.timeout(30000);
            testBufferAsync(brotli.decompress, "large.compressed", "large", done);
        });

        it("should decompress to another large buffer", function (done) {
            if (process.env.SKIP_LARGE_BUFFER_TEST) {
                this.skip();
            }

            this.timeout(30000);
            testBufferAsync(brotli.decompress, "large.txt.compressed", "large.txt", done);
        });
    });
});
