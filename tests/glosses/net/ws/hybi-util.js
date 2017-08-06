/**
 * Performs hybi07+ type masking.
 */
export const mask = (buf, maskString) => {
    const _mask = Buffer.from(maskString || "3483a868", "hex");

    buf = Buffer.from(buf);

    for (let i = 0; i < buf.length; ++i) {
        buf[i] ^= _mask[i % 4];
    }

    return buf;
};

/**
 * Left pads the string `s` to a total length of `n` with char `c`.
 */
const padl = (s, n, c) => c.repeat(n - s.length) + s;

/**
 * Returns a hex string, representing a specific byte count `length`, from a number.
 */
export const pack = (length, number) => padl(number.toString(16), length, "0");

/**
 * Returns a hex string representing the length of a message.
 */
export const getHybiLengthAsHexString = (len, masked) => {
    let s;

    masked = masked ? 0x80 : 0;

    if (len < 126) {
        s = pack(2, masked | len);
    } else if (len < 65536) {
        s = pack(2, masked | 126) + pack(4, len);
    } else {
        s = pack(2, masked | 127) + pack(16, len);
    }

    return s;
};

/**
 * Split a buffer in two.
 */
export const splitBuffer = (buf) => {
    const i = Math.floor(buf.length / 2);
    return [buf.slice(0, i), buf.slice(i)];
};
