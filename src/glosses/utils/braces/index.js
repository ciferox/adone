import * as _util from "./utils";

const {
    is,
    util
} = adone;

braces.MAX_LENGTH = 1024 * 64;
let cache = {};

/**
 * Memoizes a generated regex or function. A unique key is generated
 * from the method name, pattern, and user-defined options. Set
 * options.memoize to false to disable.
 */
const memoize = (type, pattern, options, fn) => {
    const key = _util.createKey(`${type}:${pattern}`, options);
    const disabled = options && options.cache === false;
    if (disabled) {
        braces.clearCache();
        return fn(pattern, options);
    }

    if (cache.hasOwnProperty(key)) {
        return cache[key];
    }

    const res = fn(pattern, options);
    cache[key] = res;
    return res;
};

/**
 * Converts the given `braces` pattern into a regex-compatible string.
 * By default, only one string is generated for every input string.
 * Set `options.expand` to true to return an array of patterns (similar to Bash or minimatch).
 *
 * @param {String} `str`
 * @param {Object} `options`
 * @return {String}
 */
export default function braces(pattern, options) {
    const key = _util.createKey(String(pattern), options);
    let arr = [];

    const disabled = options && options.cache === false;
    if (!disabled && cache.hasOwnProperty(key)) {
        return cache[key];
    }

    if (is.array(pattern)) {
        for (let i = 0; i < pattern.length; i++) {
            arr.push.apply(arr, braces.create(pattern[i], options));
        }
    } else {
        arr = braces.create(pattern, options);
    }

    if (options && options.nodupes === true) {
        arr = util.unique(arr);
    }

    if (!disabled) {
        cache[key] = arr;
    }
    return arr;
}

/**
 * Expands a brace pattern into an array.
 * This method is called by the main braces function when `options.expand` is true
 *
 * @param {String} `pattern` Brace pattern
 * @param {Object} `options`
 * @return {Array} Returns an array of expanded values.
 */
braces.expand = function (pattern, options) {
    return braces.create(pattern, { ...options, expand: true });
};

/**
 * Expands a brace pattern into a regex-compatible, optimized string.
 * This method is called by the main braces function by default.
 *
 * @param {String} `pattern` Brace pattern
 * @param {Object} `options`
 * @return {Array} Returns an array of expanded values.
 */
braces.optimize = function (pattern, options) {
    return braces.create(pattern, options);
};

/**
 * Processes a brace pattern and returns either an expanded array (if `options.expand` is true),
 * a highly optimized regex-compatible string.
 * This method is called by the main braces function.
 *
 * @param {String} `pattern` Brace pattern
 * @param {Object} `options`
 * @return {Array} Returns an array of expanded values.
 */
braces.create = function (pattern, options) {
    if (!is.string(pattern)) {
        throw new TypeError("expected a string");
    }

    if (pattern.length >= braces.MAX_LENGTH) {
        throw new Error(`expected pattern to be less than ${braces.MAX_LENGTH} characters`);
    }

    const create = () => {
        if (pattern === "" || pattern.length < 3) {
            return [pattern];
        }

        if (_util.isEmptySets(pattern)) {
            return [];
        }

        if (_util.isQuotedString(pattern)) {
            return [pattern.slice(1, -1)];
        }

        const proto = new __.Braces(options);
        const result = !options || options.expand !== true
            ? proto.optimize(pattern, options)
            : proto.expand(pattern, options);

        // get the generated pattern(s)
        let arr = result.output;

        // filter out empty strings if specified
        if (options && options.noempty === true) {
            arr = arr.filter(Boolean);
        }

        // filter out duplicates if specified
        if (options && options.nodupes === true) {
            arr = util.unique(arr);
        }

        Object.defineProperty(arr, "result", {
            value: result,
            configurable: true,
            enumerable: false,
            writable: true
        });
        return arr;
    };

    return memoize("create", pattern, options, create);
};

/**
 * Creates a regular expression from the given string `pattern`.
 *
 * @param {String} `pattern` The pattern to convert to regex.
 * @param {Object} `options`
 * @return {RegExp}
 */
braces.makeRe = function (pattern, options) {
    if (!is.string(pattern)) {
        throw new TypeError("expected a string");
    }

    if (pattern.length >= braces.MAX_LENGTH) {
        throw new Error(`expected pattern to be less than ${braces.MAX_LENGTH} characters`);
    }

    const makeRe = () => {
        const arr = braces(pattern, options);
        const opts = { strictErrors: false, ...options };
        return util.toRegex(arr, opts);
    };

    return memoize("makeRe", pattern, options, makeRe);
};

/**
 * Parses the given `str` with the given `options`.
 *
 * @param {String} `pattern` Brace pattern to parse
 * @param {Object} `options`
 * @return {Object} Returns an AST
 */
braces.parse = function (pattern, options) {
    const proto = new __.Braces(options);
    return proto.parse(pattern, options);
};

/**
 * Compiles the given `ast` or string with the given `options`.
 *
 * @param {Object|String} `ast` AST from [.parse](#parse). If a string is passed it will be parsed first.
 * @param {Object} `options`
 * @return {Object} Returns an object that has an `output` property with the compiled string.
 */
braces.compile = function (ast, options) {
    const proto = new __.Braces(options);
    return proto.compile(ast, options);
};

/**
 * Clears the regex cache.
 *
 */
braces.clearCache = function () {
    cache = braces.cache = {};
};

braces.cache = cache;

adone.lazifyPrivate({
    util: "./utils",
    parser: "./parsers",
    compiler: "./compilers",
    Braces: "./braces"
}, braces, require);

const __ = adone.private(braces);
