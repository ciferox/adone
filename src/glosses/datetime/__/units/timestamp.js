const __ = adone.private(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        addParseToken,
        matchSigned,
        matchTimestamp
    }
} = __;

// FORMATTING

addFormatToken("X", 0, 0, "unix");
addFormatToken("x", 0, 0, "valueOf");

// PARSING

addRegexToken("x", matchSigned);
addRegexToken("X", matchTimestamp);
addParseToken("X", (input, array, config) => {
    config._d = new Date(parseFloat(input, 10) * 1000);
});
addParseToken("x", (input, array, config) => {
    config._d = new Date(__.util.toInt(input));
});
