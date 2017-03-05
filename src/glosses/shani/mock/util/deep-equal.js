import adone from "adone";
import match from "../match";

const deepEqual = function deepEqual(a, b, matcher) {
    if (typeof a !== "object" || typeof b !== "object") {
        return adone.is.nan(a) && adone.is.nan(b) || a === b;
    }

    if (a === b) {
        return true;
    }

    if ((a === null && b !== null) || (a !== null && b === null)) {
        return false;
    }

    if (a instanceof RegExp && b instanceof RegExp) {
        return (a.source === b.source) && (a.global === b.global) &&
            (a.ignoreCase === b.ignoreCase) && (a.multiline === b.multiline);
    }

    const aString = Object.prototype.toString.call(a);
    if (aString !== Object.prototype.toString.call(b)) {
        return false;
    }

    if (aString === "[object Date]") {
        return a.valueOf() === b.valueOf();
    }

    let prop;
    let aLength = 0;
    let bLength = 0;

    if (aString === "[object Array]" && a.length !== b.length) {
        return false;
    }

    for (prop in a) {
        if (Object.prototype.hasOwnProperty.call(a, prop)) {
            aLength += 1;

            if (!(prop in b)) {
                return false;
            }

            // allow alternative function for recursion
            if (!(matcher || deepEqual)(a[prop], b[prop])) {
                return false;
            }
        }
    }

    for (prop in b) {
        if (Object.prototype.hasOwnProperty.call(b, prop)) {
            bLength += 1;
        }
    }

    return aLength === bLength;
};

export default function $deepEqual(a, b) {
    if (match.isMatcher(a)) {
        return a.test(b);
    }

    return deepEqual(a, b, $deepEqual);
}
