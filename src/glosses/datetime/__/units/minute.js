const __ = adone.getPrivate(adone.datetime);

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
        c: { MINUTE }
    }
} = __;

// FORMATTING

addFormatToken("m", ["mm", 2], 0, "minute");

// ALIASES

addUnitAlias("minute", "m");

// PRIORITY

addUnitPriority("minute", 14);

// PARSING

addRegexToken("m", match1to2);
addRegexToken("mm", match1to2, match2);
addParseToken(["m", "mm"], MINUTE);
