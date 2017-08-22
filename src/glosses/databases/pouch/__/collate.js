const MIN_MAGNITUDE = -324; // verified by -Number.MIN_VALUE
const MAGNITUDE_DIGITS = 3; // ditto
const SEP = ""; // set to '_' for easier debugging

const { is } = adone;

// couch considers null/NaN/Infinity/-Infinity === undefined,
// for the purposes of mapreduce indexes. also, dates get stringified.
export const normalizeKey = (key) => {
    switch (typeof key) {
        case "undefined": {
            return null;
        }
        case "number": {
            if (key === Infinity || key === -Infinity || is.nan(key)) {
                return null;
            }
            return key;
        }
        case "object": {
            const origKey = key;
            if (is.array(key)) {
                const len = key.length;
                key = new Array(len);
                for (let i = 0; i < len; i++) {
                    key[i] = normalizeKey(origKey[i]);
                }
                /* istanbul ignore next */
            } else if (key instanceof Date) {
                return key.toJSON();
            } else if (!is.null(key)) { // generic object
                key = {};
                for (const k in origKey) {
                    if (origKey.hasOwnProperty(k)) {
                        const val = origKey[k];
                        if (!is.undefined(val)) {
                            key[k] = normalizeKey(val);
                        }
                    }
                }
            }
        }
    }
    return key;
};

// conversion:
// x yyy zz...zz
// x = 0 for negative, 1 for 0, 2 for positive
// y = exponent (for negative numbers negated) moved so that it's >= 0
// z = mantisse
const numToIndexableString = (num) => {
    if (num === 0) {
        return "1";
    }

    // convert number to exponential format for easier and
    // more succinct string sorting
    const expFormat = num.toExponential().split(/e\+?/);
    const magnitude = parseInt(expFormat[1], 10);

    const neg = num < 0;

    let result = neg ? "0" : "2";

    // first sort by magnitude
    // it's easier if all magnitudes are positive
    const magForComparison = ((neg ? -magnitude : magnitude) - MIN_MAGNITUDE);
    const magString = (magForComparison).toString().padStart(MAGNITUDE_DIGITS, "0");

    result += SEP + magString;

    // then sort by the factor
    let factor = Math.abs(parseFloat(expFormat[0])); // [1..10)
    /* istanbul ignore next */
    if (neg) { // for negative reverse ordering
        factor = 10 - factor;
    }

    let factorStr = factor.toFixed(20);

    // strip zeros from the end
    factorStr = factorStr.replace(/\.?0+$/, "");

    result += SEP + factorStr;

    return result;
};

// The collation is defined by erlangs ordered terms
// the atoms null, true, false come first, then numbers, strings,
// arrays, then objects
// null/undefined/NaN/Infinity/-Infinity are all considered null
const collationIndex = (x) => {
    const id = ["boolean", "number", "string", "object"];
    const idx = id.indexOf(typeof x);
    //false if -1 otherwise true, but fast!!!!1
    if (~idx) {
        if (is.null(x)) {
            return 1;
        }
        if (is.array(x)) {
            return 5;
        }
        return idx < 3 ? (idx + 2) : (idx + 3);
    }
    /* istanbul ignore next */
    if (is.array(x)) {
        return 5;
    }
};


// convert the given key to a string that would be appropriate
// for lexical sorting, e.g. within a database, where the
// sorting is the same given by the collate() function.
export const toIndexableString = (key) => {
    const zero = "\u0000";
    key = normalizeKey(key);
    // eslint-disable-next-line no-use-before-define
    return collationIndex(key) + SEP + indexify(key) + zero;
};

const indexify = (key) => {
    if (!is.null(key)) {
        switch (typeof key) {
            case "boolean": {
                return key ? 1 : 0;
            }
            case "number": {
                return numToIndexableString(key);
            }
            case "string": {
                // We've to be sure that key does not contain \u0000
                // Do order-preserving replacements:
                // 0 -> 1, 1
                // 1 -> 1, 2
                // 2 -> 2, 2
                return key
                    .replace(/\u0002/g, "\u0002\u0002")
                    .replace(/\u0001/g, "\u0001\u0002")
                    .replace(/\u0000/g, "\u0001\u0001");
            }
            case "object": {
                const isArray = is.array(key);
                const arr = isArray ? key : Object.keys(key);
                let i = -1;
                const len = arr.length;
                let result = "";
                if (isArray) {
                    while (++i < len) {
                        result += toIndexableString(arr[i]);
                    }
                } else {
                    while (++i < len) {
                        const objKey = arr[i];
                        result += toIndexableString(objKey) +
                            toIndexableString(key[objKey]);
                    }
                }
                return result;
            }
        }
    }
    return "";
};

const parseNumber = (str, i) => {
    const originalIdx = i;
    let num;
    const zero = str[i] === "1";
    if (zero) {
        num = 0;
        i++;
    } else {
        const neg = str[i] === "0";
        i++;
        let numAsString = "";
        const magAsString = str.substring(i, i + MAGNITUDE_DIGITS);
        let magnitude = parseInt(magAsString, 10) + MIN_MAGNITUDE;
        /* istanbul ignore next */
        if (neg) {
            magnitude = -magnitude;
        }
        i += MAGNITUDE_DIGITS;
        while (true) {
            const ch = str[i];
            if (ch === "\u0000") {
                break;
            } else {
                numAsString += ch;
            }
            i++;
        }
        numAsString = numAsString.split(".");
        if (numAsString.length === 1) {
            num = parseInt(numAsString, 10);
        } else {
            /* istanbul ignore next */
            num = parseFloat(`${numAsString[0]}.${numAsString[1]}`);
        }
        /* istanbul ignore next */
        if (neg) {
            num = num - 10;
        }
        /* istanbul ignore next */
        if (magnitude !== 0) {
            // parseFloat is more reliable than pow due to rounding errors
            // e.g. Number.MAX_VALUE would return Infinity if we did
            // num * Math.pow(10, magnitude);
            num = parseFloat(`${num}e${magnitude}`);
        }
    }
    return { num, length: i - originalIdx };
};

// move up the stack while parsing
// this function moved outside of parseIndexableString for performance
const pop = (stack, metaStack) => {
    const obj = stack.pop();

    if (metaStack.length) {
        let lastMetaElement = metaStack[metaStack.length - 1];
        if (obj === lastMetaElement.element) {
            // popping a meta-element, e.g. an object whose value is another object
            metaStack.pop();
            lastMetaElement = metaStack[metaStack.length - 1];
        }
        const element = lastMetaElement.element;
        const lastElementIndex = lastMetaElement.index;
        if (is.array(element)) {
            element.push(obj);
        } else if (lastElementIndex === stack.length - 2) { // obj with key+value
            const key = stack.pop();
            element[key] = obj;
        } else {
            stack.push(obj); // obj with key only
        }
    }
};

const stringCollate = (a, b) => {
    // See: https://github.com/daleharvey/pouchdb/issues/40
    // This is incompatible with the CouchDB implementation, but its the
    // best we can do for now
    return (a === b) ? 0 : ((a > b) ? 1 : -1);
};

export const collate = (a, b) => {
    if (a === b) {
        return 0;
    }

    a = normalizeKey(a);
    b = normalizeKey(b);

    const ai = collationIndex(a);
    const bi = collationIndex(b);
    if ((ai - bi) !== 0) {
        return ai - bi;
    }
    switch (typeof a) {
        case "number": {
            return a - b;
        }
        case "boolean": {
            return a < b ? -1 : 1;
        }
        case "string": {
            return stringCollate(a, b);
        }
    }
    // eslint-disable-next-line no-use-before-define
    return is.array(a) ? arrayCollate(a, b) : objectCollate(a, b);
};

const arrayCollate = (a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const sort = collate(a[i], b[i]);
        if (sort !== 0) {
            return sort;
        }
    }
    return (a.length === b.length) ? 0 :
        (a.length > b.length) ? 1 : -1;
};

const objectCollate = (a, b) => {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    const len = Math.min(ak.length, bk.length);
    for (let i = 0; i < len; i++) {
        // First sort the keys
        let sort = collate(ak[i], bk[i]);
        if (sort !== 0) {
            return sort;
        }
        // if the keys are equal sort the values
        sort = collate(a[ak[i]], b[bk[i]]);
        if (sort !== 0) {
            return sort;
        }

    }
    return (ak.length === bk.length) ? 0 :
        (ak.length > bk.length) ? 1 : -1;
};

export const parseIndexableString = (str) => {
    const stack = [];
    const metaStack = []; // stack for arrays and objects
    let i = 0;

    /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
    while (true) {
        const collationIndex = str[i++];
        if (collationIndex === "\u0000") {
            if (stack.length === 1) {
                return stack.pop();
            }
            pop(stack, metaStack);
            continue;

        }
        switch (collationIndex) {
            case "1": {
                stack.push(null);
                break;
            }
            case "2": {
                stack.push(str[i] === "1");
                i++;
                break;
            }
            case "3": {
                const parsedNum = parseNumber(str, i);
                stack.push(parsedNum.num);
                i += parsedNum.length;
                break;
            }
            case "4": {
                let parsedStr = "";
                /*eslint no-constant-condition: ["error", { "checkLoops": false }]*/
                while (true) {
                    const ch = str[i];
                    if (ch === "\u0000") {
                        break;
                    }
                    parsedStr += ch;
                    i++;
                }
                // perform the reverse of the order-preserving replacement
                // algorithm (see above)
                parsedStr = parsedStr.replace(/\u0001\u0001/g, "\u0000")
                    .replace(/\u0001\u0002/g, "\u0001")
                    .replace(/\u0002\u0002/g, "\u0002");
                stack.push(parsedStr);
                break;
            }
            case "5": {
                const arrayElement = { element: [], index: stack.length };
                stack.push(arrayElement.element);
                metaStack.push(arrayElement);
                break;
            }
            case "6": {
                const objElement = { element: {}, index: stack.length };
                stack.push(objElement.element);
                metaStack.push(objElement);
                break;
            }
            default: {
                throw new Error(
                    `bad collationIndex or unexpectedly reached end of input: ${
                        collationIndex}`);
            }
        }
    }
};
