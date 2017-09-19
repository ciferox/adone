const { is } = adone;
const __ = adone.private(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        match1to2,
        matchWord,
        regexEscape,
        addWeekParseToken
    },
    unit: {
        alias: { addUnitAlias },
        priority: { addUnitPriority }
    }
} = __;

// FORMATTING

addFormatToken("d", 0, "do", "day");

addFormatToken("dd", 0, 0, function (format) {
    return this.localeData().weekdaysMin(this, format);
});

addFormatToken("ddd", 0, 0, function (format) {
    return this.localeData().weekdaysShort(this, format);
});

addFormatToken("dddd", 0, 0, function (format) {
    return this.localeData().weekdays(this, format);
});

addFormatToken("e", 0, 0, "weekday");
addFormatToken("E", 0, 0, "isoWeekday");

// ALIASES

addUnitAlias("day", "d");
addUnitAlias("weekday", "e");
addUnitAlias("isoWeekday", "E");

// PRIORITY
addUnitPriority("day", 11);
addUnitPriority("weekday", 11);
addUnitPriority("isoWeekday", 11);

// PARSING

addRegexToken("d", match1to2);
addRegexToken("e", match1to2);
addRegexToken("E", match1to2);
addRegexToken("dd", (isStrict, locale) => {
    return locale.weekdaysMinRegex(isStrict);
});
addRegexToken("ddd", (isStrict, locale) => {
    return locale.weekdaysShortRegex(isStrict);
});
addRegexToken("dddd", (isStrict, locale) => {
    return locale.weekdaysRegex(isStrict);
});

addWeekParseToken(["dd", "ddd", "dddd"], (input, week, config, token) => {
    const weekday = config._locale.weekdaysParse(input, token, config._strict);
    // if we didn't get a weekday name, mark the date as invalid
    if (is.exist(weekday)) {
        week.d = weekday;
    } else {
        __.create.getParsingFlags(config).invalidWeekday = input;
    }
});

addWeekParseToken(["d", "e", "E"], (input, week, config, token) => {
    week[token] = __.util.toInt(input);
});

// LOCALES

export const defaultLocaleWeekdays = "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_");
export const localeWeekdays = function (m, format) {
    if (!m) {
        return is.array(this._weekdays) ? this._weekdays : this._weekdays.standalone;
    }
    return is.array(this._weekdays)
        ? this._weekdays[m.day()]
        : this._weekdays[this._weekdays.isFormat.test(format) ? "format" : "standalone"][m.day()];
};

export const defaultLocaleWeekdaysShort = "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_");
export const localeWeekdaysShort = function (m) {
    return (m) ? this._weekdaysShort[m.day()] : this._weekdaysShort;
};

export const defaultLocaleWeekdaysMin = "Su_Mo_Tu_We_Th_Fr_Sa".split("_");
export const localeWeekdaysMin = function (m) {
    return (m) ? this._weekdaysMin[m.day()] : this._weekdaysMin;
};

const handleStrictParse = function (weekdayName, format, strict) {
    if (!this._weekdaysParse) {
        this._weekdaysParse = [];
        this._shortWeekdaysParse = [];
        this._minWeekdaysParse = [];

        for (let i = 0; i < 7; ++i) {
            const mom = __.create.createUTC([2000, 1]).day(i);
            this._minWeekdaysParse[i] = this.weekdaysMin(mom, "").toLocaleLowerCase();
            this._shortWeekdaysParse[i] = this.weekdaysShort(mom, "").toLocaleLowerCase();
            this._weekdaysParse[i] = this.weekdays(mom, "").toLocaleLowerCase();
        }
    }

    const llc = weekdayName.toLocaleLowerCase();
    let ii;

    if (strict) {
        if (format === "dddd") {
            ii = this._weekdaysParse.indexOf(llc);
            return ii !== -1 ? ii : null;
        } else if (format === "ddd") {
            ii = this._shortWeekdaysParse.indexOf(llc);
            return ii !== -1 ? ii : null;
        }
        ii = this._minWeekdaysParse.indexOf(llc);
        return ii !== -1 ? ii : null;

    }
    if (format === "dddd") {
        ii = this._weekdaysParse.indexOf(llc);
        if (ii !== -1) {
            return ii;
        }
        ii = this._shortWeekdaysParse.indexOf(llc);
        if (ii !== -1) {
            return ii;
        }
        ii = this._minWeekdaysParse.indexOf(llc);
        return ii !== -1 ? ii : null;
    } else if (format === "ddd") {
        ii = this._shortWeekdaysParse.indexOf(llc);
        if (ii !== -1) {
            return ii;
        }
        ii = this._weekdaysParse.indexOf(llc);
        if (ii !== -1) {
            return ii;
        }
        ii = this._minWeekdaysParse.indexOf(llc);
        return ii !== -1 ? ii : null;
    }
    ii = this._minWeekdaysParse.indexOf(llc);
    if (ii !== -1) {
        return ii;
    }
    ii = this._weekdaysParse.indexOf(llc);
    if (ii !== -1) {
        return ii;
    }
    ii = this._shortWeekdaysParse.indexOf(llc);
    return ii !== -1 ? ii : null;


};

export const localeWeekdaysParse = function (weekdayName, format, strict) {
    if (this._weekdaysParseExact) {
        return handleStrictParse.call(this, weekdayName, format, strict);
    }

    if (!this._weekdaysParse) {
        this._weekdaysParse = [];
        this._minWeekdaysParse = [];
        this._shortWeekdaysParse = [];
        this._fullWeekdaysParse = [];
    }

    for (let i = 0; i < 7; i++) {
        // make the regex if we don't have it already

        const mom = __.create.createUTC([2000, 1]).day(i);
        if (strict && !this._fullWeekdaysParse[i]) {
            this._fullWeekdaysParse[i] = new RegExp(`^${this.weekdays(mom, "").replace(".", ".?")}$`, "i");
            this._shortWeekdaysParse[i] = new RegExp(`^${this.weekdaysShort(mom, "").replace(".", ".?")}$`, "i");
            this._minWeekdaysParse[i] = new RegExp(`^${this.weekdaysMin(mom, "").replace(".", ".?")}$`, "i");
        }
        if (!this._weekdaysParse[i]) {
            const regex = `^${this.weekdays(mom, "")}|^${this.weekdaysShort(mom, "")}|^${this.weekdaysMin(mom, "")}`;
            this._weekdaysParse[i] = new RegExp(regex.replace(".", ""), "i");
        }
        // test the regex
        if (strict && format === "dddd" && this._fullWeekdaysParse[i].test(weekdayName)) {
            return i;
        } else if (strict && format === "ddd" && this._shortWeekdaysParse[i].test(weekdayName)) {
            return i;
        } else if (strict && format === "dd" && this._minWeekdaysParse[i].test(weekdayName)) {
            return i;
        } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
            return i;
        }
    }
};


const computeWeekdaysParse = function () {
    const cmpLenRev = (a, b) => b.length - a.length;

    const minPieces = [];
    const shortPieces = [];
    const longPieces = [];
    const mixedPieces = [];

    for (let i = 0; i < 7; i++) {
        // make the regex if we don't have it already
        const mom = __.create.createUTC([2000, 1]).day(i);
        const minp = this.weekdaysMin(mom, "");
        const shortp = this.weekdaysShort(mom, "");
        const longp = this.weekdays(mom, "");
        minPieces.push(minp);
        shortPieces.push(shortp);
        longPieces.push(longp);
        mixedPieces.push(minp);
        mixedPieces.push(shortp);
        mixedPieces.push(longp);
    }
    // Sorting makes sure if one weekday (or abbr) is a prefix of another it
    // will match the longer piece.
    minPieces.sort(cmpLenRev);
    shortPieces.sort(cmpLenRev);
    longPieces.sort(cmpLenRev);
    mixedPieces.sort(cmpLenRev);
    for (let i = 0; i < 7; i++) {
        shortPieces[i] = regexEscape(shortPieces[i]);
        longPieces[i] = regexEscape(longPieces[i]);
        mixedPieces[i] = regexEscape(mixedPieces[i]);
    }

    this._weekdaysRegex = new RegExp(`^(${mixedPieces.join("|")})`, "i");
    this._weekdaysShortRegex = this._weekdaysRegex;
    this._weekdaysMinRegex = this._weekdaysRegex;

    this._weekdaysStrictRegex = new RegExp(`^(${longPieces.join("|")})`, "i");
    this._weekdaysShortStrictRegex = new RegExp(`^(${shortPieces.join("|")})`, "i");
    this._weekdaysMinStrictRegex = new RegExp(`^(${minPieces.join("|")})`, "i");
};


const defaultWeekdaysRegex = matchWord;
export const weekdaysRegex = function (isStrict) {
    if (this._weekdaysParseExact) {
        if (!is.propertyOwned(this, "_weekdaysRegex")) {
            computeWeekdaysParse.call(this);
        }
        if (isStrict) {
            return this._weekdaysStrictRegex;
        }
        return this._weekdaysRegex;

    }
    if (!is.propertyOwned(this, "_weekdaysRegex")) {
        this._weekdaysRegex = defaultWeekdaysRegex;
    }
    return this._weekdaysStrictRegex && isStrict ?
        this._weekdaysStrictRegex : this._weekdaysRegex;

};

const defaultWeekdaysShortRegex = matchWord;
export const weekdaysShortRegex = function (isStrict) {
    if (this._weekdaysParseExact) {
        if (!is.propertyOwned(this, "_weekdaysRegex")) {
            computeWeekdaysParse.call(this);
        }
        if (isStrict) {
            return this._weekdaysShortStrictRegex;
        }
        return this._weekdaysShortRegex;

    }
    if (!is.propertyOwned(this, "_weekdaysShortRegex")) {
        this._weekdaysShortRegex = defaultWeekdaysShortRegex;
    }
    return this._weekdaysShortStrictRegex && isStrict ?
        this._weekdaysShortStrictRegex : this._weekdaysShortRegex;

};

const defaultWeekdaysMinRegex = matchWord;
export const weekdaysMinRegex = function (isStrict) {
    if (this._weekdaysParseExact) {
        if (!is.propertyOwned(this, "_weekdaysRegex")) {
            computeWeekdaysParse.call(this);
        }
        if (isStrict) {
            return this._weekdaysMinStrictRegex;
        }
        return this._weekdaysMinRegex;

    }
    if (!is.propertyOwned(this, "_weekdaysMinRegex")) {
        this._weekdaysMinRegex = defaultWeekdaysMinRegex;
    }
    return this._weekdaysMinStrictRegex && isStrict ?
        this._weekdaysMinStrictRegex : this._weekdaysMinRegex;

};
