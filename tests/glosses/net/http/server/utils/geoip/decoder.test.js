describe("glosses", "net", "http", "server", "utils", "geoip", "Decoder", () => {
    const { net: { http: { server: { util: { geoip: { _: { Decoder } } } } } } } = adone;

    let decoder = null;
    const fixtures = new adone.fs.Directory(__dirname, "fixtures");

    before(async () => {
        decoder = new Decoder(
            await fixtures.getVirtualFile("GeoIP2-City-Test.mmdb"),
            1
        );
    });

    describe("decodeByType()", () => {
        it("should fail for unknown type", () => {
            assert.throws(() => {
                decoder.decodeByType("kraken");
            }, /Unknown type/);
        });
    });

    describe("decodeUint()", () => {
        it("should return zero for unsupported int size", () => {
            assert.equal(decoder.decodeUint(1, 32), 0);
        });
    });

    describe("decode()", () => {
        it("should throw when extended type has wrong size", () => {
            const test = new Decoder(new Buffer([0x00, 0x00]));
            assert.throws(() => {
                test.decode(0);
            }, /Invalid Extended Type at offset 1 val 7/);
        });
    });

    describe("sizeFromCtrlByte()", () => {
        const decoder = new Decoder(new Buffer([0x01, 0x02, 0x03, 0x04]));

        it("should return correct value (size <29)", () => {
            assert.deepEqual(decoder.sizeFromCtrlByte(60, 0), { value: 28, offset: 0 });
        });

        it("should return correct value (size = 29)", () => {
            assert.deepEqual(decoder.sizeFromCtrlByte(61, 0), { value: 30, offset: 1 });
        });

        it("should return correct value (size = 30)", () => {
            assert.deepEqual(decoder.sizeFromCtrlByte(62, 0), { value: 543, offset: 2 });
        });

        it("should return correct value (size = 31)", () => {
            assert.deepEqual(decoder.sizeFromCtrlByte(63, 0), { value: 131872, offset: 3 });
        });
    });

    describe("decodePointer()", () => {
        const decoder = new Decoder(new Buffer([0x01, 0x02, 0x03, 0x04]));

        it("should return correct value (pointer size = 0)", () => {
            assert.deepEqual(decoder.decodePointer(39, 0), { value: 1793, offset: 1 });
        });

        it("should return correct value (pointer size = 1)", () => {
            assert.deepEqual(decoder.decodePointer(45, 0), { value: 329986, offset: 2 });
        });

        it("should return correct value (pointer size = 2)", () => {
            assert.deepEqual(decoder.decodePointer(48, 0), { value: 592387, offset: 3 });
        });

        it("should return correct value (pointer size = 3)", () => {
            assert.deepEqual(decoder.decodePointer(56, 0), { value: 16909060, offset: 4 });
        });
    });
});
