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

function testStream(method, bufferFile, resultFile, done, params) {
    const writeStream = new BufferWriter();

    const emit = writeStream.emit;
    writeStream.emit = function(...args) {
        return emit.apply(this, args);
    };

    fs.createReadStream(path.join(__dirname, "/fixtures/", bufferFile))
        .pipe(method(params))
        .pipe(writeStream);

    writeStream.on("finish", function () {
        const result = fs.readFileSync(path.join(__dirname, "/fixtures/", resultFile));
        expect(Buffer.compare(writeStream.data, result)).to.be.equal(0);
        done();
    });
}

describe("Brotli Stream", function () {
    describe("compress", function () {
        it("should compress binary data", function (done) {
            testStream(brotli.compress.stream, "data10k.bin", "data10k.bin.compressed", done);
        });

        it("should compress text data", function (done) {
            testStream(brotli.compress.stream, "data.txt", "data.txt.compressed", done);
        });

        it("should compress text data with quality=3", function (done) {
            testStream(brotli.compress.stream, "data.txt", "data.txt.compressed.03", done, { quality: 3 });
        });

        it("should compress text data with quality=9", function (done) {
            testStream(brotli.compress.stream, "data.txt", "data.txt.compressed.09", done, { quality: 9 });
        });

        it("should compress an empty buffer", function (done) {
            testStream(brotli.compress.stream, "empty", "empty.compressed", done);
        });

        it("should compress a large buffer", function (done) {
            this.timeout(30000);
            testStream(brotli.compress.stream, "large.txt", "large.txt.compressed", done);
        });
    });

    describe("decompress", function () {
        it("should decompress binary data", function (done) {
            testStream(brotli.decompress.stream, "data10k.bin.compressed", "data10k.bin", done);
        });

        it("should decompress text data", function (done) {
            testStream(brotli.decompress.stream, "data.txt.compressed", "data.txt", done);
        });

        it("should decompress to an empty buffer", function (done) {
            testStream(brotli.decompress.stream, "empty.compressed", "empty", done);
        });

        it("should decompress to a large buffer", function (done) {
            this.timeout(30000);
            testStream(brotli.decompress.stream, "large.compressed", "large", done);
        });

        it("should decompress to another large buffer", function (done) {
            testStream(brotli.decompress.stream, "large.txt.compressed", "large.txt", done);
        });
    });
});
