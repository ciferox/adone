const { is } = adone;
const __ = adone.private(adone.datetime);

const { hooks } = __.util;

// constant that refers to the ISO standard
hooks.ISO_8601 = function () {};

// constant that refers to the RFC 2822 form
hooks.RFC_2822 = function () {};

const meridiemFixWrap = (locale, hour, meridiem) => {
    let isPm;

    if (is.nil(meridiem)) {
        // nothing to do
        return hour;
    }
    if (is.exist(locale.meridiemHour)) {
        return locale.meridiemHour(hour, meridiem);
    } else if (is.exist(locale.isPM)) {
        // Fallback
        isPm = locale.isPM(meridiem);
        if (isPm && hour < 12) {
            hour += 12;
        }
        if (!isPm && hour === 12) {
            hour = 0;
        }
        return hour;
    }
    // this is not supposed to happen
    return hour;

};

// date from string and format string
export const configFromStringAndFormat = (config) => {
    // TODO: Move this to another part of the creation flow to prevent circular deps
    if (config._f === hooks.ISO_8601) {
        __.create.configFromISO(config);
        return;
    }
    if (config._f === hooks.RFC_2822) {
        __.create.configFromRFC2822(config);
        return;
    }

    const { getParsingFlags } = __.create;

    config._a = [];
    getParsingFlags(config).empty = true;

    // This array is used to make a Date, either with `new Date` or `Date.UTC`
    let string = `${config._i}`;

    const stringLength = string.length;
    const tokens = __.format.expandFormat(config._f, config._locale).match(__.format.formattingTokens) || [];
    let totalParsedInputLength = 0;

    for (const token of tokens) {
        const parsedInput = (string.match(__.parse.getParseRegexForToken(token, config)) || [])[0];
        // console.log('token', token, 'parsedInput', parsedInput,
        //         'regex', getParseRegexForToken(token, config));
        if (parsedInput) {
            const skipped = string.substr(0, string.indexOf(parsedInput));
            if (skipped.length > 0) {
                getParsingFlags(config).unusedInput.push(skipped);
            }
            string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
            totalParsedInputLength += parsedInput.length;
        }
        // don't parse if it's not a known token
        if (__.format.formatTokenFunctions[token]) {
            if (parsedInput) {
                getParsingFlags(config).empty = false;
            } else {
                getParsingFlags(config).unusedTokens.push(token);
            }
            __.parse.addTimeToArrayFromToken(token, parsedInput, config);
        } else if (config._strict && !parsedInput) {
            getParsingFlags(config).unusedTokens.push(token);
        }
    }

    // add remaining unparsed input length to the string
    getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
    if (string.length > 0) {
        getParsingFlags(config).unusedInput.push(string);
    }

    const { HOUR } = __.unit.c;

    // clear _12h flag if hour is <= 12
    if (config._a[HOUR] <= 12 &&
        getParsingFlags(config).bigHour === true &&
        config._a[HOUR] > 0) {
        getParsingFlags(config).bigHour = undefined;
    }

    getParsingFlags(config).parsedDateParts = config._a.slice(0);
    getParsingFlags(config).meridiem = config._meridiem;
    // handle meridiem
    config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

    __.create.configFromArray(config);
    __.create.checkOverflow(config);
};
