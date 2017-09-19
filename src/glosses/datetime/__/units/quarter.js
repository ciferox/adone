const __ = adone.private(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        addParseToken,
        match1
    },
    unit: {
        alias: { addUnitAlias },
        priority: { addUnitPriority },
        c: { MONTH }
    }
} = __;

// FORMATTING

addFormatToken("Q", 0, "Qo", "quarter");

// ALIASES

addUnitAlias("quarter", "Q");

// PRIORITY

addUnitPriority("quarter", 7);

// PARSING

addRegexToken("Q", match1);
addParseToken("Q", (input, array) => {
    array[MONTH] = (__.util.toInt(input) - 1) * 3;
});
