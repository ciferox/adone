const { is } = adone;
const __ = adone.private(adone.datetime);

const mergeConfigs = (parentConfig, childConfig) => {
    const res = { ...parentConfig };
    for (const prop in childConfig) {
        if (is.propertyOwned(childConfig, prop)) {
            if (is.plainObject(parentConfig[prop]) && is.plainObject(childConfig[prop])) {
                res[prop] = {};
                Object.assign(res[prop], parentConfig[prop]);
                Object.assign(res[prop], childConfig[prop]);
            } else if (is.exist(childConfig[prop])) {
                res[prop] = childConfig[prop];
            } else {
                delete res[prop];
            }
        }
    }
    for (const prop in parentConfig) {
        if (
            is.propertyOwned(parentConfig, prop)
            && !is.propertyOwned(childConfig, prop)
            && is.plainObject(parentConfig[prop])
        ) {
            // make sure changes to properties don't modify parent config
            res[prop] = { ...res[prop] };
        }
    }
    return res;
};

// internal storage for locale config files
const locales = {};
const localeFamilies = {};
let globalLocale;

const normalizeLocale = (key) => key ? key.toLowerCase().replace("_", "-") : key;

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
const defaultDayOfMonthOrdinalParse = /\d{1,2}/;

const defaultRelativeTime = {
    future: "in %s",
    past: "%s ago",
    s: "a few seconds",
    ss: "%d seconds",
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

const baseConfig = adone.lazify({
    calendar: () => defaultCalendar,
    longDateFormat: () => defaultLongDateFormat,
    invalidDate: () => defaultInvalidDate,
    ordinal: () => defaultOrdinal,
    dayOfMonthOrdinalParse: () => defaultDayOfMonthOrdinalParse,
    relativeTime: () => defaultRelativeTime,

    months: () => __.unit.month.defaultLocaleMonths,
    monthsShort: () => __.unit.month.defaultLocaleMonthsShort,

    week: () => __.unit.week.defaultLocaleWeek,

    weekdays: () => __.unit.dayOfWeek.defaultLocaleWeekdays,
    weekdaysMin: () => __.unit.dayOfWeek.defaultLocaleWeekdaysMin,
    weekdaysShort: () => __.unit.dayOfWeek.defaultLocaleWeekdaysShort,

    meridiemParse: () => __.unit.hour.defaultLocaleMeridiemParse
});

export class Locale {
    constructor(config) {
        if (is.exist(config)) {
            this.set(config);
        }
    }

    calendar(key, mom, now) {
        const output = this._calendar[key] || this._calendar.sameElse;
        return is.function(output) ? output.call(mom, now) : output;
    }

    longDateFormat(key) {
        const format = this._longDateFormat[key];
        const formatUpper = this._longDateFormat[key.toUpperCase()];

        if (format || !formatUpper) {
            return format;
        }

        this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, (val) => {
            return val.slice(1);
        });

        return this._longDateFormat[key];
    }

    invalidDate() {
        return this._invalidDate;
    }

    ordinal(number) {
        return this._ordinal.replace("%d", number);
    }

    preparse(string) {
        return string;
    }

    relativeTime(number, withoutSuffix, string, isFuture) {
        const output = this._relativeTime[string];
        return is.function(output)
            ? output(number, withoutSuffix, string, isFuture)
            : output.replace(/%d/i, number);
    }

    pastFuture(diff, output) {
        const format = this._relativeTime[diff > 0 ? "future" : "past"];
        return is.function(format)
            ? format(output)
            : format.replace(/%s/i, output);
    }

    set(config) {
        for (const i in config) {
            const prop = config[i];
            if (is.function(prop)) {
                Object.defineProperty(this, i, {
                    value: prop,
                    configurable: true
                });
            } else {
                this[`_${i}`] = prop;
            }
        }
        this._config = config;
        // Lenient ordinal parsing accepts just a number in addition to
        // number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
        // TODO: Remove "ordinalParse" fallback in next major release.
        this._dayOfMonthOrdinalParseLenient = new RegExp(
            `${this._dayOfMonthOrdinalParse.source || this._ordinalParse.source}|${(/\d{1,2}/).source}`
        );
    }
}

Locale.prototype.postformat = Locale.prototype.preparse;

// This function will load locale and then set the global locale.  If
// no arguments are passed in, it will simply return the current global
// locale key.
export const getSetGlobalLocale = (key, values) => {
    let data;
    if (key) {
        if (is.undefined(values)) {
            // eslint-disable-next-line no-use-before-define
            data = getLocale(key);
        } else {
            // eslint-disable-next-line no-use-before-define
            data = defineLocale(key, values);
        }

        if (data) {
            // datetime.duration._locale = datetime._locale = data;
            globalLocale = data;
        }
    }

    return globalLocale._abbr;
};

export const defineLocale = (name, config) => {
    if (!is.null(config)) {
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
            localeFamilies[name].forEach((x) => {
                defineLocale(x.name, x.config);
            });
        }

        // backwards compat for now: also set the locale
        // make sure we set the locale AFTER all child locales have been
        // created, so we won't end up with the child locale set.
        getSetGlobalLocale(name);


        return locales[name];
    }
    // useful for testing
    delete locales[name];
    return null;
};

const loadLocale = (name) => {
    let oldLocale = null;
    // TODO: Find a better way to register and load all the locales in Node
    if (!locales[name]) {
        try {
            oldLocale = globalLocale._abbr;
            require(`../locale/${name}`);
            // because defineLocale currently also sets the global locale, we
            // want to undo that for lazy loaded locales
            getSetGlobalLocale(oldLocale);
        } catch (e) {
            // swallow errors
        }
    }
    return locales[name];
};

// pick the locale from the array
// try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
// substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
const chooseLocale = (names) => {
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
            if (next && next.length >= j && __.util.compareArrays(split, next, true) >= j - 1) {
                //the next array item is better than a shallower substring of this one
                break;
            }
            j--;
        }
        i++;
    }
    return null;
};

// returns locale data
export const getLocale = (key) => {
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
};


export const updateLocale = (name, config) => {
    if (is.exist(config)) {
        let parentConfig = baseConfig;
        // MERGE
        const tmpLocale = loadLocale(name);
        if (!is.nil(tmpLocale)) {
            parentConfig = tmpLocale._config;
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
};

export const listLocales = () => adone.util.keys(locales);

const get = (format, index, field, setter) => {
    const locale = getLocale();
    const utc = __.create.createUTC().set(setter, index);
    return locale[field](utc, format);
};

const listMonthsImpl = (format, index, field) => {
    if (is.number(format)) {
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
};

// ()
// (5)
// (fmt, 5)
// (fmt)
// (true)
// (true, 5)
// (true, fmt, 5)
// (true, fmt)
const listWeekdaysImpl = (localeSorted, format, index, field) => {
    if (is.boolean(localeSorted)) {
        if (is.number(format)) {
            index = format;
            format = undefined;
        }
        format = format || "";
    } else {
        format = localeSorted;
        index = format;
        localeSorted = false;
        if (is.number(format)) {
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
};

export const listMonths = (format, index) => listMonthsImpl(format, index, "months");

export const listMonthsShort = (format, index) => listMonthsImpl(format, index, "monthsShort");

export const listWeekdays = (localeSorted, format, index) => listWeekdaysImpl(localeSorted, format, index, "weekdays");

export const listWeekdaysShort = (localeSorted, format, index) => listWeekdaysImpl(localeSorted, format, index, "weekdaysShort");

export const listWeekdaysMin = (localeSorted, format, index) => listWeekdaysImpl(localeSorted, format, index, "weekdaysMin");

adone.lazify({
    months: () => __.unit.month.localeMonths,
    monthsShort: () => __.unit.month.localeMonthsShort,
    monthsParse: () => __.unit.month.localeMonthsParse,
    monthsRegex: () => __.unit.month.monthsRegex,
    monthsShortRegex: () => __.unit.month.monthsShortRegex,

    week: () => __.unit.week.localeWeek,
    firstDayOfYear: () => __.unit.week.localeFirstDayOfYear,
    firstDayOfWeek: () => __.unit.week.localeFirstDayOfWeek,

    weekdays: () => __.unit.dayOfWeek.localeWeekdays,
    weekdaysMin: () => __.unit.dayOfWeek.localeWeekdaysMin,
    weekdaysShort: () => __.unit.dayOfWeek.localeWeekdaysShort,
    weekdaysParse: () => __.unit.dayOfWeek.localeWeekdaysParse,
    weekdaysRegex: () => __.unit.dayOfWeek.weekdaysRegex,
    weekdaysShortRegex: () => __.unit.dayOfWeek.weekdaysShortRegex,
    weekdaysMinRegex: () => __.unit.dayOfWeek.weekdaysMinRegex,

    isPM: () => __.unit.hour.localeIsPM,
    meridiem: () => __.unit.hour.localeMeridiem
}, Locale.prototype, undefined, { configurable: true, writable: true });

getSetGlobalLocale("en", {
    dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
    ordinal(number) {
        let output = "th";
        if (__.util.toInt(number % 100 / 10) !== 1) {
            const b = number % 10;
            if (b === 1) {
                output = "st";
            } else if (b === 2) {
                output = "nd";
            } else if (b === 3) {
                output = "rd";
            }
        }
        return number + output;
    }
});
