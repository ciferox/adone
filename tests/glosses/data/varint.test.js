const {
    data: { varint: { decode, encode, encodingLength } }
} = adone;

describe("data", "varint", () => {

    const randint = (range) => Math.floor(Math.random() * range);

    it("fuzz test", () => {
        let expect;
        let encoded;

        for (let i = 0, len = 100; i < len; ++i) {
            expect = randint(0x7FFFFFFF);
            encoded = encode(expect);
            const data = decode(encoded);
            assert.equal(expect, data, `fuzz test: ${expect.toString()}`);
            assert.equal(decode.bytes, encoded.length);
        }
    });

    it("test single byte works as expected", () => {
        const buf = new Uint8Array(2);
        buf[0] = 172;
        buf[1] = 2;
        const data = decode(buf);
        assert.equal(data, 300, "should equal 300");
        assert.equal(decode.bytes, 2);
    });

    it("test encode works as expected", () => {
        assert.deepEqual(encode(300), [0xAC, 0x02]);
    });

    it("test decode single bytes", () => {
        const expected = randint(parseInt("1111111", "2"));
        const buf = new Uint8Array(1);
        buf[0] = expected;
        const data = decode(buf);
        assert.equal(data, expected);
        assert.equal(decode.bytes, 1);
    });

    it("test decode multiple bytes with zero", () => {
        const expected = randint(parseInt("1111111", "2"));
        const buf = new Uint8Array(2);
        buf[0] = 128;
        buf[1] = expected;
        const data = decode(buf);
        assert.equal(data, expected << 7);
        assert.equal(decode.bytes, 2);
    });

    it("encode single byte", () => {
        const expected = randint(parseInt("1111111", "2"));
        assert.deepEqual(encode(expected), [expected]);
        assert.equal(encode.bytes, 1);
    });

    it("encode multiple byte with zero first byte", () => {
        const expected = 0x0F00;
        assert.deepEqual(encode(expected), [0x80, 0x1E]);
        assert.equal(encode.bytes, 2);
    });

    it("big integers", () => {

        const bigs = [];
        for (let i = 32; i <= 53; i++) {
            (function (i) {
                bigs.push(Math.pow(2, i) - 1);
                bigs.push(Math.pow(2, i));
            })(i);
        }

        bigs.forEach((n) => {
            const data = encode(n);
            // console.error(n, "->", data);
            assert.equal(decode(data), n);
            assert.notEqual(decode(data), n - 1);
        });
    });

    it("fuzz test - big", () => {
        let expect;
        let encoded;

        const MAX_INTD = Math.pow(2, 55);
        const MAX_INT = Math.pow(2, 31);

        for (let i = 0, len = 100; i < len; ++i) {
            expect = randint(MAX_INTD - MAX_INT) + MAX_INT;
            encoded = encode(expect);
            const data = decode(encoded);
            assert.equal(expect, data, `fuzz test: ${expect.toString()}`);
            assert.equal(decode.bytes, encoded.length);
        }
    });

    it("encodingLength", () => {

        for (let i = 0; i <= 53; i++) {
            const n = Math.pow(2, i);
            assert.equal(encode(n).length, encodingLength(n));
        }
    });

    it("buffer too short", () => {

        const value = encode(9812938912312);
        const buffer = encode(value);

        let l = buffer.length;
        while (l--) {
            try {
                decode(buffer.slice(0, l));
            } catch (err) {
                assert.equal(err.constructor, RangeError);
                assert.equal(decode.bytes, 0);
            }
        }
    });
});
