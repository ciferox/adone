const {
    is
} = adone;

const isNumber = (num) => {
    if (is.number(num)) {
        return num - num === 0;
    }
    if (is.string(num) && num.trim() !== "") {
        return is.finite ? is.finite(Number(num)) : isFinite(Number(num));
    }
    return false;
};

const toRegexRange = (min, max, options) => {
    if (isNumber(min) === false) {
        throw new TypeError("toRegexRange: expected the first argument to be a number");
    }

    if (max === void 0 || min === max) {
        return String(min);
    }

    if (isNumber(max) === false) {
        throw new TypeError("toRegexRange: expected the second argument to be a number.");
    }

    const opts = { relaxZeros: true, ...options };
    if (is.boolean(opts.strictZeros)) {
        opts.relaxZeros = opts.strictZeros === false;
    }

    const relax = String(opts.relaxZeros);
    const shorthand = String(opts.shorthand);
    const capture = String(opts.capture);
    const wrap = String(opts.wrap);
    const cacheKey = `${min}:${max}=${relax}${shorthand}${capture}${wrap}`;

    if (toRegexRange.cache.hasOwnProperty(cacheKey)) {
        return toRegexRange.cache[cacheKey].result;
    }

    let a = Math.min(min, max);
    const b = Math.max(min, max);

    if (Math.abs(a - b) === 1) {
        const result = `${min}|${max}`;
        if (opts.capture) {
            return `(${result})`;
        }
        if (opts.wrap === false) {
            return result;
        }
        return `(?:${result})`;
    }

    const isPadded = hasPadding(min) || hasPadding(max);
    const state = { min, max, a, b };
    let positives = [];
    let negatives = [];

    if (isPadded) {
        state.isPadded = isPadded;
        state.maxLen = String(state.max).length;
    }

    if (a < 0) {
        const newMin = b < 0 ? Math.abs(b) : 1;
        negatives = splitToPatterns(newMin, Math.abs(a), state, opts);
        a = state.a = 0;
    }

    if (b >= 0) {
        positives = splitToPatterns(a, b, state, opts);
    }

    state.negatives = negatives;
    state.positives = positives;
    state.result = collatePatterns(negatives, positives, opts);

    if (opts.capture === true) {
        state.result = `(${state.result})`;
    } else if (opts.wrap !== false && (positives.length + negatives.length) > 1) {
        state.result = `(?:${state.result})`;
    }

    toRegexRange.cache[cacheKey] = state;
    return state.result;
};

function collatePatterns(neg, pos, options) {
    const onlyNegative = filterPatterns(neg, pos, "-", false, options) || [];
    const onlyPositive = filterPatterns(pos, neg, "", false, options) || [];
    const intersected = filterPatterns(neg, pos, "-?", true, options) || [];
    const subpatterns = onlyNegative.concat(intersected).concat(onlyPositive);
    return subpatterns.join("|");
}

function splitToRanges(min, max) {
    let nines = 1;
    let zeros = 1;

    let stop = countNines(min, nines);
    let stops = new Set([max]);

    while (min <= stop && stop <= max) {
        stops.add(stop);
        nines += 1;
        stop = countNines(min, nines);
    }

    stop = countZeros(max + 1, zeros) - 1;

    while (min < stop && stop <= max) {
        stops.add(stop);
        zeros += 1;
        stop = countZeros(max + 1, zeros) - 1;
    }

    stops = [...stops];
    stops.sort(compare);
    return stops;
}

/**
 * Convert a range to a regex pattern
 * @param {Number} `start`
 * @param {Number} `stop`
 * @return {String}
 */

function rangeToPattern(start, stop, options) {
    if (start === stop) {
        return { pattern: start, count: [], digits: 0 };
    }

    const zipped = zip(start, stop);
    const digits = zipped.length;
    let pattern = "";
    let count = 0;

    for (let i = 0; i < digits; i++) {
        const [startDigit, stopDigit] = zipped[i];

        if (startDigit === stopDigit) {
            pattern += startDigit;

        } else if (startDigit !== "0" || stopDigit !== "9") {
            pattern += toCharacterClass(startDigit, stopDigit, options);

        } else {
            count++;
        }
    }

    if (count) {
        pattern += options.shorthand === true ? "\\d" : "[0-9]";
    }

    return { pattern, count: [count], digits };
}

function splitToPatterns(min, max, tok, options) {
    const ranges = splitToRanges(min, max);
    const tokens = [];
    let start = min;
    let prev;

    for (let i = 0; i < ranges.length; i++) {
        const max = ranges[i];
        const obj = rangeToPattern(String(start), String(max), options);
        let zeros = "";

        if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
            if (prev.count.length > 1) {
                prev.count.pop();
            }

            prev.count.push(obj.count[0]);
            prev.string = prev.pattern + toQuantifier(prev.count);
            start = max + 1;
            continue;
        }

        if (tok.isPadded) {
            zeros = padZeros(max, tok, options);
        }

        obj.string = zeros + obj.pattern + toQuantifier(obj.count);
        tokens.push(obj);
        start = max + 1;
        prev = obj;
    }

    return tokens;
}

function filterPatterns(arr, comparison, prefix, intersection, options) {
    const result = [];

    for (const ele of arr) {
        const { string } = ele;

        // only push if _both_ are negative...
        if (!intersection && !contains(comparison, "string", string)) {
            result.push(prefix + string);
        }

        // or _both_ are positive
        if (intersection && contains(comparison, "string", string)) {
            result.push(prefix + string);
        }
    }
    return result;
}

/**
 * Zip strings
 */

function zip(a, b) {
    const arr = [];
    for (let i = 0; i < a.length; i++) {
        arr.push([a[i], b[i]]);
    }
    return arr;
}

function compare(a, b) {
    return a > b ? 1 : b > a ? -1 : 0;
}

function contains(arr, key, val) {
    return arr.some((ele) => ele[key] === val);
}

function countNines(min, len) {
    return Number(String(min).slice(0, -len) + "9".repeat(len));
}

function countZeros(integer, zeros) {
    return integer - (integer % Math.pow(10, zeros));
}

function toQuantifier(digits) {
    const [start = 0, stop = ""] = digits;
    if (stop || start > 1) {
        return `{${start + (stop ? `,${stop}` : "")}}`;
    }
    return "";
}

function toCharacterClass(a, b, options) {
    return `[${a}${(b - a === 1) ? "" : "-"}${b}]`;
}

function hasPadding(str) {
    return /^-?(0+)\d/.test(str);
}

function padZeros(value, tok, options) {
    if (!tok.isPadded) {
        return value;
    }

    const diff = Math.abs(tok.maxLen - String(value).length);
    const relax = options.relaxZeros !== false;

    switch (diff) {
        case 0:
            return "";
        case 1:
            return relax ? "0?" : "0";
        case 2:
            return relax ? "0{0,2}" : "00";
        default: {
            return relax ? `0{0,${diff}}` : `0{${diff}}`;
        }
    }
}

/**
 * Cache
 */

toRegexRange.cache = {};
toRegexRange.clearCache = () => (toRegexRange.cache = {});

/**
 * Expose `toRegexRange`
 */

module.exports = toRegexRange;
