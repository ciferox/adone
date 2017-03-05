const { compressor: { xz } } = adone;

describe("glosses", "compressors", "lzma", "native internals", () => {
    describe("#code", () => {
        it("should fail for non-buffer input", () => {
            const stream = xz.decompress.stream({ sync: true });

            stream.nativeStream.bufferHandler = () => { };
            assert.throws(() => {
                stream.nativeStream.code("I am not a Buffer object");
            });
        });
    });
});
