const {
    x,
    is,
    util,
    std
} = adone;

import * as _util from "./utils";

/**
 * The main function takes a list of strings and one or more
 * glob patterns to use for matching.
 *
 * @param {string[]} list A list of strings to match
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {string[]} Returns an array of matches
 */
export default function match(list, patterns, options) {
    patterns = util.arrify(patterns);
    list = util.arrify(list);

    const len = patterns.length;
    if (list.length === 0 || len === 0) {
        return [];
    }

    if (len === 1) {
        return match.match(list, patterns[0], options);
    }

    const omit = [];
    const keep = [];
    let idx = -1;

    while (++idx < len) {
        const pattern = patterns[idx];

        if (is.string(pattern) && pattern.charCodeAt(0) === 33 /* ! */) {
            omit.push.apply(omit, match.match(list, pattern.slice(1), options));
        } else {
            keep.push.apply(keep, match.match(list, pattern, options));
        }
    }

    const matches = util.arrayDiff(keep, omit);
    if (!options || options.nodupes !== false) {
        return util.unique(matches);
    }

    return matches;
}

match.MAX_LENGTH = 1024 * 64;

const memoize = _util.memoize(match, [
    "match",
    "isMatch",
    "compose",
    "capture",
    "makeRe",
    "braces",
    "create",
    "parse",
    "compile"
]);

adone.definePrivate({
    util: _util
}, match, require);

adone.lazify({
    posixBrackets: "./posix_brackets",
    extglob: "./extglob",
    minimal: "./minimal",
    compilers: "./compilers",
    parsers: "./parsers"
}, match, require);

/**
 * Similar to the main function, but `pattern` must be a string.
 *
 * @param {string[]} list Array of strings to match
 * @param {string} pattern Glob pattern to use for matching.
 * @param {object} options
 * @returns {string[]} Returns an array of matches
 */
match.match = (list, pattern, options) => {
    if (is.array(pattern)) {
        throw new x.InvalidArgument("expected pattern to be a string");
    }

    const unixify = _util.unixify(options);
    const isMatch = memoize("match", pattern, options, match.matcher);
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
        matches = match.not(matches, options.ignore, options);
    }

    return options.nodupes !== false ? util.unique(matches) : matches;
};

/**
 * Returns true if the specified `string` matches the given glob `pattern`.
 *
 * @param {string} string String to match
 * @param {string} pattern Glob pattern to use for matching.
 * @param {object} options
 * @returns {boolean} Returns true if the string matches the glob pattern.
 */
match.isMatch = (str, pattern, options) => {
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

    const isMatch = memoize("isMatch", pattern, options, match.matcher);
    return isMatch(str);
};

/**
 * Returns true if some of the strings in the given `list` match any of the
 * given glob `patterns`.
 *
 * @param  {string | string[]} list The string or array of strings to test. Returns as soon as the first match is found.
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {boolean} Returns true if any patterns match `str`
 */
match.some = (list, patterns, options) => {
    if (is.string(list)) {
        list = [list];
    }
    for (let i = 0; i < list.length; i++) {
        if (match(list[i], patterns, options).length === 1) {
            return true;
        }
    }
    return false;
};

/**
 * Returns true if every string in the given `list` matches
 * any of the given glob `patterns`.
 *
 * @param  {string | string[]} list The string or array of strings to test.
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {Object} options
 * @returns {boolean} Returns true if any patterns match `str`
 */
match.every = (list, patterns, options) => {
    if (is.string(list)) {
        list = [list];
    }
    for (let i = 0; i < list.length; i++) {
        if (match(list[i], patterns, options).length !== 1) {
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
match.any = (str, patterns, options) => {
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
        if (match.isMatch(str, patterns[i], options)) {
            return true;
        }
    }
    return false;
};

/**
 * Returns true if **all** of the given `patterns` match
 * the specified string.
 *
 * @param  {string} str The string to test.
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {Boolean} Returns true if any patterns match `str`
 */
match.all = (str, patterns, options) => {
    if (!is.string(str)) {
        throw new x.InvalidArgument(`expected a string: "${std.util.inspect(str)}"`);
    }
    if (is.string(patterns)) {
        patterns = [patterns];
    }
    for (let i = 0; i < patterns.length; i++) {
        if (!match.isMatch(str, patterns[i], options)) {
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
 * @param {object} options
 * @returns {string[]} Returns an array of strings that **do not match** the given patterns.
 */
match.not = (list, patterns, options) => {
    const opts = { ...options };
    const ignore = opts.ignore;
    delete opts.ignore;

    const unixify = _util.unixify(opts);
    list = util.arrify(list).map(unixify);

    let matches = util.arrayDiff(list, match(list, patterns, opts));
    if (ignore) {
        matches = util.arrayDiff(matches, match(list, ignore));
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
 * @returns {boolean} Returns true if the patter matches any part of `str`.
 */
match.contains = (str, patterns, options) => {
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
    return match.any(str, patterns, opts);
};

/**
 * Returns true if the given pattern and options should enable the `matchBase` option.
 *
 * @param {string} pattern
 * @param {object} [options]
 * @returns {oolean}
 */
match.matchBase = (pattern, options) => {
    if (pattern && pattern.includes("/") || !options) {
        return false;
    }
    return options.basename === true || options.matchBase === true;
};

/**
 * Filter the keys of the given object with the given `glob` pattern
 * and `options`. Does not attempt to match nested keys. If you need this feature,
 * use [glob-object][] instead.
 *
 * @param {object} object The object with keys to filter.
 * @param {string | string[]} patterns One or more glob patterns to use for matching.
 * @param {object} options
 * @returns {object} Returns an object with only keys that match the given patterns.
 */
match.matchKeys = (obj, patterns, options) => {
    if (!is.plainObject(obj)) {
        throw new x.InvalidArgument("expected the first argument to be an object");
    }
    const keys = match(Object.keys(obj), patterns, options);
    return util.pick(obj, keys);
};

/**
 * Compose a matcher function with the given patterns.
 * This allows matcher functions to be compiled once and
 * called multiple times.
 */
const compose = (patterns, options, matcher) => {
    let matchers;

    return memoize("compose", String(patterns), options, () => (file) => {
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
    });
};


/**
 * Returns a memoized matcher function from the given glob `pattern` and `options`.
 * The returned function takes a string to match as its only argument and returns
 * true if the string is a match.
 *
 * @param {string} pattern Glob pattern
 * @param {object} options
 * @returns {Function} Returns a matcher function.
 */
match.matcher = (pattern, options) => {
    if (is.array(pattern)) {
        return compose(pattern, options, match.matcher);
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
    const re = match.makeRe(pattern, options);

    // if `options.matchBase` or `options.basename` is defined
    if (match.matchBase(pattern, options)) {
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
match.capture = (pattern, str, options) => {
    const re = match.makeRe(pattern, { capture: true, ...options });
    const unixify = _util.unixify(options);

    const matcher = () => (string) => {
        const match = re.exec(unixify(string));
        if (!match) {
            return null;
        }

        return match.slice(1);
    };

    const capture = memoize("capture", pattern, options, matcher);
    return capture(str);
};

/**
 * Create a regular expression from the given glob `pattern`.
 *
 * @param {string} pattern A glob pattern to convert to regex.
 * @param {object} options
 * @returns {RegExp} Returns a regex created from the given pattern.
 */
match.makeRe = (pattern, options) => {
    if (!is.string(pattern)) {
        throw new x.InvalidArgument("expected pattern to be a string");
    }

    if (pattern.length > match.MAX_LENGTH) {
        throw new x.LimitExceeded(`expected pattern to be less than ${match.MAX_LENGTH} characters`);
    }

    const makeRe = () => {
        const result = match.create(pattern, options);
        const asts = [];
        const output = result.map((obj) => {
            obj.ast.state = obj.state;
            asts.push(obj.ast);
            return obj.output;
        });

        const regex = util.toRegex(output.join("|"), options);
        Object.defineProperty(regex, "result", {
            configurable: true,
            enumerable: false,
            value: asts
        });
        return regex;
    };

    return memoize("makeRe", pattern, options, makeRe);
};

/**
 * Expand the given brace `pattern`.
 *
 * @param {string} pattern String with brace pattern to expand.
 * @param {object} options
 * @returns {Array}
 */
match.braces = (pattern, options) => {
    if (!is.string(pattern)) {
        throw new x.InvalidArgument("expected a string");
    }

    const expand = () => {
        if (options && options.nobrace === true) {
            return [pattern];
        }
        if (!/\{.*\}/.test(pattern)) {
            return [pattern];
        }
        // if (/[!@*?+]\{/.test(pattern)) {
        //   options = utils.extend({}, options, {expand: true});
        // }
        return util.braces(pattern, options);
    };

    return memoize("braces", pattern, options, expand);
};

/**
 * Proxy to the match.braces, for parity with minimatch.
 */
match.braceExpand = (pattern, options) => {
    const opts = { ...options, expand: true };
    return match.braces(pattern, opts);
};

/**
 * Parses the given glob `pattern` and returns an array of abstract syntax
 * trees (ASTs), with the compiled `output` and optional source `map` on
 * each AST.
 *
 * @param {string} pattern Glob pattern to parse and compile.
 * @param {object} options
 * @returns {object} Returns an object with the parsed AST, compiled string and optional source map.
 */
match.create = (pattern, options) => {
    return memoize("create", pattern, options, () => {
        const create = (str, opts) => {
            return match.compile(match.parse(str, opts), opts);
        };

        pattern = match.braces(pattern, options);
        const len = pattern.length;
        let idx = -1;
        const res = [];

        while (++idx < len) {
            res.push(create(pattern[idx], options));
        }
        return res;
    });
};

/**
 * Parse the given `str` with the given `options`.
 *
 * @param {string} str
 * @param {object} options
 * @returns {object} Returns an AST
 */
match.parse = (pattern, options) => {
    if (!is.string(pattern)) {
        throw new x.InvalidArgument("expected a string");
    }

    const parse = () => {
        const snapdragon = _util.instantiate(null, options);
        match.parsers(snapdragon, options);

        if (pattern.slice(0, 2) === "./") {
            pattern = pattern.slice(2);
        }

        pattern = _util.combineDuplicates(pattern, "\\*\\*\\/|\\/\\*\\*");
        const ast = snapdragon.parse(pattern, options);
        Object.defineProperty(ast, "snapdragon", {
            value: snapdragon,
            enumerable: false,
            configurable: true,
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
match.compile = (ast, options) => {
    if (is.string(ast)) {
        ast = match.parse(ast, options);
    }

    return memoize("compile", ast.input, options, () => {
        const snapdragon = _util.instantiate(ast, options);
        match.compilers(snapdragon, options);
        return snapdragon.compile(ast, options);
    });
};
