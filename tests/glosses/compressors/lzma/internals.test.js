const { compressor: { xz } } = adone;

describe("glosses", "compressors", "lzma", "native internals", () => {
    describe("#code", () => {
        it("should fail for non-buffer input", () => {
            const stream = xz.decompressStream({ sync: true });

            stream.nativeStream.bufferHandler = adone.noop;
            assert.throws(() => {
                stream.nativeStream.code("I am not a Buffer object");
            });
        });
    });
});
