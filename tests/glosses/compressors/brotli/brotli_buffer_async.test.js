/* eslint-disable func-style */

const {
    is,
    compressor: { brotli }
} = adone;

import { readFileSync } from "fs";
import { join } from "path";

function testBuffer(method, bufferFile, resultFile, done, params = {}) {
    const buffer = readFileSync(join(__dirname, "/fixtures/", bufferFile));
    const result = readFileSync(join(__dirname, "/fixtures/", resultFile));

    function cb(err, output) {
        assert.ok(output.equals(result));
        done(err);
    }

    if (method.name === "compress") {
        method(buffer, params, cb);
    }

    if (method.name === "decompress") {
        method(buffer, cb);
    }
}

async function testBufferError(method) {
    const err = await assert.throws(async () => new Promise(((resolve, reject) => {
        method("not a buffer", (err) => {
            err ? reject(err) : resolve();
        });
    })));
    assert.equal(err.message, "Brotli input is not a buffer.");
}

it("compress binary data", async (done) => {
    await testBuffer(brotli.compress, "data10k.bin", "data10k.bin.compressed", done);
});

it("compress text data", async (done) => {
    await testBuffer(brotli.compress, "data.txt", "data.txt.compressed", done);
});

it("compress text data with quality=3", async (done) => {
    await testBuffer(brotli.compress, "data.txt", "data.txt.compressed.03", done, { quality: 3 });
});

it("compress text data with quality=9", async (done) => {
    await testBuffer(brotli.compress, "data.txt", "data.txt.compressed.09", done, { quality: 9 });
});

it("compress an empty buffer", async (done) => {
    await testBuffer(brotli.compress, "empty", "empty.compressed", done);
});

it("compress a random buffer", async (done) => {
    await testBuffer(brotli.compress, "rand", "rand.compressed", done);
});

it("compress a large buffer", async (done) => {
    await testBuffer(brotli.compress, "large.txt", "large.txt.compressed", done);
});

it("call back with an error when the compress input is not a buffer", async () => {
    await testBufferError(brotli.compress);
});

it("decompress binary data", async (done) => {
    await testBuffer(brotli.decompress, "data10k.bin.compressed", "data10k.bin", done);
});

it("decompress text data", async (done) => {
    await testBuffer(brotli.decompress, "data.txt.compressed", "data.txt", done);
});

it("decompress to an empty buffer", async (done) => {
    await testBuffer(brotli.decompress, "empty.compressed", "empty", done);
});

it("decompress a random buffer", async (done) => {
    await testBuffer(brotli.decompress, "rand.compressed", "rand", done);
});

it("decompress to a large buffer", async (done) => {
    await testBuffer(brotli.decompress, "large.compressed", "large", done);
});

it("decompress to another large buffer", async (done) => {
    await testBuffer(brotli.decompress, "large.txt.compressed", "large.txt", done);
});

it("call back with an error when the decompression input is not a buffer", async () => {
    await testBufferError(brotli.decompress);
});
