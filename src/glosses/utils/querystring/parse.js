const {
    is,
    util
} = adone;

const {
    querystring: { unescape }
} = util;

const has = Object.prototype.hasOwnProperty;

const defaults = {
    allowDots: false,
    allowPrototypes: false,
    arrayLimit: 20,
    decoder: unescape,
    delimiter: "&",
    depth: 5,
    parameterLimit: 1000,
    plainObjects: false,
    strictNullHandling: false
};

const parseValues = (str, options) => {
    const obj = {};
    const cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, "") : str;
    const limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
    const parts = cleanStr.split(options.delimiter, limit);

    for (let i = 0; i < parts.length; ++i) {
        const part = parts[i];

        const bracketEqualsPos = part.indexOf("]=");
        const pos = bracketEqualsPos === -1 ? part.indexOf("=") : bracketEqualsPos + 1;

        let key;
        let val;
        if (pos === -1) {
            key = options.decoder(part, defaults.decoder);
            val = options.strictNullHandling ? null : "";
        } else {
            key = options.decoder(part.slice(0, pos), defaults.decoder);
            val = options.decoder(part.slice(pos + 1), defaults.decoder);
        }
        if (has.call(obj, key)) {
            obj[key] = [].concat(obj[key]).concat(val);
        } else {
            obj[key] = val;
        }
    }

    return obj;
};

const parseObject = function (chain, val, options) {
    let leaf = val;

    for (let i = chain.length - 1; i >= 0; --i) {
        let obj;
        const root = chain[i];

        if (root === "[]") {
            obj = [];
            obj = obj.concat(leaf);
        } else {
            obj = options.plainObjects ? Object.create(null) : {};
            const cleanRoot = root.charAt(0) === "[" && root.charAt(root.length - 1) === "]" ? root.slice(1, -1) : root;
            const index = parseInt(cleanRoot, 10);
            if (
                !is.nan(index)
                && root !== cleanRoot
                && String(index) === cleanRoot
                && index >= 0
                && (options.parseArrays && index <= options.arrayLimit)
            ) {
                obj = [];
                obj[index] = leaf;
            } else {
                obj[cleanRoot] = leaf;
            }
        }

        leaf = obj;
    }

    return leaf;
};

const parseKeys = (givenKey, val, options) => {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    const key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, "[$1]") : givenKey;

    // The regex chunks

    const brackets = /(\[[^[\]]*])/;
    const child = /(\[[^[\]]*])/g;

    // Get the parent

    let segment = brackets.exec(key);
    const parent = segment ? key.slice(0, segment.index) : key;

    // Stash the parent if it exists

    const keys = [];
    if (parent) {
        // If we aren't using plain objects, optionally prefix keys
        // that would overwrite object prototype properties
        if (!options.plainObjects && has.call(Object.prototype, parent)) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(parent);
    }

    // Loop through children appending to the array until we hit depth

    let i = 0;
    while (!is.null(segment = child.exec(key)) && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push(`[${key.slice(segment.index)}]`);
    }

    return parseObject(keys, val, options);
};

const compactQueue = function compactQueue(queue) {
    let obj;

    while (queue.length) {
        const item = queue.pop();
        obj = item.obj[item.prop];

        if (is.array(obj)) {
            const compacted = [];

            for (let j = 0; j < obj.length; ++j) {
                if (!is.undefined(obj[j])) {
                    compacted.push(obj[j]);
                }
            }

            item.obj[item.prop] = compacted;
        }
    }

    return obj;
};

const compact = function compact(value) {
    const queue = [{ obj: { o: value }, prop: "o" }];
    const refs = [];

    for (let i = 0; i < queue.length; ++i) {
        const item = queue[i];
        const obj = item.obj[item.prop];

        const keys = Object.keys(obj);
        for (let j = 0; j < keys.length; ++j) {
            const key = keys[j];
            const val = obj[key];
            if (is.object(val) && !refs.includes(val)) {
                queue.push({ obj, prop: key });
                refs.push(val);
            }
        }
    }

    return compactQueue(queue);
};

export default function parse(str, opts) {
    const options = opts ? { ...opts } : {};

    if (!is.null(options.decoder) && !is.undefined(options.decoder) && !is.function(options.decoder)) {
        throw new TypeError("Decoder has to be a function.");
    }

    options.ignoreQueryPrefix = options.ignoreQueryPrefix === true;
    options.delimiter = is.string(options.delimiter) || is.regexp(options.delimiter) ? options.delimiter : defaults.delimiter;
    options.depth = is.number(options.depth) ? options.depth : defaults.depth;
    options.arrayLimit = is.number(options.arrayLimit) ? options.arrayLimit : defaults.arrayLimit;
    options.parseArrays = options.parseArrays !== false;
    options.decoder = is.function(options.decoder) ? options.decoder : defaults.decoder;
    options.allowDots = is.boolean(options.allowDots) ? options.allowDots : defaults.allowDots;
    options.plainObjects = is.boolean(options.plainObjects) ? options.plainObjects : defaults.plainObjects;
    options.allowPrototypes = is.boolean(options.allowPrototypes) ? options.allowPrototypes : defaults.allowPrototypes;
    options.parameterLimit = is.number(options.parameterLimit) ? options.parameterLimit : defaults.parameterLimit;
    options.strictNullHandling = is.boolean(options.strictNullHandling) ? options.strictNullHandling : defaults.strictNullHandling;

    if (str === "" || is.null(str) || is.undefined(str)) {
        return options.plainObjects ? Object.create(null) : {};
    }

    const tempObj = is.string(str) ? parseValues(str, options) : str;
    let obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    const keys = Object.keys(tempObj);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        const newObj = parseKeys(key, tempObj[key], options);
        obj = util.merge(obj, newObj, options);
    }

    return compact(obj);
}
