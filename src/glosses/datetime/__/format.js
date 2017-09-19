const { is } = adone;

export const formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

const localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

const formatFunctions = {};

export const formatTokenFunctions = {};

const zeroFill = (number, targetLength, forceSign) => {
    if (number >= 0) {
        const sign = forceSign ? "+" : "";
        return sign + String(number).padStart(targetLength, "0");
    } else if (number < 0) {
        return `-${String(Math.abs(number)).padStart(targetLength, "0")}`;
    }
};

// token:    'M'
// padded:   ['MM', 2]
// ordinal:  'Mo'
// callback: function () { this.month() + 1 }
export const addFormatToken = (token, padded, ordinal, callback) => {
    let func = callback;
    if (is.string(callback)) {
        func = function () {
            return this[callback]();
        };
    }
    if (token) {
        formatTokenFunctions[token] = func;
    }
    if (padded) {
        formatTokenFunctions[padded[0]] = function (...args) {
            return zeroFill(func.apply(this, args), padded[1], padded[2]);
        };
    }
    if (ordinal) {
        formatTokenFunctions[ordinal] = function (...args) {
            return this.localeData().ordinal(func.apply(this, args), token);
        };
    }
};

const removeFormattingTokens = (input) => {
    if (input.match(/\[[\s\S]/)) {
        return input.replace(/^\[|\]$/g, "");
    }
    return input.replace(/\\/g, "");
};

const makeFormatFunction = (format) => {
    const array = format.match(formattingTokens);

    for (let i = 0; i < array.length; i++) {
        if (formatTokenFunctions[array[i]]) {
            array[i] = formatTokenFunctions[array[i]];
        } else {
            array[i] = removeFormattingTokens(array[i]);
        }
    }

    return function (mom) {
        let output = "";
        for (let i = 0; i < array.length; i++) {
            output += is.function(array[i]) ? array[i].call(mom, format) : array[i];
        }
        return output;
    };
};

export const expandFormat = (format, locale) => {
    let i = 5;

    const replaceLongDateFormatTokens = (input) => {
        return locale.longDateFormat(input) || input;
    };

    localFormattingTokens.lastIndex = 0;
    while (i >= 0 && localFormattingTokens.test(format)) {
        format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
        localFormattingTokens.lastIndex = 0;
        i -= 1;
    }

    return format;
};

// format date using native date object
export const formatExDate = (m, format) => {
    if (!m.isValid()) {
        return m.localeData().invalidDate();
    }

    format = expandFormat(format, m.localeData());
    formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

    return formatFunctions[format](m);
};
