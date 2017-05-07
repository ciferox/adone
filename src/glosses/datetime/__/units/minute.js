import { addFormatToken } from "../format";
import { addUnitAlias } from "./aliases";
import { addUnitPriority } from "./priorities";
import { addRegexToken, match1to2, match2, addParseToken } from "../parse";
import { MINUTE } from "./constants";

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
