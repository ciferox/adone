const defaultComparator = (a, b) => a - b;

export default function binarySearch(
    aHaystack,
    aNeedle,
    aLow = -1,
    aHigh = aHaystack.length,
    aCompare = defaultComparator,
    aBias = binarySearch.GREATEST_LOWER_BOUND
) {
    const mid = Math.floor((aHigh - aLow) / 2) + aLow;
    const cmp = aCompare(aNeedle, aHaystack[mid], true);
    if (cmp === 0) {
        return mid;
    }
    if (cmp > 0) {
        if (aHigh - mid > 1) {
            return binarySearch(aHaystack, aNeedle, mid, aHigh, aCompare, aBias);
        }

        if (aBias === binarySearch.LEAST_UPPER_BOUND) {
            return aHigh < aHaystack.length ? aHigh : -1;
        }
        return mid;
    }
    if (mid - aLow > 1) {
        return binarySearch(aHaystack, aNeedle, aLow, mid, aCompare, aBias);
    }

    if (aBias === binarySearch.LEAST_UPPER_BOUND) {
        return mid;
    }
    return aLow < 0 ? -1 : aLow;
}

binarySearch.GREATEST_LOWER_BOUND = 1;
binarySearch.LEAST_UPPER_BOUND = 2;
