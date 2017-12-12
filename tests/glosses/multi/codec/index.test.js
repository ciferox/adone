const {
    multi: { codec }
} = adone;

describe("codec", () => {
    it("add prefix through codec (string)", () => {
        const buf = Buffer.from("hey");
        const prefixedBuf = codec.addPrefix("protobuf", buf);
        expect(codec.getCodec(prefixedBuf)).to.equal("protobuf");
        expect(buf).to.eql(codec.rmPrefix(prefixedBuf));
    });

    it("add prefix through code (code)", () => {
        const buf = Buffer.from("hey");
        const prefixedBuf = codec.addPrefix(Buffer.from("70", "hex"), buf);
        expect(codec.getCodec(prefixedBuf)).to.equal("dag-pb");
        expect(buf).to.eql(codec.rmPrefix(prefixedBuf));
    });

    it("add multibyte varint prefix (eth-block) through codec (string)", () => {
        const buf = Buffer.from("hey");
        const prefixedBuf = codec.addPrefix("eth-block", buf);
        expect(codec.getCodec(prefixedBuf)).to.equal("eth-block");
        expect(buf).to.eql(codec.rmPrefix(prefixedBuf));
    });
});
