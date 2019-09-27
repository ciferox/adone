/* eslint-disable func-style */
const {
    compressor: { brotli }
} = adone;

import { Writable } from "stream";
import { createReadStream, readFileSync } from "fs";
import { join } from "path";

class BufferWriter extends Writable {
    constructor() {
        super();
        this.chunks = [];
        this.size = 0;
    }

    _write(chunk, encoding, next) {
        this.chunks.push(chunk);
        this.size += chunk.length;
        next();
    }

    get data() {
        return Buffer.concat(this.chunks, this.size);
    }
}

function testStream(method, bufferFile, resultFile, done, params) {
    const writeStream = new BufferWriter();

    createReadStream(join(__dirname, "/fixtures/", bufferFile))
        .pipe(method(params))
        .pipe(writeStream);

    writeStream.on("finish", () => {
        const result = readFileSync(join(__dirname, "/fixtures/", resultFile));
        assert.ok(writeStream.data.equals(result));
        done();
    });
}

it("compress binary data", (done) => {
    testStream(brotli.compressStream, "data10k.bin", "data10k.bin.compressed", done);
});

it("compress text data", (done) => {
    testStream(brotli.compressStream, "data.txt", "data.txt.compressed", done);
});

it("compress text data with quality=3", (done) => {
    testStream(brotli.compressStream, "data.txt", "data.txt.compressed.03", done, { quality: 3 });
});

it("compress text data with quality=9", (done) => {
    testStream(brotli.compressStream, "data.txt", "data.txt.compressed.09", done, { quality: 9 });
});

it("compress an empty buffer", (done) => {
    testStream(brotli.compressStream, "empty", "empty.compressed", done);
});

it("compress a random buffer", (done) => {
    testStream(brotli.compressStream, "rand", "rand.compressed", done);
});

it("compress a large buffer", (done) => {
    testStream(brotli.compressStream, "large.txt", "large.txt.compressed", done);
});

it("flush data", (done) => {
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
        assert.ok(writeStream.data.equals(Buffer.concat([buf1, buf2])));
        done();
    });
});

it("decompress binary data", (done) => {
    testStream(brotli.decompressStream, "data10k.bin.compressed", "data10k.bin", done);
});

it("decompress text data", (done) => {
    testStream(brotli.decompressStream, "data.txt.compressed", "data.txt", done);
});

it("decompress to an empty buffer", (done) => {
    testStream(brotli.decompressStream, "empty.compressed", "empty", done);
});

it("decompress to a random buffer", (done) => {
    testStream(brotli.decompressStream, "rand.compressed", "rand", done);
});

it("decompress to a large buffer", (done) => {
    testStream(brotli.decompressStream, "large.compressed", "large", done);
});

it("decompress to another large buffer", (done) => {
    testStream(brotli.decompressStream, "large.txt.compressed", "large.txt", done);
});
