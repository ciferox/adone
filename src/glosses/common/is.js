const objectProto = Object.prototype;
const hasOwnProperty = objectProto.hasOwnProperty;
const toString = objectProto.toString;
const symToStringTag = Symbol.toStringTag;
const funcToString = Function.prototype.toString;
const objectCtorString = funcToString.call(Object);

const getTag = (value) => {
    const rawTag = toString.call(value);
    if (value === null) {
        return "null";
    }
    return rawTag.substring(8, rawTag.length - 1).toLowerCase();
};


const baseGetTag = (value) => {
    if (value == null) {
        return value === undefined ? "[object Undefined]" : "[object Null]";
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

const callbackNames = ["callback", "callback_", "cb", "cb_", "done", "next"];

const posixPathAbsolute = (path) => path.charAt(0) === "/";
const win32PathAbsolute = (path) => {
    const result = /^([a-zA-Z]:|[\\/]{2}[^\\/]+[\\/]+[^\\/]+)?([\\/])?([\s\S]*?)$/.exec(path);
    const device = result[1] || "";
    const isUnc = Boolean(device) && device.charAt(1) !== ":";
    // UNC paths are always absolute
    return Boolean(result[2]) || isUnc;
};

const platform = process.platform;

const is = {
    _getTag: getTag,
    // Checks whether given value is `null`.
    null: (value) => value === null,
    // Checks whether given value is `undefined`.
    undefined: (value) => value === void 0,
    // Checks whether given value exists, i.e, not `null` nor `undefined`
    exist: (value) => value != null,  // eslint-disable-line
    // Checks whether given value is either `null` or `undefined`
    nil: (value) => value == null,  // eslint-disable-line
    // Checks whether given value is a number.
    number: (value) => typeof value === "number",
    numeral: (value) => {
        // Checks whether given value is a numeral, i.e:
        //
        // - a genuine finite number
        // - or a string that represents a finite number
        const tag = getTag(value);
        if (tag !== "number" && tag !== "string") {
            return false;
        }

        if (is.emptyString(value)) {
            return false;
        }

        try {
            value = Number(value);
        } catch (error) {
            return false;
        }

        return is.finite(value);
    },
    // Checks whether given value is an infinite number, i.e: +∞ or -∞.
    infinite: (number) => (number === +1 / 0 || number === -1 / 0),
    // Checks whether given value is an odd number.
    odd: (number) => (is.integer(number) && number % 2 === 1),
    // Checks whether given value is an even number.
    even: (number) => (is.integer(number) && number % 2 === 0),
    // Checks whether given value is a float number.
    float: (number) => is.number(number) && number !== Math.floor(number),
    negativeZero: (number) => (number === 0) && (Number.NEGATIVE_INFINITY === 1 / number),
    // Checks whether given value is a string.
    string: (value) => (typeof value === "string"),
    // Checks whether given value is an empty string, i.e, a string with whitespace characters only.
    emptyString: (string) => (is.string(string) && /^\s*$/.test(string)),
    substring: (substring, string, offset) => {
        // Checks whether one string may be found within another string.
        if (getTag(string) !== "string") {
            return false;
        }

        const length = string.length;
        offset = is.integer(offset) ? offset : 0;

        // Allow negative offsets.
        if (offset < 0) {
            offset = length + offset;
        }

        if (offset < 0 || offset >= length) {
            return false;
        }

        return string.indexOf(substring, offset) !== -1;
    },
    // Checks whether `string` starts with `prefix`.
    prefix: (prefix, string) => (getTag(string) === "string" && string.startsWith(prefix)),
    // Checks whether `string` ends with `suffix`.
    suffix: (suffix, string) => (getTag(string) === "string" && string.endsWith(suffix)),
    // Checks whether given value is a boolean.
    boolean: (value) => (value === true || value === false),
    // Checks whether given value is path to json-file or may by JS-object.
    json: (value) => (is.string(value) && value.endsWith(".json")) || is.object(value),
    // Checks whether given value is an object.
    object: (value) => !is.primitive(value),
    plainObject: (value) => {
        if (!(value != null && typeof value === "object") || baseGetTag(value) !== "[object Object]") {
            return false;
        }
        const proto = Object.getPrototypeOf(value);
        if (proto === null) {
            return true;
        }
        const Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
        return typeof Ctor === "function" && Ctor instanceof Ctor && funcToString.call(Ctor) === objectCtorString;
    },
    // Checks whether given value is class
    class: (value) => (typeof (value) === "function" && is.propertyOwned(value, "prototype") && value.prototype && is.propertyOwned(value.prototype, "constructor") && value.prototype.constructor.toString().substring(0, 5) === "class"),
    // Checks whether given value is an empty object, i.e, an object without any own, enumerable, string keyed properties.
    emptyObject: (object) => (is.object(object) && Object.keys(object).length === 0),
    // Checks whether `field` is a field owned by `object`.
    propertyOwned: (object, field) => (hasOwnProperty.call(object, field)),
    // Checks whether `path` is a direct or inherited property of `object`.
    propertyDefined: (object, path) => {
        let key;
        let context = object;
        const keys = String(path).split(".");

        while (key = keys.shift()) { // eslint-disable-line no-cond-assign
            if (!is.object(context) || !(key in context)) {
                return false;
            }
            context = context[key];
        }

        return true;
    },
    conforms: (object, schema, strict) => {
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
        // In strict mode(where `strict=true`), `is.conforms` also checks whether
        // `object` and `schema` has the same set of own, enumerable, string-keyed
        // properties, in addition to check whether all validators passed.
        if (!is.object(object) || !is.object(schema)) {
            return false;
        }

        const keys = Object.keys(schema);
        const length = keys.length;

        if (strict && length !== Object.keys(object).length) {
            return false;
        }

        for (let index = 0; index < length; index += 1) {
            const key = keys[index];
            const validator = schema[key];

            if (typeof validator !== "function") {
                continue;
            }

            if (!hasOwnProperty.call(object, key) || !validator(object[key], key, object)) {
                return false;
            }
        }

        return true;
    },
    arrayLikeObject: (value) => {
        // Checks whether given value is an _array-like_ object.
        //
        // An object is qualified as _array-like_ if it has a property named
        // `length` that is a positive safe integer. As a special case, functions
        // are never qualified as _array-like_.
        if (is.primitive(value) || is.function(value)) {
            return false;
        }
        const length = value.length;
        return is.integer(length) && length >= 0 && length <= 0xFFFFFFFF; // 32-bit unsigned int maximum

    },
    inArray: (value, array, offset, comparator) => {
        // Checks whether given array or array-like object contains certain element.
        //
        // - __value__: The element to search.
        // - __array__: The array or array-like object to search from.
        // - __offset__: The index to search from, inclusive.
        // - __comparator__: The comparator invoked per element against `value`.

        // Only works with genuine arrays or array-like objects.
        if (!is.arrayLikeObject(array)) {
            return false;
        }

        if (is.function(offset)) {
            comparator = offset;
            offset = 0;
        } else {
            offset = is.integer(offset) ? offset : 0;
            comparator = is.function(comparator) ? comparator : is.equal;
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
    },
    // Checks whether given values are of the same type.
    sameType: (value, other) => (typeof value === typeof other && getTag(value) === getTag(other)),
    // Checks whether given value is a primitive.
    primitive: (value) => (is.nil(value) || is.number(value) || is.string(value) || is.boolean(value) || is.symbol(value)),
    equalArrays: (arr1, arr2) => {
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
    },
    deepEqual: (leftHandOperand, rightHandOperand, options) => {
        const memoizeCompare = (leftHandOperand, rightHandOperand, memoizeMap) => {
            if (!memoizeMap || is.primitive(leftHandOperand) || is.primitive(rightHandOperand)) {
                return null;
            }
            const leftHandMap = memoizeMap.get(leftHandOperand);
            if (leftHandMap) {
                const result = leftHandMap.get(rightHandOperand);
                if (is.boolean(result)) {
                    return result;
                }
            }
            return null;
        };

        const memoizeSet = (leftHandOperand, rightHandOperand, memoizeMap, result) => {
            // Technically, WeakMap keys can *only* be objects, not primitives.
            if (!memoizeMap || is.primitive(leftHandOperand) || is.primitive(rightHandOperand)) {
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
                if (is.deepEqual(leftHandOperand[index], rightHandOperand[index], options) === false) {
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
            if (is.iterable(target)) {
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
                if (is.deepEqual(leftHandOperand[keys[i]], rightHandOperand[keys[i]], options) === false) {
                    return false;
                }
            }
            return true;
        };

        const objectEqual = (leftHandOperand, rightHandOperand, options) => {
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
                leftHandOperand !== leftHandOperand &&  // eslint-disable-line no-self-compare
                rightHandOperand !== rightHandOperand  // eslint-disable-line no-self-compare
            ) {
                return true;
            }

            // Anything that is not an 'object', i.e. symbols, functions, booleans, numbers,
            // strings, and undefined, can be compared by reference.
            if (is.primitive(leftHandOperand) || is.primitive(rightHandOperand)) {
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
                    return is.deepEqual(leftHandOperand.valueOf(), rightHandOperand.valueOf());
                }
                case "Promise":
                case "Symbol":
                case "function":
                case "WeakMap":
                case "WeakSet":
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
                case "Array": {
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
            if (!is.null(memoizeResultLeft)) {
                return memoizeResultLeft;
            }
            const memoizeResultRight = memoizeCompare(rightHandOperand, leftHandOperand, options.memoize);
            if (!is.null(memoizeResultRight)) {
                return memoizeResultRight;
            }

            if (comparator) {
                const comparatorResult = comparator(leftHandOperand, rightHandOperand);
                // Comparators may return null, in which case we want to go back to default behavior.
                if (is.boolean(comparatorResult)) {
                    memoizeSet(leftHandOperand, rightHandOperand, options.memoize, comparatorResult);
                    return comparatorResult;
                }
                // To allow comparators to override *any* behavior, we ran them first. Since it didn't decide
                // what to do, we need to make sure to return the basic tests first before we move on.
                const simpleResult = simpleEqual(leftHandOperand, rightHandOperand);
                if (!is.null(simpleResult)) {
                    // Don't memoize this, it takes longer to set/retrieve than to just compare.
                    return simpleResult;
                }
            }

            const leftHandType = adone.util.typeOf(leftHandOperand);
            if (leftHandType !== adone.util.typeOf(rightHandOperand)) {
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
        if (simpleResult !== null) {
            return simpleResult;
        }

        // Deeper comparisons are pushed through to a larger function
        return extensiveDeepEqual(leftHandOperand, rightHandOperand, options);
    },
    // Does a shallow comparison of two objects, returning false if the keys or values differ.
    // The purpose is to do the fastest comparison possible of two objects when the values will predictably be primitives.
    shallowEqual: (a, b) => {
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
            if (!is.primitive(b[key]) || !a.hasOwnProperty(key) || (a[key] !== b[key])) {
                return false;
            }
        }
        for (key in a) {
            numKeysA++;
        }
        return numKeysA === numKeysB;
    },
    stream: (value) => (value !== null && typeof value === "object" && typeof value.pipe === "function"),
    writableStream: (stream) => is.stream(stream) && typeof stream._writableState === "object",
    readableStream: (stream) => is.stream(stream) && typeof stream._readableState === "object",
    duplexStream: (stream) => is.writableStream(stream) && is.readableStream(stream),
    transformStream: (stream) => is.stream(stream) && typeof stream._transformState === "object",
    utf8: (bytes) => {
        let i = 0;
        while (i < bytes.length) {
            if ((bytes[i] === 0x09 || bytes[i] === 0x0A || bytes[i] === 0x0D || (bytes[i] >= 0x20 && bytes[i] <= 0x7E))) { // ASCII
                i += 1;
                continue;
            }
            if (((bytes[i] >= 0xC2 && bytes[i] <= 0xDF) && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF))) { // non-overlong 2-byte
                i += 2;
                continue;
            }
            if ((bytes[i] === 0xE0 && (bytes[i + 1] >= 0xA0 && bytes[i + 1] <= 0xBF) && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)) || // excluding overlongs
                (((bytes[i] >= 0xE1 && bytes[i] <= 0xEC) || bytes[i] === 0xEE || bytes[i] === 0xEF) && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF) && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF)) || // straight 3-byte
                (bytes[i] === 0xED && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0x9F) && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF))) { // excluding surrogates
                i += 3;
                continue;
            }
            if ((bytes[i] === 0xF0 && (bytes[i + 1] >= 0x90 && bytes[i + 1] <= 0xBF) && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF) && (bytes[i + 3] >= 0x80 && bytes[i + 3] <= 0xBF)) || // planes 1-3
                ((bytes[i] >= 0xF1 && bytes[i] <= 0xF3) && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF) && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF) && (bytes[i + 3] >= 0x80 && bytes[i + 3] <= 0xBF)) || // planes 4-15
                (bytes[i] === 0xF4 && (bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0x8F) && (bytes[i + 2] >= 0x80 && bytes[i + 2] <= 0xBF) && (bytes[i + 3] >= 0x80 && bytes[i + 3] <= 0xBF))) { // plane 16
                i += 4;
                continue;
            }
            return false;
        }
        return true;
    },
    win32PathAbsolute,
    posixPathAbsolute,
    pathAbsolute: (platform === "win32" ? win32PathAbsolute : posixPathAbsolute),
    // Checks whether given `str` is glob or extglob (can use for test extglobs with the same performance)
    glob: (str) => (typeof str === "string" && (/[@?!+*]\(/.test(str) || /[*!?{}(|)[\]]/.test(str))),
    dotfile: (str) => {
        if (str.charCodeAt(0) === 46 /* . */ && str.indexOf("/", 1) === -1) {
            return true;
        }

        const last = str.lastIndexOf("/");
        return last !== -1 ? str.charCodeAt(last + 1) === 46/*.*/ : false;
    },
    function: (fn) => typeof fn === "function",
    asyncFunction: (fn) => fn && toString.call(fn).slice(8, -1) === "AsyncFunction",
    promise: (obj) => (!is.nil(obj) && is.function(obj.then)),
    validDate: (str) => !isNaN(Date.parse(str)),
    buffer: (obj) => obj != null && ((Boolean(obj.constructor) && is.function(obj.constructor.isBuffer) && obj.constructor.isBuffer(obj)) || Boolean(obj._isBuffer)),
    callback: (fn, names) => (is.inArray(names || callbackNames, adone.util.functionName(fn))),
    generator: (value) => {
        if (!value || !value.constructor) {
            return false;
        }

        const c = value.constructor;
        const name = "GeneratorFunction";

        if (c.name === name || c.displayName === name) {
            return true;
        }
        if (typeof value.next === "function" && typeof value.throw === "function") {
            return true;
        }
        if (typeof value !== "function") {
            return false;
        }
        return true;
    },
    nan: Number.isNaN, // Checks whether given value is `NaN`.
    finite: Number.isFinite, // Checks whether given value is a finite number.
    integer: Number.isInteger, // Checks whether given value is an integer.
    safeInteger: Number.isSafeInteger, // Checks whether given value is a safe integer.
    array: Array.isArray, // Checks whether given value is an array.
    uint8Array: (value) => value instanceof Uint8Array,
    configuration: (obj) => adone.tag.has(obj, adone.tag.CONFIGURATION),
    long: (obj) => adone.tag.has(obj, adone.tag.LONG),
    bigNumber: (obj) => adone.tag.has(obj, adone.tag.BIGNUMBER),
    exbuffer: (obj) => adone.tag.has(obj, adone.tag.EXBUFFER),
    exdate: (obj) => adone.tag.has(obj, adone.tag.EXDATE),
    transform: (obj) => adone.tag.has(obj, adone.tag.TRANSFORM),
    subsystem: (obj) => adone.tag.has(obj, adone.tag.SUBSYSTEM),
    application: (obj) => adone.tag.has(obj, adone.tag.APPLICATION),
    logger: (obj) => adone.tag.has(obj, adone.tag.LOGGER),
    coreStream: (obj) => adone.tag.has(obj, adone.tag.CORE_STREAM),
    fastStream: (obj) => adone.tag.has(obj, adone.tag.FAST_STREAM),
    fastFSStream: (obj) => adone.tag.has(obj, adone.tag.FAST_FS_STREAM),
    fastFSMapStream: (obj) => adone.tag.has(obj, adone.tag.FAST_FS_MAP_STREAM),
    genesisNetron: (obj) => adone.tag.has(obj, adone.tag.GENESIS_NETRON),
    genesisPeer: (obj) => adone.tag.has(obj, adone.tag.GENESIS_PEER),
    netronAdapter: (obj) => adone.tag.has(obj, adone.tag.NETRON_ADAPTER),
    netron: (obj) => adone.tag.has(obj, adone.tag.NETRON),
    netronPeer: (obj) => adone.tag.has(obj, adone.tag.NETRON_PEER),
    netronDefinition: (obj) => adone.tag.has(obj, adone.tag.NETRON_DEFINITION),
    netronDefinitions: (obj) => adone.tag.has(obj, adone.tag.NETRON_DEFINITIONS),
    netronReference: (obj) => adone.tag.has(obj, adone.tag.NETRON_REFERENCE),
    netronInterface: (obj) => adone.tag.has(obj, adone.tag.NETRON_INTERFACE),
    netronContext: (obj) => adone.netron.Investigator.isContextable(obj),
    netronIMethod: (ni, name) => (is.function(ni[name]) && (ni.$def.$[name].method === true)),
    netronIProperty: (ni, name) => (is.object(ni[name]) && is.function(ni[name].get) && (ni.$def.$[name].method === undefined)),
    netronStub: (obj) => adone.tag.has(obj, adone.tag.NETRON_STUB),
    netronRemoteStub: (obj) => adone.tag.has(obj, adone.tag.NETRON_REMOTESTUB),
    netronStream: (obj) => adone.tag.has(obj, adone.tag.NETRON_STREAM),
    iterable: (obj) => obj && is.function(obj[Symbol.iterator]),
    windows: (platform === "win32"),
    linux: (platform === "linux"),
    freebsd: (platform === "freebsd"),
    darwin: (platform === "darwin"),
    sunos: (platform === "sunos"),
    uppercase: (str) => {
        for (const i of str) {
            if (i < "A" || i > "Z") {
                return false;
            }
        }
        return true;
    },
    lowercase: (str) => {
        for (const i of str) {
            if (i < "a" || i > "z") {
                return false;
            }
            return true;
        }
    },
    digits: (str) => {
        for (const i of str) {
            if (i < "0" || i > "9") {
                return false;
            }
            return true;
        }
    },
    identifier: (str) => {
        if (!str.length) {
            return false;
        }
        if (!is.uppercase(str[0]) && !is.lowercase(str[0]) && str[0] !== "$" && str[0] !== "_" && str[0] < 0xA0) {
            return false;
        }
        for (let i = 1; i < str.length; ++i) {
            if (!is.digits(str[i]) && !is.lowercase(str[i]) && !is.uppercase(str[i]) && str[i] !== "_" && str[i] !== "_" && str[i] < 0xA0) {
                return false;
            }
        }
        return true;
    },
    binaryExtension: (x) => binaryExtensions.has(x),
    binaryPath: (x) => binaryExtensions.has(adone.std.path.extname(x).slice(1).toLowerCase()),
    ip4: (ip) => adone.regex.ip4.test(ip),
    ip6: (ip) => adone.regex.ip4.test(ip),
    arrayBuffer: (x) => objectProto.toString.call(x) === "[object ArrayBuffer]",
    arrayBufferView: (x) => ArrayBuffer.isView(x),
    date: (value) => (getTag(value) === "date"),
    error: (value) => (getTag(value) === "error"),
    map: (value) => (getTag(value) === "map"),
    regexp: (value) => (getTag(value) === "regexp"),
    set: (value) => (getTag(value) === "set"),
    symbol: (value) => (getTag(value) === "symbol")
};

adone.lazify({
    validUTF8: () => adone.native.Common.isValidUTF8
}, is, require);

export default is;
