export const create = (a, b) => {
    if (a.length !== b.length) {
        throw new Error("Inputs should have the same length");
    }
    const result = Buffer.alloc(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
};

export const compare = (a, b) => {
    if (a.length !== b.length) {
        throw new Error("Inputs should have the same length");
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] === b[i]) {
            continue;
        }
        return a[i] < b[i] ? -1 : 1;
    }
    return 0;
};

export const gt = (a, b) => compare(a, b) === 1;
export const lt = (a, b) => compare(a, b) === -1;
export const eq = (a, b) => compare(a, b) === 0;
