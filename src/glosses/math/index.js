adone.lazify({
    Long: "./long",
    BitSet: "./bitset",
    BigNumber: "./bignumber",
    simd: "./simd"
}, exports, require);

export const random = (min = 0, max = 0xFFFFFFFF) => {
    min >>>= 0;
    max >>>= 0;
    const b = adone.std.crypto.randomBytes(4);
    const val = (b[0] | b[1] << 8 | b[2] << 16 | b[3] << 24) >>> 0;
    return min + (val % (max - min));
};
