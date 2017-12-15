const {
    is
} = adone;

adone.lazify({
    Long: "./long",
    BitSet: "./bitset",
    BigNumber: "./bignumber",
    simd: "./simd",
    matrix: "./matrix"
}, adone.asNamespace(exports), require);

export const random = (min = 0, max = 0xFFFFFFFF) => {
    min >>>= 0;
    max >>>= 0;
    const b = adone.std.crypto.randomBytes(4);
    const val = (b[0] | b[1] << 8 | b[2] << 16 | b[3] << 24) >>> 0;
    return min + (val % (max - min));
};

export const max = (array, func = adone.identity) => {
    if (!array.length) {
        return undefined;
    }
    let maxScore = null;
    let maxElem = undefined;
    for (let i = 0; i < array.length; ++i) {
        const elem = array[i];
        if (is.null(maxScore)) {
            maxScore = func(elem);
            maxElem = elem;
            continue;
        }
        const score = func(elem);
        if (score > maxScore) {
            maxScore = score;
            maxElem = elem;
        }
    }
    return maxElem;
};

export const min = (array, func = adone.identity) => {
    if (!array.length) {
        return undefined;
    }
    let minScore = null;
    let minElem = undefined;
    for (let i = 0; i < array.length; ++i) {
        const elem = array[i];
        if (is.null(minScore)) {
            minScore = func(elem);
            minElem = elem;
            continue;
        }
        const score = func(elem);
        if (score < minScore) {
            minScore = score;
            minElem = elem;
        }
    }
    return minElem;
};
