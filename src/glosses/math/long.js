const { is, x } = adone;

const TWO_PWR_16_DBL = 1 << 16;
const TWO_PWR_24_DBL = 1 << 24;
const TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;
const TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;
const TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;

/**
 * @typedef {object} LowHighBits
 * @property {number} low The low (signed) 32 bits of the long
 * @property {number} high The high (signed) 32 bits of the long
 */

/**
 * @typedef {Long | number | string | LowHighBits} Longable
 */

/**
 * Represents a 64 bit two's-complement integer
 */
export default class Long {
    /**
     * @param {number} [low = 0] The low (signed) 32 bits of the long
     * @param {number} [high = 0] The high (signed) 32 bits of the long
     * @param {boolean} [unsigned = false] Whether unsigned or not, defaults to false for signed
     */
    constructor(low = 0, high = 0, unsigned = false) {
        this.low = low | 0;
        this.high = high | 0;
        this.unsigned = Boolean(unsigned);
    }

    /**
     * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer
     *
     * @returns {number}
     */
    toInt() {
        return this.unsigned ? this.low >>> 0 : this.low;
    }

    /**
     * Converts the Long to a the nearest floating-point representation of this value (double, 53 bit mantissa)
     *
     * @returns {number}
     */
    toNumber() {
        if (this.unsigned) {
            return ((this.high >>> 0) * TWO_PWR_32_DBL) + (this.low >>> 0);
        }
        return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
    }

    /**
     * Converts the Long to a string written in the specified radix
     *
     * @param {string} radix Radix (2-36), 10 by default
     */
    toString(radix = 10) {
        if (radix < 2 || radix > 36) {
            throw new x.InvalidArgument("radix is invalid");
        }
        if (this.isZero()) {
            return "0";
        }
        if (this.isNegative()) {
            if (this.equals(this.constructor.MIN_VALUE)) {
                // We need to change the Long value before it can be negated, so we remove
                // the bottom-most digit in this base and then recurse to do the rest.
                const radixLong = this.constructor.fromNumber(radix);
                const div = this.div(radixLong);
                const rem1 = div.mul(radixLong).sub(this);
                return div.toString(radix) + rem1.toInt().toString(radix);
            }
            return `-${this.negate().toString(radix)}`;
        }

        // Do several (6) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        const radixToPower = this.constructor.fromNumber(radix ** 6, this.unsigned);
        let rem = this;
        let result = "";
        for (; ;) {
            const remDiv = rem.div(radixToPower);
            const intval = rem.sub(remDiv.mul(radixToPower)).toInt() >>> 0;
            let digits = intval.toString(radix);
            rem = remDiv;
            if (rem.isZero()) {
                return `${digits}${result}`;
            }
            while (digits.length < 6) {
                digits = `0${digits}`;
            }
            result = `${digits}${result}`;
        }
    }

    /**
     * Gets the high 32 bits as a signed integer
     *
     * @returns {number}
     */
    getHighBits() {
        return this.high;
    }

    /**
     * Gets the high 32 bits as an unsigned integer
     *
     * @returns {number}
     */
    getHighBitsUnsigned() {
        return this.high >>> 0;
    }

    /**
     * Gets the low 32 bits as a signed integer
     *
     * @returns {number}
     */
    getLowBits() {
        return this.low;
    }

    /**
     * Gets the low 32 bits as an unsigned integer
     *
     * @returns {number}
     */
    getLowBitsUnsigned() {
        return this.low >>> 0;
    }

    /**
     * Gets the number of bits needed to represent the absolute value of this Long
     *
     * @returns {number}
     */
    getNumBitsAbs() {
        if (this.isNegative()) {
            return this.equals(this.constructor.MIN_VALUE) ? 64 : this.negate().getNumBitsAbs();
        }
        const val = this.high !== 0 ? this.high : this.low;
        let bit = 31;
        for (; bit > 0; bit--) {
            if ((val & (1 << bit)) !== 0) {
                break;
            }
        }
        return this.high !== 0 ? bit + 33 : bit + 1;
    }

    /**
     * Tests if this Long's value equals zero
     *
     * @returns {boolean}
     */
    isZero() {
        return this.high === 0 && this.low === 0;
    }

    /**
     * Tests if this Long's value is negative
     *
     * @returns {boolean}
     */
    isNegative() {
        return !this.unsigned && this.high < 0;
    }

    /**
     * Tests if this Long's value is positive
     *
     * @returns {boolean}
     */
    isPositive() {
        return this.unsigned || this.high >= 0;
    }

    /**
     * Tests if this Long's value is odd
     *
     * @returns {boolean}
     */
    isOdd() {
        return (this.low & 1) === 1;
    }

    /**
     * Tests if this Long's value is even
     *
     * @returns {boolean}
     */
    isEven() {
        return (this.low & 1) === 0;
    }

    /**
     * Tests if this Long's value equals the specified's
     *
     * @param {Longable} other
     * @returns {boolean}
     */
    equals(other) {
        if (!is.long(other)) {
            other = this.constructor.fromValue(other);
        }
        if (
            this.unsigned !== other.unsigned &&
            (this.high >>> 31) === 1 &&
            (other.high >>> 31) === 1
        ) {
            return false;
        }
        return this.high === other.high && this.low === other.low;
    }

    /**
     * Tests if this Long's value is less than the specified's
     *
     * @param {Longable} other
     * @returns {boolean}
     */
    lessThan(other) {
        return this.compare(other) < 0;
    }

    /**
     * Tests if this Long's value is less than or equal the specified's
     *
     * @param {Longable} other
     * @returns {boolean}
     */
    lessThanOrEqual(other) {
        return this.compare(other) <= 0;
    }

    /**
     * Tests if this Long's value is greater than the specified's
     *
     * @param {Longable} other
     * @returns {boolean}
     */
    greaterThan(other) {
        return this.compare(other) > 0;
    }

    /**
     * Tests if this Long's value is greater than or equal the specified's
     *
     * @param {Longable} other
     * @returns {boolean}
     */
    greaterThanOrEqual(other) {
        return this.compare(other) >= 0;
    }

    /**
     * Compares this Long's value with the specified's.
     * @returns {number} 0 if they are the same, 1 if the this is greater and -1 if the given one is greater
     * @returns {boolean}
     */
    compare(other) {
        if (!is.long(other)) {
            other = this.constructor.fromValue(other);
        }
        if (this.equals(other)) {
            return 0;
        }
        const thisNeg = this.isNegative();
        const otherNeg = other.isNegative();
        if (thisNeg && !otherNeg) {
            return -1;
        }
        if (!thisNeg && otherNeg) {
            return 1;
        }
        // At this point the sign bits are the same
        if (!this.unsigned) {
            return this.sub(other).isNegative() ? -1 : 1;
        }
        // Both are positive if at least one is unsigned
        return (other.high >>> 0) > (this.high >>> 0) ||
            (other.high === this.high && (other.low >>> 0) > (this.low >>> 0))
            ? -1
            : 1;
    }

    /**
     * Negates this Long's value
     *
     * @returns {Long}
     */
    negate() {
        if (!this.unsigned && this.equals(this.constructor.MIN_VALUE)) {
            return this.constructor.MIN_VALUE;
        }
        return this.not().add(this.constructor.ONE);
    }

    /**
     * Returns the sum of this and the specified Long
     *
     * @param {Longable} addend
     * @returns {Long}
     */
    add(addend) {
        if (!is.long(addend)) {
            addend = this.constructor.fromValue(addend);
        }

        // Divide each number into 4 chunks of 16 bits, and then sum the chunks.
        const a48 = this.high >>> 16;
        const a32 = this.high & 0xFFFF;
        const a16 = this.low >>> 16;
        const a00 = this.low & 0xFFFF;

        const b48 = addend.high >>> 16;
        const b32 = addend.high & 0xFFFF;
        const b16 = addend.low >>> 16;
        const b00 = addend.low & 0xFFFF;

        let c48 = 0;
        let c32 = 0;
        let c16 = 0;
        let c00 = 0;
        c00 += a00 + b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 + b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 + b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 + b48;
        c48 &= 0xFFFF;
        return this.constructor.fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    }

    /**
     * Returns the difference of this and the specified Long
     *
     * @param {Longable} subtrahend
     * @returns {Long}
     */
    sub(subtrahend) {
        if (!is.long(subtrahend)) {
            subtrahend = this.constructor.fromValue(subtrahend);
        }
        return this.add(subtrahend.negate());
    }

    /**
     * Returns the product of this and the specified Long
     *
     * @param {Longable} multiplier
     * @returns {Long}
     */
    mul(multiplier) {
        if (this.isZero()) {
            return this.constructor.ZERO;
        }
        if (!is.long(multiplier)) {
            multiplier = this.constructor.fromValue(multiplier);
        }
        if (multiplier.isZero()) {
            return this.constructor.ZERO;
        }
        if (this.equals(this.constructor.MIN_VALUE)) {
            return multiplier.isOdd() ? this.constructor.MIN_VALUE : this.constructor.ZERO;
        }
        if (multiplier.equals(this.constructor.MIN_VALUE)) {
            return this.isOdd() ? this.constructor.MIN_VALUE : this.constructor.ZERO;
        }

        if (this.isNegative()) {
            if (multiplier.isNegative()) {
                return this.negate().mul(multiplier.negate());
            }
            return this.negate().mul(multiplier).negate();
        } else if (multiplier.isNegative()) {
            return this.mul(multiplier.negate()).negate();
        }

        // If both longs are small, use float multiplication
        if (
            this.lessThan(this.constructor.fromInt(TWO_PWR_24_DBL)) &&
            multiplier.lessThan(this.constructor.fromInt(TWO_PWR_24_DBL))
        ) {
            return this.constructor.fromNumber(this.toNumber() * multiplier.toNumber(), this.unsigned);
        }

        // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
        // We can skip products that would overflow.
        const a48 = this.high >>> 16;
        const a32 = this.high & 0xFFFF;
        const a16 = this.low >>> 16;
        const a00 = this.low & 0xFFFF;

        const b48 = multiplier.high >>> 16;
        const b32 = multiplier.high & 0xFFFF;
        const b16 = multiplier.low >>> 16;
        const b00 = multiplier.low & 0xFFFF;

        let c48 = 0;
        let c32 = 0;
        let c16 = 0;
        let c00 = 0;
        c00 += a00 * b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 * b00;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c16 += a00 * b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 * b00;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a16 * b16;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a00 * b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
        c48 &= 0xFFFF;
        return this.constructor.fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    }

    /**
     * Returns this Long divided by the specified
     *
     * @param {Longable} divisor
     * @returns {Long}
     */
    div(divisor) {
        if (!is.long(divisor)) {
            divisor = this.constructor.fromValue(divisor);
        }
        if (divisor.isZero()) {
            throw new x.IllegalState("division by zero");
        }
        if (this.isZero()) {
            return this.unsigned ? this.constructor.UZERO : this.constructor.ZERO;
        }
        let approx;
        let rem;
        let res;
        // The result is signed if this Long is signed or unsigned if this Long is unsigned.
        if (!this.unsigned) {
            // This section is only relevant for signed longs and is derived from the
            // closure library as a whole.
            if (this.equals(this.constructor.MIN_VALUE)) {
                if (divisor.equals(this.constructor.ONE) || divisor.equals(this.constructor.NEG_ONE)) {
                    return this.constructor.MIN_VALUE; // recall that -MIN_VALUE == MIN_VALUE
                }
                if (divisor.equals(this.constructor.MIN_VALUE)) {
                    return this.constructor.ONE;
                }
                // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                const halfThis = this.shr(1);
                approx = halfThis.div(divisor).shl(1);
                if (approx.equals(this.constructor.ZERO)) {
                    return divisor.isNegative() ? this.constructor.ONE : this.constructor.NEG_ONE;
                }
                rem = this.sub(divisor.mul(approx));
                res = approx.add(rem.div(divisor));
                return res;
            }
            if (divisor.equals(this.constructor.MIN_VALUE)) {
                return this.unsigned ? this.constructor.UZERO : this.constructor.ZERO;
            }
            if (this.isNegative()) {
                if (divisor.isNegative()) {
                    return this.negate().div(divisor.negate());
                }
                return this.negate().div(divisor).negate();
            } else if (divisor.isNegative()) {
                return this.div(divisor.negate()).negate();
            }
            res = this.constructor.ZERO;
        } else {
            // The algorithm below has not been made for unsigned longs. It's therefore
            // required to take special care of the MSB prior to running it.
            if (!divisor.unsigned) {
                divisor = divisor.toUnsigned();
            }
            if (divisor.greaterThan(this)) {
                return this.constructor.UZERO;
            }
            // 15 >>> 1 = 7 ; with divisor = 8 ; true
            if (divisor.greaterThan(this.shru(1))) {
                return this.constructor.UONE;
            }
            res = this.constructor.UZERO;
        }

        // Repeat the following until the remainder is less than other:  find a
        // floating-point that approximates remainder / other *from below*, add this
        // into the result, and subtract it from the remainder.  It is critical that
        // the approximate value is less than or equal to the real value so that the
        // remainder never becomes negative.
        rem = this;
        while (rem.greaterThanOrEqual(divisor)) {
            // Approximate the result of division. This may be a little greater or
            // smaller than the actual value.
            approx = Math.max(1, Math.floor(rem.toNumber() / divisor.toNumber()));

            // We will tweak the approximate result by changing it in the 48-th digit or
            // the smallest non-fractional digit, whichever is larger.
            const log2 = Math.ceil(Math.log(approx) / Math.LN2);
            const delta = (log2 <= 48) ? 1 : 2 ** (log2 - 48);

            // Decrease the approximation until it is smaller than the remainder.  Note
            // that if it is too large, the product overflows and is negative.
            let approxRes = this.constructor.fromNumber(approx);
            let approxRem = approxRes.mul(divisor);
            while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
                approx -= delta;
                approxRes = this.constructor.fromNumber(approx, this.unsigned);
                approxRem = approxRes.mul(divisor);
            }

            // We know the answer can't be zero... and actually, zero would cause
            // infinite recursion since we would make no progress.
            if (approxRes.isZero()) {
                approxRes = this.constructor.ONE;
            }

            res = res.add(approxRes);
            rem = rem.sub(approxRem);
        }
        return res;
    }

    /**
     * Returns this Long modulo the specified
     *
     * @param {Longable} divisor
     * @returns {Long}
     */
    mod(divisor) {
        if (!is.long(divisor)) {
            divisor = this.constructor.fromValue(divisor);
        }
        return this.sub(this.div(divisor).mul(divisor));
    }

    /**
     * Returns the bitwise NOT of this Long
     *
     * @returns {Long}
     */
    not() {
        return this.constructor.fromBits(~this.low, ~this.high, this.unsigned);
    }

    /**
     * Returns the bitwise AND of this Long and the specified
     *
     * @param {Longable} other
     * @returns {Long}
     */
    and(other) {
        if (!is.long(other)) {
            other = this.constructor.fromValue(other);
        }
        return this.constructor.fromBits(this.low & other.low, this.high & other.high, this.unsigned);
    }

    /**
     * Returns the bitwise OR of this Long and the specifieds
     *
     * @param {Longable} other
     * @returns {Long}
     */
    or(other) {
        if (!is.long(other)) {
            other = this.constructor.fromValue(other);
        }
        return this.constructor.fromBits(this.low | other.low, this.high | other.high, this.unsigned);
    }

    /**
     * Returns the bitwise XOR of this Long and the given one
     *
     * @param {Longable} other
     * @returns {Long}
     */
    xor(other) {
        if (!is.long(other)) {
            other = this.constructor.fromValue(other);
        }
        return this.constructor.fromBits(this.low ^ other.low, this.high ^ other.high, this.unsigned);
    }

    /**
     * Returns this Long with bits shifted to the left by the given amount
     *
     * @param {number | Long} numBits
     * @returns {Long}
     */
    shl(numBits) {
        if (is.long(numBits)) {
            numBits = numBits.toInt();
        }
        if ((numBits &= 63) === 0) {
            return this;
        }
        if (numBits < 32) {
            return this.constructor.fromBits(
                this.low << numBits,
                (this.high << numBits) | (this.low >>> (32 - numBits)),
                this.unsigned
            );
        }
        return this.constructor.fromBits(0, this.low << (numBits - 32), this.unsigned);
    }

    /**
     * Returns this Long with bits arithmetically shifted to the right by the given amount
     *
     * @param {number | Long} numBits
     */
    shr(numBits) {
        if (is.long(numBits)) {
            numBits = numBits.toInt();
        }
        if ((numBits &= 63) === 0) {
            return this;
        }
        if (numBits < 32) {
            return this.constructor.fromBits(
                (this.low >>> numBits) | (this.high << (32 - numBits)),
                this.high >> numBits,
                this.unsigned
            );
        }
        return this.constructor.fromBits(
            this.high >> (numBits - 32),
            this.high >= 0 ? 0 : -1,
            this.unsigned
        );
    }

    /**
     * Returns this Long with bits logically shifted to the right by the given amount
     *
     * @param {number | Long} numBits
     * @returns {Long}
     */
    shru(numBits) {
        if (is.long(numBits)) {
            numBits = numBits.toInt();
        }
        numBits &= 63;
        if (numBits === 0) {
            return this;
        }
        const high = this.high;
        if (numBits < 32) {
            const low = this.low;
            return this.constructor.fromBits(
                (low >>> numBits) | (high << (32 - numBits)),
                high >>> numBits,
                this.unsigned
            );
        }
        if (numBits === 32) {
            return this.constructor.fromBits(high, 0, this.unsigned);
        }
        return this.constructor.fromBits(high >>> (numBits - 32), 0, this.unsigned);
    }

    /**
     * Converts this Long to signed
     *
     * @returns {Long}
     */
    toSigned() {
        if (!this.unsigned) {
            return this;
        }
        return this.constructor.fromBits(this.low, this.high, false);
    }

    /**
     * Converts this Long to unsigned
     *
     * @returns {Long}
     */
    toUnsigned() {
        if (this.unsigned) {
            return this;
        }
        return this.constructor.fromBits(this.low, this.high, true);
    }

    /**
     * Converts this Long to an array of bytes, big-endian by default
     *
     * @param {boolean} [le] Whether to return an array in little-endian format
     * @returns {number[]}
     */
    toBytes(le) {
        return le ? this.toBytesLE() : this.toBytesBE();
    }

    /**
     * Converts this Long to an array of bytes in little-endian format
     *
     * @returns {number[]}
     */
    toBytesLE() {
        const hi = this.high;
        const lo = this.low;
        return [
            lo & 0xff,
            (lo >>> 8) & 0xff,
            (lo >>> 16) & 0xff,
            (lo >>> 24) & 0xff,
            hi & 0xff,
            (hi >>> 8) & 0xff,
            (hi >>> 16) & 0xff,
            (hi >>> 24) & 0xff
        ];
    }

    /**
     * Converts this Long to an array of bytes in big-endian format
     *
     * @returns {number[]}
     */
    toBytesBE() {
        const hi = this.high;
        const lo = this.low;
        return [
            (hi >>> 24) & 0xff,
            (hi >>> 16) & 0xff,
            (hi >>> 8) & 0xff,
            hi & 0xff,
            (lo >>> 24) & 0xff,
            (lo >>> 16) & 0xff,
            (lo >>> 8) & 0xff,
            lo & 0xff
        ];
    }

    /**
     * Returns a Long representing the given 32 bit integer value
     *
     * @param {number} value
     * @param {boolean} [unsigned]
     * @returns {Long}
     */
    static fromInt(value, unsigned) {
        if (unsigned) {
            value >>>= 0;
            const obj = this.fromBits(value, (value | 0) < 0 ? -1 : 0, true);
            return obj;
        }
        value |= 0;
        const obj = this.fromBits(value, value < 0 ? -1 : 0, false);
        return obj;
    }

    /**
     * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned
     *
     * @param {number} value
     * @param {boolean} [unsigned]
     * @returns {Long}
     */
    static fromNumber(value, unsigned) {
        if (isNaN(value)) {
            return unsigned ? this.UZERO : this.ZERO;
        }
        if (unsigned) {
            if (value < 0) {
                return this.UZERO;
            }
            if (value >= TWO_PWR_64_DBL) {
                return this.MAX_UNSIGNED_VALUE;
            }
        }
        if (value <= -TWO_PWR_63_DBL) {
            return this.MIN_VALUE;
        }
        if (value + 1 >= TWO_PWR_63_DBL) {
            return this.MAX_VALUE;
        }
        if (value < 0) {
            return this.fromNumber(-value, unsigned).negate();
        }
        return this.fromBits((value % TWO_PWR_32_DBL) | 0, (value / TWO_PWR_32_DBL) | 0, unsigned);
    }

    /**
     * Returns a Long representing the 64 bit integer that comes by concatenating the given low and high bits.
     * Each is assumed to use 32 bits.
     *
     * @param {number} lowBits
     * @param {number} highBits
     * @param {boolean} [unsigned]
     * @returns {Long}
     */
    static fromBits(lowBits, highBits, unsigned) {
        return new this(lowBits, highBits, unsigned);
    }

    /**
     * Returns a Long representation of the given string, written using the specified radix
     *
     * @param {string} str
     * @param {boolean} unsigned
     * @param {number} [radix = 10]
     */
    static fromString(str, unsigned, radix = 10) {
        if (str.length === 0) {
            throw new x.InvalidArgument("empty string");
        }
        if (str === "NaN" || str === "Infinity" || str === "+Infinity" || str === "-Infinity") {
            return this.ZERO;
        }
        if (is.number(unsigned)) {
            // For goog.math.long compatibility
            radix = unsigned;
            unsigned = false;
        } else {
            unsigned = Boolean(unsigned);
        }
        if (radix < 2 || radix > 36) {
            throw new x.InvalidArgument("radix is invalid");
        }

        const p = str.indexOf("-");
        if (p > 0) {
            throw new x.InvalidArgument("interior hyphen");
        }
        if (p === 0) {
            return this.fromString(str.substring(1), unsigned, radix).negate();
        }

        // Do several (8) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        const radixToPower = this.fromNumber(radix ** 8);

        let result = this.ZERO;
        for (let i = 0; i < str.length; i += 8) {
            const size = Math.min(8, str.length - i);
            const value = parseInt(str.substring(i, i + size), radix);
            if (size < 8) {
                const power = this.fromNumber(radix ** size);
                result = result.mul(power).add(this.fromNumber(value));
            } else {
                result = result.mul(radixToPower);
                result = result.add(this.fromNumber(value));
            }
        }
        result.unsigned = unsigned;
        return result;
    }

    /**
     * Converts the specified value to a Long
     *
     * @param {Longable} val
     */
    static fromValue(val) {
        if (is.long(val)) {
            return val;
        }
        if (is.number(val)) {
            return this.fromNumber(val);
        }
        if (is.string(val)) {
            return this.fromString(val);
        }
        // Throws for non-objects, converts non-instanceof Long:
        return this.fromBits(val.low, val.high, val.unsigned);
    }
}
adone.tag.set(Long, adone.tag.LONG);

Long.MIN_VALUE = Long.fromBits(0, 0x80000000 | 0, false); // Minimum signed value
Long.MAX_VALUE = Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0, false); // Maximum signed value
Long.MAX_UNSIGNED_VALUE = Long.fromBits(0xFFFFFFFF | 0, 0xFFFFFFFF | 0, true); // Maximum unsigned value

Long.ZERO = Long.fromInt(0); // Signed zero
Long.UZERO = Long.fromInt(0, true); // Unsigned zero
Long.ONE = Long.fromInt(1); // Signed one
Long.UONE = Long.fromInt(1, true); // Unsigned one
Long.NEG_ONE = Long.fromInt(-1); // Signed negative one
