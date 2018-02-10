const {
    is
} = adone;

export default function (ALPHABET) {
    const ALPHABET_MAP = {};
    const BASE = ALPHABET.length;
    const LEADER = ALPHABET.charAt(0);

    // pre-compute lookup table
    for (let z = 0; z < ALPHABET.length; z++) {
        const x = ALPHABET.charAt(z);

        if (!is.undefined(ALPHABET_MAP[x])) {
            throw new TypeError(`${x} is ambiguous`);
        }
        ALPHABET_MAP[x] = z;
    }

    const encode = (source) => {
        if (source.length === 0) {
            return "";
        }

        const digits = [0];
        for (let i = 0; i < source.length; ++i) {
            let carry = source[i];
            for (let j = 0; j < digits.length; ++j) {
                carry += digits[j] << 8;
                digits[j] = carry % BASE;
                carry = (carry / BASE) | 0;
            }

            while (carry > 0) {
                digits.push(carry % BASE);
                carry = (carry / BASE) | 0;
            }
        }

        let string = "";

        // deal with leading zeros
        for (let k = 0; source[k] === 0 && k < source.length - 1; ++k) {
            string += LEADER;
        }
        // convert digits to a string
        for (let q = digits.length - 1; q >= 0; --q) {
            string += ALPHABET[digits[q]];
        }

        return string;
    };

    const decodeUnsafe = (string) => {
        if (!is.string(string)) {
            throw new TypeError("Expected String");
        }
        if (string.length === 0) {
            return Buffer.allocUnsafe(0);
        }

        const bytes = [0];
        for (let i = 0; i < string.length; i++) {
            const value = ALPHABET_MAP[string[i]];
            if (is.undefined(value)) {
                return;
            }

            let carry = value;
            for (let j = 0; j < bytes.length; ++j) {
                carry += bytes[j] * BASE;
                bytes[j] = carry & 0xff;
                carry >>= 8;
            }

            while (carry > 0) {
                bytes.push(carry & 0xff);
                carry >>= 8;
            }
        }

        // deal with leading zeros
        for (let k = 0; string[k] === LEADER && k < string.length - 1; ++k) {
            bytes.push(0);
        }

        return Buffer.from(bytes.reverse());
    };

    const decode = (string) => {
        const buffer = decodeUnsafe(string);
        if (buffer) {
            return buffer;
        }

        throw new Error(`Non-base${BASE} character`);
    };

    return {
        encode,
        decodeUnsafe,
        decode
    };
}
