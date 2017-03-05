import { addFormatToken } from "../format";
import { addUnitAlias } from "./aliases";
import { addUnitPriority } from "./priorities";
import { addRegexToken, match1, addParseToken } from "../parse";
import { MONTH } from "./constants";
import { toInt } from "../utils";

// FORMATTING

addFormatToken("Q", 0, "Qo", "quarter");

// ALIASES

addUnitAlias("quarter", "Q");

// PRIORITY

addUnitPriority("quarter", 7);

// PARSING

addRegexToken("Q", match1);
addParseToken("Q", function (input, array) {
    array[MONTH] = (toInt(input) - 1) * 3;
});
