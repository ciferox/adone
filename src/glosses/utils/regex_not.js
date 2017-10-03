const {
    x,
    is
} = adone;

/**
 * @param {object} options
 * @return {RegExp} Converts the given `pattern` to a regex using the specified `options`.
 */
const not = (pattern, options) => new RegExp(not.create(pattern, options));

/**
 * Create a regex-compatible string from the given `pattern` and `options`.
 *
 * @param {string} pattern
 * @param {object} options
 * @return {string}
 */
not.create = (pattern, options) => {
    if (!is.string(pattern)) {
        throw new x.InvalidArgument("expected a string");
    }

    const opts = { ...options };
    if (opts && opts.contains === true) {
        opts.strictNegate = false;
    }

    const open = opts.strictOpen !== false ? "^" : "";
    const close = opts.strictClose !== false ? "$" : "";
    const endChar = opts.endChar ? opts.endChar : "+";
    let str = pattern;

    if (opts && opts.strictNegate === false) {
        str = `(?:(?!(?:${pattern})).)${endChar}`;
    } else {
        str = `(?:(?!^(?:${pattern})$).)${endChar}`;
    }

    return open + str + close;
};

export default not;
