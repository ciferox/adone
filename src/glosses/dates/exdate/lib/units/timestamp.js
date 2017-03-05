import { addFormatToken } from "../format";
import { addRegexToken, matchTimestamp, matchSigned, addParseToken } from "../parse";
import { toInt } from "../utils";

// FORMATTING

addFormatToken("X", 0, 0, "unix");
addFormatToken("x", 0, 0, "valueOf");

// PARSING

addRegexToken("x", matchSigned);
addRegexToken("X", matchTimestamp);
addParseToken("X", function (input, array, config) {
    config._d = new Date(parseFloat(input, 10) * 1000);
});
addParseToken("x", function (input, array, config) {
    config._d = new Date(toInt(input));
});
