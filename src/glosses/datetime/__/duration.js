const { is } = adone;
const __ = adone.private(adone.datetime);

const ordering = ["year", "quarter", "month", "week", "day", "hour", "minute", "second", "millisecond"];

const isDurationValid = (m) => {
    for (const key in m) {
        if (!(ordering.includes(key) && (is.nil(m[key]) || !isNaN(m[key])))) {
            return false;
        }
    }

    let unitHasDecimal = false;
    for (let i = 0; i < ordering.length; ++i) {
        if (m[ordering[i]]) {
            if (unitHasDecimal) {
                return false; // only allow non-integers for smallest unit
            }
            if (parseFloat(m[ordering[i]]) !== __.util.toInt(m[ordering[i]])) {
                unitHasDecimal = true;
            }
        }
    }

    return true;
};

const sign = (x) => ((x > 0) - (x < 0)) || Number(x);

const mathAbs = Math.abs;

// ASP.NET json date format regex
const aspNetRegex = /^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/;

// from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
// somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
// and further modified to allow for strings containing both week and day
const isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;


let round = Math.round;
const thresholds = {
    ss: 44, // a few seconds to seconds
    s: 45, // seconds to minute
    m: 45, // minutes to hour
    h: 22, // hours to day
    d: 26, // days to month
    M: 11 // months to year
};

const parseIso = (inp, sign) => {
    // We'd normally use ~~inp for this, but unfortunately it also
    // converts floats to ints.
    // inp may be undefined, so careful calling replace on it.
    const res = inp && parseFloat(inp.replace(",", "."));
    // apply sign while we're at it
    return (isNaN(res) ? 0 : res) * sign;
};

const positiveExDatesDifference = (base, other) => {
    const res = { milliseconds: 0, months: 0 };

    res.months = other.month() - base.month() +
        (other.year() - base.year()) * 12;
    if (base.clone().add(res.months, "M").isAfter(other)) {
        --res.months;
    }

    res.milliseconds = Number(other) - Number(base.clone().add(res.months, "M"));

    return res;
};

const exDatesDifference = (base, other) => {
    let res;
    if (!(base.isValid() && other.isValid())) {
        return { milliseconds: 0, months: 0 };
    }

    other = __.unit.offset.cloneWithOffset(other, base);
    if (base.isBefore(other)) {
        res = positiveExDatesDifference(base, other);
    } else {
        res = positiveExDatesDifference(other, base);
        res.milliseconds = -res.milliseconds;
        res.months = -res.months;
    }

    return res;
};

const addSubtract = (duration, input, value, direction) => {
    const other = new Duration(input, value);

    duration._milliseconds += direction * other._milliseconds;
    duration._days += direction * other._days;
    duration._months += direction * other._months;

    return duration._bubble();
};

const daysToMonths = (days) => {
    // 400 years have 146097 days (taking into account leap year rules)
    // 400 years have 12 months === 4800
    return days * 4800 / 146097;
};

const monthsToDays = (months) => {
    // the reverse of daysToMonths
    return months * 146097 / 4800;
};

// helper function for datetime.fn.from, datetime.fn.fromNow, and datetime.duration.fn.humanize
const substituteTimeAgo = (string, number, withoutSuffix, isFuture, locale) => {
    return locale.relativeTime(number || 1, Boolean(withoutSuffix), string, isFuture);
};

const relativeTime = (posNegDuration, withoutSuffix, locale) => {
    const duration = new Duration(posNegDuration).abs();
    const seconds = round(duration.as("s"));
    const minutes = round(duration.as("m"));
    const hours = round(duration.as("h"));
    const days = round(duration.as("d"));
    const months = round(duration.as("M"));
    const years = round(duration.as("y"));

    const a = seconds <= thresholds.ss && ["s", seconds]
        || seconds < thresholds.s && ["ss", seconds]
        || minutes <= 1 && ["m"]
        || minutes < thresholds.m && ["mm", minutes]
        || hours <= 1 && ["h"]
        || hours < thresholds.h && ["hh", hours]
        || days <= 1 && ["d"]
        || days < thresholds.d && ["dd", days]
        || months <= 1 && ["M"]
        || months < thresholds.M && ["MM", months]
        || years <= 1 && ["y"] || ["yy", years];

    a[2] = withoutSuffix;
    a[3] = Number(posNegDuration) > 0;
    a[4] = locale;
    return substituteTimeAgo.apply(null, a);
};

// This function allows you to set the rounding function for relative time strings
export const getSetRelativeTimeRounding = (roundingFunction) => {
    if (is.undefined(roundingFunction)) {
        return round;
    }
    if (is.function(roundingFunction)) {
        round = roundingFunction;
        return true;
    }
    return false;
};

// This function allows you to set a threshold for relative time strings
export const getSetRelativeTimeThreshold = (threshold, limit) => {
    if (is.undefined(thresholds[threshold])) {
        return false;
    }
    if (is.undefined(limit)) {
        return thresholds[threshold];
    }
    thresholds[threshold] = limit;
    if (threshold === "s") {
        thresholds.ss = limit - 1;
    }
    return true;
};

export const isDuration = (obj) => obj instanceof Duration; // eslint-disable-line no-use-before-define

export class Duration {
    constructor(input, key) {
        let duration = input;
        // matching against regexp is expensive, do it on demand
        let match = null;
        let sign;
        let diffRes;

        if (isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (is.number(input)) {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (match = aspNetRegex.exec(input)) { // eslint-disable-line no-cond-assign
            const {
                DATE,
                HOUR,
                MINUTE,
                SECOND,
                MILLISECOND
            } = __.unit.c;
            const { toInt, absRound } = __.util;
            sign = (match[1] === "-") ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(absRound(match[MILLISECOND] * 1000)) * sign // the millisecond decimal point is included in the match
            };
        } else if (match = isoRegex.exec(input)) { // eslint-disable-line no-cond-assign
            sign = (match[1] === "-") ? -1 : (match[1] === "+") ? 1 : 1;
            duration = {
                y: parseIso(match[2], sign),
                M: parseIso(match[3], sign),
                w: parseIso(match[4], sign),
                d: parseIso(match[5], sign),
                h: parseIso(match[6], sign),
                m: parseIso(match[7], sign),
                s: parseIso(match[8], sign)
            };
        } else if (is.nil(duration)) {
            duration = {};
        } else if (is.object(duration) && ("from" in duration || "to" in duration)) {
            const { createLocal } = __.create;
            diffRes = exDatesDifference(createLocal(duration.from), createLocal(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        const normalizedInput = __.unit.alias.normalizeObjectUnits(duration);
        const years = normalizedInput.year || 0;
        const quarters = normalizedInput.quarter || 0;
        const months = normalizedInput.month || 0;
        const weeks = normalizedInput.week || 0;
        const days = normalizedInput.day || 0;
        const hours = normalizedInput.hour || 0;
        const minutes = normalizedInput.minute || 0;
        const seconds = normalizedInput.second || 0;
        const milliseconds = normalizedInput.millisecond || 0;

        this._isValid = isDurationValid(normalizedInput);

        // representation for dateAddRemove
        this._milliseconds = Number(milliseconds) +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = Number(days) +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = Number(months) +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = __.locale.getLocale();

        this._bubble();

        if (isDuration(input) && is.propertyOwned(input, "_locale")) {
            this._locale = input._locale;
        }
    }

    clone() {
        return new Duration(this);
    }

    abs() {
        const data = this._data;

        this._milliseconds = mathAbs(this._milliseconds);
        this._days = mathAbs(this._days);
        this._months = mathAbs(this._months);

        data.milliseconds = mathAbs(data.milliseconds);
        data.seconds = mathAbs(data.seconds);
        data.minutes = mathAbs(data.minutes);
        data.hours = mathAbs(data.hours);
        data.months = mathAbs(data.months);
        data.years = mathAbs(data.years);

        return this;
    }

    add(input, value) {
        return addSubtract(this, input, value, 1);
    }

    subtract(input, value) {
        return addSubtract(this, input, value, -1);
    }

    as(units) {
        if (!this.isValid()) {
            return NaN;
        }
        let days;
        let months;
        const milliseconds = this._milliseconds;

        units = __.unit.alias.normalizeUnits(units);

        if (units === "month" || units === "year") {
            days = this._days + milliseconds / 864e5;
            months = this._months + daysToMonths(days);
            return units === "month" ? months : months / 12;
        }
        // handle milliseconds separately because of floating point math errors
        days = this._days + Math.round(monthsToDays(this._months));
        switch (units) {
            case "week": return days / 7 + milliseconds / 6048e5;
            case "day": return days + milliseconds / 864e5;
            case "hour": return days * 24 + milliseconds / 36e5;
            case "minute": return days * 1440 + milliseconds / 6e4;
            case "second": return days * 86400 + milliseconds / 1000;
            // Math.floor prevents floating point math errors here
            case "millisecond": return Math.floor(days * 864e5) + milliseconds;
            default: throw new Error(`Unknown unit ${units}`);
        }

    }

    valueOf() {
        if (!this.isValid()) {
            return NaN;
        }
        return (
            this._milliseconds +
            this._days * 864e5 +
            (this._months % 12) * 2592e6 +
            __.util.toInt(this._months / 12) * 31536e6
        );
    }

    _bubble() {
        let milliseconds = this._milliseconds;
        let days = this._days;
        let months = this._months;
        const data = this._data;

        const { absCeil, absFloor } = __.util;

        // if we have a mix of positive and negative values, bubble down first
        if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
            (milliseconds <= 0 && days <= 0 && months <= 0))) {
            milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
            days = 0;
            months = 0;
        }

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;

        const seconds = absFloor(milliseconds / 1000);
        data.seconds = seconds % 60;

        const minutes = absFloor(seconds / 60);
        data.minutes = minutes % 60;

        const hours = absFloor(minutes / 60);
        data.hours = hours % 24;

        days += absFloor(hours / 24);

        // convert days to months
        const monthsFromDays = absFloor(daysToMonths(days));
        months += monthsFromDays;
        days -= absCeil(monthsToDays(monthsFromDays));

        // 12 months -> 1 year
        const years = absFloor(months / 12);
        months %= 12;

        data.days = days;
        data.months = months;
        data.years = years;

        return this;
    }

    get(units) {
        units = __.unit.alias.normalizeUnits(units);
        return this.isValid() ? this[`${units}s`]() : NaN;
    }

    weeks() {
        return __.util.absFloor(this.days() / 7);
    }

    humanize(withSuffix) {
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }
        const locale = this.localeData();
        let output = relativeTime(this, !withSuffix, locale);

        if (withSuffix) {
            output = locale.pastFuture(Number(this), output);
        }

        return locale.postformat(output);
    }

    toISOString() {
        // for ISO strings we do not use the normal bubbling rules:
        //  * milliseconds bubble up until they become hours
        //  * days do not bubble at all
        //  * months bubble up until they become years
        // This is because there is no context-free conversion between hours and days
        // (think of clock changes)
        // and also not between days and months (28-31 days per month)
        if (!this.isValid()) {
            return this.localeData().invalidDate();
        }
        let seconds = mathAbs(this._milliseconds) / 1000;
        const days = mathAbs(this._days);
        let months = mathAbs(this._months);

        const { absFloor } = __.util;

        // 3600 seconds -> 60 minutes -> 1 hour
        let minutes = absFloor(seconds / 60);
        const hours = absFloor(minutes / 60);
        seconds %= 60;
        minutes %= 60;

        // 12 months -> 1 year
        const years = absFloor(months / 12);
        months %= 12;

        const Y = years;
        const M = months;
        const D = days;
        const h = hours;
        const m = minutes;
        const s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, "") : "";
        const total = this.asSeconds();

        if (!total) {
            // this is the same as C#'s (Noda) and python (isodate)...
            // but not other JS (goog.date)
            return "P0D";
        }

        const totalSign = total < 0 ? "-" : "";
        const ymSign = sign(this._months) !== sign(total) ? "-" : "";
        const daysSign = sign(this._days) !== sign(total) ? "-" : "";
        const hmsSign = sign(this._milliseconds) !== sign(total) ? "-" : "";

        return [
            `${totalSign}P`,
            Y ? `${ymSign + Y}Y` : "",
            M ? `${ymSign + M}M` : "",
            D ? `${daysSign + D}D` : "",
            (h || m || s) ? "T" : "",
            h ? `${hmsSign + h}H` : "",
            m ? `${hmsSign + m}M` : "",
            s ? `${hmsSign + s}S` : ""
        ].join("");
    }

    isValid() {
        return this._isValid;
    }

    locale(key) {
        if (is.undefined(key)) {
            return this._locale._abbr;
        }
        const newLocaleData = __.locale.getLocale(key);
        if (is.exist(newLocaleData)) {
            this._locale = newLocaleData;
        }
        return this;

    }

    localeData() {
        return this._locale;
    }

    static invalid() {
        return new Duration(NaN);
    }
}

const makeAs = (alias) => function () {
    return this.as(alias);
};

Duration.prototype.asMilliseconds = makeAs("ms");
Duration.prototype.asSeconds = makeAs("s");
Duration.prototype.asMinutes = makeAs("m");
Duration.prototype.asHours = makeAs("h");
Duration.prototype.asDays = makeAs("d");
Duration.prototype.asWeeks = makeAs("w");
Duration.prototype.asMonths = makeAs("M");
Duration.prototype.asYears = makeAs("y");

const makeGetter = (name) => function () {
    return this.isValid() ? this._data[name] : NaN;
};

Duration.prototype.milliseconds = makeGetter("milliseconds");
Duration.prototype.seconds = makeGetter("seconds");
Duration.prototype.minutes = makeGetter("minutes");
Duration.prototype.hours = makeGetter("hours");
Duration.prototype.days = makeGetter("days");
Duration.prototype.months = makeGetter("months");
Duration.prototype.years = makeGetter("years");

Duration.prototype.toString = Duration.prototype.toISOString;
Duration.prototype.toJSON = Duration.prototype.toISOString;
