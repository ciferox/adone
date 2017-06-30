describe("math", "Long", "special", () => {
    const { math: { Long } } = adone;

    it("basic", () => {
        const longVal = new Long(0xFFFFFFFF, 0x7FFFFFFF);
        assert.equal(longVal.toNumber(), 9223372036854775807);
        assert.equal(longVal.toString(), "9223372036854775807");
        const longVal2 = Long.fromValue(longVal);
        assert.equal(longVal2.toNumber(), 9223372036854775807);
        assert.equal(longVal2.toString(), "9223372036854775807");
        assert.equal(longVal2.unsigned, longVal.unsigned);
    });

    it("is.long", () => {
        const longVal = new Long(0xFFFFFFFF, 0x7FFFFFFF);
        assert.strictEqual(adone.is.long(longVal), true);
    });

    it("toString", () => {
        const longVal = Long.fromBits(0xFFFFFFFF, 0xFFFFFFFF, true);
        // #10
        assert.equal(longVal.toString(16), "ffffffffffffffff");
        assert.equal(longVal.toString(10), "18446744073709551615");
        assert.equal(longVal.toString(8), "1777777777777777777777");
        // #7, obviously wrong in goog.math.Long
        assert.equal(Long.fromString("zzzzzz", 36).toString(36), "zzzzzz");
        assert.equal(Long.fromString("-zzzzzz", 36).toString(36), "-zzzzzz");
    });

    it("min/max", () => {
        assert.equal(Long.MIN_VALUE.toString(), "-9223372036854775808");
        assert.equal(Long.MAX_VALUE.toString(), "9223372036854775807");
        assert.equal(Long.MAX_UNSIGNED_VALUE.toString(), "18446744073709551615");
    });

    it("construct_negint", () => {
        const longVal = Long.fromInt(-1, true);
        assert.equal(longVal.low, -1);
        assert.equal(longVal.high, -1);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 18446744073709551615);
        assert.equal(longVal.toString(), "18446744073709551615");
    });

    it("construct_highlow", () => {
        const longVal = new Long(0xFFFFFFFF, 0xFFFFFFFF, true);
        assert.equal(longVal.low, -1);
        assert.equal(longVal.high, -1);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 18446744073709551615);
        assert.equal(longVal.toString(), "18446744073709551615");
    });

    it("construct_number", () => {
        const longVal = Long.fromNumber(0xFFFFFFFFFFFFFFFF, true);
        assert.equal(longVal.low, -1);
        assert.equal(longVal.high, -1);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 18446744073709551615);
        assert.equal(longVal.toString(), "18446744073709551615");
    });

    it("toSigned/Unsigned", () => {
        let longVal = Long.fromNumber(-1, false);
        assert.equal(longVal.toNumber(), -1);
        longVal = longVal.toUnsigned();
        assert.equal(longVal.toNumber(), 0xFFFFFFFFFFFFFFFF);
        assert.equal(longVal.toString(16), "ffffffffffffffff");
        longVal = longVal.toSigned();
        assert.equal(longVal.toNumber(), -1);
    });

    it("toBytes", () => {
        const longVal = Long.fromBits(0x01234567, 0x12345678);
        expect(longVal.toBytesBE()).to.be.deep.equal([
            0x12, 0x34, 0x56, 0x78,
            0x01, 0x23, 0x45, 0x67
        ]);
        expect(longVal.toBytesLE()).to.be.deep.equal([
            0x67, 0x45, 0x23, 0x01,
            0x78, 0x56, 0x34, 0x12
        ]);
    });

    it("max_unsigned_sub_max_signed", () => {
        const longVal = Long.MAX_UNSIGNED_VALUE.sub(Long.MAX_VALUE).sub(Long.ONE);
        assert.equal(longVal.toNumber(), Long.MAX_VALUE.toNumber());
        assert.equal(longVal.toString(), Long.MAX_VALUE.toString());
    });

    it("max_sub_max", () => {
        const longVal = Long.MAX_UNSIGNED_VALUE.sub(Long.MAX_UNSIGNED_VALUE);
        assert.equal(longVal, 0);
        assert.equal(longVal.low, 0);
        assert.equal(longVal.high, 0);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 0);
        assert.equal(longVal.toString(), "0");
    });

    it("zero_sub_signed", () => {
        const longVal = Long.fromInt(0, true).add(Long.fromInt(-1, false));
        assert.equal(longVal.low, -1);
        assert.equal(longVal.high, -1);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 18446744073709551615);
        assert.equal(longVal.toString(), "18446744073709551615");
    });

    it("max_unsigned_div_max_signed", () => {
        const longVal = Long.MAX_UNSIGNED_VALUE.div(Long.MAX_VALUE);
        assert.equal(longVal.toNumber(), 2);
        assert.equal(longVal.toString(), "2");
    });

    it("max_unsigned_div_max_unsigned", () => {
        const longVal = Long.MAX_UNSIGNED_VALUE;
        assert.strictEqual(longVal.div(longVal).toString(), "1");
    });

    it("max_unsigned_div_neg_signed", () => {
        const a = Long.MAX_UNSIGNED_VALUE;
        const b = Long.fromInt(-2);
        assert.strictEqual(b.toUnsigned().toString(), Long.MAX_UNSIGNED_VALUE.sub(1).toString());
        const longVal = a.div(b);
        assert.strictEqual(longVal.toString(), "1");
    });

    it("min_signed_div_one", () => {
        const longVal = Long.MIN_VALUE.div(Long.ONE);
        assert.strictEqual(longVal.toString(), Long.MIN_VALUE.toString());
    });

    it("msb_unsigned", () => {
        const longVal = Long.UONE.shl(63);
        assert.isNotOk(longVal.equals(Long.MIN_VALUE));
        assert.equal(longVal.toString(), "9223372036854775808");
        assert.equal(Long.fromString("9223372036854775808", true).toString(), "9223372036854775808");
    });

    it("issue31", () => {
        const a = new Long(0, 8, true);
        const b = Long.fromNumber(2656901066, true);
        assert.strictEqual(a.unsigned, true);
        assert.strictEqual(b.unsigned, true);
        const x = a.div(b);
        assert.strictEqual(x.toString(), "12");
        assert.strictEqual(x.unsigned, true);
    });
});
