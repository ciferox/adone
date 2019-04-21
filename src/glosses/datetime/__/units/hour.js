const __ = adone.getPrivate(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        match1to2,
        match2,
        match3to4,
        match5to6,
        addParseToken
    },
    unit: {
        alias: { addUnitAlias },
        priority: { addUnitPriority },
        c: {
            HOUR,
            MINUTE,
            SECOND
        }
    }
} = __;

// FORMATTING

const hFormat = function () {
    return this.hours() % 12 || 12;
};

const kFormat = function () {
    return this.hours() || 24;
};

addFormatToken("H", ["HH", 2], 0, "hour");
addFormatToken("h", ["hh", 2], 0, hFormat);
addFormatToken("k", ["kk", 2], 0, kFormat);

addFormatToken("hmm", 0, 0, function () {
    return String(hFormat.apply(this)) + String(this.minutes()).padStart(2, "0");
});

addFormatToken("hmmss", 0, 0, function () {
    return String(hFormat.apply(this)) + String(this.minutes()).padStart(2, "0") + String(this.seconds()).padStart(2, "0");
});

addFormatToken("Hmm", 0, 0, function () {
    return String(this.hours()) + String(this.minutes()).padStart(2, "0");
});

addFormatToken("Hmmss", 0, 0, function () {
    return String(this.hours()) + String(this.minutes()).padStart(2, "0") + String(this.seconds()).padStart(2, "0");
});

const meridiem = (token, lowercase) => {
    addFormatToken(token, 0, 0, function () {
        return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
    });
};

meridiem("a", true);
meridiem("A", false);

// ALIASES

addUnitAlias("hour", "h");

// PRIORITY
addUnitPriority("hour", 13);

// PARSING

const matchMeridiem = (isStrict, locale) => locale._meridiemParse;

addRegexToken("a", matchMeridiem);
addRegexToken("A", matchMeridiem);
addRegexToken("H", match1to2);
addRegexToken("h", match1to2);
addRegexToken("k", match1to2);
addRegexToken("HH", match1to2, match2);
addRegexToken("hh", match1to2, match2);
addRegexToken("kk", match1to2, match2);

addRegexToken("hmm", match3to4);
addRegexToken("hmmss", match5to6);
addRegexToken("Hmm", match3to4);
addRegexToken("Hmmss", match5to6);

addParseToken(["H", "HH"], HOUR);
addParseToken(["k", "kk"], (input, array) => {
    const kInput = __.util.toInt(input);
    array[HOUR] = kInput === 24 ? 0 : kInput;
});
addParseToken(["a", "A"], (input, array, config) => {
    config._isPm = config._locale.isPM(input);
    config._meridiem = input;
});
addParseToken(["h", "hh"], (input, array, config) => {
    array[HOUR] = __.util.toInt(input);
    __.create.getParsingFlags(config).bigHour = true;
});
addParseToken("hmm", (input, array, config) => {
    const pos = input.length - 2;
    array[HOUR] = __.util.toInt(input.substr(0, pos));
    array[MINUTE] = __.util.toInt(input.substr(pos));
    __.create.getParsingFlags(config).bigHour = true;
});
addParseToken("hmmss", (input, array, config) => {
    const pos1 = input.length - 4;
    const pos2 = input.length - 2;
    array[HOUR] = __.util.toInt(input.substr(0, pos1));
    array[MINUTE] = __.util.toInt(input.substr(pos1, 2));
    array[SECOND] = __.util.toInt(input.substr(pos2));
    __.create.getParsingFlags(config).bigHour = true;
});
addParseToken("Hmm", (input, array) => {
    const pos = input.length - 2;
    array[HOUR] = __.util.toInt(input.substr(0, pos));
    array[MINUTE] = __.util.toInt(input.substr(pos));
});
addParseToken("Hmmss", (input, array) => {
    const pos1 = input.length - 4;
    const pos2 = input.length - 2;
    array[HOUR] = __.util.toInt(input.substr(0, pos1));
    array[MINUTE] = __.util.toInt(input.substr(pos1, 2));
    array[SECOND] = __.util.toInt(input.substr(pos2));
});

// LOCALES

export const localeIsPM = (input) => {
    // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
    // Using charAt should be more compatible.
    return ((`${input}`).toLowerCase().charAt(0) === "p");
};

export const defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
export const localeMeridiem = (hours, minutes, isLower) => {
    if (hours > 11) {
        return isLower ? "pm" : "PM";
    }
    return isLower ? "am" : "AM";

};
