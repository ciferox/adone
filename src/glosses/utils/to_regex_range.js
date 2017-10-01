const { is } = adone;

const cache = {};

/**
 * Zip strings (`for in` can be used on string characters)
 */

const zip = (a, b) => {
    const arr = [];
    for (const ch in a) {
        arr.push([a[ch], b[ch]]);
    }
    return arr;
};

const toCharacterClass = (a, b) => `[${a}${(b - a === 1) ? "" : "-"}${b}]`;

/**
 * Convert a range to a regex pattern
 * @param {Number} `start`
 * @param {Number} `stop`
 * @return {String}
 */
const rangeToPattern = (start, stop, options) => {
    if (start === stop) {
        return { pattern: String(start), digits: [] };
    }

    const zipped = zip(String(start), String(stop));
    const len = zipped.length;
    let i = -1;

    let pattern = "";
    let digits = 0;

    while (++i < len) {
        const numbers = zipped[i];
        const startDigit = numbers[0];
        const stopDigit = numbers[1];

        if (startDigit === stopDigit) {
            pattern += startDigit;

        } else if (startDigit !== "0" || stopDigit !== "9") {
            pattern += toCharacterClass(startDigit, stopDigit);

        } else {
            digits += 1;
        }
    }

    if (digits) {
        pattern += options.shorthand ? "\\d" : "[0-9]";
    }

    return { pattern, digits: [digits] };
};


const padZeros = (val, tok) => {
    if (tok.isPadded) {
        const diff = Math.abs(tok.maxLen - String(val).length);
        switch (diff) {
            case 0:
                return "";
            case 1:
                return "0";
            default: {
                return `0{${diff}}`;
            }
        }
    }
    return val;
};

const toQuantifier = (digits) => {
    const start = digits[0];
    const stop = digits[1] ? (`,${digits[1]}`) : "";
    if (!stop && (!start || start === 1)) {
        return "";
    }
    return `{${start}${stop}}`;
};

const contains = (arr, key, val) => {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i][key] === val) {
            return true;
        }
    }
    return false;
};

const filterPatterns = (arr, comparison, prefix, intersection, options) => {
    const res = [];

    for (let i = 0; i < arr.length; i++) {
        const tok = arr[i];
        let ele = tok.string;

        if (options.relaxZeros !== false) {
            if (prefix === "-" && ele.charAt(0) === "0") {
                if (ele.charAt(1) === "{") {
                    ele = `0*${ele.replace(/^0\{\d+\}/, "")}`;
                } else {
                    ele = `0*${ele.slice(1)}`;
                }
            }
        }

        if (!intersection && !contains(comparison, "string", ele)) {
            res.push(prefix + ele);
        }

        if (intersection && contains(comparison, "string", ele)) {
            res.push(prefix + ele);
        }
    }
    return res;
};

const siftPatterns = (neg, pos, options) => {
    const onlyNegative = filterPatterns(neg, pos, "-", false, options) || [];
    const onlyPositive = filterPatterns(pos, neg, "", false, options) || [];
    const intersected = filterPatterns(neg, pos, "-?", true, options) || [];
    const subpatterns = onlyNegative.concat(intersected).concat(onlyPositive);
    return subpatterns.join("|");
};

const compare = (a, b) => a > b ? 1 : b > a ? -1 : 0;

const push = (arr, ele) => {
    if (!arr.includes(ele)) {
        arr.push(ele);
    }
    return arr;
};

const countNines = (min, len) => String(min).slice(0, -len) + "9".repeat(len);

const countZeros = (integer, zeros) => integer - (integer % Math.pow(10, zeros));

const splitToRanges = (min, max) => {
    min = Number(min);
    max = Number(max);

    let nines = 1;
    let stops = [max];
    let stop = Number(countNines(min, nines));

    while (min <= stop && stop <= max) {
        stops = push(stops, stop);
        nines += 1;
        stop = Number(countNines(min, nines));
    }

    let zeros = 1;
    stop = countZeros(max + 1, zeros) - 1;

    while (min < stop && stop <= max) {
        stops = push(stops, stop);
        zeros += 1;
        stop = countZeros(max + 1, zeros) - 1;
    }

    stops.sort(compare);
    return stops;
};

const splitToPatterns = (min, max, tok, options) => {
    const ranges = splitToRanges(min, max);
    const len = ranges.length;
    let idx = -1;

    const tokens = [];
    let start = min;
    let prev;

    while (++idx < len) {
        const range = ranges[idx];
        const obj = rangeToPattern(start, range, options);
        let zeros = "";

        if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
            if (prev.digits.length > 1) {
                prev.digits.pop();
            }
            prev.digits.push(obj.digits[0]);
            prev.string = prev.pattern + toQuantifier(prev.digits);
            start = range + 1;
            continue;
        }

        if (tok.isPadded) {
            zeros = padZeros(range, tok);
        }

        obj.string = zeros + obj.pattern + toQuantifier(obj.digits);
        tokens.push(obj);
        start = range + 1;
        prev = obj;
    }

    return tokens;
};

const padding = (str) => /^-?(0+)\d/.exec(str);

export default function toRegexRange(min, max, options) {
    if (!is.numeral(min)) {
        throw new RangeError("toRegexRange: first argument is invalid.");
    }

    if (is.undefined(max) || min === max) {
        return String(min);
    }

    if (!is.numeral(max)) {
        throw new RangeError("toRegexRange: second argument is invalid.");
    }

    options = options || {};
    const relax = String(options.relaxZeros);
    const shorthand = String(options.shorthand);
    const capture = String(options.capture);
    const key = `${min}:${max}=${relax}${shorthand}${capture}`;
    if (cache.hasOwnProperty(key)) {
        return cache[key].result;
    }

    let a = Math.min(min, max);
    const b = Math.max(min, max);

    if (Math.abs(a - b) === 1) {
        const result = `${min}|${max}`;
        if (options.capture) {
            return `(${result})`;
        }
        return result;
    }

    const isPadded = padding(min) || padding(max);
    let positives = [];
    let negatives = [];

    const tok = { min, max, a, b };
    if (isPadded) {
        tok.isPadded = isPadded;
        tok.maxLen = String(tok.max).length;
    }

    if (a < 0) {
        const newMin = b < 0 ? Math.abs(b) : 1;
        const newMax = Math.abs(a);
        negatives = splitToPatterns(newMin, newMax, tok, options);
        a = tok.a = 0;
    }

    if (b >= 0) {
        positives = splitToPatterns(a, b, tok, options);
    }

    tok.negatives = negatives;
    tok.positives = positives;
    tok.result = siftPatterns(negatives, positives, options);

    if (options.capture && (positives.length + negatives.length) > 1) {
        tok.result = `(${tok.result})`;
    }

    cache[key] = tok;
    return tok.result;
}
