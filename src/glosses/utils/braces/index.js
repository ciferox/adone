import * as _util from "./utils";

const {
    error,
    is,
    util
} = adone;

const _braces = (pattern, options) => {
    let arr = [];
    if (is.array(pattern)) {
        for (let i = 0; i < pattern.length; i++) {
            arr.push.apply(arr, braces.create(pattern[i], options));
        }
    } else {
        arr = braces.create(pattern, options);
    }

    if (options && options.nodupes === true) {
        arr = adone.common.unique(arr);
    }
    return arr;
};

/**
 * Converts the given `braces` pattern into a regex-compatible string.
 * By default, only one string is generated for every input string.
 * Set `options.expand` to true to return an array of patterns (similar to Bash or minimatch).
 *
 * @param {string} str
 * @param {object} options
 * @return {string}
 */
export default function braces(pattern, options) {
    // eslint-disable-next-line no-use-before-define
    return memoize("braces", pattern, options, _braces);
}

braces.MAX_LENGTH = 1024 * 64;

const memoize = _util.memoize(braces, ["braces", "create", "makeRe"]);

adone.lazifyp({
    util: "./utils",
    parser: "./parsers",
    compiler: "./compilers",
    Braces: "./braces"
}, braces, require);

const __ = adone.getPrivate(braces);


/**
 * Expands a brace pattern into an array.
 * This method is called by the main braces function when `options.expand` is true
 *
 * @param {string} pattern Brace pattern
 * @param {object} options
 * @return {string[]} Returns an array of expanded values.
 */
braces.expand = function (pattern, options) {
    return braces.create(pattern, { ...options, expand: true });
};

/**
 * Expands a brace pattern into a regex-compatible, optimized string.
 * This method is called by the main braces function by default.
 *
 * @param {string} pattern Brace pattern
 * @param {object} options
 * @return {string[]} Returns an array of expanded values.
 */
braces.optimize = function (pattern, options) {
    return braces.create(pattern, options);
};

/**
 * Processes a brace pattern and returns either an expanded array (if `options.expand` is true),
 * a highly optimized regex-compatible string.
 * This method is called by the main braces function.
 *
 * @param {string} pattern Brace pattern
 * @param {object} options
 * @return {string[]} Returns an array of expanded values.
 */
braces.create = function (pattern, options) {
    if (!is.string(pattern)) {
        throw new error.InvalidArgumentException("expected a string");
    }

    if (pattern.length >= braces.MAX_LENGTH) {
        throw new error.LimitExceededException(`expected pattern to be less than ${braces.MAX_LENGTH} characters`);
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
            arr = adone.common.unique(arr);
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
 * @param {string} pattern The pattern to convert to regex.
 * @param {object} options
 * @return {RegExp}
 */
braces.makeRe = function (pattern, options) {
    if (!is.string(pattern)) {
        throw new error.InvalidArgumentException("expected a string");
    }

    if (pattern.length >= braces.MAX_LENGTH) {
        throw new error.LimitExceededException(`expected pattern to be less than ${braces.MAX_LENGTH} characters`);
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
 * @param {string} pattern Brace pattern to parse
 * @param {object} options
 * @return {object} Returns an AST
 */
braces.parse = (pattern, options) => {
    const proto = new __.Braces(options);
    return proto.parse(pattern, options);
};

/**
 * Compiles the given `ast` or string with the given `options`.
 *
 * @param {object | string} ast AST from .parse. If a string is passed it will be parsed first.
 * @param {object} options
 * @return {object} Returns an object that has an `output` property with the compiled string.
 */
braces.compile = (ast, options) => {
    const proto = new __.Braces(options);
    return proto.compile(ast, options);
};
