const __ = adone.private(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        addParseToken,
        match1to2,
        match2
    },
    unit: {
        alias: { addUnitAlias },
        priority: { addUnitPriority },
        c: { SECOND }
    }
} = __;

// FORMATTING

addFormatToken("s", ["ss", 2], 0, "second");

// ALIASES

addUnitAlias("second", "s");

// PRIORITY

addUnitPriority("second", 15);

// PARSING

addRegexToken("s", match1to2);
addRegexToken("ss", match1to2, match2);
addParseToken(["s", "ss"], SECOND);
