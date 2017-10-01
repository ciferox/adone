const {
    is,
    util
} = adone;

const toSequence = (arr, zeros, options) => {
    let greater = "";
    let lesser = "";
    if (zeros.greater.length) {
        greater = zeros.greater.join("|");
    }
    if (zeros.lesser.length) {
        lesser = `-(${zeros.lesser.join("|")})`;
    }
    const res = greater && lesser
        ? `${greater}|${lesser}`
        : greater || lesser;

    if (options.capture) {
        return `(${res})`;
    }
    return res;
};

const toNumber = (val) => Number(val) || 0;

const toRange = (a, b, start, stop, options) => {
    if (options.isPadded) {
        return util.toRegexRange(start, stop, options);
    }

    if (options.isNumber) {
        return util.toRegexRange(Math.min(a, b), Math.max(a, b), options);
    }

    start = String.fromCharCode(Math.min(a, b));
    stop = String.fromCharCode(Math.max(a, b));
    return `[${start}-${stop}]`;
};

const zeros = (val, options) => {
    if (options.isPadded) {
        let str = String(val);
        const len = str.length;
        let dash = "";
        if (str.charAt(0) === "-") {
            dash = "-";
            str = str.slice(1);
        }
        const diff = options.maxLength - len;
        const pad = "0".repeat(diff);
        val = (dash + pad + str);
    }
    if (options.stringify) {
        return String(val);
    }
    return val;
};

const expand = (start, stop, options) => {
    let a = options.isNumber ? toNumber(start) : start.charCodeAt(0);
    const b = options.isNumber ? toNumber(stop) : stop.charCodeAt(0);

    const step = Math.abs(toNumber(options.step)) || 1;
    if (options.toRegex && step === 1) {
        return toRange(a, b, start, stop, options);
    }

    const zero = { greater: [], lesser: [] };
    const asc = a < b;
    const arr = new Array(Math.round((asc ? b - a : a - b) / step));
    let idx = 0;

    while (asc ? a <= b : a >= b) {
        let val = options.isNumber ? a : String.fromCharCode(a);
        if (options.toRegex && (val >= 0 || !options.isNumber)) {
            zero.greater.push(val);
        } else {
            zero.lesser.push(Math.abs(val));
        }

        if (options.isPadded) {
            val = zeros(val, options);
        }

        if (options.toString) {
            val = String(val);
        }

        if (is.function(options.transform)) {
            arr[idx++] = options.transform(val, a, b, step, idx, arr, options);
        } else {
            arr[idx++] = val;
        }

        if (asc) {
            a += step;
        } else {
            a -= step;
        }
    }

    if (options.toRegex === true) {
        return toSequence(arr, zero, options);
    }
    return arr;
};

const isPadded = (str) => /^-?0\d/.test(str);


const isValidLetter = (ch) => {
    return is.string(ch) && ch.length === 1 && /^\w+$/.test(ch);
};

const isValidNumber = (n) => {
    return is.numeral(n) && !/\./.test(n);
};

const isValid = (min, max) => {
    return (isValidNumber(min) || isValidLetter(min))
        && (isValidNumber(max) || isValidLetter(max));
};

/**
 * Return a range of numbers or letters.
 *
 * @param  {String} `start` Start of the range
 * @param  {String} `stop` End of the range
 * @param  {String} `step` Increment or decrement to use.
 * @param  {Function} `fn` Custom function to modify each element in the range.
 * @return {Array}
 */
export default function fillRange(start, stop, step, options) {
    if (is.undefined(start)) {
        return [];
    }

    if (is.undefined(stop) || start === stop) {
        // special case, for handling negative zero
        const isString = is.string(start);
        if (is.numeral(start) && !toNumber(start)) {
            return [isString ? "0" : 0];
        }
        return [start];
    }

    if (!is.number(step) && !is.string(step)) {
        options = step;
        step = undefined;
    }

    if (is.function(options)) {
        options = { transform: options };
    }

    const opts = { step, ...options };
    if (opts.step && !isValidNumber(opts.step)) {
        if (opts.strictRanges === true) {
            throw new TypeError("expected options.step to be a number");
        }
        return [];
    }

    opts.isNumber = isValidNumber(start) && isValidNumber(stop);
    if (!opts.isNumber && !isValid(start, stop)) {
        if (opts.strictRanges === true) {
            throw new RangeError(`invalid range arguments: ${adone.std.util.inspect([start, stop])}`);
        }
        return [];
    }

    opts.isPadded = isPadded(start) || isPadded(stop);
    opts.toString = opts.stringify
        || is.string(opts.step)
        || is.string(start)
        || is.string(stop)
        || !opts.isNumber;

    if (opts.isPadded) {
        opts.maxLength = Math.max(String(start).length, String(stop).length);
    }

    // support legacy minimatch/fill-range options
    if (is.boolean(opts.optimize)) {
        opts.toRegex = opts.optimize;
    }
    if (is.boolean(opts.makeRe)) {
        opts.toRegex = opts.makeRe;
    }
    return expand(start, stop, opts);
}
