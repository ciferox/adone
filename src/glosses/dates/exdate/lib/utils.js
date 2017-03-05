export { hooks, setHookCallback };

let hookCallback;

function hooks () {
    return hookCallback.apply(null, arguments);
}

// This is done to register the method called with exdate()
// without creating circular dependencies.
function setHookCallback (callback) {
    hookCallback = callback;
}


export function absCeil (number) {
    if (number < 0) {
        return Math.floor(number);
    } else {
        return Math.ceil(number);
    }
}

export function absFloor (number) {
    if (number < 0) {
        // -0 -> 0
        return Math.ceil(number) || 0;
    } else {
        return Math.floor(number);
    }
}

export function absRound (number) {
    if (number < 0) {
        return Math.round(-1 * number) * -1;
    } else {
        return Math.round(number);
    }
}

// compare two arrays, return the number of differences
export function compareArrays(array1, array2, dontConvert) {
    const lengthDiff = Math.abs(array1.length - array2.length);
    let diffs = 0;
    for (let i = 0; i < Math.min(array1.length, array2.length); i++) {
        if ((dontConvert && array1[i] !== array2[i]) ||
            (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
            diffs++;
        }
    }
    return diffs + lengthDiff;
}

export function toInt(argumentForCoercion) {
    const coercedNumber = +argumentForCoercion;
    let value = 0;

    if (coercedNumber !== 0 && isFinite(coercedNumber)) {
        value = absFloor(coercedNumber);
    }

    return value;
}
