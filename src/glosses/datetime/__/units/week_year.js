const { is } = adone;
const __ = adone.getPrivate(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        match1to2,
        match1to4,
        match1to6,
        match2,
        match4,
        match6,
        matchSigned,
        addWeekParseToken
    },
    unit: {
        alias: { addUnitAlias },
        priority: { addUnitPriority },
    },
    util: {
        hooks,
        toInt
    }
} = __;

// FORMATTING

addFormatToken(0, ["gg", 2], 0, function () {
    return this.weekYear() % 100;
});

addFormatToken(0, ["GG", 2], 0, function () {
    return this.isoWeekYear() % 100;
});

const addWeekYearFormatToken = (token, getter) => {
    addFormatToken(0, [token, token.length], 0, getter);
};

addWeekYearFormatToken("gggg", "weekYear");
addWeekYearFormatToken("ggggg", "weekYear");
addWeekYearFormatToken("GGGG", "isoWeekYear");
addWeekYearFormatToken("GGGGG", "isoWeekYear");

// ALIASES

addUnitAlias("weekYear", "gg");
addUnitAlias("isoWeekYear", "GG");

// PRIORITY

addUnitPriority("weekYear", 1);
addUnitPriority("isoWeekYear", 1);


// PARSING

addRegexToken("G", matchSigned);
addRegexToken("g", matchSigned);
addRegexToken("GG", match1to2, match2);
addRegexToken("gg", match1to2, match2);
addRegexToken("GGGG", match1to4, match4);
addRegexToken("gggg", match1to4, match4);
addRegexToken("GGGGG", match1to6, match6);
addRegexToken("ggggg", match1to6, match6);

addWeekParseToken(["gggg", "ggggg", "GGGG", "GGGGG"], (input, week, config, token) => {
    week[token.substr(0, 2)] = toInt(input);
});

addWeekParseToken(["gg", "GG"], (input, week, config, token) => {
    week[token] = hooks.parseTwoDigitYear(input);
});

const setWeekAll = function (weekYear, week, weekday, dow, doy) {
    const dayOfYearData = __.unit.weekCalendar.dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
    const date = __.create.createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

    this.year(date.getUTCFullYear());
    this.month(date.getUTCMonth());
    this.date(date.getUTCDate());
    return this;
};


export const getSetWeekYearHelper = function (input, week, weekday, dow, doy) {
    if (is.nil(input)) {
        return __.unit.weekCalendar.weekOfYear(this, dow, doy).year;
    }
    const weeksTarget = __.unit.weekCalendar.weeksInYear(input, dow, doy);
    if (week > weeksTarget) {
        week = weeksTarget;
    }
    return setWeekAll.call(this, input, week, weekday, dow, doy);

};
