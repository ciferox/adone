/* eslint-disable func-style */
const {
    compressor: { brotli }
} = adone;

import { readFileSync } from "fs";
import { join } from "path";

function testBuffer(method, bufferFile, resultFile, params = {}) {
    const buffer = readFileSync(join(__dirname, "/fixtures/", bufferFile));
    const result = readFileSync(join(__dirname, "/fixtures/", resultFile));
    const output = method(buffer, params);
    assert.ok(output.equals(result));
}

function testBufferError(method) {
    assert.throws(() => {
        method("not a buffer");
    }, "Brotli input is not a buffer.");
}

it("compress binary data", () => {
    testBuffer(brotli.compressSync, "data10k.bin", "data10k.bin.compressed");
});

it("compress text data", () => {
    testBuffer(brotli.compressSync, "data.txt", "data.txt.compressed");
});

it("compress text data with quality=3", () => {
    testBuffer(brotli.compressSync, "data.txt", "data.txt.compressed.03", { quality: 3 });
});

it("compress text data with quality=9", () => {
    testBuffer(brotli.compressSync, "data.txt", "data.txt.compressed.09", { quality: 9 });
});

it("compress an empty buffer", () => {
    testBuffer(brotli.compressSync, "empty", "empty.compressed");
});

it("compress a random buffer", () => {
    testBuffer(brotli.compressSync, "rand", "rand.compressed");
});

it("compress a large buffer", () => {
    testBuffer(brotli.compressSync, "large.txt", "large.txt.compressed");
});

it("throw when the compression input is not a buffer", () => {
    testBufferError(brotli.compressSync);
});

it("decompress binary data", () => {
    testBuffer(brotli.decompressSync, "data10k.bin.compressed", "data10k.bin");
});

it("decompress text data", () => {
    testBuffer(brotli.decompressSync, "data.txt.compressed", "data.txt");
});

it("decompress to an empty buffer", () => {
    testBuffer(brotli.decompressSync, "empty.compressed", "empty");
});

it("decompress a random buffer", () => {
    testBuffer(brotli.decompressSync, "rand.compressed", "rand");
});

it("decompress to a large buffer", () => {
    testBuffer(brotli.decompressSync, "large.compressed", "large");
});

it("decompress to another large buffer", () => {
    testBuffer(brotli.decompressSync, "large.txt.compressed", "large.txt");
});

it("throw when the decompression input is not a buffer", () => {
    testBufferError(brotli.decompressSync);
});
