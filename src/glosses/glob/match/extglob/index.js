const {
    error,
    is,
    glob: { match },
    util
} = adone;
const {
    util: _util
} = adone.getPrivate(match);

const MAX_LENGTH = 1024 * 64;

/**
 * Convert the given `extglob` pattern into a regex-compatible string. Returns
 * an object with the compiled result and the parsed AST.
 *
 * @param {string} pattern
 * @param {object} options
 * @returns {string}
 */
export default function extglob(pattern, options) {
    return extglob.create(pattern, options).output;
}

const memoize = _util.memoize(extglob, [
    "isMatch",
    "matcher",
    "create",
    "capture",
    "makeRe"
]);

adone.lazify({
    compilers: "./compilers",
    parsers: "./parsers"
}, extglob, require);

adone.lazifyp({
    Extglob: "./extglob"
}, extglob, require);

const __ = adone.getPrivate(extglob);

/**
 * Takes an array of strings and an extglob pattern and returns a new
 * array that contains only the strings that match the pattern.
 *
 * @param {string[]} list Array of strings to match
 * @param {string} pattern Extglob pattern
 * @param {object} options
 * @returns {string[]} Returns an array of matches
 */
extglob.match = (list, pattern, options) => {
    if (!is.string(pattern)) {
        throw new error.InvalidArgumentException("expected pattern to be a string");
    }

    list = util.arrify(list);
    const isMatch = extglob.matcher(pattern, options);
    const len = list.length;
    let idx = -1;
    const matches = [];

    while (++idx < len) {
        const ele = list[idx];

        if (isMatch(ele)) {
            matches.push(ele);
        }
    }

    // if no options were passed, uniquify results and return
    if (is.undefined(options)) {
        return adone.common.unique(matches);
    }

    if (matches.length === 0) {
        if (options.failglob === true) {
            throw new error.IllegalStateException(`no matches found for "${pattern}"`);
        }
        if (options.nonull === true || options.nullglob === true) {
            return [pattern.split("\\").join("")];
        }
    }

    return options.nodupes !== false ? adone.common.unique(matches) : matches;
};

/**
 * Returns true if the specified `string` matches the given
 * extglob `pattern`.
 *
 * @param {string} string String to match
 * @param {string} pattern Extglob pattern
 * @param {string} options
 * @returns {boolean}
 */
extglob.isMatch = (str, pattern, options) => {
    if (!is.string(pattern)) {
        throw new error.InvalidArgumentException("expected pattern to be a string");
    }

    if (!is.string(str)) {
        throw new error.InvalidArgumentException("expected a string");
    }

    if (pattern === str) {
        return true;
    }

    if (pattern === "" || pattern === " " || pattern === ".") {
        return pattern === str;
    }

    const isMatch = memoize("isMatch", pattern, options, extglob.matcher);
    return isMatch(str);
};

/**
 * Returns true if the given `string` contains the given pattern.
 * Similar to `.isMatch` but the pattern can match any part of the string.
 *
 * @param {string} str The string to match.
 * @param {string} pattern Glob pattern to use for matching.
 * @param {object} options
 * @returns {boolean} Returns true if the patter matches any part of `str`.
 */
extglob.contains = (str, pattern, options) => {
    if (!is.string(str)) {
        throw new error.InvalidArgumentException("expected a string");
    }

    if (pattern === "" || pattern === " " || pattern === ".") {
        return pattern === str;
    }

    return extglob.isMatch(str, pattern, {
        ...options,
        contains: true,
        strictClose: false,
        strictOpen: false
    });
};

/**
 * Takes an extglob pattern and returns a matcher function. The returned
 * function takes the string to match as its only argument.
 *
 * @param {string} pattern Extglob pattern
 * @param {string} options
 * @returns {boolean}
 */
extglob.matcher = (pattern, options) => {
    if (!is.string(pattern)) {
        throw new error.InvalidArgumentException("expected pattern to be a string");
    }

    const matcher = () => {
        const re = extglob.makeRe(pattern, options);
        return (str) => re.test(str);
    };

    return memoize("matcher", pattern, options, matcher);
};

/**
 * Convert the given `extglob` pattern into a regex-compatible string. Returns
 * an object with the compiled result and the parsed AST.
 *
 * @param {string} str
 * @param {object} options
 * @returns {string}
 */
extglob.create = (pattern, options) => {
    if (!is.string(pattern)) {
        throw new error.InvalidArgumentException("expected pattern to be a string");
    }

    const create = () => {
        const ext = new __.Extglob(options);
        const ast = ext.parse(pattern, options);
        return ext.compile(ast, options);
    };

    return memoize("create", pattern, options, create);
};

/**
 * Returns an array of matches captured by `pattern` in `string, or `null` if the pattern did not match.
 *
 * @param {string} pattern Glob pattern to use for matching.
 * @param {string} string String to match
 * @param {object} options
 * @returns {boolean} An array of captures if the string matches the glob pattern, otherwise `null`.
 */
extglob.capture = (pattern, str, options) => {
    const re = extglob.makeRe(pattern, { capture: true, ...options });

    const match = () => (string) => {
        const match = re.exec(string);
        if (!match) {
            return null;
        }
        return match.slice(1);
    };

    const capture = memoize("capture", pattern, options, match);
    return capture(str);
};

/**
 * Create a regular expression from the given `pattern` and `options`.
 *
 * @param {string} pattern The pattern to convert to regex.
 * @param {object} options
 * @returns {RegExp}
 */
extglob.makeRe = (pattern, options) => {
    if (is.regexp(pattern)) {
        return pattern;
    }

    if (!is.string(pattern)) {
        throw new error.InvalidArgumentException("expected pattern to be a string");
    }

    if (pattern.length > MAX_LENGTH) {
        throw new error.InvalidArgumentException(`expected pattern to be less than ${MAX_LENGTH} characters`);
    }

    const makeRe = () => {
        const opts = { strictErrors: false, ...options };
        if (opts.strictErrors === true) {
            opts.strict = true;
        }
        const res = extglob.create(pattern, opts);
        return util.toRegex(res.output, opts);
    };

    const regex = memoize("makeRe", pattern, options, makeRe);
    if (regex.source.length > MAX_LENGTH) {
        throw new error.LimitExceededException("potentially malicious regex detected");
    }

    return regex;
};
