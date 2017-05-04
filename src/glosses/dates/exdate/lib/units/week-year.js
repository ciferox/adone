
import { addFormatToken } from "../format";
import { addUnitAlias } from "./aliases";
import { addUnitPriority } from "./priorities";
import { weekOfYear, weeksInYear, dayOfYearFromWeeks } from "./week-calendar-utils";
import { toInt, hooks } from "../utils";
import { createUTCDate } from "../create/date-from-array";

import {
    addRegexToken,
    match1to2,
    match1to4,
    match1to6,
    match2,
    match4,
    match6,
    matchSigned,
    addWeekParseToken
} from "../parse";

// FORMATTING

addFormatToken(0, ["gg", 2], 0, function () {
    return this.weekYear() % 100;
});

addFormatToken(0, ["GG", 2], 0, function () {
    return this.isoWeekYear() % 100;
});

function addWeekYearFormatToken(token, getter) {
    addFormatToken(0, [token, token.length], 0, getter);
}

addWeekYearFormatToken("gggg", "weekYear");
addWeekYearFormatToken("ggggg", "weekYear");
addWeekYearFormatToken("GGGG", "isoWeekYear");
addWeekYearFormatToken("GGGGG", "isoWeekYear");

// ALIASES

addUnitAlias("weekYear", "gg");
addUnitAlias("isoWeekYear", "GG");

// PRIORITY

addUnitPriority("weekYear", 1);
addUnitPriority("isoWeekYear", 1);


// PARSING

addRegexToken("G", matchSigned);
addRegexToken("g", matchSigned);
addRegexToken("GG", match1to2, match2);
addRegexToken("gg", match1to2, match2);
addRegexToken("GGGG", match1to4, match4);
addRegexToken("gggg", match1to4, match4);
addRegexToken("GGGGG", match1to6, match6);
addRegexToken("ggggg", match1to6, match6);

addWeekParseToken(["gggg", "ggggg", "GGGG", "GGGGG"], (input, week, config, token) => {
    week[token.substr(0, 2)] = toInt(input);
});

addWeekParseToken(["gg", "GG"], (input, week, config, token) => {
    week[token] = hooks.parseTwoDigitYear(input);
});


export function getSetWeekYearHelper(input, week, weekday, dow, doy) {
    let weeksTarget;
    if (adone.is.nil(input)) {
        return weekOfYear(this, dow, doy).year;
    }
    weeksTarget = weeksInYear(input, dow, doy);
    if (week > weeksTarget) {
        week = weeksTarget;
    }
    return setWeekAll.call(this, input, week, weekday, dow, doy);

}

function setWeekAll(weekYear, week, weekday, dow, doy) {
    const dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
    const date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

    this.year(date.getUTCFullYear());
    this.month(date.getUTCMonth());
    this.date(date.getUTCDate());
    return this;
}
