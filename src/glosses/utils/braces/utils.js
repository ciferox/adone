const {
    is,
    util
} = adone;


/**
 * Returns true if the given string looks like a regex quantifier
 * @return {Boolean}
 */
export const isQuantifier = (str) => /^(?:[0-9]?,[0-9]|[0-9],)$/.test(str);

/**
 * Cast `val` to an array.
 * @param {*} `val`
 */
export const stringifyArray = (arr) => [util.arrify(arr).join("|")];

/**
 * Get the last element from `array`
 * @param {Array} `array`
 * @return {*}
 */

export const last = (arr, n = 1) => arr[arr.length - (n || 1)];

export const escapeRegex = (str) => str.replace(/\\?([!^*?()[\]{}+?/])/g, "\\$1");

/**
 * Returns true if the given string contains only empty brace sets.
 */
export const isEmptySets = (str) => /^(?:\{,\})+$/.test(str);

/**
 * Returns true if the given string contains only empty brace sets.
 */
export const isQuotedString = (str) => {
    const open = str.charAt(0);
    if (open === "'" || open === '"' || open === "`") {
        return str.slice(-1) === open;
    }
    return false;
};

/**
 * Create the key to use for memoization. The unique key is generated
 * by iterating over the options and concatenating key-value pairs
 * to the pattern string.
 */
export const createKey = (pattern, options) => {
    let id = pattern;
    if (!options) {
        return id;
    }
    const keys = Object.keys(options);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        id += `;${key}=${String(options[key])}`;
    }
    return id;
};

/**
 * Normalize options
 */
export const createOptions = (...args) => {
    const opts = Object.assign({}, ...args);
    if (is.boolean(opts.expand)) {
        opts.optimize = !opts.expand;
    }
    if (is.boolean(opts.optimize)) {
        opts.expand = !opts.optimize;
    }
    if (opts.optimize === true) {
        opts.makeRe = true;
    }
    return opts;
};

/**
 * Join patterns in `a` to patterns in `b`
 */
export const join = (a, b, options) => {
    options = options || {};
    a = util.arrify(a);
    b = util.arrify(b);

    if (!a.length) {
        return b;
    }
    if (!b.length) {
        return a;
    }

    const len = a.length;
    let idx = -1;
    const arr = [];

    while (++idx < len) {
        const val = a[idx];
        if (is.array(val)) {
            for (let i = 0; i < val.length; i++) {
                val[i] = join(val[i], b, options);
            }
            arr.push(val);
            continue;
        }

        for (let j = 0; j < b.length; j++) {
            const bval = b[j];

            if (is.array(bval)) {
                arr.push(join(val, bval, options));
            } else {
                arr.push(val + bval);
            }
        }
    }
    return arr;
};

/**
 * Ensure commas inside brackets and parens are not split.
 * @param {Object} `tok` Token from the `split-string` module
 * @return {undefined}
 */
export const escapeBrackets = (options) => (tok) => {
    if (tok.escaped && tok.val === "b") {
        tok.val = "\\b";
        return;
    }

    if (tok.val !== "(" && tok.val !== "[") {
        return;
    }
    const opts = { ...options };
    const brackets = [];
    const parens = [];
    const stack = [];
    let val = tok.val;
    const str = tok.str;
    let i = tok.idx - 1;

    while (++i < str.length) {
        const ch = str[i];

        if (ch === "\\") {
            val += (opts.keepEscaping === false ? "" : ch) + str[++i];
            continue;
        }

        if (ch === "(") {
            parens.push(ch);
            stack.push(ch);
        }

        if (ch === "[") {
            brackets.push(ch);
            stack.push(ch);
        }

        if (ch === ")") {
            parens.pop();
            stack.pop();
            if (!stack.length) {
                val += ch;
                break;
            }
        }

        if (ch === "]") {
            brackets.pop();
            stack.pop();
            if (!stack.length) {
                val += ch;
                break;
            }
        }
        val += ch;
    }

    tok.split = false;
    tok.val = val.slice(1);
    tok.idx = i;
};

/**
 * Split the given string on `,` if not escaped.
 */
export const split = (str, options) => {
    const opts = { sep: ",", ...options };
    if (!is.boolean(opts.keepQuotes)) {
        opts.keepQuotes = true;
    }
    if (opts.unescape === false) {
        opts.keepEscaping = true;
    }
    return util.splitString(str, opts, escapeBrackets(opts));
};

/**
 * Expand ranges or sets in the given `pattern`.
 *
 * @param {String} `str`
 * @param {Object} `options`
 * @return {Object}
 */
export const expand = (str, options) => {
    const opts = { rangeLimit: 10000, ...options };
    const segs = split(str, opts);
    const tok = { segs };

    if (isQuotedString(str)) {
        return tok;
    }

    if (opts.rangeLimit === true) {
        opts.rangeLimit = 10000;
    }

    if (segs.length > 1) {
        if (opts.optimize === false) {
            tok.val = segs[0];
            return tok;
        }

        tok.segs = stringifyArray(tok.segs);
    } else if (segs.length === 1) {
        const arr = str.split("..");

        if (arr.length === 1) {
            tok.val = tok.segs[tok.segs.length - 1] || tok.val || str;
            tok.segs = [];
            return tok;
        }

        if (arr.length === 2 && arr[0] === arr[1]) {
            tok.escaped = true;
            tok.val = arr[0];
            tok.segs = [];
            return tok;
        }

        if (arr.length > 1) {
            if (opts.optimize !== false) {
                opts.optimize = true;
                delete opts.expand;
            }

            if (opts.optimize !== true) {
                const min = Math.min(arr[0], arr[1]);
                const max = Math.max(arr[0], arr[1]);
                const step = arr[2] || 1;

                if (opts.rangeLimit !== false && ((max - min) / step >= opts.rangeLimit)) {
                    throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
                }
            }

            arr.push(opts);
            tok.segs = util.fillRange.apply(null, arr);

            if (!tok.segs.length) {
                tok.escaped = true;
                tok.val = str;
                return tok;
            }

            if (opts.optimize === true) {
                tok.segs = stringifyArray(tok.segs);
            }

            if (tok.segs === "") {
                tok.val = str;
            } else {
                tok.val = tok.segs[0];
            }
            return tok;
        }
    } else {
        tok.val = str;
    }
    return tok;
};
