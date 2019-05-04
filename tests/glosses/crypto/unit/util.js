const {
    is,
    crypto: { util: UTIL }
} = adone;

// custom assertion to test array-like objects
const assertArrayEqual = function (actual, expected) {
    assert.equal(actual.length, expected.length);
    for (let idx = 0; idx < expected.length; idx++) {
        assert.equal(actual[idx], expected[idx]);
    }
};

describe("util", () => {
    it("should put bytes into a buffer", () => {
        const b = UTIL.createBuffer();
        b.putByte(1);
        b.putByte(2);
        b.putByte(3);
        b.putByte(4);
        b.putInt32(4);
        b.putByte(1);
        b.putByte(2);
        b.putByte(3);
        b.putInt32(4294967295);
        const hex = b.toHex();
        assert.equal(hex, "0102030400000004010203ffffffff");

        const bytes = [];
        while (b.length() > 0) {
            bytes.push(b.getByte());
        }
        assert.deepEqual(
            bytes, [1, 2, 3, 4, 0, 0, 0, 4, 1, 2, 3, 255, 255, 255, 255]);
    });

    it("should put bytes from an Uint8Array into a buffer", () => {
        if (is.undefined(Uint8Array)) {
            return;
        }
        const data = [1, 2, 3, 4, 0, 0, 0, 4, 1, 2, 3, 255, 255, 255, 255];
        const ab = new Uint8Array(data);
        const b = UTIL.createBuffer(ab);
        const hex = b.toHex();
        assert.equal(hex, "0102030400000004010203ffffffff");

        const bytes = [];
        while (b.length() > 0) {
            bytes.push(b.getByte());
        }
        assert.deepEqual(bytes, data);
    });

    it("should convert bytes from hex", () => {
        const hex = "0102030400000004010203ffffffff";
        const b = UTIL.createBuffer();
        b.putBytes(UTIL.hexToBytes(hex));
        assert.equal(b.toHex(), hex);
    });

    it("should put 0 into a buffer using two's complement", () => {
        const b = UTIL.createBuffer();
        b.putSignedInt(0, 8);
        assert.equal(b.toHex(), "00");
    });

    it("should put 0 into a buffer using two's complement w/2 bytes", () => {
        const b = UTIL.createBuffer();
        b.putSignedInt(0, 16);
        assert.equal(b.toHex(), "0000");
    });

    it("should put 127 into a buffer using two's complement", () => {
        const b = UTIL.createBuffer();
        b.putSignedInt(127, 8);
        assert.equal(b.toHex(), "7f");
    });

    it("should put 127 into a buffer using two's complement w/2 bytes", () => {
        const b = UTIL.createBuffer();
        b.putSignedInt(127, 16);
        assert.equal(b.toHex(), "007f");
    });

    it("should put 128 into a buffer using two's complement", () => {
        const b = UTIL.createBuffer();
        b.putSignedInt(128, 16);
        assert.equal(b.toHex(), "0080");
    });

    it("should put 256 into a buffer using two's complement", () => {
        const b = UTIL.createBuffer();
        b.putSignedInt(256, 16);
        assert.equal(b.toHex(), "0100");
    });

    it("should put -128 into a buffer using two's complement", () => {
        const b = UTIL.createBuffer();
        b.putSignedInt(-128, 8);
        assert.equal(b.toHex(), "80");
    });

    it("should put -129 into a buffer using two's complement", () => {
        const b = UTIL.createBuffer();
        b.putSignedInt(-129, 16);
        assert.equal(b.toHex(), "ff7f");
    });

    it("should get 0 from a buffer using two's complement", () => {
        const x = 0;
        const n = 8;
        const b = UTIL.createBuffer();
        b.putSignedInt(x, n);
        assert.equal(b.getSignedInt(n), x);
    });

    it("should get 127 from a buffer using two's complement", () => {
        const x = 127;
        const n = 8;
        const b = UTIL.createBuffer();
        b.putSignedInt(x, n);
        assert.equal(b.getSignedInt(n), x);
    });

    it("should get 128 from a buffer using two's complement", () => {
        const x = 128;
        const n = 16;
        const b = UTIL.createBuffer();
        b.putSignedInt(x, n);
        assert.equal(b.getSignedInt(n), x);
    });

    it("should get 256 from a buffer using two's complement", () => {
        const x = 256;
        const n = 16;
        const b = UTIL.createBuffer();
        b.putSignedInt(x, n);
        assert.equal(b.getSignedInt(n), x);
    });

    it("should get -128 from a buffer using two's complement", () => {
        const x = -128;
        const n = 8;
        const b = UTIL.createBuffer();
        b.putSignedInt(x, n);
        assert.equal(b.getSignedInt(n), x);
    });

    it("should get -129 from a buffer using two's complement", () => {
        const x = -129;
        const n = 16;
        const b = UTIL.createBuffer();
        b.putSignedInt(x, n);
        assert.equal(b.getSignedInt(n), x);
    });

    it("should getInt(8) from buffer", () => {
        const b = UTIL.createBuffer(UTIL.hexToBytes("12"));
        assert.equal(b.getInt(8), 0x12);
        assert.equal(b.length(), 0);
    });

    it("should getInt(8)x2 from buffer", () => {
        const b = UTIL.createBuffer(UTIL.hexToBytes("1221"));
        assert.equal(b.getInt(8), 0x12);
        assert.equal(b.getInt(8), 0x21);
        assert.equal(b.length(), 0);
    });

    it("should getInt(16) from buffer", () => {
        const b = UTIL.createBuffer(UTIL.hexToBytes("1234"));
        assert.equal(b.getInt(16), 0x1234);
        assert.equal(b.length(), 0);
    });

    it("should getInt(16)x2 from buffer", () => {
        const b = UTIL.createBuffer(UTIL.hexToBytes("12344321"));
        assert.equal(b.getInt(16), 0x1234);
        assert.equal(b.getInt(16), 0x4321);
        assert.equal(b.length(), 0);
    });

    it("should getInt(24) from buffer", () => {
        const b = UTIL.createBuffer(UTIL.hexToBytes("123456"));
        assert.equal(b.getInt(24), 0x123456);
        assert.equal(b.length(), 0);
    });

    it("should getInt(24)x2 from buffer", () => {
        const b = UTIL.createBuffer(UTIL.hexToBytes("123456654321"));
        assert.equal(b.getInt(24), 0x123456);
        assert.equal(b.getInt(24), 0x654321);
        assert.equal(b.length(), 0);
    });

    it("should getInt(32) from buffer", () => {
        const b = UTIL.createBuffer(UTIL.hexToBytes("12345678"));
        assert.equal(b.getInt(32), 0x12345678);
        assert.equal(b.length(), 0);
    });

    it("should getInt(32)x2 from buffer", () => {
        const b = UTIL.createBuffer(UTIL.hexToBytes("1234567887654321"));
        assert.equal(b.getInt(32), 0x12345678);
        // FIXME: getInt bit shifts create signed int
        assert.equal(b.getInt(32), 0x87654321 << 0);
        assert.equal(b.length(), 0);
    });

    it("should throw for getInt(1) from buffer", () => {
        const b = UTIL.createBuffer();
        assert.throws(() => {
            b.getInt(1);
        });
    });

    it("should throw for getInt(33) from buffer", () => {
        const b = UTIL.createBuffer();
        assert.throws(() => {
            b.getInt(33);
        });
    });

    // TODO: add get/put tests at limits of signed/unsigned types

    it("should base64 encode some bytes", () => {
        const s1 = "00010203050607080A0B0C0D0F1011121415161719";
        const s2 = "MDAwMTAyMDMwNTA2MDcwODBBMEIwQzBEMEYxMDExMTIxNDE1MTYxNzE5";
        assert.equal(UTIL.encode64(s1), s2);
    });

    it("should base64 decode some bytes", () => {
        const s1 = "00010203050607080A0B0C0D0F1011121415161719";
        const s2 = "MDAwMTAyMDMwNTA2MDcwODBBMEIwQzBEMEYxMDExMTIxNDE1MTYxNzE5";
        assert.equal(UTIL.decode64(s2), s1);
    });

    it("should base64 encode some bytes using util.binary.base64", () => {
        const s1 = new Uint8Array([
            0x30, 0x30, 0x30, 0x31, 0x30, 0x32, 0x30, 0x33, 0x30,
            0x35, 0x30, 0x36, 0x30, 0x37, 0x30, 0x38, 0x30, 0x41,
            0x30, 0x42, 0x30, 0x43, 0x30, 0x44, 0x30, 0x46, 0x31,
            0x30, 0x31, 0x31, 0x31, 0x32, 0x31, 0x34, 0x31, 0x35,
            0x31, 0x36, 0x31, 0x37, 0x31, 0x39]);
        const s2 = "MDAwMTAyMDMwNTA2MDcwODBBMEIwQzBEMEYxMDExMTIxNDE1MTYxNzE5";
        assert.equal(UTIL.binary.base64.encode(s1), s2);
    });

    it("should base64 encode some odd-length bytes using util.binary.base64", () => {
        const s1 = new Uint8Array([
            0x30, 0x30, 0x30, 0x31, 0x30, 0x32, 0x30, 0x33, 0x30,
            0x35, 0x30, 0x36, 0x30, 0x37, 0x30, 0x38, 0x30, 0x41,
            0x30, 0x42, 0x30, 0x43, 0x30, 0x44, 0x30, 0x46, 0x31,
            0x30, 0x31, 0x31, 0x31, 0x32, 0x31, 0x34, 0x31, 0x35,
            0x31, 0x36, 0x31, 0x37, 0x31, 0x39, 0x31, 0x41, 0x31,
            0x42]);
        const s2 = "MDAwMTAyMDMwNTA2MDcwODBBMEIwQzBEMEYxMDExMTIxNDE1MTYxNzE5MUExQg==";
        assert.equal(UTIL.binary.base64.encode(s1), s2);
    });

    it("should base64 decode some bytes using util.binary.base64", () => {
        const s1 = new Uint8Array([
            0x30, 0x30, 0x30, 0x31, 0x30, 0x32, 0x30, 0x33, 0x30,
            0x35, 0x30, 0x36, 0x30, 0x37, 0x30, 0x38, 0x30, 0x41,
            0x30, 0x42, 0x30, 0x43, 0x30, 0x44, 0x30, 0x46, 0x31,
            0x30, 0x31, 0x31, 0x31, 0x32, 0x31, 0x34, 0x31, 0x35,
            0x31, 0x36, 0x31, 0x37, 0x31, 0x39]);
        const s2 = "MDAwMTAyMDMwNTA2MDcwODBBMEIwQzBEMEYxMDExMTIxNDE1MTYxNzE5";
        assert.deepEqual(UTIL.binary.base64.decode(s2), s1);
    });

    it("should base64 decode some odd-length bytes using util.binary.base64", () => {
        const s1 = new Uint8Array([
            0x30, 0x30, 0x30, 0x31, 0x30, 0x32, 0x30, 0x33, 0x30,
            0x35, 0x30, 0x36, 0x30, 0x37, 0x30, 0x38, 0x30, 0x41,
            0x30, 0x42, 0x30, 0x43, 0x30, 0x44, 0x30, 0x46, 0x31,
            0x30, 0x31, 0x31, 0x31, 0x32, 0x31, 0x34, 0x31, 0x35,
            0x31, 0x36, 0x31, 0x37, 0x31, 0x39, 0x31, 0x41, 0x31,
            0x42]);
        const s2 = "MDAwMTAyMDMwNTA2MDcwODBBMEIwQzBEMEYxMDExMTIxNDE1MTYxNzE5MUExQg==";
        assertArrayEqual(UTIL.binary.base64.decode(s2), s1);
    });

    it("should base58 encode some bytes", () => {
        const buffer = new Uint8Array([
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
        const encoded = UTIL.binary.base58.encode(buffer);
        assert.equal(encoded, "13DUyZY2dc");
    });

    it("should base58 encode some bytes from a ByteBuffer", () => {
        const buffer = UTIL.createBuffer(new Uint8Array([
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]));
        const encoded = UTIL.binary.base58.encode(buffer);
        assert.equal(encoded, "13DUyZY2dc");
    });

    it("should base58 decode some bytes", () => {
        const decoded = UTIL.binary.base58.decode("13DUyZY2dc");
        const buffer = new Uint8Array([
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
        assert.equal(
            UTIL.createBuffer(decoded).toHex(),
            UTIL.createBuffer(buffer).toHex());
    });

    it("should base58 encode some bytes with whitespace", () => {
        const buffer = new Uint8Array([
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
        const encoded = UTIL.binary.base58.encode(buffer, 4);
        assert.equal(encoded, "13DU\r\nyZY2\r\ndc");
    });

    it("should base58 decode some bytes with whitespace", () => {
        const decoded = UTIL.binary.base58.decode("13DU\r\nyZY2\r\ndc");
        const buffer = new Uint8Array([
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
        assert.equal(
            UTIL.createBuffer(decoded).toHex(),
            UTIL.createBuffer(buffer).toHex());
    });

    it("should convert IPv4 0.0.0.0 textual address to 4-byte address", () => {
        const bytes = UTIL.bytesFromIP("0.0.0.0");
        const b = UTIL.createBuffer().fillWithByte(0, 4);
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv4 127.0.0.1 textual address to 4-byte address", () => {
        const bytes = UTIL.bytesFromIP("127.0.0.1");
        const b = UTIL.createBuffer();
        b.putByte(127);
        b.putByte(0);
        b.putByte(0);
        b.putByte(1);
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv6 :: textual address to 16-byte address", () => {
        const bytes = UTIL.bytesFromIP("::");
        const b = UTIL.createBuffer().fillWithByte(0, 16);
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv6 ::0 textual address to 16-byte address", () => {
        const bytes = UTIL.bytesFromIP("::0");
        const b = UTIL.createBuffer().fillWithByte(0, 16);
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv6 0:: textual address to 16-byte address", () => {
        const bytes = UTIL.bytesFromIP("0::");
        const b = UTIL.createBuffer().fillWithByte(0, 16);
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv6 ::1 textual address to 16-byte address", () => {
        const bytes = UTIL.bytesFromIP("::1");
        const b = UTIL.createBuffer().fillWithByte(0, 14);
        b.putBytes(UTIL.hexToBytes("0001"));
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv6 1:: textual address to 16-byte address", () => {
        const bytes = UTIL.bytesFromIP("1::");
        const b = UTIL.createBuffer();
        b.putBytes(UTIL.hexToBytes("0001"));
        b.fillWithByte(0, 14);
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv6 1::1 textual address to 16-byte address", () => {
        const bytes = UTIL.bytesFromIP("1::1");
        const b = UTIL.createBuffer();
        b.putBytes(UTIL.hexToBytes("0001"));
        b.fillWithByte(0, 12);
        b.putBytes(UTIL.hexToBytes("0001"));
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv6 1::1:0 textual address to 16-byte address", () => {
        const bytes = UTIL.bytesFromIP("1::1:0");
        const b = UTIL.createBuffer();
        b.putBytes(UTIL.hexToBytes("0001"));
        b.fillWithByte(0, 10);
        b.putBytes(UTIL.hexToBytes("0001"));
        b.putBytes(UTIL.hexToBytes("0000"));
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv6 2001:db8:0:1:1:1:1:1 textual address to 16-byte address", () => {
        const bytes = UTIL.bytesFromIP("2001:db8:0:1:1:1:1:1");
        const b = UTIL.createBuffer();
        b.putBytes(UTIL.hexToBytes("2001"));
        b.putBytes(UTIL.hexToBytes("0db8"));
        b.putBytes(UTIL.hexToBytes("0000"));
        b.putBytes(UTIL.hexToBytes("0001"));
        b.putBytes(UTIL.hexToBytes("0001"));
        b.putBytes(UTIL.hexToBytes("0001"));
        b.putBytes(UTIL.hexToBytes("0001"));
        b.putBytes(UTIL.hexToBytes("0001"));
        assert.equal(bytes, b.getBytes());
    });

    it("should convert IPv4 0.0.0.0 byte address to textual representation", () => {
        let addr = "0.0.0.0";
        const bytes = UTIL.createBuffer().fillWithByte(0, 4).getBytes();
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "0.0.0.0");
    });

    it("should convert IPv4 0.0.0.0 byte address to textual representation", () => {
        let addr = "127.0.0.1";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "127.0.0.1");
    });

    it("should convert IPv6 :: byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "::";
        const bytes = UTIL.createBuffer().fillWithByte(0, 16).getBytes();
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "::");
    });

    it("should convert IPv6 ::1 byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "::1";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "::1");
    });

    it("should convert IPv6 1:: byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "1::";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "1::");
    });

    it("should convert IPv6 0:0:0:0:0:0:0:1 byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "0:0:0:0:0:0:0:1";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "::1");
    });

    it("should convert IPv6 1:0:0:0:0:0:0:0 byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "1:0:0:0:0:0:0:0";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "1::");
    });

    it("should convert IPv6 1::1 byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "1::1";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "1::1");
    });

    it("should convert IPv6 1:0:0:0:0:0:0:1 byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "1:0:0:0:0:0:0:1";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "1::1");
    });

    it("should convert IPv6 1:0000:0000:0000:0000:0000:0000:1 byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "1:0000:0000:0000:0000:0000:0000:1";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "1::1");
    });

    it("should convert IPv6 1:0:0:1:1:1:0:1 byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "1:0:0:1:1:1:0:1";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "1::1:1:1:0:1");
    });

    it("should convert IPv6 1:0:1:1:1:0:0:1 byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "1:0:1:1:1:0:0:1";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "1:0:1:1:1::1");
    });

    it("should convert IPv6 2001:db8:0:1:1:1:1:1 byte address to canonical textual representation (RFC 5952)", () => {
        let addr = "2001:db8:0:1:1:1:1:1";
        const bytes = UTIL.bytesFromIP(addr);
        addr = UTIL.bytesToIP(bytes);
        assert.equal(addr, "2001:db8:0:1:1:1:1:1");
    });

    it('should convert "foo" to its UTF-8 representation', () => {
        if (is.undefined(Uint8Array)) {
            return;
        }
        const result = UTIL.text.utf8.encode("foo");
        assert.equal(result.byteLength, 3);
        assert.equal(result[0], 102);
        assert.equal(result[1], 111);
        assert.equal(result[2], 111);
    });

    it('should convert "foo" from its UTF-8 representation', () => {
        if (is.undefined(Uint8Array)) {
            return;
        }
        const bytes = new Uint8Array([102, 111, 111]);
        const result = UTIL.text.utf8.decode(bytes);
        assert.equal(result, "foo");
    });

    it('should convert "\ud83c\udc00" to its UTF-8 representation', () => {
        if (is.undefined(Uint8Array)) {
            return;
        }
        const result = UTIL.text.utf8.encode("\ud83c\udc00");
        assert.equal(result.byteLength, 4);
        assert.equal(result[0], 240);
        assert.equal(result[1], 159);
        assert.equal(result[2], 128);
        assert.equal(result[3], 128);
    });

    it('should convert "\ud83c\udc00" from its UTF-8 representation', () => {
        if (is.undefined(Uint8Array)) {
            return;
        }
        const bytes = new Uint8Array([240, 159, 128, 128]);
        const result = UTIL.text.utf8.decode(bytes);
        assert.equal(result, "\ud83c\udc00");
    });

    it('should convert "foo" to its UTF-16 representation', () => {
        if (is.undefined(Uint8Array)) {
            return;
        }
        const result = UTIL.text.utf16.encode("foo");
        assert.equal(result.byteLength, 6);
        assert.equal(result[0], 102);
        assert.equal(result[1], 0);
        assert.equal(result[2], 111);
        assert.equal(result[3], 0);
        assert.equal(result[4], 111);
        assert.equal(result[5], 0);
    });

    it('should convert "foo" from its UTF-16 representation', () => {
        if (is.undefined(Uint8Array)) {
            return;
        }
        const bytes = new Uint8Array([102, 0, 111, 0, 111, 0]);
        const result = UTIL.text.utf16.decode(bytes);
        assert.equal(result, "foo");
    });

    it('should convert "\ud83c\udc00" to its UTF-16 representation', () => {
        if (is.undefined(Uint8Array)) {
            return;
        }
        const result = UTIL.text.utf16.encode("\ud83c\udc00");
        assert.equal(result.byteLength, 4);
        assert.equal(result[0], 60);
        assert.equal(result[1], 216);
        assert.equal(result[2], 0);
        assert.equal(result[3], 220);
    });

    it('should convert "\ud83c\udc00" from its UTF-16 representation', () => {
        if (is.undefined(Uint8Array)) {
            return;
        }
        const bytes = new Uint8Array([60, 216, 0, 220]);
        const result = UTIL.text.utf16.decode(bytes);
        assert.equal(result, "\ud83c\udc00");
    });
});
