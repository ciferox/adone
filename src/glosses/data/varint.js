const MSB = 0x80;
const REST = 0x7F;
const MSBALL = ~REST;
const INT = Math.pow(2, 31);

export const encode = (num, out, offset = 0) => {
    out = out || [];
    const oldOffset = offset;

    while (num >= INT) {
        out[offset++] = (num & 0xFF) | MSB;
        num /= 128;
    }
    while (num & MSBALL) {
        out[offset++] = (num & 0xFF) | MSB;
        num >>>= 7;
    }
    out[offset] = num | 0;

    encode.bytes = offset - oldOffset + 1;

    return out;
};


export const decode = (buf, offset = 0) => {
    let res = 0;
    let shift = 0;
    let counter = offset;
    let b;
    const l = buf.length;

    do {
        if (counter >= l) {
            decode.bytes = 0;
            throw new RangeError("Could not decode varint");
        }
        b = buf[counter++];
        res += shift < 28
            ? (b & REST) << shift
            : (b & REST) * Math.pow(2, shift);
        shift += 7;
    } while (b >= MSB);

    decode.bytes = counter - offset;

    return res;
};

const N1 = Math.pow(2, 7);
const N2 = Math.pow(2, 14);
const N3 = Math.pow(2, 21);
const N4 = Math.pow(2, 28);
const N5 = Math.pow(2, 35);
const N6 = Math.pow(2, 42);
const N7 = Math.pow(2, 49);
const N8 = Math.pow(2, 56);
const N9 = Math.pow(2, 63);

export const encodingLength = (value) => {
    return (
        value < N1 ? 1
            : value < N2 ? 2
                : value < N3 ? 3
                    : value < N4 ? 4
                        : value < N5 ? 5
                            : value < N6 ? 6
                                : value < N7 ? 7
                                    : value < N8 ? 8
                                        : value < N9 ? 9
                                            : 10
    );
};
