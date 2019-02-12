const {
    error,
    is,
    util
} = adone;

toRegex.MAX_LENGTH = 1024 * 64;
toRegex.cache = {};


/**
 * Cache generated regex. This can result in dramatic speed improvements
 * and simplify debugging by adding options and pattern to the regex. It can be
 * disabled by passing setting `options.cache` to false.
 */
const memoize = (regex, key, pattern, options) => {
    Object.defineProperties(regex, {
        cached: {
            value: true,
            enumerable: false,
            configurable: true,
            writable: true
        },
        pattern: {
            value: pattern,
            enumerable: false,
            configurable: true,
            writable: true
        },
        options: {
            value: options,
            enumerable: false,
            configurable: true,
            writable: true
        },
        key: {
            value: key,
            enumerable: false,
            configurable: true,
            writable: true
        }
    });
    toRegex.cache[key] = regex;
};

/**
 * Create the key to use for memoization. The key is generated
 * by iterating over the options and concatenating key-value pairs
 * to the pattern string.
 */
const createKey = (pattern, options) => {
    if (!options) {
        return pattern;
    }
    let key = pattern;
    for (const prop in options) {
        if (options.hasOwnProperty(prop)) {
            key += `;${prop}=${String(options[prop])}`;
        }
    }
    return key;
};

/**
 * Create a regular expression from the given `pattern` string.
 *
 * @param {string | RegExp} pattern Pattern can be a string or regular expression.
 * @param {object} options
 * @return {RegExp}
 */
const makeRe = (pattern, options) => {
    if (is.regexp(pattern)) {
        return pattern;
    }

    if (!is.string(pattern)) {
        throw new error.InvalidArgumentException("expected a string");
    }

    if (pattern.length > toRegex.MAX_LENGTH) {
        throw new error.LimitExceededException(`expected pattern to be less than ${toRegex.MAX_LENGTH} characters`);
    }

    let key = pattern;
    // do this before shallow cloning options, it's a lot faster
    if (!options || (options && options.cache !== false)) {
        key = createKey(pattern, options);
        const { cache } = toRegex;
        if (cache.hasOwnProperty(key)) {
            return cache[key];
        }
    }

    const opts = { ...options };
    if (opts.contains === true) {
        if (opts.negate === true) {
            opts.strictNegate = false;
        } else {
            opts.strict = false;
        }
    }

    if (opts.strict === false) {
        opts.strictOpen = false;
        opts.strictClose = false;
    }

    const open = opts.strictOpen !== false ? "^" : "";
    const close = opts.strictClose !== false ? "$" : "";
    let flags = opts.flags || "";
    let regex;

    if (opts.nocase === true && !/i/.test(flags)) {
        flags += "i";
    }

    try {
        if (opts.negate || is.boolean(opts.strictNegate)) {
            pattern = util.regexNot.create(pattern, opts);
        }
        const str = `${open}(?:${pattern})${close}`;
        regex = new RegExp(str, flags);

        if (opts.safe === true && is.safeRegexp(regex) === false) {
            throw new Error(`potentially unsafe regular expression: ${regex.source}`);
        }
    } catch (err) {
        if (opts.strictErrors === true || opts.safe === true) {
            err.key = key;
            err.pattern = pattern;
            err.originalOptions = options;
            err.createdOptions = opts;
            throw err;
        }

        try {
            regex = new RegExp(`^${pattern.replace(/(\W)/g, "\\$1")}$`);
        } catch (err) {
            regex = /.^/; //<= match nothing
        }
    }

    if (opts.cache !== false) {
        memoize(regex, key, pattern, opts);
    }
    return regex;
};


/**
 * Create a regular expression from the given `pattern` string.
 *
 * @param {string | RegExp} pattern Pattern can be a string or regular expression.
 * @param {object} options
 * @return {RegExp}
 */
export default function toRegex(patterns, options) {
    if (!is.array(patterns)) {
        return makeRe(patterns, options);
    }
    return makeRe(patterns.join("|"), options);
}

toRegex.makeRe = makeRe;
