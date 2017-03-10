
import { createUTC } from "./create/utc";
import { compareArrays, toInt } from "./utils";
const { is } = adone;
const { extend } = adone.vendor.lodash;

// months
import {
    defaultLocaleMonths,
    defaultLocaleMonthsShort
} from "./units/month";

// week
import { defaultLocaleWeek } from "./units/week";

// weekdays
import {
    defaultLocaleWeekdays,
    defaultLocaleWeekdaysMin,
    defaultLocaleWeekdaysShort
} from "./units/day-of-week";

// meridiem
import { defaultLocaleMeridiemParse } from "./units/hour";

function mergeConfigs(parentConfig, childConfig) {
    const res = extend({}, parentConfig);
    for (const prop in childConfig) {
        if (is.propertyOwned(childConfig, prop)) {
            if (is.plainObject(parentConfig[prop]) && is.plainObject(childConfig[prop])) {
                res[prop] = {};
                extend(res[prop], parentConfig[prop]);
                extend(res[prop], childConfig[prop]);
            } else if (is.exist(childConfig[prop])) {
                res[prop] = childConfig[prop];
            } else {
                delete res[prop];
            }
        }
    }
    for (const prop in parentConfig) {
        if (is.propertyOwned(parentConfig, prop) &&
                !is.propertyOwned(childConfig, prop) &&
                is.plainObject(parentConfig[prop])) {
            // make sure changes to properties don't modify parent config
            res[prop] = extend({}, res[prop]);
        }
    }
    return res;
}

// internal storage for locale config files
const locales = {};
const localeFamilies = {};
let globalLocale;

function normalizeLocale(key) {
    return key ? key.toLowerCase().replace("_", "-") : key;
}

// pick the locale from the array
// try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
// substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
function chooseLocale(names) {
    let i = 0;
    while (i < names.length) {
        const split = normalizeLocale(names[i]).split("-");
        let j = split.length;
        let next = normalizeLocale(names[i + 1]);
        next = next ? next.split("-") : null;
        while (j > 0) {
            const locale = loadLocale(split.slice(0, j).join("-"));
            if (locale) {
                return locale;
            }
            if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                //the next array item is better than a shallower substring of this one
                break;
            }
            j--;
        }
        i++;
    }
    return null;
}

function loadLocale(name) {
    let oldLocale = null;
    // TODO: Find a better way to register and load all the locales in Node
    if (!locales[name] && (!is.undefined(module)) &&
            module && module.exports) {
        try {
            oldLocale = globalLocale._abbr;
            require("../locale/" + name);
            // because defineLocale currently also sets the global locale, we
            // want to undo that for lazy loaded locales
            getSetGlobalLocale(oldLocale);
        } catch (e) {
            // swallow errors
        }
    }
    return locales[name];
}

// This function will load locale and then set the global locale.  If
// no arguments are passed in, it will simply return the current global
// locale key.
export function getSetGlobalLocale (key, values) {
    let data;
    if (key) {
        if (is.undefined(values)) {
            data = getLocale(key);
        } else {
            data = defineLocale(key, values);
        }

        if (data) {
            // exdate.duration._locale = exdate._locale = data;
            globalLocale = data;
        }
    }

    return globalLocale._abbr;
}

const defaultCalendar = {
    sameDay: "[Today at] LT",
    nextDay: "[Tomorrow at] LT",
    nextWeek: "dddd [at] LT",
    lastDay: "[Yesterday at] LT",
    lastWeek: "[Last] dddd [at] LT",
    sameElse: "L"
};

const defaultLongDateFormat = {
    LTS: "h:mm:ss A",
    LT: "h:mm A",
    L: "MM/DD/YYYY",
    LL: "MMMM D, YYYY",
    LLL: "MMMM D, YYYY h:mm A",
    LLLL: "dddd, MMMM D, YYYY h:mm A"
};

const defaultInvalidDate = "Invalid date";
const defaultOrdinal = "%d";
const defaultOrdinalParse = /\d{1,2}/;

const defaultRelativeTime = {
    future: "in %s",
    past: "%s ago",
    s: "a few seconds",
    m: "a minute",
    mm: "%d minutes",
    h: "an hour",
    hh: "%d hours",
    d: "a day",
    dd: "%d days",
    M: "a month",
    MM: "%d months",
    y: "a year",
    yy: "%d years"
};

const baseConfig = {
    calendar: defaultCalendar,
    longDateFormat: defaultLongDateFormat,
    invalidDate: defaultInvalidDate,
    ordinal: defaultOrdinal,
    ordinalParse: defaultOrdinalParse,
    relativeTime: defaultRelativeTime,

    months: defaultLocaleMonths,
    monthsShort: defaultLocaleMonthsShort,

    week: defaultLocaleWeek,

    weekdays: defaultLocaleWeekdays,
    weekdaysMin: defaultLocaleWeekdaysMin,
    weekdaysShort: defaultLocaleWeekdaysShort,

    meridiemParse: defaultLocaleMeridiemParse
};

export function defineLocale (name, config) {
    if (config !== null) {
        let parentConfig = baseConfig;
        config.abbr = name;
        if (is.exist(config.parentLocale)) {
            if (is.exist(locales[config.parentLocale])) {
                parentConfig = locales[config.parentLocale]._config;
            } else {
                if (!localeFamilies[config.parentLocale]) {
                    localeFamilies[config.parentLocale] = [];
                }
                localeFamilies[config.parentLocale].push({
                    name,
                    config
                });
                return null;
            }
        }
        locales[name] = new Locale(mergeConfigs(parentConfig, config));

        if (localeFamilies[name]) {
            localeFamilies[name].forEach(function (x) {
                defineLocale(x.name, x.config);
            });
        }

        // backwards compat for now: also set the locale
        // make sure we set the locale AFTER all child locales have been
        // created, so we won't end up with the child locale set.
        getSetGlobalLocale(name);


        return locales[name];
    } else {
        // useful for testing
        delete locales[name];
        return null;
    }
}

export function updateLocale(name, config) {
    if (is.exist(config)) {
        let parentConfig = baseConfig;
        // MERGE
        if (is.exist(locales[name])) {
            parentConfig = locales[name]._config;
        }
        config = mergeConfigs(parentConfig, config);
        const locale = new Locale(config);
        locale.parentLocale = locales[name];
        locales[name] = locale;

        // backwards compat for now: also set the locale
        getSetGlobalLocale(name);
    } else {
        // pass null for config to unupdate, useful for tests
        if (is.exist(locales[name])) {
            if (is.exist(locales[name].parentLocale)) {
                locales[name] = locales[name].parentLocale;
            } else if (is.exist(locales[name])) {
                delete locales[name];
            }
        }
    }
    return locales[name];
}

// returns locale data
export function getLocale (key) {
    let locale;

    if (key && key._locale && key._locale._abbr) {
        key = key._locale._abbr;
    }

    if (!key) {
        return globalLocale;
    }

    if (!is.array(key)) {
        //short-circuit everything else
        locale = loadLocale(key);
        if (locale) {
            return locale;
        }
        key = [key];
    }

    return chooseLocale(key);
}

export function listLocales() {
    return adone.util.keys(locales);
}

function get (format, index, field, setter) {
    const locale = getLocale();
    const utc = createUTC().set(setter, index);
    return locale[field](utc, format);
}

function listMonthsImpl (format, index, field) {
    if (adone.is.number(format)) {
        index = format;
        format = undefined;
    }

    format = format || "";

    if (is.exist(index)) {
        return get(format, index, field, "month");
    }

    let i;
    const out = [];
    for (i = 0; i < 12; i++) {
        out[i] = get(format, i, field, "month");
    }
    return out;
}

// ()
// (5)
// (fmt, 5)
// (fmt)
// (true)
// (true, 5)
// (true, fmt, 5)
// (true, fmt)
function listWeekdaysImpl (localeSorted, format, index, field) {
    if (is.boolean(localeSorted)) {
        if (adone.is.number(format)) {
            index = format;
            format = undefined;
        }

        format = format || "";
    } else {
        format = localeSorted;
        index = format;
        localeSorted = false;

        if (adone.is.number(format)) {
            index = format;
            format = undefined;
        }

        format = format || "";
    }

    const locale = getLocale();
    const shift = localeSorted ? locale._week.dow : 0;

    if (is.exist(index)) {
        return get(format, (index + shift) % 7, field, "day");
    }

    let i;
    const out = [];
    for (i = 0; i < 7; i++) {
        out[i] = get(format, (i + shift) % 7, field, "day");
    }
    return out;
}

export function listMonths (format, index) {
    return listMonthsImpl(format, index, "months");
}

export function listMonthsShort (format, index) {
    return listMonthsImpl(format, index, "monthsShort");
}

export function listWeekdays (localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, "weekdays");
}

export function listWeekdaysShort (localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, "weekdaysShort");
}

export function listWeekdaysMin (localeSorted, format, index) {
    return listWeekdaysImpl(localeSorted, format, index, "weekdaysMin");
}


class Locale {
    constructor(config) {
        if (adone.is.exist(config)) {
            this.set(config);
        }
    }

    calendar (key, mom, now) {
        const output = this._calendar[key] || this._calendar["sameElse"];
        return adone.is.function(output) ? output.call(mom, now) : output;
    }

    longDateFormat (key) {
        const format = this._longDateFormat[key];
        const formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
            return val.slice(1);
        });

        return this._longDateFormat[key];
    }

    invalidDate () {
        return this._invalidDate;
    }

    ordinal (number) {
        return this._ordinal.replace("%d", number);
    }

    preparse (string) {
        return string;
    }

    relativeTime (number, withoutSuffix, string, isFuture) {
        const output = this._relativeTime[string];
        return (adone.is.function(output)) ?
            output(number, withoutSuffix, string, isFuture) :
            output.replace(/%d/i, number);
    }

    pastFuture (diff, output) {
        const format = this._relativeTime[diff > 0 ? "future" : "past"];
        return adone.is.function(format) ? format(output) : format.replace(/%s/i, output);
    }

    set (config) {
        for (const i in config) {
            const prop = config[i];
            if (is.function(prop)) {
                this[i] = prop;
            } else {
                this["_" + i] = prop;
            }
        }
        this._config = config;
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _ordinalParseLenient.
        this._ordinalParseLenient = new RegExp(this._ordinalParse.source + "|" + (/\d{1,2}/).source);
    }
}

Locale.prototype.postformat = Locale.prototype.preparse;

// Month
import {
    localeMonthsParse,
    localeMonths,
    localeMonthsShort,
    monthsRegex,
    monthsShortRegex
} from "./units/month";

Locale.prototype.months            = localeMonths;
Locale.prototype.monthsShort       = localeMonthsShort;
Locale.prototype.monthsParse       = localeMonthsParse;
Locale.prototype.monthsRegex       = monthsRegex;
Locale.prototype.monthsShortRegex  = monthsShortRegex;

// Week
import { localeWeek, localeFirstDayOfYear, localeFirstDayOfWeek } from "./units/week";
Locale.prototype.week = localeWeek;
Locale.prototype.firstDayOfYear = localeFirstDayOfYear;
Locale.prototype.firstDayOfWeek = localeFirstDayOfWeek;

// Day of Week
import {
    localeWeekdaysParse,
    localeWeekdays,
    localeWeekdaysMin,
    localeWeekdaysShort,

    weekdaysRegex,
    weekdaysShortRegex,
    weekdaysMinRegex
} from "./units/day-of-week";

Locale.prototype.weekdays      = localeWeekdays;
Locale.prototype.weekdaysMin   = localeWeekdaysMin;
Locale.prototype.weekdaysShort = localeWeekdaysShort;
Locale.prototype.weekdaysParse = localeWeekdaysParse;

Locale.prototype.weekdaysRegex      = weekdaysRegex;
Locale.prototype.weekdaysShortRegex = weekdaysShortRegex;
Locale.prototype.weekdaysMinRegex   = weekdaysMinRegex;

// Hours
import { localeIsPM, localeMeridiem } from "./units/hour";

Locale.prototype.isPM = localeIsPM;
Locale.prototype.meridiem = localeMeridiem;

export default Locale;


getSetGlobalLocale("en", {
    ordinalParse: /\d{1,2}(th|st|nd|rd)/,
    ordinal (number) {
        const b = number % 10;
        const output = (toInt(number % 100 / 10) === 1) ? "th" :
            (b === 1) ? "st" :
            (b === 2) ? "nd" :
            (b === 3) ? "rd" : "th";
        return number + output;
    }
});
