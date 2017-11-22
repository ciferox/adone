describe("util", "terraformer", "wkx", () => {
    const { WKX } = adone.util.terraformer;

    describe("BinaryWriter", () => {
        const { BinaryWriter } = WKX;

        it("writeVarInt - 1", () => {
            const binaryWriter = new BinaryWriter(1);
            const length = binaryWriter.writeVarInt(1);

            assert.equal(binaryWriter.buffer.toString("hex"), "01");
            assert.equal(length, 1);
        });
        it("writeVarInt - 300", () => {
            const binaryWriter = new BinaryWriter(2);
            const length = binaryWriter.writeVarInt(300);

            assert.equal(binaryWriter.buffer.toString("hex"), "ac02");
            assert.equal(length, 2);
        });
        it("writeUInt8 - enough space", () => {
            const binaryWriter = new BinaryWriter(1);
            binaryWriter.writeUInt8(1);
            assert.equal(binaryWriter.buffer.length, 1);
            assert.equal(binaryWriter.position, 1);
        });
        it("writeUInt16LE - not enough space", () => {
            const binaryWriter = new BinaryWriter(1);
            assert.throws(() => {
                binaryWriter.writeUInt16LE(1);
            }, "index out of range");
        });
        it("writeUInt8 - enough space / allow resize", () => {
            const binaryWriter = new BinaryWriter(1, true);
            binaryWriter.writeUInt8(1);
            assert.equal(binaryWriter.buffer.length, 1);
            assert.equal(binaryWriter.position, 1);
        });
        it("writeUInt16LE - not enough space  / allow resize", () => {
            const binaryWriter = new BinaryWriter(1, true);
            binaryWriter.writeUInt16LE(1);
            assert.equal(binaryWriter.buffer.length, 2);
            assert.equal(binaryWriter.position, 2);
        });
    });
});
