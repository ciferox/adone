import { addFormatToken } from "../format";
import { addUnitAlias } from "./aliases";
import { addUnitPriority } from "./priorities";
import { addRegexToken, match3, match1to3, addParseToken } from "../parse";
import { toInt } from "../utils";

// FORMATTING

addFormatToken("DDD", ["DDDD", 3], "DDDo", "dayOfYear");

// ALIASES

addUnitAlias("dayOfYear", "DDD");

// PRIORITY
addUnitPriority("dayOfYear", 4);

// PARSING

addRegexToken("DDD",  match1to3);
addRegexToken("DDDD", match3);
addParseToken(["DDD", "DDDD"], function (input, array, config) {
    config._dayOfYear = toInt(input);
});
