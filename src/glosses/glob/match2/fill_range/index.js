const {
    is,
    glob: { match: { toRegexRange } },
    std: { util }
} = adone;

const isObject = (val) => !is.null(val) && typeof val === "object" && !is.array(val);

const transform = (toNumber) => {
    return (value) => toNumber === true ? Number(value) : String(value);
};

const isValidValue = (value) => {
    return is.number(value) || (is.string(value) && value !== "");
};

const isNumber = (num) => is.integer(Number(num));

const zeros = (input) => {
    let value = `${input}`;
    let index = -1;
    if (value[0] === "-") {
        value = value.slice(1);
    }
    if (value === "0") {
        return false;
    }
    while (value[++index] === "0") { }
    return index > 0;
};

const stringify = (start, end, options) => {
    if (is.string(start) || is.string(end)) {
        return true;
    }
    return options.stringify === true;
};

const pad = (input, maxLength, toNumber) => {
    if (maxLength > 0) {
        const dash = input[0] === "-" ? "-" : "";
        if (dash) {
            input = input.slice(1);
        }
        input = (dash + input.padStart(dash ? maxLength - 1 : maxLength, "0"));
    }
    if (toNumber === false) {
        return String(input);
    }
    return input;
};

const toMaxLen = (input, maxLength) => {
    const negative = input[0] === "-" ? "-" : "";
    if (negative) {
        input = input.slice(1);
        maxLength--;
    }
    while (input.length < maxLength) {
        input = `0${input}`;
    }
    return negative ? (`-${input}`) : input;
};

const toSequence = (parts, options) => {
    parts.negatives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    parts.positives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

    const prefix = options.capture ? "" : "?:";
    let positives = "";
    let negatives = "";
    let result;

    if (parts.positives.length) {
        positives = parts.positives.join("|");
    }

    if (parts.negatives.length) {
        negatives = `-(${prefix}${parts.negatives.join("|")})`;
    }

    if (positives && negatives) {
        result = `${positives}|${negatives}`;
    } else {
        result = positives || negatives;
    }

    if (options.wrap) {
        return `(${prefix}${result})`;
    }

    return result;
};

const toRange = (a, b, isNumbers, options) => {
    if (isNumbers) {
        return toRegexRange(a, b, { wrap: false, ...options });
    }

    const start = String.fromCharCode(a);
    if (a === b) {
        return start;
    }

    const stop = String.fromCharCode(b);
    return `[${start}-${stop}]`;
};

const toRegex = (start, end, options) => {
    if (is.array(start)) {
        const wrap = options.wrap === true;
        const prefix = options.capture ? "" : "?:";
        return wrap ? `(${prefix}${start.join("|")})` : start.join("|");
    }
    return toRegexRange(start, end, options);
};

const rangeError = (...args) => {
    return new RangeError(`Invalid range arguments: ${util.inspect(...args)}`);
};

const invalidRange = (start, end, options) => {
    if (options.strictRanges === true) {
        throw rangeError([start, end]);
    }
    return [];
};

const invalidStep = (step, options) => {
    if (options.strictRanges === true) {
        throw new TypeError(`Expected step "${step}" to be a number`);
    }
    return [];
};

const fillNumbers = (start, end, step = 1, options = {}) => {
    let a = Number(start);
    let b = Number(end);

    if (!is.integer(a) || !is.integer(b)) {
        if (options.strictRanges === true) {
            throw rangeError([start, end]);
        }
        return [];
    }

    // fix negative zero
    if (a === 0) {
        a = 0;
    }
    if (b === 0) {
        b = 0;
    }

    const descending = a > b;
    const startString = String(start);
    const endString = String(end);
    const stepString = String(step);
    step = Math.max(Math.abs(step), 1);

    const padded = zeros(startString) || zeros(endString) || zeros(stepString);
    const maxLen = padded ? Math.max(startString.length, endString.length, stepString.length) : 0;
    const toNumber = padded === false && stringify(start, end, options) === false;
    const format = options.transform || transform(toNumber);

    if (options.toRegex && step === 1) {
        return toRange(toMaxLen(start, maxLen), toMaxLen(end, maxLen), true, options);
    }

    const parts = { negatives: [], positives: [] };
    const push = (num) => parts[num < 0 ? "negatives" : "positives"].push(Math.abs(num));
    const range = [];
    let index = 0;

    while (descending ? a >= b : a <= b) {
        if (options.toRegex === true && step > 1) {
            push(a);
        } else {
            range.push(pad(format(a, index), maxLen, toNumber));
        }
        a = descending ? a - step : a + step;
        index++;
    }

    if (options.toRegex === true) {
        return step > 1
            ? toSequence(parts, options)
            : toRegex(range, null, { wrap: false, ...options });
    }

    return range;
};

const fillLetters = (start, end, step = 1, options = {}) => {
    if ((!isNumber(start) && start.length > 1) || (!isNumber(end) && end.length > 1)) {
        return invalidRange(start, end, options);
    }


    const format = options.transform || ((val) => String.fromCharCode(val));
    let a = `${start}`.charCodeAt(0);
    const b = `${end}`.charCodeAt(0);

    const descending = a > b;
    const min = Math.min(a, b);
    const max = Math.max(a, b);

    if (options.toRegex && step === 1) {
        return toRange(min, max, false, options);
    }

    const range = [];
    let index = 0;

    while (descending ? a >= b : a <= b) {
        range.push(format(a, index));
        a = descending ? a - step : a + step;
        index++;
    }

    if (options.toRegex === true) {
        return toRegex(range, null, { wrap: false, options });
    }

    return range;
};

const fill = (start, end, step, options = {}) => {
    if (is.nil(end) && isValidValue(start)) {
        return [start];
    }

    if (!isValidValue(start) || !isValidValue(end)) {
        return invalidRange(start, end, options);
    }

    if (is.function(step)) {
        return fill(start, end, 1, { transform: step });
    }

    if (isObject(step)) {
        return fill(start, end, 0, step);
    }

    const opts = { ...options };
    if (opts.capture === true) {
        opts.wrap = true;
    }
    step = step || opts.step || 1;

    if (!isNumber(step)) {
        if (!is.nil(step) && !isObject(step)) {
            return invalidStep(step, opts);
        }
        return fill(start, end, 1, step);
    }

    if (isNumber(start) && isNumber(end)) {
        return fillNumbers(start, end, step, opts);
    }

    return fillLetters(start, end, Math.max(Math.abs(step), 1), opts);
};

module.exports = fill;
