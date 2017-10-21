const {
    x,
    is,
    util,
    std
} = adone;
const {
    util: { match }
} = adone;
const {
    util: _util
} = adone.private(match);

/**
 * The main function takes a list of strings and one or more
 * glob patterns to use for matching.
 *
 * @param {strin[]} list A list of strings to match
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {string[]} An array of matches
 */
export default function minimalMatch(list, patterns, options) {
    patterns = util.arrify(patterns);
    list = util.arrify(list);

    const len = patterns.length;
    if (list.length === 0 || len === 0) {
        return [];
    }

    if (len === 1) {
        return minimalMatch.match(list, patterns[0], options);
    }

    let negated = false;
    const omit = [];
    let keep = [];
    let idx = -1;

    while (++idx < len) {
        const pattern = patterns[idx];

        if (is.string(pattern) && pattern.charCodeAt(0) === 33 /* ! */) {
            omit.push.apply(omit, minimalMatch.match(list, pattern.slice(1), options));
            negated = true;
        } else {
            keep.push.apply(keep, minimalMatch.match(list, pattern, options));
        }
    }

    // minimatch.match parity
    if (negated && keep.length === 0) {
        if (options && options.unixify === false) {
            keep = list.slice();
        } else {
            const unixify = _util.unixify(options);
            for (let i = 0; i < list.length; i++) {
                keep.push(unixify(list[i]));
            }
        }
    }

    const matches = util.arrayDiff(keep, omit);
    if (!options || options.nodupes !== false) {
        return util.unique(matches);
    }

    return matches;
}

minimalMatch.MAX_LENGTH = 1024 * 64;

const memoize = _util.memoize(minimalMatch, [
    "match",
    "isMatch",
    "capture",
    "makeRe",
    "create",
    "parse",
    "compile",
    "compose"
]);

adone.lazify({
    compilers: "./compilers",
    parsers: "./parsers"
}, minimalMatch, require);

adone.definePrivate({
    util: _util
}, minimalMatch);

/**
 * Similar to the main function, but `pattern` must be a string.
 *
 * @param {string[]} list Array of strings to match
 * @param {string} pattern Glob pattern to use for matching.
 * @param {object} options
 * @returns {string[]} An array of matches
 */
minimalMatch.match = (list, pattern, options) => {
    if (is.array(pattern)) {
        throw new x.InvalidArgument("expected pattern to be a string");
    }

    const unixify = _util.unixify(options);
    const isMatch = memoize("match", pattern, options, minimalMatch.matcher);
    let matches = [];

    list = util.arrify(list);
    const len = list.length;
    let idx = -1;

    while (++idx < len) {
        const ele = list[idx];
        if (ele === pattern || isMatch(ele)) {
            matches.push(_util.value(ele, unixify, options));
        }
    }

    // if no options were passed, uniquify results and return
    if (is.undefined(options)) {
        return util.unique(matches);
    }

    if (matches.length === 0) {
        if (options.failglob === true) {
            throw new x.IllegalState(`no matches found for "${pattern}"`);
        }
        if (options.nonull === true || options.nullglob === true) {
            return [options.unescape ? _util.unescape(pattern) : pattern];
        }
    }

    // if `opts.ignore` was defined, diff ignored list
    if (options.ignore) {
        matches = minimalMatch.not(matches, options.ignore, options);
    }

    return options.nodupes !== false ? util.unique(matches) : matches;
};

/**
 * Returns true if the specified `string` matches the given glob `pattern`.
 *
 * @param {string} string String to match
 * @param {string} pattern Glob pattern to use for matching.
 * @param {object} options
 * @returns {boolean} true if the string matches the glob pattern.
 */
minimalMatch.isMatch = (str, pattern, options) => {
    if (!is.string(str)) {
        throw new x.InvalidArgument(`expected a string: "${std.util.inspect(str)}"`);
    }

    if (_util.isEmptyString(str) || _util.isEmptyString(pattern)) {
        return false;
    }

    const equals = _util.equalsPattern(options);
    if (equals(str)) {
        return true;
    }

    const isMatch = memoize("isMatch", pattern, options, minimalMatch.matcher);
    return isMatch(str);
};

/**
 * Returns true if some of the elements in the given `list` match any of the given glob `patterns`.
 *
 * @param  {string | string[]} list The string or array of strings to test. Returns as soon as the first match is found.
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {boolean} true if any patterns match `str`
 */
minimalMatch.some = (list, patterns, options) => {
    if (is.string(list)) {
        list = [list];
    }

    for (let i = 0; i < list.length; i++) {
        if (minimalMatch(list[i], patterns, options).length === 1) {
            return true;
        }
    }

    return false;
};

/**
 * Returns true if every element in the given `list` matches at least one of the given glob `patterns`.
 *
 * @param  {string | string[]} list The string or array of strings to test.
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {boolean} true if any patterns match `str`
 */
minimalMatch.every = (list, patterns, options) => {
    if (is.string(list)) {
        list = [list];
    }

    for (let i = 0; i < list.length; i++) {
        if (minimalMatch(list[i], patterns, options).length !== 1) {
            return false;
        }
    }

    return true;
};

/**
 * Returns true if **any** of the given glob `patterns` match the specified `string`.
 *
 * @param  {string} str The string to test.
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {boolean} Returns true if any patterns match `str`
 */
minimalMatch.any = (str, patterns, options) => {
    if (!is.string(str)) {
        throw new x.InvalidArgument(`expected a string: "${std.util.inspect(str)}"`);
    }

    if (_util.isEmptyString(str) || _util.isEmptyString(patterns)) {
        return false;
    }

    if (is.string(patterns)) {
        patterns = [patterns];
    }

    for (let i = 0; i < patterns.length; i++) {
        if (minimalMatch.isMatch(str, patterns[i], options)) {
            return true;
        }
    }
    return false;
};

/**
 * Returns true if **all** of the given `patterns` match the specified string.
 *
 * @param  {string} str The string to test.
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {boolean} true if any patterns match `str`
 */
minimalMatch.all = (str, patterns, options) => {
    if (!is.string(str)) {
        throw new x.InvalidArgument(`expected a string: "${std.util.inspect(str)}"`);
    }

    if (is.string(patterns)) {
        patterns = [patterns];
    }

    for (let i = 0; i < patterns.length; i++) {
        if (!minimalMatch.isMatch(str, patterns[i], options)) {
            return false;
        }
    }
    return true;
};

/**
 * Returns a list of strings that _**do not match any**_ of the given `patterns`.
 *
 * @param {string[]} list Array of strings to match.
 * @param {string | string[]} patterns One or more glob pattern to use for matching.
 * @param {Object} options
 * @returns {string[]} An array of strings that **do not match** the given patterns.
 */
minimalMatch.not = (list, patterns, options) => {
    const opts = { ...options };
    const ignore = opts.ignore;
    delete opts.ignore;

    list = util.arrify(list);

    let matches = util.arrayDiff(list, minimalMatch(list, patterns, opts));
    if (ignore) {
        matches = util.arrayDiff(matches, minimalMatch(list, ignore));
    }

    return opts.nodupes !== false ? util.unique(matches) : matches;
};

/**
 * Returns true if the given `string` contains the given pattern.
 * Similar to .isMatch but the pattern can match any part of the string.
 *
 * @param {string} str The string to match.
 * @param {string | string[]} patterns Glob pattern to use for matching.
 * @param {object} options
 * @returns {boolean} true if the patter matches any part of `str`.
 */
minimalMatch.contains = (str, patterns, options) => {
    if (!is.string(str)) {
        throw new x.InvalidArgument(`expected a string: "${std.util.inspect(str)}"`);
    }

    if (is.string(patterns)) {
        if (_util.isEmptyString(str) || _util.isEmptyString(patterns)) {
            return false;
        }

        const equals = _util.equalsPattern(patterns, options);
        if (equals(str)) {
            return true;
        }
        const contains = _util.containsPattern(patterns, options);
        if (contains(str)) {
            return true;
        }
    }

    const opts = { ...options, contains: true };
    return minimalMatch.any(str, patterns, opts);
};

/**
 * Returns true if the given pattern and options should enable the `matchBase` option.
 *
 * @param {string} pattern
 * @param {object} [options]
 * @returns {boolean}
 */
minimalMatch.matchBase = (pattern, options) => {
    if (pattern && pattern.includes("/") || !options) {
        return false;
    }
    return options.basename === true || options.matchBase === true;
};

/**
 * Filter the keys of the given object with the given `glob` pattern and `options`.
 *
 * @param {object} object The object with keys to filter.
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {object} Returns an object with only keys that match the given patterns.
 */
minimalMatch.matchKeys = (obj, patterns, options) => {
    if (!is.plainObject(obj)) {
        throw new x.InvalidArgument("expected the first argument to be an object");
    }
    const keys = minimalMatch(Object.keys(obj), patterns, options);
    return util.pick(obj, keys);
};

/**
 * Compose a matcher function with the given patterns.
 * This allows matcher functions to be compiled once and called multiple times.
 */
const compose = (patterns, options, matcher) => {
    let matchers;

    return memoize("compose", String(patterns), options, () => {
        return (file) => {
            // delay composition until it's invoked the first time,
            // after that it won't be called again
            if (!matchers) {
                matchers = [];
                for (let i = 0; i < patterns.length; i++) {
                    matchers.push(matcher(patterns[i], options));
                }
            }

            let len = matchers.length;
            while (len--) {
                if (matchers[len](file) === true) {
                    return true;
                }
            }
            return false;
        };
    });
};

/**
 * Returns a memoized matcher function from the given glob `pattern` and `options`.
 * The returned function takes a string to match as its only argument and returns true if the string is a match.
 *
 * @param {string} pattern Glob pattern
 * @param {object} options
 * @returns {Function} Returns a matcher function.
 */
minimalMatch.matcher = (pattern, options) => {
    if (_util.isEmptyString(pattern)) {
        return adone.falsely;
    }

    if (is.array(pattern)) {
        return compose(pattern, options, minimalMatch.matcher);
    }

    const test = (regex) => {
        const equals = _util.equalsPattern(options);
        const unixify = _util.unixify(options);

        return function (str) {
            if (equals(str)) {
                return true;
            }

            if (regex.test(unixify(str))) {
                return true;
            }
            return false;
        };
    };

    // if pattern is a regex
    if (is.regexp(pattern)) {
        return test(pattern);
    }

    // if pattern is invalid
    if (!is.string(pattern)) {
        throw new x.InvalidArgument("expected pattern to be an array, string or regex");
    }

    // if pattern is a non-glob string
    if (!_util.hasSpecialChars(pattern)) {
        if (options && options.nocase === true) {
            pattern = pattern.toLowerCase();
        }
        return _util.matchPath(pattern, options);
    }

    // if pattern is a glob string
    const re = minimalMatch.makeRe(pattern, options);

    // if `options.matchBase` or `options.basename` is defined
    if (minimalMatch.matchBase(pattern, options)) {
        return _util.matchBasename(re, options);
    }

    const fn = test(re);
    Object.defineProperty(fn, "result", {
        configurable: true,
        enumerable: false,
        value: re.result
    });
    return fn;
};

/**
 * Returns an array of matches captured by `pattern` in `string, or `null` if the pattern did not match.
 *
 * @param {string} pattern Glob pattern to use for matching.
 * @param {string} string String to match
 * @param {object} options
 * @returns {boolean} Returns an array of captures if the string matches the glob pattern, otherwise `null`.
 */
minimalMatch.capture = (pattern, str, options) => {
    const re = minimalMatch.makeRe(pattern, { capture: true, ...options });
    const unixify = _util.unixify(options);

    const match = () => (string) => {
        const match = re.exec(unixify(string));
        if (!match) {
            return null;
        }

        return match.slice(1);
    };

    const capture = memoize("capture", pattern, options, match);
    return capture(str);
};

/**
 * Create a regular expression from the given glob `pattern`.
 *
 * @param {string} pattern A glob pattern to convert to regex.
 * @param {object} options
 * @returns {RegExp} Returns a regex created from the given pattern.
 */
minimalMatch.makeRe = (pattern, options) => {
    if (is.regexp(pattern)) {
        return pattern;
    }

    if (!is.string(pattern)) {
        throw new x.InvalidArgument("expected pattern to be a string");
    }

    if (pattern.length > minimalMatch.MAX_LENGTH) {
        throw new x.LimitExceeded(`expected pattern to be less than ${minimalMatch.MAX_LENGTH} characters`);
    }

    const makeRe = () => {
        const res = minimalMatch.create(pattern, options);
        const opts = { wrap: false, ...options };
        const regex = util.toRegex(res.output, opts);
        Object.defineProperty(regex, "result", {
            configurable: true,
            enumerable: false,
            value: res
        });
        return regex;
    };

    return memoize("makeRe", pattern, options, makeRe);
};

/**
 * Parses the given glob `pattern` and returns an object with the compiled `output` and optional source `map`.
 *
 * @param {string} pattern Glob pattern to parse and compile.
 * @param {object} options
 * @returns {object} Returns an object with the parsed AST, compiled string and optional source map.
 */
minimalMatch.create = (pattern, options) => {
    if (!is.string(pattern)) {
        throw new x.InvalidArgument("expected a string");
    }
    const create = () => minimalMatch.compile(minimalMatch.parse(pattern, options), options);
    return memoize("create", pattern, options, create);
};

/**
 * Parse the given `str` with the given `options`.
 *
 * @param {string} str
 * @param {object} options
 * @returns {object} Returns an AST
 */
minimalMatch.parse = (pattern, options) => {
    if (!is.string(pattern)) {
        throw new x.InvalidArgument("expected a string");
    }

    const parse = () => {
        const snapdragon = _util.instantiate(null, options);
        minimalMatch.parsers(snapdragon, options);

        const ast = snapdragon.parse(pattern, options);
        Object.defineProperty(ast, "snapdragon", {
            value: snapdragon,
            configurable: true,
            enumerable: false,
            writable: true
        });
        ast.input = pattern;
        return ast;
    };

    return memoize("parse", pattern, options, parse);
};

/**
 * Compile the given `ast` or string with the given `options`.
 *
 * @param {object | string} ast
 * @param {object} options
 * @returns {object} Returns an object that has an `output` property with the compiled string.
 */
minimalMatch.compile = (ast, options) => {
    if (is.string(ast)) {
        ast = minimalMatch.parse(ast, options);
    }

    const compile = () => {
        const snapdragon = _util.instantiate(ast, options);
        minimalMatch.compilers(snapdragon, options);
        return snapdragon.compile(ast, options);
    };

    return memoize("compile", ast.input, options, compile);
};
