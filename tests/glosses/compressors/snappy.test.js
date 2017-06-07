const { is } = adone;
const { compress, decompress, compressSync, isValidCompressedSync, decompressSync, isValidCompressed } = adone.compressor.snappy;
const inputString = "beep boop, hello world. OMG OMG OMG";
const inputBuffer = Buffer.from(inputString);

describe("compressor", "snappy", () => {
    it("compress() string", async () => {
        const buffer = await compress(inputString);
        assert.isTrue(is.buffer(buffer));
    });

    it("compress() buffer", async () => {
        const buffer = await compress(inputBuffer);
        assert.isTrue(is.buffer(buffer));
    });

    it("compress() bad input", () => {
        assert.throws(() => compress(123), "Input must be a String or a Buffer");
    });

    it("compressSync() string", () => {
        const buffer = compressSync(inputString);
        assert.isTrue(is.buffer(buffer));
    });

    it("compressSync() buffer", () => {
        const buffer = compressSync(inputBuffer);
        assert.isTrue(is.buffer(buffer));
    });

    it("isValidCompressed() on valid data", async () => {
        const compressed = await compress(inputBuffer);
        const isCompressed = await isValidCompressed(compressed);
        assert.isTrue(isCompressed);
    });

    it("isValidCompressed() on invalid data", async () => {
        const isCompressed = await isValidCompressed(Buffer.from("beep boop"));
        assert.isFalse(isCompressed);
    });

    it("isValidCompressedSync() on valid data", async () => {
        const compressed = await compress(inputBuffer);
        const isCompressed = isValidCompressedSync(compressed);
        assert.isTrue(isCompressed);
    });

    it("isValidCompressedSync() on invalid data", () => {
        const isCompressed = isValidCompressedSync(Buffer.from("beep boop"));
        assert.isFalse(isCompressed);
    });

    it("decompress() defaults to Buffer", async () => {
        const compressed = await compress(inputBuffer);
        const buffer = await decompress(compressed);
        assert.deepEqual(buffer, inputBuffer);
    });

    it("decompress() returning a Buffer", async () => {
        const compressed = await compress(inputBuffer);
        const buffer = await decompress(compressed, { asBuffer: true });
        assert.deepEqual(buffer, inputBuffer);
    });

    it("decompress() returning a String", async () => {
        const compressed = await compress(inputBuffer);
        const string = await decompress(compressed, { asBuffer: false });
        assert.deepEqual(string, inputString);
    });

    it("decompress() does not change opts", async () => {
        const compressed = await compress(inputBuffer);
        const opts = {};
        await decompress(compressed, opts);
        assert.deepEqual(opts, {});
    });

    it("decompress() on bad input", async () => {
        try {
            await decompress(Buffer.from("beep boop OMG OMG OMG"));
        } catch (err) {
            return;
        }
        assert.fail("Should have thrown");
    });

    it("decompress() on not a Buffer", () => {
        assert.throws(() => decompress("beep boop OMG OMG OMG", "input must be a Buffer"));
    });

    it("decompressSync() defaults to Buffer", async () => {
        const compressed = await compress(inputBuffer);
        const buffer = decompressSync(compressed);
        assert.deepEqual(buffer, inputBuffer);
    });

    it("decompressSync() returning a Buffer", async () => {
        const compressed = await compress(inputBuffer);
        const buffer = decompressSync(compressed, { asBuffer: true });
        assert.deepEqual(buffer, inputBuffer);
    });

    it("decompressSync() returning a String", async () => {
        const compressed = await compress(inputBuffer);
        const string = decompressSync(compressed, { asBuffer: false });
        assert.deepEqual(string, inputString);
    });

    it("decompress() does not change opts", async () => {
        const compressed = await compress(inputBuffer);
        const opts = {};
        decompressSync(compressed, opts);
        assert.deepEqual(opts, {});
    });

    it("decompressSync() on bad input", () => {
        assert.throws(() => decompressSync(Buffer.from("beep boop OMG OMG OMG")), "Invalid input");
    });
});
