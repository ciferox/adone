const max = 65536;
export const cache = {};

export const generateNumber = (i) => {
    const buffer = Buffer.allocUnsafe(2);
    buffer.writeUInt8(i >> 8, 0, true);
    buffer.writeUInt8(i & 0x00FF, 0 + 1, true);

    return buffer;
};

export const generateCache = () => {
    for (let i = 0; i < max; i++) {
        cache[i] = generateNumber(i);
    }
};
