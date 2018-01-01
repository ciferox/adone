const __ = adone.private(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        match1to2,
        match2,
        addParseToken
    },
    unit: {
        alias: { addUnitAlias },
        priority: { addUnitPriority },
        c: { DATE }
    }
} = __;

// FORMATTING

addFormatToken("D", ["DD", 2], "Do", "date");

// ALIASES

addUnitAlias("date", "D");

// PRIOROITY
addUnitPriority("date", 9);

// PARSING

addRegexToken("D", match1to2);
addRegexToken("DD", match1to2, match2);
addRegexToken("Do", (isStrict, locale) => {
    // TODO: Remove "ordinalParse" fallback in next major release.
    return isStrict
        ? locale._dayOfMonthOrdinalParse || locale._ordinalParse
        : locale._dayOfMonthOrdinalParseLenient;
});

addParseToken(["D", "DD"], DATE);
addParseToken("Do", (input, array) => {
    array[DATE] = __.util.toInt(input.match(match1to2)[0]);
});
