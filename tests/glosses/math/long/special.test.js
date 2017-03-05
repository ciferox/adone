/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS-IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

const { Long } = adone.math;

describe("Long - Special", function() {

    it("basic", function(done) {
        const longVal = new Long(0xFFFFFFFF, 0x7FFFFFFF);
        assert.equal(longVal.toNumber(), 9223372036854775807);
        assert.equal(longVal.toString(), "9223372036854775807");
        const longVal2 = Long.fromValue(longVal);
        assert.equal(longVal2.toNumber(), 9223372036854775807);
        assert.equal(longVal2.toString(), "9223372036854775807");
        assert.equal(longVal2.unsigned, longVal.unsigned);
        done();
    });

    it("is.long", function(done) {
        const longVal = new Long(0xFFFFFFFF, 0x7FFFFFFF);
        assert.strictEqual(adone.is.long(longVal), true);
        done();
    });

    it("toString", function(done) {
        const longVal = Long.fromBits(0xFFFFFFFF, 0xFFFFFFFF, true);
        // #10
        assert.equal(longVal.toString(16), "ffffffffffffffff");
        assert.equal(longVal.toString(10), "18446744073709551615");
        assert.equal(longVal.toString(8), "1777777777777777777777");
        // #7, obviously wrong in goog.math.Long
        assert.equal(Long.fromString("zzzzzz", 36).toString(36), "zzzzzz");
        assert.equal(Long.fromString("-zzzzzz", 36).toString(36), "-zzzzzz");
        done();
    });

    it("min/max", function(done) {
        assert.equal(Long.MIN_VALUE.toString(), "-9223372036854775808");
        assert.equal(Long.MAX_VALUE.toString(), "9223372036854775807");
        assert.equal(Long.MAX_UNSIGNED_VALUE.toString(), "18446744073709551615");
        done();
    });

    it("construct_negint", function(done) {
        const longVal = Long.fromInt(-1, true);
        assert.equal(longVal.low, -1);
        assert.equal(longVal.high, -1);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 18446744073709551615);
        assert.equal(longVal.toString(), "18446744073709551615");
        done();
    });

    it("construct_highlow", function(done) {
        const longVal = new Long(0xFFFFFFFF, 0xFFFFFFFF, true);
        assert.equal(longVal.low, -1);
        assert.equal(longVal.high, -1);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 18446744073709551615);
        assert.equal(longVal.toString(), "18446744073709551615");
        done();
    });

    it("construct_number", function(done) {
        const longVal = Long.fromNumber(0xFFFFFFFFFFFFFFFF, true);
        assert.equal(longVal.low, -1);
        assert.equal(longVal.high, -1);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 18446744073709551615);
        assert.equal(longVal.toString(), "18446744073709551615");
        done();
    });

    it("toSigned/Unsigned", function(done) {
        let longVal = Long.fromNumber(-1, false);
        assert.equal(longVal.toNumber(), -1);
        longVal = longVal.toUnsigned();
        assert.equal(longVal.toNumber(), 0xFFFFFFFFFFFFFFFF);
        assert.equal(longVal.toString(16), "ffffffffffffffff");
        longVal = longVal.toSigned();
        assert.equal(longVal.toNumber(), -1);
        done();
    });

    it("max_unsigned_sub_max_signed", function(done) {
        const longVal = Long.MAX_UNSIGNED_VALUE.sub(Long.MAX_VALUE).sub(Long.ONE);
        assert.equal(longVal.toNumber(), Long.MAX_VALUE.toNumber());
        assert.equal(longVal.toString(), Long.MAX_VALUE.toString());
        done();
    });

    it("max_sub_max", function(done) {
        const longVal = Long.MAX_UNSIGNED_VALUE.sub(Long.MAX_UNSIGNED_VALUE);
        assert.equal(longVal, 0);
        assert.equal(longVal.low, 0);
        assert.equal(longVal.high, 0);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 0);
        assert.equal(longVal.toString(), "0");
        done();
    });

    it("zero_sub_signed", function(done) {
        const longVal = Long.fromInt(0, true).add(Long.fromInt(-1, false));
        assert.equal(longVal.low, -1);
        assert.equal(longVal.high, -1);
        assert.equal(longVal.unsigned, true);
        assert.equal(longVal.toNumber(), 18446744073709551615);
        assert.equal(longVal.toString(), "18446744073709551615");
        done();
    });

    it("max_unsigned_div_max_signed", function(done) {
        const longVal = Long.MAX_UNSIGNED_VALUE.div(Long.MAX_VALUE);
        assert.equal(longVal.toNumber(), 2);
        assert.equal(longVal.toString(), "2");
        done();
    });

    it("max_unsigned_div_max_unsigned", function(done) {
        const longVal = Long.MAX_UNSIGNED_VALUE;
        assert.strictEqual(longVal.div(longVal).toString(), "1");
        done();
    });

    it("max_unsigned_div_neg_signed", function(done) {
        const a = Long.MAX_UNSIGNED_VALUE;
        const b = Long.fromInt(-2);
        assert.strictEqual(b.toUnsigned().toString(), Long.MAX_UNSIGNED_VALUE.sub(1).toString());
        const longVal = a.div(b);
        assert.strictEqual(longVal.toString(), "1");
        done();
    });

    it("min_signed_div_one", function(done) {
        const longVal = Long.MIN_VALUE.div(Long.ONE);
        assert.strictEqual(longVal.toString(), Long.MIN_VALUE.toString());
        done();
    });

    it("msb_unsigned", function(done) {
        const longVal = Long.UONE.shl(63);
        assert.isNotOk(longVal.equals(Long.MIN_VALUE));
        assert.equal(longVal.toString(), "9223372036854775808");
        assert.equal(Long.fromString("9223372036854775808", true).toString(), "9223372036854775808");
        done();
    });

    it("issue31", function(done) {
        const a = new Long(0, 8, true);
        const b = Long.fromNumber(2656901066, true);
        assert.strictEqual(a.unsigned, true);
        assert.strictEqual(b.unsigned, true);
        const x = a.div(b);
        assert.strictEqual(x.toString(), "12");
        assert.strictEqual(x.unsigned, true);
        done();
    });
});
