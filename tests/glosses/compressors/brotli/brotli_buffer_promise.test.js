/* eslint-disable func-style */
const {
    compressor: { brotli }
} = adone;

import { readFileSync } from "fs";
import { join } from "path";

async function testBuffer(method, bufferFile, resultFile, params = {}) {
    const buffer = readFileSync(join(__dirname, "/fixtures/", bufferFile));
    const result = readFileSync(join(__dirname, "/fixtures/", resultFile));

    const output = await (method.name === "compress" ? method(buffer, params) : method(buffer));
    assert.ok(output.equals(result));
}

async function testBufferError(method) {
    const err = await assert.throws(async () => method("not a buffer"));
    assert.equal(err.message, "Brotli input is not a buffer.");
}

it("compress binary data", async () => {
    await testBuffer(brotli.compress, "data10k.bin", "data10k.bin.compressed");
});

it("compress text data", async () => {
    await testBuffer(brotli.compress, "data.txt", "data.txt.compressed");
});

it("compress text data with quality=3", async () => {
    await testBuffer(brotli.compress, "data.txt", "data.txt.compressed.03", { quality: 3 });
});

it("compress text data with quality=9", async () => {
    await testBuffer(brotli.compress, "data.txt", "data.txt.compressed.09", { quality: 9 });
});

it("compress an empty buffer", async () => {
    await testBuffer(brotli.compress, "empty", "empty.compressed");
});

it("compress a random buffer", async () => {
    await testBuffer(brotli.compress, "rand", "rand.compressed");
});

it("compress a large buffer", async () => {
    await testBuffer(brotli.compress, "large.txt", "large.txt.compressed");
});

it("reject with an error when the compression input is not a buffer", async () => {
    await testBufferError(brotli.compress);
});

it("decompress binary data", async () => {
    await testBuffer(brotli.decompress, "data10k.bin.compressed", "data10k.bin");
});

it("decompress text data", async () => {
    await testBuffer(brotli.decompress, "data.txt.compressed", "data.txt");
});

it("decompress to an empty buffer", async () => {
    await testBuffer(brotli.decompress, "empty.compressed", "empty");
});

it("decompress a random buffer", async () => {
    await testBuffer(brotli.decompress, "rand.compressed", "rand");
});

it("decompress to a large buffer", async () => {
    await testBuffer(brotli.decompress, "large.compressed", "large");
});

it("decompress to another large buffer", async () => {
    await testBuffer(brotli.decompress, "large.txt.compressed", "large.txt");
});

it("reject with an error when the decompression input is not a buffer", async () => {
    return testBufferError(brotli.decompress);
});
