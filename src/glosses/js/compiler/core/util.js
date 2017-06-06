const { vendor: { lodash: _ }, is, util, std: { path } } = adone;
const { escapeRegExp } = _;

export { inherits, inspect } from "util";

export const canCompile = (filename, altExts) => {
    const exts = altExts || canCompile.EXTENSIONS;
    const ext = path.extname(filename);
    return exts.includes(ext);
};

canCompile.EXTENSIONS = [".js", ".jsx", ".es6", ".es"];

/**
 * Create an array from any value, splitting strings by ",".
 */

export const list = (val) => {
    if (!val) {
        return [];
    } else if (is.array(val)) {
        return val;
    } else if (is.string(val)) {
        return val.split(",");
    }
    return [val];

};

/**
 * Create a RegExp from a string, array, or regexp.
 */

export const regexify = (val) => {
    if (!val) {
        return new RegExp(/.^/);
    }

    if (is.array(val)) {
        val = new RegExp(val.map(escapeRegExp).join("|"), "i");
    }

    if (is.string(val)) {
        // normalise path separators
        val = util.normalizePath(val);

        // remove starting wildcards or relative separator if present
        if (val.startsWith("./") || val.startsWith("*/")) {
            val = val.slice(2);
        }
        if (val.startsWith("**/")) {
            val = val.slice(3);
        }

        const regex = util.GlobExp.makeRe(val, { nocase: true });
        return new RegExp(regex.source.slice(1, -1), "i");
    }

    if (is.regexp(val)) {
        return val;
    }

    throw new TypeError("illegal type for regexify");
};

/**
 * Create an array from a boolean, string, or array, mapped by and optional function.
 */

export const arrayify = (val, mapFn) => {
    if (!val) {
        return [];
    }
    if (is.boolean(val)) {
        return arrayify([val], mapFn);
    }
    if (is.string(val)) {
        return arrayify(list(val), mapFn);
    }

    if (is.array(val)) {
        if (mapFn) {
            val = val.map(mapFn);
        }
        return val;
    }

    return [val];
};

/**
 * Makes boolean-like strings into booleans.
 */

export const booleanify = (val) => {
    // eslint-disable-next-line eqeqeq
    if (val === "true" || val == 1) {
        return true;
    }

    // eslint-disable-next-line eqeqeq
    if (val === "false" || val == 0 || !val) {
        return false;
    }

    return val;
};

/**
 * Returns result of calling function with filename if pattern is a function.
 * Otherwise returns result of matching pattern Regex with filename.
 */

const _shouldIgnore = (pattern, filename) => {
    if (is.function(pattern)) {
        return pattern(filename);
    }
    return pattern.test(filename);

};

/**
 * Tests if a filename should be ignored based on "ignore" and "only" options.
 */

export const shouldIgnore = (filename, ignore = [], only) => {
    filename = filename.replace(/\\/g, "/");

    if (only) {
        for (const pattern of only) {
            if (_shouldIgnore(pattern, filename)) {
                return false;
            }
        }
        return true;
    } else if (ignore.length) {
        for (const pattern of ignore) {
            if (_shouldIgnore(pattern, filename)) {
                return true;
            }
        }
    }

    return false;
};
