const {
    exception,
    util
} = adone;

export default function brackets(pattern, options) {
    const res = brackets.create(pattern, options);
    return res.output;
}

adone.lazify({
    compilers: "./compilers",
    parsers: "./parsers"
}, brackets, require);

/**
 * Takes an array of strings and a POSIX character class pattern,
 * and returns a new array with only the strings that matched the pattern.
 *
 * @param {string[]} arr Array of strings to match
 * @param {string} pattern POSIX character class pattern(s)
 * @param {object} options
 * @returns {string[]}
 */
brackets.match = (arr, pattern, options) => {
    const opts = { ...options };
    const isMatch = brackets.matcher(pattern, opts);
    const len = arr.length;
    let idx = -1;
    const res = [];

    while (++idx < len) {
        const ele = arr[idx];
        if (isMatch(ele)) {
            res.push(ele);
        }
    }

    if (res.length === 0) {
        if (opts.failglob === true) {
            throw new exception.IllegalState(`no matches found for "${pattern}"`);
        }

        if (opts.nonull === true || opts.nullglob === true) {
            return [pattern.split("\\").join("")];
        }
    }
    return res;
};

/**
 * Returns true if the specified `string` matches the given brackets `pattern`.
 *
 * @param {string} string String to match
 * @param {string} pattern Poxis pattern
 * @param {object} options
 * @returns {boolean}
 */
brackets.isMatch = (str, pattern, options) => brackets.matcher(pattern, options)(str);

/**
 * Takes a POSIX character class pattern and returns a matcher function.
 * The returned function takes the string to match as its only argument.
 *
 * @param {string} pattern Poxis pattern
 * @param {object} options
 * @returns {boolean}
 */
brackets.matcher = (pattern, options) => {
    const re = brackets.makeRe(pattern, options);
    return (str) => re.test(str);
};

/**
 * Create a regular expression from the given `pattern`.
 *
 * @param {string} pattern The pattern to convert to regex.
 * @param {object} options
 * @returns {RegExp}
 */
brackets.makeRe = (pattern, options) => {
    const res = brackets.create(pattern, options);
    const opts = { strictErrors: false, ...options };
    return util.toRegex(res.output, opts);
};

/**
 * Parses the given POSIX character class `pattern`
 * and returns an object with the compiled `output` and optional source `map`.
 *
 * @param {string} pattern
 * @param {object} options
 * @returns {object}
 */
brackets.create = (pattern, options) => {
    const snapdragon = (options && options.snapdragon) || new util.Snapdragon(options);
    brackets.compilers(snapdragon);
    brackets.parsers(snapdragon);

    const ast = snapdragon.parse(pattern, options);
    ast.input = pattern;
    const res = snapdragon.compile(ast, options);
    res.input = pattern;
    return res;
};
