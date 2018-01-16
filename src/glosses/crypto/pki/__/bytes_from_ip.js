// TODO: replace with native impl

/**
 * Converts an IPv4 string representation into bytes (in network order).
 *
 * @param ip the IPv4 address to convert.
 *
 * @return the 4-byte address or null if the address can't be parsed.
 */
const bytesFromIPv4 = (ip) => {
    ip = ip.split(".");
    if (ip.length !== 4) {
        return null;
    }
    const b = new adone.collection.ByteArray();
    for (let i = 0; i < ip.length; ++i) {
        const num = parseInt(ip[i], 10);
        if (isNaN(num)) {
            return null;
        }
        b.writeUInt8(num);
    }
    return b.toBuffer();
};

/**
 * Converts an IPv6 string representation into bytes (in network order).
 *
 * @param ip the IPv6 address to convert.
 *
 * @return the 16-byte address or null if the address can't be parsed.
 */
const bytesFromIPv6 = (ip) => {
    let blanks = 0;
    ip = ip.split(":").filter((e) => {
        if (e.length === 0) {
            ++blanks;
        }
        return true;
    });
    let zeros = (8 - ip.length + blanks) * 2;
    const b = new adone.collection.ByteArray();
    for (let i = 0; i < 8; ++i) {
        if (!ip[i] || ip[i].length === 0) {
            b.fill(0x00, b.offset, b.offset + zeros);
            b.skip(zeros);
            zeros = 0;
            continue;
        }
        const bytes = Buffer.from(ip[i], "hex");
        if (bytes.length < 2) {
            b.putByte(0);
        }
        b.writeBuffer(bytes);
    }
    return b.toBuffer();
};

/**
 * Converts an IPv4 or IPv6 string representation into bytes (in network order).
 *
 * @param ip the IPv4 or IPv6 address to convert.
 *
 * @return the 4-byte IPv6 or 16-byte IPv6 address or null if the address can't
 *         be parsed.
 */
export default function bytesFromIP(ip) {
    if (ip.includes(".")) {
        return bytesFromIPv4(ip);
    }
    if (ip.includes(":")) {
        return bytesFromIPv6(ip);
    }
    return null;
}
