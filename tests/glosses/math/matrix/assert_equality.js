const isEqual = (arr1, arr2) => {
    if (adone.is.number(arr1)) {
        return Math.abs(arr1 - arr2) < adone.math.matrix.EPSILON;
    }

    const length = arr1.length;
    if (length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < length; i++) {
        if ((isNaN(arr1[i]) !== isNaN(arr2[i])) || (Math.abs(arr1[i] - arr2[i]) >= adone.math.matrix.EPSILON)) {
            return false;
        }
    }
    return true;
};

export default function assertEquality(a, b) {
    assert.ok(isEqual(a, b), `Expected ${JSON.stringify(a)} to be equal ${JSON.stringify(b)}`);
}
