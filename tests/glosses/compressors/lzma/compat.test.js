const { is, compressor: { lzma } } = adone;

describe("compressor", "lzma", () => {
    describe("compress()/decompress()", () => {
        it("can compress strings to Buffers", async () => {
            const result = await lzma.compress("Banana", { preset: 9 });
            assert.isOk(is.buffer(result));
            assert.isOk(result.length > 0);
        });
    
        it("can decompress integer arrays", async () => {
            const result = await lzma.decompress([
                0x5d, 0x00, 0x00, 0x80, 0x00, 0xff, 0xff, 0xff,  
                0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x21, 0x18, 
                0x49, 0xc6, 0x24, 0x17, 0x18, 0x93, 0x42, 0x5f,  
                0xff, 0xfd, 0xa2, 0xd0, 0x00
            ]);
            assert.isOk(is.buffer(result));
            assert.equal(result.toString(), "Banana");
        });
    
        it("can decompress typed integer arrays", async () => {
            const result = await lzma.decompress(new Uint8Array([
                0x5d, 0x00, 0x00, 0x80, 0x00, 0xff, 0xff, 0xff, 
                0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x21, 0x18, 
                0x49, 0xc6, 0x24, 0x17, 0x18, 0x93, 0x42, 0x5f,  
                0xff, 0xfd, 0xa2, 0xd0, 0x00
            ]));
            assert.isOk(is.buffer(result));
            assert.equal(result.toString(), "Banana");
        });
    
        it("can round-trip", async () => {
            const a = await lzma.compress("Bananas", { preset: 9 });
            assert.equal(a.toString("base64"), "XQAAAAT//////////wAhGEnQgnOEP++//7v9AAA=");

            const b = await lzma.decompress(a);
            assert.isOk(is.buffer(b));
            assert.equal(b.toString(), "Bananas");
        });
    });
});
