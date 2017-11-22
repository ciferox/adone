describe("util", "terraformer", "wkx", () => {
    const { WKX } = adone.util.terraformer;

    describe("BinaryReader", () => {
        const { BinaryReader } = WKX;

        it("readVarInt", () => {
            assert.equal(new BinaryReader(Buffer.from("01", "hex")).readVarInt(), 1);
            assert.equal(new BinaryReader(Buffer.from("ac02", "hex")).readVarInt(), 300);
        });
    });
});
