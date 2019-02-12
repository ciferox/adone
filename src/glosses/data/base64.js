const {
    is,
    error
} = adone;

adone.asNamespace(exports);

const intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");

export const encodeNumber = (number) => {
    if (number >= 0 && number < intToCharMap.length) {
        return intToCharMap[number];
    }
    throw new error.InvalidArgumentException(`Must be between 0 and 63: ${number}`);
};

export const decodeCharCode = (charCode) => {
    const bigA = 65; // 'A'
    const bigZ = 90; // 'Z'

    const littleA = 97; // 'a'
    const littleZ = 122; // 'z'

    const zero = 48; // '0'
    const nine = 57; // '9'

    const plus = 43; // '+'
    const slash = 47; // '/'

    const littleOffset = 26;
    const numberOffset = 52;

    // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
    if (bigA <= charCode && charCode <= bigZ) {
        return (charCode - bigA);
    }

    // 26 - 51: abcdefghijklmnopqrstuvwxyz
    if (littleA <= charCode && charCode <= littleZ) {
        return (charCode - littleA + littleOffset);
    }

    // 52 - 61: 0123456789
    if (zero <= charCode && charCode <= nine) {
        return (charCode - zero + numberOffset);
    }

    // 62: +
    if (charCode === plus) {
        return 62;
    }

    // 63: /
    if (charCode === slash) {
        return 63;
    }

    // Invalid base64 digit.
    return -1;
};


const VLQ_BASE_SHIFT = 5;

const VLQ_BASE = 1 << VLQ_BASE_SHIFT;

const VLQ_BASE_MASK = VLQ_BASE - 1;

const VLQ_CONTINUATION_BIT = VLQ_BASE;

const toVLQSigned = (aValue) => aValue < 0 ? ((-aValue) << 1) + 1 : (aValue << 1) + 0;

const fromVLQSigned = (aValue) => {
    const isNegative = (aValue & 1) === 1;
    const shifted = aValue >> 1;
    return isNegative ? -shifted : shifted;
};

export const decodeVLQ = (aStr, aIndex = 0, rest = false) => {
    const { length } = aStr;
    let result = 0;
    let shift = 0;
    let continuation;
    let digit;

    do {
        if (aIndex >= length) {
            throw new error.IllegalStateException("Expected more digits in base 64 VLQ value.");
        }

        digit = decodeCharCode(aStr.charCodeAt(aIndex++));
        if (digit === -1) {
            throw new error.IllegalStateException(`Invalid base64 digit: ${aStr.charAt(aIndex - 1)}`);
        }

        continuation = Boolean(digit & VLQ_CONTINUATION_BIT);
        digit &= VLQ_BASE_MASK;
        result = result + (digit << shift);
        shift += VLQ_BASE_SHIFT;
    } while (continuation);

    const value = fromVLQSigned(result);

    if (rest) {
        return { value, index: aIndex };
    }

    return value;
};

export const encodeVLQ = (aValue) => {
    let encoded = "";
    let digit;

    let vlq = toVLQSigned(aValue);

    do {
        digit = vlq & VLQ_BASE_MASK;
        vlq >>>= VLQ_BASE_SHIFT;
        if (vlq > 0) {
            // There are still more digits in this value, so we must make sure the
            // continuation bit is marked.
            digit |= VLQ_CONTINUATION_BIT;
        }
        encoded += encodeNumber(digit);
    } while (vlq > 0);

    return encoded;
};

export const encode = (str, { buffer = true } = {}) => {
    if (!is.buffer(str)) {
        str = Buffer.from(str);
    }
    if (!buffer) {
        return str.toString("base64");
    }
    return Buffer.from(str.toString("base64"), "binary");
};

export const decode = (str, { buffer = false, encoding = "binary" } = {}) => {
    const b = Buffer.from(str, "base64");
    if (buffer) {
        return b;
    }
    return b.toString(encoding);
};

export const any = false;
