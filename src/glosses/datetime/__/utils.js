let hookCallback;

export const hooks = (...args) => hookCallback(...args);

// This is done to register the method called with datetime()
// without creating circular dependencies.
export const setHookCallback = (callback) => {
    hookCallback = callback;
};


export const absCeil = (number) => {
    if (number < 0) {
        return Math.floor(number);
    }
    return Math.ceil(number);
};

export const mod = (n, x) => ((n % x) + x) % x;

export const absFloor = (number) => {
    if (number < 0) {
        // -0 -> 0
        return Math.ceil(number) || 0;
    }
    return Math.floor(number);
};

export const absRound = (number) => {
    if (number < 0) {
        return Math.round(-1 * number) * -1;
    }
    return Math.round(number);
};

export const toInt = (argumentForCoercion) => {
    const coercedNumber = Number(argumentForCoercion);
    let value = 0;

    if (coercedNumber !== 0 && isFinite(coercedNumber)) {
        value = absFloor(coercedNumber);
    }

    return value;
};

// compare two arrays, return the number of differences
export const compareArrays = (array1, array2, dontConvert) => {
    const lengthDiff = Math.abs(array1.length - array2.length);
    let diffs = 0;
    for (let i = 0; i < Math.min(array1.length, array2.length); i++) {
        if ((dontConvert && array1[i] !== array2[i]) || (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
            diffs++;
        }
    }
    return diffs + lengthDiff;
};
