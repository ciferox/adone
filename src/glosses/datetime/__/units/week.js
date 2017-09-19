const __ = adone.private(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        match1to2,
        match2,
        addWeekParseToken
    },
    unit: {
        alias: { addUnitAlias },
        priority: { addUnitPriority },
    }
} = __;


// FORMATTING

addFormatToken("w", ["ww", 2], "wo", "week");
addFormatToken("W", ["WW", 2], "Wo", "isoWeek");

// ALIASES

addUnitAlias("week", "w");
addUnitAlias("isoWeek", "W");

// PRIORITIES

addUnitPriority("week", 5);
addUnitPriority("isoWeek", 5);

// PARSING

addRegexToken("w", match1to2);
addRegexToken("ww", match1to2, match2);
addRegexToken("W", match1to2);
addRegexToken("WW", match1to2, match2);

addWeekParseToken(["w", "ww", "W", "WW"], (input, week, config, token) => {
    week[token.substr(0, 1)] = __.util.toInt(input);
});

// LOCALES

export const localeWeek = function (mom) {
    return __.unit.weekCalendar.weekOfYear(mom, this._week.dow, this._week.doy).week;
};

export const defaultLocaleWeek = {
    dow: 0, // Sunday is the first day of the week.
    doy: 6 // The week that contains Jan 1st is the first week of the year.
};

export const localeFirstDayOfWeek = function () {
    return this._week.dow;
};

export const localeFirstDayOfYear = function () {
    return this._week.doy;
};
