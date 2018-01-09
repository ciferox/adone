/**
 * Converts 4-bytes into an IPv4 string representation. The bytes must be
 * in network order.
 *
 * @param bytes the bytes to convert.
 *
 * @return the IPv4 string representation or null for an invalid # of bytes.
 */
const bytesToIPv4 = function (bytes) {
    if (bytes.length !== 4) {
        return null;
    }
    const ip = [];
    for (let i = 0; i < bytes.length; ++i) {
        ip.push(bytes.charCodeAt(i));
    }
    return ip.join(".");
};

/**
 * Converts 16-bytes into an IPv16 string representation. The bytes must be
 * in network order.
 *
 * @param bytes the bytes to convert.
 *
 * @return the IPv16 string representation or null for an invalid # of bytes.
 */
const bytesToIPv6 = function (bytes) {
    if (bytes.length !== 16) {
        return null;
    }
    const ip = [];
    const zeroGroups = [];
    let zeroMaxGroup = 0;
    for (let i = 0; i < bytes.length; i += 2) {
        let hex = Buffer.from(bytes[i] + bytes[i + 1], "binary").toString("hex");
        // canonicalize zero representation
        while (hex[0] === "0" && hex !== "0") {
            hex = hex.substr(1);
        }
        if (hex === "0") {
            const last = zeroGroups[zeroGroups.length - 1];
            const idx = ip.length;
            if (!last || idx !== last.end + 1) {
                zeroGroups.push({ start: idx, end: idx });
            } else {
                last.end = idx;
                if ((last.end - last.start) >
            (zeroGroups[zeroMaxGroup].end - zeroGroups[zeroMaxGroup].start)) {
                    zeroMaxGroup = zeroGroups.length - 1;
                }
            }
        }
        ip.push(hex);
    }
    if (zeroGroups.length > 0) {
        const group = zeroGroups[zeroMaxGroup];
        // only shorten group of length > 0
        if (group.end - group.start > 0) {
            ip.splice(group.start, group.end - group.start + 1, "");
            if (group.start === 0) {
                ip.unshift("");
            }
            if (group.end === 7) {
                ip.push("");
            }
        }
    }
    return ip.join(":");
};

/**
 * Converts 4-bytes into an IPv4 string representation or 16-bytes into
 * an IPv6 string representation. The bytes must be in network order.
 *
 * @param bytes the bytes to convert.
 *
 * @return the IPv4 or IPv6 string representation if 4 or 16 bytes,
 *         respectively, are given, otherwise null.
 */
export default function bytesToIP(bytes) {
    if (bytes.length === 4) {
        return bytesToIPv4(bytes);
    }
    if (bytes.length === 16) {
        return bytesToIPv6(bytes);
    }
    return null;
}
