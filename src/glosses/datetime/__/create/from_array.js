const { is } = adone;
const __ = adone.private(adone.datetime);

const { YEAR, MONTH, DATE, HOUR, MINUTE, SECOND, MILLISECOND } = __.unit.c;

const defaults = (a, b, c) => {
    if (is.exist(a)) {
        return a;
    }
    if (is.exist(b)) {
        return b;
    }
    return c;
};

const currentDateArray = (config) => {
    // hooks is actually the exported ExDate object
    const nowValue = new Date(__.util.hooks.now());
    if (config._useUTC) {
        return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
    }
    return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
};

const dayOfYearFromWeekInfo = (config) => {
    let weekYear;
    let week;
    let weekday;
    let dow;
    let doy;
    let temp;
    let weekdayOverflow;

    const { weekOfYear, weeksInYear, dayOfYearFromWeeks } = __.unit.weekCalendar;

    const w = config._w;

    if (is.exist(w.GG) || is.exist(w.W) || is.exist(w.E)) {
        dow = 1;
        doy = 4;

        // TODO: We need to take the current isoWeekYear, but that depends on
        // how we interpret now (local, utc, fixed offset). So create
        // a now version of current config (take local/utc/offset flags, and
        // create now).
        weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(__.create.createLocal(), 1, 4).year);
        week = defaults(w.W, 1);
        weekday = defaults(w.E, 1);
        if (weekday < 1 || weekday > 7) {
            weekdayOverflow = true;
        }
    } else {
        dow = config._locale._week.dow;
        doy = config._locale._week.doy;

        const curWeek = weekOfYear(__.create.createLocal(), dow, doy);

        weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

        // Default to current week.
        week = defaults(w.w, curWeek.week);

        if (is.exist(w.d)) {
            // weekday -- low day numbers are considered next week
            weekday = w.d;
            if (weekday < 0 || weekday > 6) {
                weekdayOverflow = true;
            }
        } else if (is.exist(w.e)) {
            // local weekday -- counting starts from begining of week
            weekday = w.e + dow;
            if (w.e < 0 || w.e > 6) {
                weekdayOverflow = true;
            }
        } else {
            // default to begining of week
            weekday = dow;
        }
    }
    if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
        __.create.getParsingFlags(config)._overflowWeeks = true;
    } else if (is.exist(weekdayOverflow)) {
        __.create.getParsingFlags(config)._overflowWeekday = true;
    } else {
        temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }
};

// convert an array to a date.
// the array should mirror the parameters below
// note: all values past the year are optional and will default to the lowest possible value.
// [year, month, day , hour, minute, second, millisecond]
export const configFromArray = (config) => {
    let date;
    let yearToUse;

    if (config._d) {
        return;
    }

    const currentDate = currentDateArray(config);

    //compute day of the year from weeks and weekdays
    if (config._w && is.nil(config._a[DATE]) && is.nil(config._a[MONTH])) {
        dayOfYearFromWeekInfo(config);
    }

    //if the day of the year is set, figure out what it is
    if (!is.nil(config._dayOfYear)) {
        yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

        if (config._dayOfYear > __.unit.year.daysInYear(yearToUse) || config._dayOfYear === 0) {
            __.create.getParsingFlags(config)._overflowDayOfYear = true;
        }

        date = __.create.createUTCDate(yearToUse, 0, config._dayOfYear);
        config._a[MONTH] = date.getUTCMonth();
        config._a[DATE] = date.getUTCDate();
    }

    // Default to current date.
    // * if no year, month, day of month are given, default to today
    // * if day of month is given, default month and year
    // * if month is given, default only year
    // * if year is given, don't default anything
    let i;
    const input = [];
    for (i = 0; i < 3 && is.nil(config._a[i]); ++i) {
        config._a[i] = input[i] = currentDate[i];
    }

    // Zero out whatever was not defaulted, including time
    for (; i < 7; i++) {
        config._a[i] = input[i] = (is.nil(config._a[i])) ? (i === 2 ? 1 : 0) : config._a[i];
    }

    // Check for 24:00:00.000
    if (
        config._a[HOUR] === 24
        && config._a[MINUTE] === 0
        && config._a[SECOND] === 0
        && config._a[MILLISECOND] === 0
    ) {
        config._nextDay = true;
        config._a[HOUR] = 0;
    }

    config._d = (config._useUTC ? __.create.createUTCDate : __.create.createDate).apply(null, input);
    const expectedWeekday = config._useUTC ? config._d.getUTCDay() : config._d.getDay();
    // Apply timezone offset from input. The actual utcOffset can be changed
    // with parseZone.
    if (is.exist(config._tzm)) {
        config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
    }

    if (config._nextDay) {
        config._a[HOUR] = 24;
    }

    // check for mismatching day of week
    if (config._w && !is.undefined(config._w.d) && config._w.d !== expectedWeekday) {
        __.create.getParsingFlags(config).weekdayMismatch = true;
    }
};
