const objectProto = Object.prototype;
const hasOwnProperty = objectProto.hasOwnProperty;
const toString = objectProto.toString;
const symToStringTag = Symbol.toStringTag;
const funcToString = Function.prototype.toString;
const objectCtorString = funcToString.call(Object);

export const getTag = (value) => {
    const rawTag = toString.call(value);
    if (value === null) { // eslint-disable-line
        return "null";
    }
    return rawTag.substring(8, rawTag.length - 1).toLowerCase();
};


export const baseGetTag = (value) => {
    if (value == null) { // eslint-disable-line
        return value === undefined ? "[object Undefined]" : "[object Null]"; // eslint-disable-line
    }
    if (!(symToStringTag && symToStringTag in Object(value))) {
        return toString.call(value);
    }
    const isOwn = hasOwnProperty.call(value, symToStringTag);
    const tag = value[symToStringTag];
    let unmasked = false;
    try {
        value[symToStringTag] = undefined;
        unmasked = true;
    } catch (e) {
        //
    }

    const result = toString.call(value);
    if (unmasked) {
        if (isOwn) {
            value[symToStringTag] = tag;
        } else {
            delete value[symToStringTag];
        }
    }
    return result;
};

const callbackNames = ["callback", "callback_", "cb", "cb_", "done", "next"];

const platform = process.platform;

adone.asNamespace(exports);

// Checks whether `field` is a field owned by `object`.
export const propertyOwned = (obj, field) => hasOwnProperty.call(obj, field);

// Checks whether given value is `null`.
const null_ = (value) => value === null; // eslint-disable-line

// Checks whether given value is `undefined`.
const undefined_ = (value) => value === void 0;

const function_ = (fn) => typeof fn === "function"; // eslint-disable-line

// Checks whether given value is class
const class_ = (value) => (function_(value) && propertyOwned(value, "prototype") && value.prototype && propertyOwned(value.prototype, "constructor") && value.prototype.constructor.toString().substring(0, 5) === "class"); // eslint-disable-line

export {
    null_ as null,
    undefined_ as undefined,
    function_ as function,
    class_ as class
};

// Checks whether given value is `NaN`.
export const nan = Number.isNaN; // eslint-disable-line

// Checks whether given value is a finite number.
export const finite = Number.isFinite; // eslint-disable-line

// Checks whether given value is an integer.
export const integer = Number.isInteger; // eslint-disable-line

// Checks whether given value is a safe integer.
export const safeInteger = Number.isSafeInteger; // eslint-disable-line


export const array = Array.isArray; // eslint-disable-line
export const byteArray = (obj) => adone.tag.has(obj, "BYTE_ARRAY");

// Checks whether given value is a string.
export const string = (value) => (typeof value === "string"); // eslint-disable-line

// Checks whether given value exists, i.e, not `null` nor `undefined`
export const exist = (value) => value != null; // eslint-disable-line

// Checks whether given value is either `null` or `undefined`
export const nil = (value) => value == null; // eslint-disable-line

// Checks whether given value is an empty string, i.e, a string with whitespace characters only.
export const emptyString = (str) => string(str) && /^\s*$/.test(str);

// Checks whether given value is a number.
export const number = (value) => typeof value === "number"; // eslint-disable-line

export const numeral = (value) => {
    // Checks whether given value is a numeral, i.e:
    //
    // - a genuine finite number
    // - or a string that represents a finite number
    const tag = getTag(value);
    if (tag !== "number" && tag !== "string") {
        return false;
    }

    if (emptyString(value)) {
        return false;
    }

    try {
        value = Number(value);
    } catch (error) {
        return false;
    }

    return finite(value);
};

export const emitter = (obj ) => adone.tag.has(obj, "EMITTER");
export const asyncEmitter = (obj ) => adone.tag.has(obj, "ASYNC_EMITTER");

export const long = (obj) => adone.tag.has(obj, "LONG");
export const bigNumber = (obj) => adone.tag.has(obj, "BIGNUMBER");

// Checks whether given value is an infinite number, i.e: +∞ or -∞.
export const infinite = (val) => val === +1 / 0 || val === -1 / 0;

// Checks whether given value is an odd number.
export const odd = (val) => integer(val) && val % 2 === 1;

// Checks whether given value is an even number.
export const even = (val) => integer(val) && val % 2 === 0;

// Checks whether given value is a float number.
export const float = (val) => number(val) && val !== Math.floor(val);

export const negativeZero = (val) => (val === 0) && (Number.NEGATIVE_INFINITY === 1 / val);

export const substring = (substr, str, offset) => {
    // Checks whether one str may be found within another str.
    if (!string(str)) {
        return false;
    }

    const length = str.length;
    offset = integer(offset) ? offset : 0;

    // Allow negative offsets.
    if (offset < 0) {
        offset = length + offset;
    }

    if (offset < 0 || offset >= length) {
        return false;
    }

    return str.indexOf(substr, offset) !== -1;
};

// Checks whether `str` starts with `prefix`.
export const prefix = (prefix, str) => getTag(str) === "str" && str.startsWith(prefix);

// Checks whether `str` ends with `suffix`.
export const suffix = (suffix, str) => getTag(str) === "str" && str.endsWith(suffix);

// Checks whether given value is a boolean.
export const boolean = (value) => value === true || value === false;

export const arrayBuffer = (x) => objectProto.toString.call(x) === "[object ArrayBuffer]";

export const arrayBufferView = (x) => ArrayBuffer.isView(x);

export const date = (value) => getTag(value) === "date";

export const error = (value) => getTag(value) === "error";

export const map = (value) => getTag(value) === "map";

export const regexp = (value) => getTag(value) === "regexp";

export const set = (value) => getTag(value) === "set";

export const symbol = (value) => getTag(value) === "symbol";

// Checks whether given value is a primitive.
export const primitive = (value) => nil(value) || number(value) || string(value) || boolean(value) || symbol(value);

export const equal = (value, other) => (value === other || (value !== value && other !== other)); // eslint-disable-line

export const equalArrays = (arr1, arr2) => {
    const length = arr1.length;
    if (length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
};

// Checks whether given value is an object.
export const object = (value) => !primitive(value);

// Checks whether given value is path to json-file or may by JS-object.
export const json = (value) => (string(value) && value.endsWith(".json")) || object(value);

export const plainObject = (value) => {
    if (!(value != null && typeof value === "object") || baseGetTag(value) !== "[object Object]") { // eslint-disable-line
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto === null) { // eslint-disable-line
        return true;
    }
    const Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
    return function_(Ctor) && Ctor instanceof Ctor && funcToString.call(Ctor) === objectCtorString; // eslint-disable-line
};

export const namespace = (value) => object(value) && value[Symbol.for("adone:namespace")] === true;

// Checks whether given value is an empty object, i.e, an object without any own, enumerable, string keyed properties.
export const emptyObject = (obj) => object(obj) && Object.keys(obj).length === 0;

// Checks whether `path` is a direct or inherited property of `object`.
export const propertyDefined = (obj, path) => {
    let key;
    let context = obj;
    const keys = String(path).split(".");

    while (key = keys.shift()) { // eslint-disable-line no-cond-assign
        if (!object(context) || !(key in context)) {
            return false;
        }
        context = context[key];
    }

    return true;
};

export const conforms = (obj, schema, strict) => {
    // Checks whether `object` conforms to `schema`.
    //
    // A `schema` is an object whose properties are functions that takes
    // these parameters(in order):
    //
    // - __value:any__ - The value of current iteration.
    // - __key:string__ - The corresponding key of current iteration.
    // - __context:object__ - The object in question.
    //
    // These functions, or _validators_, are called for each corresponding key
    // in `object` to check whether object conforms to the schema. An object is
    // said to be conforms to the schema if all validators passed.
    //
    // In strict mode(where `strict=true`), `conforms` also checks whether
    // `object` and `schema` has the same set of own, enumerable, string-keyed
    // properties, in addition to check whether all validators passed.
    if (!object(obj) || !object(schema)) {
        return false;
    }

    const keys = Object.keys(schema);
    const length = keys.length;

    if (strict && length !== Object.keys(obj).length) {
        return false;
    }

    for (let index = 0; index < length; index += 1) {
        const key = keys[index];
        const validator = schema[key];

        if (!function_(validator)) {
            continue;
        }

        if (!hasOwnProperty.call(obj, key) || !validator(obj[key], key, obj)) {
            return false;
        }
    }

    return true;
};

export const arrayLikeObject = (value) => {
    // Checks whether given value is an _array-like_ object.
    //
    // An object is qualified as _array-like_ if it has a property named
    // `length` that is a positive safe integer. As a special case, functions
    // are never qualified as _array-like_.
    if (primitive(value) || function_(value)) {
        return false;
    }
    const length = value.length;
    return integer(length) && length >= 0 && length <= 0xFFFFFFFF; // 32-bit unsigned int maximum
};

export const inArray = (value, array, offset, comparator) => {
    // Checks whether given array or array-like object contains certain element.
    //
    // - __value__: The element to search.
    // - __array__: The array or array-like object to search from.
    // - __offset__: The index to search from, inclusive.
    // - __comparator__: The comparator invoked per element against `value`.

    // Only works with genuine arrays or array-like objects.
    if (!arrayLikeObject(array)) {
        return false;
    }

    if (function_(offset)) {
        comparator = offset;
        offset = 0;
    } else {
        offset = integer(offset) ? offset : 0;
        comparator = function_(comparator) ? comparator : equal;
    }

    const length = array.length;

    // Allow negative offsets.
    if (offset < 0) {
        offset = length + offset;
    }

    if (offset < 0 || offset >= length) {
        return false;
    }

    for (let index = offset; index < length; index += 1) {
        // Skip _holes_ in sparse arrays.
        if (!hasOwnProperty.call(array, index)) {
            continue;
        }

        if (comparator(value, array[index])) {
            return true;
        }
    }

    return false;
};

export const iterable = (obj) => obj && function_(obj[Symbol.iterator]);

// Checks whether given values are of the same type.
export const sameType = (value, other) => (typeof value === typeof other && getTag(value) === getTag(other)); // eslint-disable-line

export const deepEqual = (leftHandOperand, rightHandOperand, options) => {
    const memoizeCompare = (leftHandOperand, rightHandOperand, memoizeMap) => {
        if (!memoizeMap || primitive(leftHandOperand) || primitive(rightHandOperand)) {
            return null;
        }
        const leftHandMap = memoizeMap.get(leftHandOperand);
        if (leftHandMap) {
            const result = leftHandMap.get(rightHandOperand);
            if (boolean(result)) {
                return result;
            }
        }
        return null;
    };

    const memoizeSet = (leftHandOperand, rightHandOperand, memoizeMap, result) => {
        // Technically, WeakMap keys can *only* be objects, not primitives.
        if (!memoizeMap || primitive(leftHandOperand) || primitive(rightHandOperand)) {
            return;
        }
        let leftHandMap = memoizeMap.get(leftHandOperand);
        if (leftHandMap) {
            leftHandMap.set(rightHandOperand, result);
        } else {
            leftHandMap = new WeakMap();
            leftHandMap.set(rightHandOperand, result);
            memoizeMap.set(leftHandOperand, leftHandMap);
        }
    };

    const iterableEqual = (leftHandOperand, rightHandOperand, options) => {
        const length = leftHandOperand.length;
        if (length !== rightHandOperand.length) {
            return false;
        }
        if (length === 0) {
            return true;
        }
        let index = -1;
        while (++index < length) {
            if (deepEqual(leftHandOperand[index], rightHandOperand[index], options) === false) {
                return false;
            }
        }
        return true;
    };

    const entriesEqual = (leftHandOperand, rightHandOperand, options) => {
        if (leftHandOperand.size !== rightHandOperand.size) {
            return false;
        }
        if (leftHandOperand.size === 0) {
            return true;
        }
        return iterableEqual(
            [...leftHandOperand.entries()].sort(),
            [...rightHandOperand.entries()].sort(),
            options
        );
    };

    const getGeneratorEntries = (generator) => {
        let generatorResult = generator.next();
        const accumulator = [generatorResult.value];
        while (generatorResult.done === false) {
            generatorResult = generator.next();
            accumulator.push(generatorResult.value);
        }
        return accumulator;
    };

    const generatorEqual = (leftHandOperand, rightHandOperand, options) => {
        return iterableEqual(
            getGeneratorEntries(leftHandOperand),
            getGeneratorEntries(rightHandOperand),
            options
        );
    };

    const getIteratorEntries = (target) => {
        if (iterable(target)) {
            return [...target];
        }
        return [];
    };

    const keysEqual = (leftHandOperand, rightHandOperand, keys, options) => {
        const { length } = keys;

        if (length === 0) {
            return true;
        }
        for (let i = 0; i < length; ++i) {
            if (deepEqual(leftHandOperand[keys[i]], rightHandOperand[keys[i]], options) === false) {
                return false;
            }
        }
        return true;
    };

    const objectEqual = (leftHandOperand, rightHandOperand, options) => {
        // must they be equal?
        // if (
        //     leftHandOperand.constructor
        //     && rightHandOperand.constructor
        //     && leftHandOperand.constructor !== rightHandOperand.constructor
        // ) {
        //     return false;
        // }

        const leftHandKeys = adone.util.keys(leftHandOperand, { followProto: true });
        const rightHandKeys = adone.util.keys(rightHandOperand, { followProto: true });

        if (leftHandKeys.length && leftHandKeys.length === rightHandKeys.length) {
            leftHandKeys.sort();
            rightHandKeys.sort();
            if (iterableEqual(leftHandKeys, rightHandKeys) === false) {
                return false;
            }
            return keysEqual(leftHandOperand, rightHandOperand, leftHandKeys, options);
        }

        const leftHandEntries = getIteratorEntries(leftHandOperand);
        const rightHandEntries = getIteratorEntries(rightHandOperand);
        if (leftHandEntries.length && leftHandEntries.length === rightHandEntries.length) {
            leftHandEntries.sort();
            rightHandEntries.sort();
            return iterableEqual(leftHandEntries, rightHandEntries, options);
        }

        return leftHandKeys.length === 0 && leftHandEntries.length === 0 &&
            rightHandKeys.length === 0 && rightHandEntries.length === 0;
    };

    const simpleEqual = (leftHandOperand, rightHandOperand) => {
        // Equal references (except for Numbers) can be returned early
        if (leftHandOperand === rightHandOperand) {
            // Handle +-0 cases
            return leftHandOperand !== 0 || 1 / leftHandOperand === 1 / rightHandOperand;
        }

        // handle NaN cases
        if (
            leftHandOperand !== leftHandOperand && // eslint-disable-line no-self-compare
            rightHandOperand !== rightHandOperand // eslint-disable-line no-self-compare
        ) {
            return true;
        }

        // Anything that is not an 'object', i.e. symbols, functions, booleans, numbers,
        // strings, and undefined, can be compared by reference.
        if (primitive(leftHandOperand) || primitive(rightHandOperand)) {
            // Easy out b/c it would have passed the first equality check
            return false;
        }
        return null;
    };

    const extensiveDeepEqualByType = (leftHandOperand, rightHandOperand, leftHandType, options) => {
        switch (leftHandType) {
            case "String":
            case "Number":
            case "Boolean":
            case "Date": {
                // If these types are their instance types (e.g. `new Number`) then re-deepEqual against their values
                return deepEqual(leftHandOperand.valueOf(), rightHandOperand.valueOf());
            }
            case "Promise":
            case "Symbol":
            case "function":
            case "WeakMap":
            case "WeakSet":
            case "class":
            case "Error": {
                return leftHandOperand === rightHandOperand;
            }
            case "Arguments":
            case "Int8Array":
            case "Uint8Array":
            case "Uint8ClampedArray":
            case "Int16Array":
            case "Uint16Array":
            case "Int32Array":
            case "Uint32Array":
            case "Float32Array":
            case "Float64Array":
            case "Array":
            case "Buffer": {
                return iterableEqual(leftHandOperand, rightHandOperand, options);
            }
            case "RegExp": {
                return leftHandOperand.toString() === rightHandOperand.toString();
            }
            case "Generator": {
                return generatorEqual(leftHandOperand, rightHandOperand, options);
            }
            case "DataView": {
                return iterableEqual(
                    new Uint8Array(leftHandOperand.buffer),
                    new Uint8Array(rightHandOperand.buffer),
                    options
                );
            }
            case "ArrayBuffer": {
                return iterableEqual(
                    new Uint8Array(leftHandOperand),
                    new Uint8Array(rightHandOperand),
                    options
                );
            }
            case "Set": {
                return entriesEqual(leftHandOperand, rightHandOperand, options);
            }
            case "Map": {
                return entriesEqual(leftHandOperand, rightHandOperand, options);
            }
            default: {
                return objectEqual(leftHandOperand, rightHandOperand, options);
            }
        }
    };

    const extensiveDeepEqual = (leftHandOperand, rightHandOperand, options = {}) => {
        options.memoize = options.memoize === false ? false : options.memoize || new WeakMap();
        const comparator = options && options.comparator;

        const memoizeResultLeft = memoizeCompare(leftHandOperand, rightHandOperand, options.memoize);
        if (!null_(memoizeResultLeft)) {
            return memoizeResultLeft;
        }
        const memoizeResultRight = memoizeCompare(rightHandOperand, leftHandOperand, options.memoize);
        if (!null_(memoizeResultRight)) {
            return memoizeResultRight;
        }

        if (comparator) {
            const comparatorResult = comparator(leftHandOperand, rightHandOperand);
            // Comparators may return null, in which case we want to go back to default behavior.
            if (boolean(comparatorResult)) {
                memoizeSet(leftHandOperand, rightHandOperand, options.memoize, comparatorResult);
                return comparatorResult;
            }
            // To allow comparators to override *any* behavior, we ran them first. Since it didn't decide
            // what to do, we need to make sure to return the basic tests first before we move on.
            const simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
            if (!null_(simpleResult)) {
                // Don't memoize this, it takes longer to set/retrieve than to just compare.
                return simpleResult;
            }
        }

        const leftHandType = adone.meta.typeOf(leftHandOperand);
        if (leftHandType !== adone.meta.typeOf(rightHandOperand)) {
            memoizeSet(leftHandOperand, rightHandOperand, options.memoize, false);
            return false;
        }

        // Temporarily set the operands in the memoize object to prevent blowing the stack
        memoizeSet(leftHandOperand, rightHandOperand, options.memoize, true);

        const result = extensiveDeepEqualByType(
            leftHandOperand,
            rightHandOperand,
            leftHandType,
            options
        );
        memoizeSet(leftHandOperand, rightHandOperand, options.memoize, result);
        return result;
    };
    if (options && options.comparator) {
        return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
    }

    const simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
    if (!null_(simpleResult)) {
        return simpleResult;
    }

    // Deeper comparisons are pushed through to a larger function
    return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
};

// Does a shallow comparison of two objects, returning false if the keys or values differ.
// The purpose is to do the fastest comparison possible of two objects when the values will predictably be primitives.
export const shallowEqual = (a, b) => {
    if (!a && !b) {
        return true;
    }
    if (!a && b || a && !b) {
        return false;
    }

    let numKeysA = 0;
    let numKeysB = 0;
    let key;
    for (key in b) {
        numKeysB++;
        if (!primitive(b[key]) || !a.hasOwnProperty(key) || (a[key] !== b[key])) {
            return false;
        }
    }
    for (key in a) {
        numKeysA++;
    }
    return numKeysA === numKeysB;
};

// streams

export const stream = (value) => (value !== null && typeof value === "object" && function_(value.pipe)); // eslint-disable-line
export const writableStream = (value) => stream(value) && typeof value._writableState === "object"; // eslint-disable-line
export const readableStream = (value) => stream(value) && typeof value._readableState === "object"; // eslint-disable-line
export const duplexStream = (value) => writableStream(value) && readableStream(value);
export const transformStream = (value) => stream(value) && typeof value._transformState === "object"; // eslint-disable-line
export const coreStream = (value) => adone.tag.has(value, "CORE_STREAM");

export const utf8 = (bytes) => {
    let i = 0;
    while (i < bytes.length) {
        if (bytes[i] === 0x09 || bytes[i] === 0x0A || bytes[i] === 0x0D || (bytes[i] >= 0x20 && bytes[i] <= 0x7E)) { // ASCII
            i += 1;
            continue;
        }
        if ((bytes[i] >= 0xC2 && bytes[i] <= 0xDF) && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF)) { // non-overlong 2-byte
            i += 2;
            continue;
        }
        if (
            (
                bytes[i] === 0xE0
                && (bytes[i + 1] >= 0xA0 && bytes[i + 1] <= 0xBF)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
            )
            || ( // excluding overlongs
                ((bytes[i] >= 0xE1 && bytes[i] <= 0xEC) || bytes[i] === 0xEE || bytes[i] === 0xEF)
                && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
            ) || ( // straight 3-byte
                bytes[i] === 0xED
                && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0x9F)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
            )
        ) { // excluding surrogates
            i += 3;
            continue;
        }

        if (
            (
                bytes[i] === 0xF0
                && (bytes[i + 1] >= 0x90 && bytes[i + 1] <= 0xBF)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
                && (bytes[i + 3] >= 0x80 && bytes[i + 3] <= 0xBF)
            )
            || ( // planes 1-3
                (bytes[i] >= 0xF1 && bytes[i] <= 0xF3)
                && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
                && (bytes[i + 3] >= 0x80 && bytes[i + 3] <= 0xBF)
            )
            || ( // planes 4-15
                bytes[i] === 0xF4
                && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0x8F)
                && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)
                && (bytes[i + 3] >= 0x80 && bytes[i + 3] <= 0xBF)
            )
        ) { // plane 16
            i += 4;
            continue;
        }
        return false;
    }
    return true;
};


export const posixPathAbsolute = (path) => path.charAt(0) === "/";
export const win32PathAbsolute = (path) => {
    const result = /^([a-zA-Z]:|[\\/]{2}[^\\/]+[\\/]+[^\\/]+)?([\\/])?([\s\S]*?)$/.exec(path);
    const device = result[1] || "";
    const isUnc = Boolean(device) && device.charAt(1) !== ":";
    // UNC paths are always absolute
    return Boolean(result[2]) || isUnc;
};

export const pathAbsolute = platform === "win32" ? win32PathAbsolute : posixPathAbsolute;

// Checks whether given `str` is glob or extglob (can use for test extglobs with the same performance)
export const glob = (str) => string(str) && (/[@?!+*]\(/.test(str) || /[*!?{}(|)[\]]/.test(str));

export const dotfile = (str) => {
    if (str.charCodeAt(0) === 46 /* . */ && str.indexOf("/", 1) === -1) {
        return true;
    }

    const last = str.lastIndexOf("/");
    return last !== -1 ? str.charCodeAt(last + 1) === 46/*.*/ : false;
};

export const asyncFunction = (fn) => fn && toString.call(fn).slice(8, -1) === "AsyncFunction";

const isNonArrowFnRegex = /^\s*function/;
const isArrowFnWithParensRegex = /^\([^)]*\) *=>/;
const isArrowFnWithoutParensRegex = /^[^=]*=>/;

export const arrowFunction = (fn) => {
    if (!function_(fn)) {
        return false;
    }
    const fnStr = funcToString.call(fn);
    return fnStr.length > 0 && !isNonArrowFnRegex.test(fnStr) && (isArrowFnWithParensRegex.test(fnStr) || isArrowFnWithoutParensRegex.test(fnStr));
};

const isFnRegex = /^\s*(?:function)?\*/;
const getProto = Object.getPrototypeOf;
const GeneratorFunction = getProto(function* () { });

export const generatorFunction = (fn) => {
    if (!function_(fn)) {
        return false;
    }
    if (isFnRegex.test(funcToString.call(fn))) {
        return true;
    }
    return getProto(fn) === GeneratorFunction;
};

export const promise = (obj) => !nil(obj) && function_(obj.then);

export const validDate = (str) => !isNaN(Date.parse(str)); // eslint-disable-line

export const buffer = (obj) => obj != null && ((Boolean(obj.constructor) && function_(obj.constructor.isBuffer) && obj.constructor.isBuffer(obj)) || Boolean(obj._isBuffer)); // eslint-disable-line

export const callback = (fn, names) => inArray(names || callbackNames, adone.util.functionName(fn));

export const generator = (value) => {
    if (!value || !value.constructor) {
        return false;
    }

    const c = value.constructor;
    const name = "GeneratorFunction";

    if (c.name === name || c.displayName === name) {
        return true;
    }
    if (function_(value.next) && function_(value.throw)) {
        return true;
    }
    if (!function_(value)) {
        return false;
    }
    return true;
};

export const uint8Array = (value) => value instanceof Uint8Array;

export const subsystem = (obj) => adone.tag.has(obj, "SUBSYSTEM");
export const application = (obj) => adone.tag.has(obj, "APPLICATION");
export const cliApplication = (obj) => adone.tag.has(obj, "CLI_APPLICATION");
export const configuration = (obj) => adone.tag.has(obj, "CONFIGURATION");
export const datetime = (obj) => adone.tag.has(obj, "DATETIME");

export const windows = platform === "win32";

export const linux = platform === "linux";

export const freebsd = platform === "freebsd";

export const darwin = platform === "darwin";

export const sunos = platform === "sunos";

export const uppercase = (str) => {
    for (const i of str) {
        if (i < "A" || i > "Z") {
            return false;
        }
    }
    return true;
};

export const lowercase = (str) => {
    for (const i of str) {
        if (i < "a" || i > "z") {
            return false;
        }
        return true;
    }
};

export const digits = (str) => {
    for (const i of str) {
        if (i < "0" || i > "9") {
            return false;
        }
        return true;
    }
};

export const identifier = (str) => {
    if (!str.length) {
        return false;
    }
    if (!uppercase(str[0]) && !lowercase(str[0]) && str[0] !== "$" && str[0] !== "_" && str[0] < 0xA0) {
        return false;
    }
    for (let i = 1; i < str.length; ++i) {
        if (!digits(str[i]) && !lowercase(str[i]) && !uppercase(str[i]) && str[i] !== "_" && str[i] !== "_" && str[i] < 0xA0) {
            return false;
        }
    }
    return true;
};

const binaryExtensions = new Set([
    "3ds", "3g2", "3gp",
    "7z", "a", "aac",
    "adp", "ai", "aif",
    "aiff", "alz", "ape",
    "apk", "ar", "arj",
    "asf", "au", "avi",
    "bak", "bh", "bin",
    "bk", "bmp", "btif",
    "bz2", "bzip2", "cab",
    "caf", "cgm", "class",
    "cmx", "cpio", "cr2",
    "csv", "cur", "dat",
    "deb", "dex", "djvu",
    "dll", "dmg", "dng",
    "doc", "docm", "docx",
    "dot", "dotm", "dra",
    "DS_Store", "dsk", "dts",
    "dtshd", "dvb", "dwg",
    "dxf", "ecelp4800", "ecelp7470",
    "ecelp9600", "egg", "eol",
    "eot", "epub", "exe",
    "f4v", "fbs", "fh",
    "fla", "flac", "fli",
    "flv", "fpx", "fst",
    "fvt", "g3", "gif",
    "graffle", "gz", "gzip",
    "h261", "h263", "h264",
    "ico", "ief", "img",
    "ipa", "iso", "jar",
    "jpeg", "jpg", "jpgv",
    "jpm", "jxr", "key",
    "ktx", "lha", "lvp",
    "lz", "lzh", "lzma",
    "lzo", "m3u", "m4a",
    "m4v", "mar", "mdi",
    "mht", "mid", "midi",
    "mj2", "mka", "mkv",
    "mmr", "mng", "mobi",
    "mov", "movie", "mp3",
    "mp4", "mp4a", "mpeg",
    "mpg", "mpga", "mxu",
    "nef", "npx", "numbers",
    "o", "oga", "ogg",
    "ogv", "otf", "pages",
    "pbm", "pcx", "pdf",
    "pea", "pgm", "pic",
    "png", "pnm", "pot",
    "potm", "potx", "ppa",
    "ppam", "ppm", "pps",
    "ppsm", "ppsx", "ppt",
    "pptm", "pptx", "psd",
    "pya", "pyc", "pyo",
    "pyv", "qt", "rar",
    "ras", "raw", "rgb",
    "rip", "rlc", "rmf",
    "rmvb", "rtf", "rz",
    "s3m", "s7z", "scpt",
    "sgi", "shar", "sil",
    "slk", "smv", "so",
    "sub", "swf", "tar",
    "tbz", "tbz2", "tga",
    "tgz", "thmx", "tif",
    "tiff", "tlz", "ts",
    "ttc", "ttf", "txz",
    "udf", "uvh", "uvi",
    "uvm", "uvp", "uvs",
    "uvu", "viv", "vob",
    "war", "wav", "wax",
    "wbmp", "wdp", "weba",
    "webm", "webp", "whl",
    "wim", "wm", "wma",
    "wmv", "wmx", "woff",
    "woff2", "wvx", "xbm",
    "xif", "xla", "xlam",
    "xls", "xlsb", "xlsm",
    "xlsx", "xlt", "xltm",
    "xltx", "xm", "xmind",
    "xpi", "xpm", "xwd",
    "xz", "z", "zip",
    "zipx"
]);
export const binaryExtension = (x) => binaryExtensions.has(x);
export const binaryPath = (x) => binaryExtensions.has(adone.std.path.extname(x).slice(1).toLowerCase());

export const ip4 = (ip) => adone.regex.ip4().test(ip);

export const ip6 = (ip) => adone.regex.ip6().test(ip);

export const ip = (ip, version = adone.null) => {
    if (version === adone.null) {
        return ip4(ip) || ip6(ip);
    }
    switch (Number(version)) {
        case 4:
            return ip4(ip);
        case 6:
            return ip6(ip);
        default:
            return false; // ?
    }
};

export const knownError = (err) => {
    if (!(err instanceof Error)) {
        return false;
    }
    const name = err.constructor.name;

    for (const Exc of adone.error.adoneExceptions) {
        if (name === Exc.name) {
            return true;
        }
    }

    for (const Exc of adone.error.stdExceptions) {
        if (name === Exc.name) {
            return true;
        }
    }

    return false;
};

const uuidPatterns = {
    1: /^[0-9a-f]{8}-[0-9a-f]{4}-[1][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    2: /^[0-9a-f]{8}-[0-9a-f]{4}-[2][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    3: /^[0-9a-f]{8}-[0-9a-f]{4}-[3][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    4: /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    5: /^[0-9a-f]{8}-[0-9a-f]{4}-[5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    all: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

export const uuid = (str, version = "all") => {
    if (!string(str)) {
        return false;
    }
    const pattern = uuidPatterns[version];
    return pattern && pattern.test(str);
};

const toDate = (date) => {
    date = Date.parse(date);
    return !isNaN(date) ? new Date(date) : null;
};

export const before = (str, date = String(new Date())) => {
    if (!string(str)) {
        return false; // TODO: Date and datetime support
    }
    const comparison = toDate(date);
    const original = toDate(str);
    return Boolean(original && comparison && original < comparison);
};


export const after = (str, date = String(new Date())) => {
    if (!string(str)) {
        return false; // TODO: Date and datetime support
    }
    const comparison = toDate(date);
    const original = toDate(str);
    return Boolean(original && comparison && original > comparison);
};

adone.lazify({
    fqdn: "./fqdn",
    url: "./url",
    email: "./email"
}, exports, require);
