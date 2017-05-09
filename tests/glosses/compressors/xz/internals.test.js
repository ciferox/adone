const { compressor: { xz } } = adone;

describe("glosses", "compressors", "xz", "native internals", () => {
    describe("#code", () => {
        it("should fail for non-buffer input", () => {
            const stream = xz.decompressStream({ sync: true });

            stream.nativeStream.bufferHandler = () => { };
            assert.throws(() => {
                stream.nativeStream.code("I am not a Buffer object");
            });
        });
    });
});
