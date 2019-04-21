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
        addParseToken
    },
    unit: {
        alias: { addUnitAlias },
        priority: { addUnitPriority },
        c: { YEAR }
    },
    util: {
        hooks,
        toInt
    }
} = __;

// FORMATTING

addFormatToken("Y", 0, 0, function () {
    const y = this.year();
    return y <= 9999 ? `${y}` : `+${y}`;
});

addFormatToken(0, ["YY", 2], 0, function () {
    return this.year() % 100;
});

addFormatToken(0, ["YYYY", 4], 0, "year");
addFormatToken(0, ["YYYYY", 5], 0, "year");
addFormatToken(0, ["YYYYYY", 6, true], 0, "year");

// ALIASES

addUnitAlias("year", "y");

// PRIORITIES

addUnitPriority("year", 1);

// PARSING

addRegexToken("Y", matchSigned);
addRegexToken("YY", match1to2, match2);
addRegexToken("YYYY", match1to4, match4);
addRegexToken("YYYYY", match1to6, match6);
addRegexToken("YYYYYY", match1to6, match6);

addParseToken(["YYYYY", "YYYYYY"], YEAR);
addParseToken("YYYY", (input, array) => {
    array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
});
addParseToken("YY", (input, array) => {
    array[YEAR] = hooks.parseTwoDigitYear(input);
});
addParseToken("Y", (input, array) => {
    array[YEAR] = parseInt(input, 10);
});

// HELPERS

export const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export const daysInYear = (year) => isLeapYear(year) ? 366 : 365;

// HOOKS

hooks.parseTwoDigitYear = (input) => toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
