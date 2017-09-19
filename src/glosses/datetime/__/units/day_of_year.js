const __ = adone.private(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        match3,
        match1to3,
        addParseToken
    },
    unit: {
        alias: { addUnitAlias },
        priority: { addUnitPriority }
    }
} = __;

// FORMATTING

addFormatToken("DDD", ["DDDD", 3], "DDDo", "dayOfYear");

// ALIASES

addUnitAlias("dayOfYear", "DDD");

// PRIORITY
addUnitPriority("dayOfYear", 4);

// PARSING

addRegexToken("DDD", match1to3);
addRegexToken("DDDD", match3);
addParseToken(["DDD", "DDDD"], (input, array, config) => {
    config._dayOfYear = __.util.toInt(input);
});
