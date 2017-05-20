const { is, x, data: { bson: { Long } } } = adone;

const PARSE_STRING_REGEXP = /^(\+|\-)?(\d+|(\d*\.\d*))?(E|e)?([\-\+])?(\d+)?$/;
const PARSE_INF_REGEXP = /^(\+|\-)?(Infinity|inf)$/i;
const PARSE_NAN_REGEXP = /^(\+|\-)?NaN$/i;

const EXPONENT_MAX = 6111;
const EXPONENT_MIN = -6176;
const EXPONENT_BIAS = 6176;
const MAX_DIGITS = 34;

// Nan value bits as 32 bit values (due to lack of longs)
const NAN_BUFFER = [
    0x7c, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
].reverse();
// Infinity value bits 32 bit values (due to lack of longs)
const INF_NEGATIVE_BUFFER = [
    0xf8, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
].reverse();
const INF_POSITIVE_BUFFER = [
    0x78, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
].reverse();

const EXPONENT_REGEX = /^([\-\+])?(\d+)?$/;


const isDigit = (value) => !isNaN(parseInt(value, 10));

const divideu128 = (value) => {
    const divisor = Long.fromNumber(1000 * 1000 * 1000);
    let _rem = Long.fromNumber(0);

    if (!value.parts[0] && !value.parts[1] &&
        !value.parts[2] && !value.parts[3]) {
        return { quotient: value, rem: _rem };
    }

    for (let i = 0; i <= 3; i++) {
        // Adjust remainder to match value of next dividend
        _rem = _rem.shl(32);
        // Add the divided to _rem
        _rem = _rem.add(new Long(value.parts[i], 0));
        value.parts[i] = _rem.div(divisor).low;
        _rem = _rem.mod(divisor);
    }

    return { quotient: value, rem: _rem };
};

const multiply64x2 = (left, right) => {
    if (!left && !right) {
        return { high: Long.fromNumber(0), low: Long.fromNumber(0) };
    }

    const leftHigh = left.shru(32);
    const leftLow = new Long(left.getLowBits(), 0);
    const rightHigh = right.shru(32);
    const rightLow = new Long(right.getLowBits(), 0);

    let productHigh = leftHigh.mul(rightHigh);
    let productMid = leftHigh.mul(rightLow);
    const productMid2 = leftLow.mul(rightHigh);
    let productLow = leftLow.mul(rightLow);

    productHigh = productHigh.add(productMid.shru(32));
    productMid = new Long(productMid.getLowBits(), 0).add(productMid2).add(productLow.shru(32));

    productHigh = productHigh.add(productMid.shru(32));
    productLow = productMid.shl(32).add(new Long(productLow.getLowBits(), 0));

    return { high: productHigh, low: productLow };
};

const lessThan = (left, right) => {
    const uhleft = left.high >>> 0;
    const uhright = right.high >>> 0;

    if (uhleft < uhright) {
        return true;
    } else if (uhleft === uhright) {
        const ulleft = left.low >>> 0;
        const ulright = right.low >>> 0;
        if (ulleft < ulright) {
            return true;
        }
    }

    return false;
};

// least significant 5 bits
const COMBINATION_MASK = 0x1f;
// least significant 14 bits
const EXPONENT_MASK = 0x3fff;

const COMBINATION_INFINITY = 30;

const COMBINATION_NAN = 31;


export default class Decimal128 {
    constructor(bytes) {
        this._bsontype = "Decimal128";
        this.bytes = bytes;
    }

    static fromString(string) {
        let isNegative = false;
        let sawRadix = false;
        let foundNonZero = false;

        let significantDigits = 0;
        let nDigitsRead = 0;
        // Total number of digits (no leading zeros)
        let nDigits = 0;
        // The number of the digits after radix
        let radixPosition = 0;
        // The index of the first non-zero in *str*
        let firstNonZero = 0;

        const digits = [0];
        // The number of digits in digits
        let nDigitsStored = 0;
        // Insertion pointer for digits
        let digitsInsert = 0;
        // The index of the first non-zero digit
        let firstDigit = 0;
        // The index of the last digit
        let lastDigit = 0;

        // Exponent
        let exponent = 0;
        // The high 17 digits of the significand
        let significandHigh = [0, 0];
        // The low 17 digits of the significand
        let significandLow = [0, 0];
        // The biased exponent
        // Read index
        let index = 0;

        // Trim the string
        string = string.trim();

        // Results
        const stringMatch = string.match(PARSE_STRING_REGEXP);
        const infMatch = string.match(PARSE_INF_REGEXP);
        const nanMatch = string.match(PARSE_NAN_REGEXP);

        // Validate the string
        if (!stringMatch && !infMatch && !nanMatch || string.length === 0) {
            throw new x.InvalidArgument(`${String(string)} not a valid Decimal128 string`);
        }

        // Check if we have an illegal exponent format
        if (stringMatch && stringMatch[4] && is.undefined(stringMatch[2])) {
            throw new x.InvalidArgument(`${String(string)} not a valid Decimal128 string`);
        }

        // Get the negative or positive sign
        if (string[index] === "+" || string[index] === "-") {
            isNegative = string[index++] === "-";
        }

        // Check if user passed Infinity or NaN
        if (!isDigit(string[index]) && string[index] !== ".") {
            if (string[index] === "i" || string[index] === "I") {
                return new Decimal128(
                    new Buffer(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER)
                );
            } else if (string[index] === "N") {
                return new Decimal128(new Buffer(NAN_BUFFER));
            }
        }

        // Read all the digits
        while (isDigit(string[index]) || string[index] === ".") {
            if (string[index] === ".") {
                if (sawRadix) {
                    return new Decimal128(new Buffer(NAN_BUFFER));
                }

                sawRadix = true;
                index = index + 1;
                continue;
            }

            if (nDigitsStored < 34) {
                if (string[index] !== "0" || foundNonZero) {
                    if (!foundNonZero) {
                        firstNonZero = nDigitsRead;
                    }

                    foundNonZero = true;

                    // Only store 34 digits
                    digits[digitsInsert++] = parseInt(string[index], 10);
                    nDigitsStored = nDigitsStored + 1;
                }
            }

            if (foundNonZero) {
                nDigits = nDigits + 1;
            }

            if (sawRadix) {
                radixPosition = radixPosition + 1;
            }

            nDigitsRead = nDigitsRead + 1;
            index = index + 1;
        }

        if (sawRadix && !nDigitsRead) {
            throw new x.InvalidArgument(`${String(string)} not a valid Decimal128 string`);
        }

        // Read exponent if exists
        if (string[index] === "e" || string[index] === "E") {
            // Read exponent digits
            const match = string.substr(++index).match(EXPONENT_REGEX);

            // No digits read
            if (!match || !match[2]) {
                return new Decimal128(new Buffer(NAN_BUFFER));
            }

            // Get exponent
            exponent = parseInt(match[0], 10);

            // Adjust the index
            index = index + match[0].length;
        }

        // Return not a number
        if (string[index]) {
            return new Decimal128(new Buffer(NAN_BUFFER));
        }

        // Done reading input
        // Find first non-zero digit in digits
        firstDigit = 0;

        if (!nDigitsStored) {
            firstDigit = 0;
            lastDigit = 0;
            digits[0] = 0;
            nDigits = 1;
            nDigitsStored = 1;
            significantDigits = 0;
        } else {
            lastDigit = nDigitsStored - 1;
            significantDigits = nDigits;

            if (exponent !== 0 && significantDigits !== 1) {
                while (string[firstNonZero + significantDigits - 1] === "0") {
                    significantDigits = significantDigits - 1;
                }
            }
        }

        // Normalization of exponent
        // Correct exponent based on radix position, and shift significand as needed
        // to represent user input

        // Overflow prevention
        if (exponent <= radixPosition && radixPosition - exponent > (1 << 14)) {
            exponent = EXPONENT_MIN;
        } else {
            exponent = exponent - radixPosition;
        }

        // Attempt to normalize the exponent
        while (exponent > EXPONENT_MAX) {
            // Shift exponent to significand and decrease
            lastDigit = lastDigit + 1;

            if (lastDigit - firstDigit > MAX_DIGITS) {
                // Check if we have a zero then just hard clamp, otherwise fail
                const digitsString = digits.join("");
                if (digitsString.match(/^0+$/)) {
                    exponent = EXPONENT_MAX;
                    break;
                } else {
                    return new Decimal128(
                        new Buffer(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER)
                    );
                }
            }

            exponent = exponent - 1;
        }

        while (exponent < EXPONENT_MIN || nDigitsStored < nDigits) {
            // Shift last digit
            if (lastDigit === 0) {
                exponent = EXPONENT_MIN;
                significantDigits = 0;
                break;
            }

            if (nDigitsStored < nDigits) {
                // adjust to match digits not stored
                nDigits = nDigits - 1;
            } else {
                // adjust to round
                lastDigit = lastDigit - 1;
            }

            if (exponent < EXPONENT_MAX) {
                exponent = exponent + 1;
            } else {
                // Check if we have a zero then just hard clamp, otherwise fail
                const digitsString = digits.join("");
                if (digitsString.match(/^0+$/)) {
                    exponent = EXPONENT_MAX;
                    break;
                } else {
                    return new Decimal128(
                        new Buffer(isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER)
                    );
                }
            }
        }


        // Round
        // We've normalized the exponent, but might still need to round.
        if (
            (lastDigit - firstDigit + 1 < significantDigits) &&
            string[significantDigits] !== "0"
        ) {
            let endOfString = nDigitsRead;

            // If we have seen a radix point, 'string' is 1 longer than we have
            // documented with ndigits_read, so inc the position of the first nonzero
            // digit and the position that digits are read to.
            if (sawRadix && exponent === EXPONENT_MIN) {
                firstNonZero = firstNonZero + 1;
                endOfString = endOfString + 1;
            }

            const roundDigit = parseInt(string[firstNonZero + lastDigit + 1], 10);
            let roundBit = 0;

            if (roundDigit >= 5) {
                roundBit = 1;

                if (roundDigit === 5) {
                    roundBit = digits[lastDigit] % 2 === 1;

                    for (let i = firstNonZero + lastDigit + 2; i < endOfString; i++) {
                        if (parseInt(string[i], 10)) {
                            roundBit = 1;
                            break;
                        }
                    }
                }
            }

            if (roundBit) {
                let dIdx = lastDigit;

                for (; dIdx >= 0; dIdx--) {
                    if (++digits[dIdx] > 9) {
                        digits[dIdx] = 0;

                        // overflowed most significant digit
                        if (dIdx === 0) {
                            if (exponent < EXPONENT_MAX) {
                                exponent = exponent + 1;
                                digits[dIdx] = 1;
                            } else {
                                return new Decimal128(
                                    new Buffer(
                                        isNegative ? INF_NEGATIVE_BUFFER : INF_POSITIVE_BUFFER
                                    )
                                );
                            }
                        }
                    } else {
                        break;
                    }
                }
            }
        }

        // Encode significand
        // The high 17 digits of the significand
        significandHigh = Long.fromNumber(0);
        // The low 17 digits of the significand
        significandLow = Long.fromNumber(0);

        // read a zero
        if (significantDigits === 0) {
            significandHigh = Long.fromNumber(0);
            significandLow = Long.fromNumber(0);
        } else if (lastDigit - firstDigit < 17) {
            let dIdx = firstDigit;
            significandLow = Long.fromNumber(digits[dIdx++]);
            significandHigh = new Long(0, 0);

            for (; dIdx <= lastDigit; dIdx++) {
                significandLow = significandLow.mul(Long.fromNumber(10));
                significandLow = significandLow.add(Long.fromNumber(digits[dIdx]));
            }
        } else {
            let dIdx = firstDigit;
            significandHigh = Long.fromNumber(digits[dIdx++]);

            for (; dIdx <= lastDigit - 17; dIdx++) {
                significandHigh = significandHigh.mul(Long.fromNumber(10));
                significandHigh = significandHigh.add(Long.fromNumber(digits[dIdx]));
            }

            significandLow = Long.fromNumber(digits[dIdx++]);

            for (; dIdx <= lastDigit; dIdx++) {
                significandLow = significandLow.mul(Long.fromNumber(10));
                significandLow = significandLow.add(Long.fromNumber(digits[dIdx]));
            }
        }

        const significand = multiply64x2(significandHigh, Long.fromString("100000000000000000"));

        significand.low = significand.low.add(significandLow);

        if (lessThan(significand.low, significandLow)) {
            significand.high = significand.high.add(Long.fromNumber(1));
        }

        // Biased exponent
        const biasedExponent = (exponent + EXPONENT_BIAS);
        const dec = { low: Long.fromNumber(0), high: Long.fromNumber(0) };

        // Encode combination, exponent, and significand.
        if (significand.high.shru(49).and(Long.fromNumber(1)).equals(Long.fromNumber(1))) {
            // Encode '11' into bits 1 to 3
            dec.high = dec.high.or(Long.fromNumber(0x3).shl(61));
            dec.high = dec.high.or(Long.fromNumber(biasedExponent)
                .and(Long.fromNumber(0x3fff).shl(47)));
            dec.high = dec.high.or(significand.high.and(Long.fromNumber(0x7fffffffffff)));
        } else {
            dec.high = dec.high.or(Long.fromNumber(biasedExponent & 0x3fff).shl(49));
            dec.high = dec.high.or(significand.high.and(Long.fromNumber(0x1ffffffffffff)));
        }

        dec.low = significand.low;

        if (isNegative) {
            dec.high = dec.high.or(Long.fromString("9223372036854775808"));
        }

        const buffer = Buffer.alloc(16);
        index = 0;

        // Encode the low 64 bits of the decimal
        // Encode low bits
        buffer[index++] = dec.low.low & 0xff;
        buffer[index++] = (dec.low.low >> 8) & 0xff;
        buffer[index++] = (dec.low.low >> 16) & 0xff;
        buffer[index++] = (dec.low.low >> 24) & 0xff;
        // Encode high bits
        buffer[index++] = dec.low.high & 0xff;
        buffer[index++] = (dec.low.high >> 8) & 0xff;
        buffer[index++] = (dec.low.high >> 16) & 0xff;
        buffer[index++] = (dec.low.high >> 24) & 0xff;

        // Encode the high 64 bits of the decimal
        // Encode low bits
        buffer[index++] = dec.high.low & 0xff;
        buffer[index++] = (dec.high.low >> 8) & 0xff;
        buffer[index++] = (dec.high.low >> 16) & 0xff;
        buffer[index++] = (dec.high.low >> 24) & 0xff;
        // Encode high bits
        buffer[index++] = dec.high.high & 0xff;
        buffer[index++] = (dec.high.high >> 8) & 0xff;
        buffer[index++] = (dec.high.high >> 16) & 0xff;
        buffer[index++] = (dec.high.high >> 24) & 0xff;

        // Return the new Decimal128
        return new Decimal128(buffer);
    }

    toString() {
        let index = 0;
        const buffer = this.bytes;
        // bits 96 - 127
        const low = buffer[index++] |
            buffer[index++] << 8 |
            buffer[index++] << 16 |
            buffer[index++] << 24;
        // bits 64 - 95
        const midl = buffer[index++] |
            buffer[index++] << 8 |
            buffer[index++] << 16 |
            buffer[index++] << 24;

        // Unpack the high 64bits into a long
        // bits 32 - 63
        const midh = buffer[index++] |
            buffer[index++] << 8 |
            buffer[index++] << 16 |
            buffer[index++] << 24;
        // bits 0 - 31
        const high = buffer[index++] |
            buffer[index++] << 8 |
            buffer[index++] << 16 |
            buffer[index++] << 24;

        index = 0;

        // Create the state of the decimal
        const dec = {
            low: new Long(low, midl),
            high: new Long(midh, high)
        };

        const string = [];

        if (dec.high.lessThan(Long.ZERO)) {
            string.push("-");
        }

        // Decode combination field and exponent
        const combination = (high >> 26) & COMBINATION_MASK;

        let significandMSB;
        let biasedExponent;

        if ((combination >> 3) === 3) {
            // Check for 'special' values
            if (combination === COMBINATION_INFINITY) {
                return `${string.join("")}Infinity`;
            } else if (combination === COMBINATION_NAN) {
                return "NaN";
            } 
            biasedExponent = (high >> 15) & EXPONENT_MASK;
            significandMSB = 0x08 + ((high >> 14) & 0x01);
            
        } else {
            significandMSB = (high >> 14) & 0x07;
            biasedExponent = (high >> 17) & EXPONENT_MASK;
        }

        const exponent = biasedExponent - EXPONENT_BIAS;

        // Create string of significand digits

        // Convert the 114-bit binary number represented by
        // (significand_high, significand_low) to at most 34 decimal
        // digits through modulo and division.
        const significand = new Array(36).fill(0);
        let significand128 = { parts: new Array(4) };
        significand128.parts[0] = (high & 0x3fff) + ((significandMSB & 0xf) << 14);
        significand128.parts[1] = midh;
        significand128.parts[2] = midl;
        significand128.parts[3] = low;

        let isZero = false;

        if (
            significand128.parts[0] === 0 &&
            significand128.parts[1] === 0 &&
            significand128.parts[2] === 0 &&
            significand128.parts[3] === 0
        ) {
            isZero = true;
        } else {
            for (let k = 3; k >= 0; k--) {
                let leastDigits = 0;
                // Peform the divide
                const result = divideu128(significand128);
                significand128 = result.quotient;
                leastDigits = result.rem.low;

                // We now have the 9 least significant digits (in base 2).
                // Convert and output to string.
                if (!leastDigits) {
                    continue;
                }

                for (let j = 8; j >= 0; j--) {
                    significand[k * 9 + j] = leastDigits % 10;
                    leastDigits = Math.floor(leastDigits / 10);
                }
            }
        }

        // Output format options:
        // Scientific - [-]d.dddE(+/-)dd or [-]dE(+/-)dd
        // Regular    - ddd.ddd

        let significandDigits = 0;

        if (isZero) {
            significandDigits = 1;
            significand[index] = 0;
        } else {
            significandDigits = 36;
            while (!significand[index]) {
                significandDigits = significandDigits - 1;
                ++index;
            }
        }

        const scientificExponent = significandDigits - 1 + exponent;

        // The scientific exponent checks are dictated by the string conversion
        // specification and are somewhat arbitrary cutoffs.
        //
        // We must check exponent > 0, because if this is the case, the number
        // has trailing zeros.  However, we *cannot* output these trailing zeros,
        // because doing so would change the precision of the value, and would
        // change stored data if the string converted number is round tripped.

        if (scientificExponent >= 34 || scientificExponent <= -7 ||
            exponent > 0) {
            // Scientific format
            string.push(significand[index++]);
            significandDigits = significandDigits - 1;

            if (significandDigits) {
                string.push(".");
            }

            for (let i = 0; i < significandDigits; i++) {
                string.push(significand[index++]);
            }

            // Exponent
            string.push("E");
            if (scientificExponent > 0) {
                string.push(`+${scientificExponent}`);
            } else {
                string.push(scientificExponent);
            }
        } else {
            // Regular format with no decimal place
            if (exponent >= 0) {
                for (let i = 0; i < significandDigits; i++) {
                    string.push(significand[index++]);
                }
            } else {
                let radixPosition = significandDigits + exponent;

                // non-zero digits before radix
                if (radixPosition > 0) {
                    for (let i = 0; i < radixPosition; i++) {
                        string.push(significand[index++]);
                    }
                } else {
                    string.push("0");
                }

                string.push(".");
                // add leading zeros after radix
                while (radixPosition++ < 0) {
                    string.push("0");
                }

                for (let i = 0; i < significandDigits - Math.max(radixPosition - 1, 0); i++) {
                    string.push(significand[index++]);
                }
            }
        }

        return string.join("");
    }

    toJSON() {
        return { $numberDecimal: this.toString() };
    }
}
