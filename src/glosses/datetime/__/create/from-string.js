
import { configFromStringAndFormat } from "./from-string-and-format";
import { hooks } from "../utils";
import getParsingFlags from "./parsing-flags";
const { is } = adone;

// iso 8601 regex
// 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
const extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
const basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

const tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

const isoDates = [
    ["YYYYYY-MM-DD", /[+-]\d{6}-\d\d-\d\d/],
    ["YYYY-MM-DD", /\d{4}-\d\d-\d\d/],
    ["GGGG-[W]WW-E", /\d{4}-W\d\d-\d/],
    ["GGGG-[W]WW", /\d{4}-W\d\d/, false],
    ["YYYY-DDD", /\d{4}-\d{3}/],
    ["YYYY-MM", /\d{4}-\d\d/, false],
    ["YYYYYYMMDD", /[+-]\d{10}/],
    ["YYYYMMDD", /\d{8}/],
    // YYYYMM is NOT allowed by the standard
    ["GGGG[W]WWE", /\d{4}W\d{3}/],
    ["GGGG[W]WW", /\d{4}W\d{2}/, false],
    ["YYYYDDD", /\d{7}/]
];

// iso time formats and regexes
const isoTimes = [
    ["HH:mm:ss.SSSS", /\d\d:\d\d:\d\d\.\d+/],
    ["HH:mm:ss,SSSS", /\d\d:\d\d:\d\d,\d+/],
    ["HH:mm:ss", /\d\d:\d\d:\d\d/],
    ["HH:mm", /\d\d:\d\d/],
    ["HHmmss.SSSS", /\d\d\d\d\d\d\.\d+/],
    ["HHmmss,SSSS", /\d\d\d\d\d\d,\d+/],
    ["HHmmss", /\d\d\d\d\d\d/],
    ["HHmm", /\d\d\d\d/],
    ["HH", /\d\d/]
];

const aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

// date from iso format
export function configFromISO(config) {
    const string = config._i;
    const match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string);
    let dateFormat;
    let timeFormat;
    let tzFormat;

    if (match) {
        getParsingFlags(config).iso = true;

        let allowTime;
        for (let i = 0, l = isoDates.length; i < l; i++) {
            if (isoDates[i][1].exec(match[1])) {
                dateFormat = isoDates[i][0];
                allowTime = isoDates[i][2] !== false;
                break;
            }
        }
        if (is.nil(dateFormat)) {
            config._isValid = false;
            return;
        }
        if (match[3]) {
            for (let i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(match[3])) {
                    // match[2] should be 'T' or space
                    timeFormat = (match[2] || " ") + isoTimes[i][0];
                    break;
                }
            }
            if (is.nil(timeFormat)) {
                config._isValid = false;
                return;
            }
        }
        if (!allowTime && is.exist(timeFormat)) {
            config._isValid = false;
            return;
        }
        if (match[4]) {
            if (tzRegex.exec(match[4])) {
                tzFormat = "Z";
            } else {
                config._isValid = false;
                return;
            }
        }
        config._f = dateFormat + (timeFormat || "") + (tzFormat || "");
        configFromStringAndFormat(config);
    } else {
        config._isValid = false;
    }
}

// RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
const basicRfcRegex = /^((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d?\d\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(?:\d\d)?\d\d\s)(\d\d:\d\d)(\:\d\d)?(\s(?:UT|GMT|[ECMP][SD]T|[A-IK-Za-ik-z]|[+-]\d{4}))$/;

// date and time from ref 2822 format
export function configFromRFC2822(config) {
    let string, match, dayFormat,
        dateFormat, timeFormat, tzFormat;
    const timezones = {
        " GMT": " +0000",
        " EDT": " -0400",
        " EST": " -0500",
        " CDT": " -0500",
        " CST": " -0600",
        " MDT": " -0600",
        " MST": " -0700",
        " PDT": " -0700",
        " PST": " -0800"
    };
    const military = "YXWVUTSRQPONZABCDEFGHIKLM";
    let timezone, timezoneIndex;

    string = config._i
        .replace(/\([^\)]*\)|[\n\t]/g, " ") // Remove comments and folding whitespace
        .replace(/(\s\s+)/g, " ") // Replace multiple-spaces with a single space
        .replace(/^\s|\s$/g, ""); // Remove leading and trailing spaces
    match = basicRfcRegex.exec(string);

    if (match) {
        dayFormat = match[1] ? `ddd${(match[1].length === 5) ? ", " : " "}` : "";
        dateFormat = `D MMM ${(match[2].length > 10) ? "YYYY " : "YY "}`;
        timeFormat = `HH:mm${match[4] ? ":ss" : ""}`;

        // TODO: Replace the vanilla JS Date object with an indepentent day-of-week check.
        if (match[1]) { // day of week given
            const momentDate = new Date(match[2]);
            const momentDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][momentDate.getDay()];

            if (match[1].substr(0, 3) !== momentDay) {
                getParsingFlags(config).weekdayMismatch = true;
                config._isValid = false;
                return;
            }
        }

        switch (match[5].length) {
            case 2: // military
                if (timezoneIndex === 0) {
                    timezone = " +0000";
                } else {
                    timezoneIndex = military.indexOf(match[5][1].toUpperCase()) - 12;
                    timezone = `${((timezoneIndex < 0) ? " -" : " +") +
                        ((`${timezoneIndex}`).replace(/^-?/, "0")).match(/..$/)[0]}00`;
                }
                break;
            case 4: // Zone
                timezone = timezones[match[5]];
                break;
            default: // UT or +/-9999
                timezone = timezones[" GMT"];
        }
        match[5] = timezone;
        config._i = match.splice(1).join("");
        tzFormat = " ZZ";
        config._f = dayFormat + dateFormat + timeFormat + tzFormat;
        configFromStringAndFormat(config);
        getParsingFlags(config).rfc2822 = true;
    } else {
        config._isValid = false;
    }
}

// date from iso format or fallback
export function configFromString(config) {
    const matched = aspNetJsonRegex.exec(config._i);

    if (matched !== null) {
        config._d = new Date(Number(matched[1]));
        return;
    }

    configFromISO(config);
    if (config._isValid === false) {
        delete config._isValid;
    } else {
        return;
    }

    configFromRFC2822(config);
    if (config._isValid === false) {
        delete config._isValid;
    } else {
        return;
    }

    // Final attempt, use Input Fallback
    hooks.createFromInputFallback(config);
}
