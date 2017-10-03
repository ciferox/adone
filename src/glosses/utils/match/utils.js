const {
    is,
    util,
    collection,
    std: { path }
} = adone;

/**
 * Returns true if the platform is windows, or `path.sep` is `\\`.
 * This is defined as a function to allow `path.sep` to be set in unit tests,
 * or by the user, if there is a reason to do so.
 *
 * @returns {boolean}
 */
export const isWindows = () => path.sep === "\\" || process.platform === "win32";

/**
 * Get the `Snapdragon` instance to use
 */
export const instantiate = (ast, options) => {
    let snapdragon;
    // if an instance was created by `.parse`, use that instance
    if (is.object(ast) && ast.snapdragon) {
        snapdragon = ast.snapdragon;
        // if the user supplies an instance on options, use that instance
    } else if (is.object(options) && options.snapdragon) {
        snapdragon = options.snapdragon;
        // create a new instance
    } else {
        snapdragon = new util.Snapdragon(options);
    }

    const orig = util.Snapdragon.prototype.parse;
    snapdragon.parse = function (str, options) {
        const parsed = orig.call(this, str, options);
        parsed.input = str;

        // escape unmatched brace/bracket/parens
        const last = this.parser.stack.pop();
        if (last && this.options.strictErrors !== true) {
            const open = last.nodes[0];
            const inner = last.nodes[1];
            if (last.type === "bracket") {
                if (inner.val.charAt(0) === "[") {
                    inner.val = `\\${inner.val}`;
                }

            } else {
                open.val = `\\${open.val}`;
                const sibling = open.parent.nodes[1];
                if (sibling.type === "star") {
                    sibling.loose = true;
                }
            }
        }

        // add non-enumerable parser reference
        Object.defineProperty(parsed, "parser", {
            value: this.parser,
            configurable: true,
            enumerable: false,
            writable: true
        });
        return parsed;
    };

    return snapdragon;
};

/**
 * Create the key to use for memoization. The key is generated
 * by iterating over the options and concatenating key-value pairs
 * to the pattern string.
 */
export const createKey = (pattern, options) => {
    if (!is.object(options)) {
        return pattern;
    }
    let val = pattern;
    const keys = Object.keys(options);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        val += `;${key}=${String(options[key])}`;
    }
    return val;
};

/**
 * Memoize a generated regex or function. A unique key is generated
 * from the `type` (usually method name), the `pattern`, and
 * user-defined options.
 */
export const memoize = (target, namespaces) => {
    let cache = null;
    let size = 50;

    target.clearCache = () => {
        if (cache) {
            cache.clear();
        }
    };

    target.resizeCache = (newSize) => {
        if (cache) {
            cache.resize(newSize);
        } else {
            size = newSize;
        }
    };

    target.getCache = () => cache;

    return (type, pattern, options, fn) => {
        if (options && options.cache === false) {
            return fn(pattern, options);
        }

        const key = createKey(`${type}=${pattern}`, options);

        if (!cache) {
            cache = new collection.NSCache(size, namespaces);
        }

        if (cache.has(type, key)) {
            return cache.get(type, key);
        }

        const val = fn(pattern, options);
        cache.set(type, key, val);
        return val;
    };
};

/**
 * Escape regex characters in the given string
 */
export const escapeRegex = (str) => str.replace(/[-[\]{}()^$|*+?.\\/\s]/g, "\\$&");

/**
 * Combines duplicate characters in the provided string.
 *
 * @param {string} str
 * @returns {string}
 */
export const combineDuplicates = (str, val) => {
    if (is.string(val)) {
        const re = new RegExp(`(${val})(?=(?:${val})*\\1)`, "g");
        return str.replace(re, "");
    }
    return str.replace(/(.)(?=.*\1)/g, "");
};

/**
 * Returns true if the given `str` has special characters
 */
export const hasSpecialChars = (str) => /(?:(?:(^|\/)[!.])|[*?+()|[\]{}]|[+@]\()/.test(str);

/**
 * Normalize slashes in the given filepath.
 *
 * @param {string} str filepath
 * @returns {string}
 */
export const toPosixPath = (str) => str.replace(/\\+/g, "/");

/**
 * Strip backslashes before special characters in a string.
 *
 * @param {string} str
 * @returns {string}
 */
export const unescape = (str) => toPosixPath(str.replace(/\\(?=[*+?!.])/g, ""));

/**
 * Returns true if the given str is an escaped or
 * unescaped path character
 */
export const isSlash = (str) => str === "/" || str === "\\/" || str === "\\" || str === "\\\\";

/**
 * Strip the prefix from a filepath
 * @param {string} str
 * @returns {string}
 */
export const stripPrefix = (str) => {
    if (str.charAt(0) !== ".") {
        return str;
    }
    const ch = str.charAt(1);
    if (isSlash(ch)) {
        return str.slice(2);
    }
    return str;
};

/**
 * Returns true if `str` is a common character that doesn't need
 * to be processed to be used for matching.
 *
 * @param {string} str
 * @returns {boolean}
 */
export const isSimpleChar = (str) => str === "" || str === " " || str === ".";

/**
 * Returns true if the given value is effectively an empty string
 */
export const isEmptyString = (val) => String(val) === "" || String(val) === "./";

/**
 * Returns a function that normalizes slashes in a string to forward
 * slashes, strips `./` from beginning of paths, and optionally unescapes
 * special characters.
 *
 * @param {object} options
 * @returns {Function}
 */
export const unixify = (options) => {
    options = options || {};
    return (filepath) => {
        if (isWindows() || options.unixify === true) {
            filepath = toPosixPath(filepath);
        }
        if (options.stripPrefix !== false) {
            filepath = stripPrefix(filepath);
        }
        if (options.unescape === true) {
            filepath = unescape(filepath);
        }
        return filepath;
    };
};

/**
 * Returns true if the given (original) filepath or unixified path are equal
 * to the given pattern.
 */
export const _equals = (filepath, unixPath, pattern) => {
    return pattern === filepath || pattern === unixPath;
};

/**
 * Returns true if the given (original) filepath or unixified path contain
 * the given pattern.
 */
export const _contains = (filepath, unixPath, pattern) => {
    return filepath.includes(pattern) || unixPath.includes(pattern);
};

/**
 * Returns a function that returns true if the given
 * pattern is the same as a given `filepath`
 *
 * @param {string} pattern
 * @returns {Function}
 */
export const equalsPattern = (pattern, options) => {
    const u = unixify(options);
    options = options || {};

    return function fn(filepath) {
        const equal = _equals(filepath, u(filepath), pattern);
        if (equal === true || options.nocase !== true) {
            return equal;
        }
        const lower = filepath.toLowerCase();
        return _equals(lower, u(lower), pattern);
    };
};

/**
 * Returns a function that returns true if the given
 * pattern contains a `filepath`
 *
 * @param {string} pattern
 * @returns {Function}
 */
export const containsPattern = (pattern, options) => {
    const u = unixify(options);
    options = options || {};

    return function (filepath) {
        const contains = _contains(filepath, u(filepath), pattern);
        if (contains === true || options.nocase !== true) {
            return contains;
        }
        const lower = filepath.toLowerCase();
        return _contains(lower, u(lower), pattern);
    };
};

/**
 * Returns a function that returns true if the given
 * pattern matches or contains a `filepath`
 *
 * @param {string} pattern
 * @returns {Function}
 */
export const matchPath = (pattern, options) => {
    return (options && options.contains)
        ? containsPattern(pattern, options)
        : equalsPattern(pattern, options);
};

/**
 * Returns a function that returns true if the given
 * regex matches the `filename` of a file path.
 *
 * @param {RegExp} re Matching regex
 * @returns {Function}
 */
export const matchBasename = (re) => (filepath) => re.test(filepath) || re.test(path.basename(filepath));

/**
 * Determines the filepath to return based on the provided options.
 */
export const value = (str, unixify, options) => {
    if (options && options.unixify === false) {
        return str;
    }
    return unixify(str);
};
