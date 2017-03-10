
import { addFormatToken } from "../format";
import { addUnitAlias } from "./aliases";
import { addUnitPriority } from "./priorities";
import { addRegexToken, match1to2, match2, match3to4, match5to6, addParseToken } from "../parse";
import { HOUR, MINUTE, SECOND } from "./constants";
import { toInt } from "../utils";
import getParsingFlags from "../create/parsing-flags";

const { padStart } = adone.vendor.lodash;

// FORMATTING

function hFormat() {
    return this.hours() % 12 || 12;
}

function kFormat() {
    return this.hours() || 24;
}

addFormatToken("H", ["HH", 2], 0, "hour");
addFormatToken("h", ["hh", 2], 0, hFormat);
addFormatToken("k", ["kk", 2], 0, kFormat);

addFormatToken("hmm", 0, 0, function () {
    return "" + hFormat.apply(this) + padStart(this.minutes(), 2, "0");
});

addFormatToken("hmmss", 0, 0, function () {
    return "" + hFormat.apply(this) + padStart(this.minutes(), 2, "0") +
        padStart(this.seconds(), 2, "0");
});

addFormatToken("Hmm", 0, 0, function () {
    return "" + this.hours() + padStart(this.minutes(), 2, "0");
});

addFormatToken("Hmmss", 0, 0, function () {
    return "" + this.hours() + padStart(this.minutes(), 2, "0") +
        padStart(this.seconds(), 2, "0");
});

function meridiem (token, lowercase) {
    addFormatToken(token, 0, 0, function () {
        return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
    });
}

meridiem("a", true);
meridiem("A", false);

// ALIASES

addUnitAlias("hour", "h");

// PRIORITY
addUnitPriority("hour", 13);

// PARSING

function matchMeridiem (isStrict, locale) {
    return locale._meridiemParse;
}

addRegexToken("a",  matchMeridiem);
addRegexToken("A",  matchMeridiem);
addRegexToken("H",  match1to2);
addRegexToken("h",  match1to2);
addRegexToken("HH", match1to2, match2);
addRegexToken("hh", match1to2, match2);

addRegexToken("hmm", match3to4);
addRegexToken("hmmss", match5to6);
addRegexToken("Hmm", match3to4);
addRegexToken("Hmmss", match5to6);

addParseToken(["H", "HH"], HOUR);
addParseToken(["a", "A"], function (input, array, config) {
    config._isPm = config._locale.isPM(input);
    config._meridiem = input;
});
addParseToken(["h", "hh"], function (input, array, config) {
    array[HOUR] = toInt(input);
    getParsingFlags(config).bigHour = true;
});
addParseToken("hmm", function (input, array, config) {
    const pos = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos));
    array[MINUTE] = toInt(input.substr(pos));
    getParsingFlags(config).bigHour = true;
});
addParseToken("hmmss", function (input, array, config) {
    const pos1 = input.length - 4;
    const pos2 = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos1));
    array[MINUTE] = toInt(input.substr(pos1, 2));
    array[SECOND] = toInt(input.substr(pos2));
    getParsingFlags(config).bigHour = true;
});
addParseToken("Hmm", function (input, array) {
    const pos = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos));
    array[MINUTE] = toInt(input.substr(pos));
});
addParseToken("Hmmss", function (input, array) {
    const pos1 = input.length - 4;
    const pos2 = input.length - 2;
    array[HOUR] = toInt(input.substr(0, pos1));
    array[MINUTE] = toInt(input.substr(pos1, 2));
    array[SECOND] = toInt(input.substr(pos2));
});

// LOCALES

export function localeIsPM (input) {
    // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
    // Using charAt should be more compatible.
    return ((input + "").toLowerCase().charAt(0) === "p");
}

export const defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
export function localeMeridiem (hours, minutes, isLower) {
    if (hours > 11) {
        return isLower ? "pm" : "PM";
    } else {
        return isLower ? "am" : "AM";
    }
}
