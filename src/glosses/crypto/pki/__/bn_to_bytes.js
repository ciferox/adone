/**
 * Converts a positive BigNumber into 2's-complement big-endian bytes.
 *
 * @param b the big integer to convert.
 *
 * @return {Buffer} the bytes.
 */
export default function bnToBytes(b) {
    // prepend 0x00 if first byte >= 0x80
    let hex = b.toString(16);
    if (hex[0] >= "8") {
        hex = `00${hex}`;
    }
    if (hex.length % 2 !== 0) {
        hex = `0${hex}`;
    }
    const bytes = Buffer.from(hex, "hex");

    // ensure integer is minimally-encoded
    if (bytes.length > 1
        &&
        (
            // leading 0x00 for positive integer
            (bytes[0] === 0 && (bytes[1] & 0x80) === 0)
            ||
            // leading 0xFF for negative integer
            (bytes[0] === 0xFF && (bytes[1] & 0x80) === 0x80)
        )
    ) {
        return bytes.slice(1);
    }
    return bytes;
}
