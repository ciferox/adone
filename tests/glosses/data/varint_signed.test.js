const {
    data: { varintSigned }
} = adone;
describe("data", "signedVarint", () => {
    const encodeDecode = function (v, bytes) {
        const b = varintSigned.encode(v);
        assert.equal(b.length, bytes);
        assert.equal(varintSigned.decode(b), v);
        assert.equal(varintSigned.encode.bytes, bytes);
        assert.equal(varintSigned.decode.bytes, bytes);
    };

    it("single byte", () => {
        encodeDecode(1, 1);
        encodeDecode(-1, 1);
        encodeDecode(63, 1);
        encodeDecode(-64, 1);
    });

    it("double byte", () => {
        encodeDecode(64, 2);
        encodeDecode(-65, 2);
        encodeDecode(127, 2);
        encodeDecode(-128, 2);
        encodeDecode(128, 2);
        encodeDecode(-129, 2);
        encodeDecode(255, 2);
        encodeDecode(-256, 2);
    });

    it("tripple", () => {
        encodeDecode(0x4000, 3);
        encodeDecode(-0x4001, 3);
        encodeDecode(1048574, 3);
        encodeDecode(-1048575, 3);
    });

    it("quad", () => {
        encodeDecode(134217726, 4);
        encodeDecode(-134217727, 4);
    });

    it("large int", () => {
        encodeDecode(0x80000000000, 7);
        encodeDecode(-0x80000000000, 7);
    });
});
