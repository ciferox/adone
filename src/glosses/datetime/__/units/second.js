import { addFormatToken } from "../format";
import { addUnitAlias } from "./aliases";
import { addUnitPriority } from "./priorities";
import { addRegexToken, match1to2, match2, addParseToken } from "../parse";
import { SECOND } from "./constants";

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
