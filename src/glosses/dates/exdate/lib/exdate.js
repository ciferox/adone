
const { is } = adone;
const { extend } = adone.vendor.lodash;

import { prepareConfig } from "./create/from-anything";
import { createUTC } from "./create/utc";
import { createLocal } from "./create/local";
import getParsingFlags from "./create/parsing-flags";
import { isValid as _isValid } from "./create/valid";

import Duration from "./duration";
import { formatExDate } from "./format";
import { getLocale } from "./locale";
import { matchOffset, matchShortOffset } from "./parse";

import { normalizeUnits, normalizeObjectUnits } from "./units/aliases";
import { getPrioritizedUnits } from "./units/priorities";
import { cloneWithOffset, offsetFromString } from "./units/offset";
import { isLeapYear } from "./units/year";
import { getSetWeekYearHelper } from "./units/week-year";
import { daysInMonth } from "./units/month";
import { weekOfYear, weeksInYear } from "./units/week-calendar-utils";

import { hooks, absRound, absFloor, toInt, compareArrays } from "./utils";

hooks.defaultFormat = "YYYY-MM-DDTHH:mm:ssZ";
hooks.defaultFormatUtc = "YYYY-MM-DDTHH:mm:ss[Z]";

function makeGetSet(unit, keepTime) {
    return function (value) {
        if (adone.is.exist(value)) {
            set(this, unit, value);
            hooks.updateOffset(this, keepTime);
            return this;
        } else {
            return get(this, unit);
        }
    };
}

function get(mom, unit) {
    return mom.isValid() ?
        mom._d["get" + (mom._isUTC ? "UTC" : "") + unit]() : NaN;
}

function set(mom, unit, value) {
    if (mom.isValid()) {
        mom._d["set" + (mom._isUTC ? "UTC" : "") + unit](value);
    }
}

function createAdder(direction) {
    return function (val, period) {
        val = is.string(val) ? +val : val;
        const dur = new Duration(val, period);
        addSubtract(this, dur, direction);
        return this;
    };
}

export function addSubtract(mom, duration, isAdding, updateOffset = true) {
    const milliseconds = duration._milliseconds;
    const days = absRound(duration._days);
    const months = absRound(duration._months);

    if (!mom.isValid()) {
        // No op
        return;
    }

    if (milliseconds) {
        mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
    }
    if (days) {
        set(mom, "Date", get(mom, "Date") + days * isAdding);
    }
    if (months) {
        setMonth(mom, get(mom, "Month") + months * isAdding);
    }
    if (updateOffset) {
        hooks.updateOffset(mom, days || months);
    }
}

export function getCalendarFormat(exDate, now) {
    const diff = exDate.diff(now, "days", true);
    return diff < -6 ? "sameElse" :
            diff < -1 ? "lastWeek" :
            diff < 0 ? "lastDay" :
            diff < 1 ? "sameDay" :
            diff < 2 ? "nextDay" :
            diff < 7 ? "nextWeek" : "sameElse";
}

// Plugins that add properties should also add the key here (null value),
// so we can properly clone ourselves.
const customProperties = hooks.customProperties = [];

export function copyConfig(to, from) {
    if (!is.undefined(from._isAnExDateObject)) {
        to._isAnExDateObject = from._isAnExDateObject;
    }
    if (!is.undefined(from._i)) {
        to._i = from._i;
    }
    if (!is.undefined(from._f)) {
        to._f = from._f;
    }
    if (!is.undefined(from._l)) {
        to._l = from._l;
    }
    if (!is.undefined(from._strict)) {
        to._strict = from._strict;
    }
    if (!is.undefined(from._tzm)) {
        to._tzm = from._tzm;
    }
    if (!is.undefined(from._isUTC)) {
        to._isUTC = from._isUTC;
    }
    if (!is.undefined(from._offset)) {
        to._offset = from._offset;
    }
    if (!is.undefined(from._pf)) {
        to._pf = getParsingFlags(from);
    }
    if (!is.undefined(from._locale)) {
        to._locale = from._locale;
    }

    if (customProperties.length > 0) {
        for (const prop of customProperties) {
            const val = from[prop];
            if (!is.undefined(val)) {
                to[prop] = val;
            }
        }
    }

    return to;
}

function monthDiff(a, b) {
    // difference in months
    const wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month());
    // b is in (anchor - 1 month, anchor + 1 month)
    const anchor = a.clone().add(wholeMonthDiff, "months");
    let anchor2;
    let adjust;

    if (b - anchor < 0) {
        anchor2 = a.clone().add(wholeMonthDiff - 1, "months");
        // linear across the month
        adjust = (b - anchor) / (anchor - anchor2);
    } else {
        anchor2 = a.clone().add(wholeMonthDiff + 1, "months");
        // linear across the month
        adjust = (b - anchor) / (anchor2 - anchor);
    }

    //check for negative zero, return zero if negative zero
    return -(wholeMonthDiff + adjust) || 0;
}

function setMonth(mom, value) {
    if (!mom.isValid()) {
        // No op
        return mom;
    }

    if (is.string(value)) {
        if (/^\d+$/.test(value)) {
            value = toInt(value);
        } else {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (!adone.is.number(value)) {
                return mom;
            }
        }
    }

    const dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
    mom._d["set" + (mom._isUTC ? "UTC" : "") + "Month"](value, dayOfMonth);
    return mom;
}

function parseWeekday(input, locale) {
    if (!is.string(input)) {
        return input;
    }

    if (!isNaN(input)) {
        return parseInt(input, 10);
    }

    input = locale.weekdaysParse(input);
    if (is.number(input)) {
        return input;
    }

    return null;
}

function parseIsoWeekday(input, locale) {
    if (is.string(input)) {
        return locale.weekdaysParse(input) % 7 || 7;
    }
    return isNaN(input) ? null : input;
}

function getDateOffset(m) {
    return -m._d.getTimezoneOffset();
}

export const now = function () {
    return Date.now ? Date.now() : +(new Date());
};

// Pick a exdate m from exdates so that m[fn](other) is true for all
// other. This relies on the function fn to be transitive.
//
// exdates should either be an array of exdate objects or an array, whose
// first element is an array of exdate objects.
function pickBy(fn, exdates) {
    if (exdates.length === 1 && adone.is.array(exdates[0])) {
        exdates = exdates[0];
    }
    if (!exdates.length) {
        return createLocal();
    }
    let res = exdates[0];
    for (let i = 1; i < exdates.length; ++i) {
        if (!exdates[i].isValid() || exdates[i][fn](res)) {
            res = exdates[i];
        }
    }
    return res;
}

export function min() {
    const args = [].slice.call(arguments, 0);

    return pickBy("isBefore", args);
}

export function max() {
    const args = [].slice.call(arguments, 0);

    return pickBy("isAfter", args);
}

let updateInProgress = false;

class ExDate {
    constructor(config) {
        copyConfig(this, config);
        this._d = new Date(is.exist(config._d) ? config._d.getTime() : NaN);
        if (!this.isValid()) {
            this._d = new Date(NaN);
        }
        // Prevent infinite loop in case updateOffset creates new ExDate
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            hooks.updateOffset(this);
            updateInProgress = false;
        }
    }

    get(units) {
        units = normalizeUnits(units);
        if (adone.is.function(this[units])) {
            return this[units]();
        }
        return this;
    }


    set(units, value) {
        if (typeof units === "object") {
            units = normalizeObjectUnits(units);
            const prioritized = getPrioritizedUnits(units);
            for (let i = 0; i < prioritized.length; i++) {
                this[prioritized[i].unit](units[prioritized[i].unit]);
            }
        } else {
            units = normalizeUnits(units);
            if (adone.is.function(this[units])) {
                return this[units](value);
            }
        }
        return this;
    }

    calendar(time, formats) {
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        const now = time || createLocal();
        const sod = cloneWithOffset(now, this).startOf("day");
        const format = hooks.calendarFormat(this, sod) || "sameElse";

        const output = formats && (is.function(formats[format]) ? formats[format].call(this, now) : formats[format]);

        return this.format(output || this.localeData().calendar(format, this, createLocal(now)));
    }

    clone() {
        return new ExDate(this);
    }

    diff(input, units, asFloat) {
        if (!this.isValid()) {
            return NaN;
        }

        const that = cloneWithOffset(input, this);

        if (!that.isValid()) {
            return NaN;
        }

        units = normalizeUnits(units);

        const zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;
        let output;

        if (units === "year" || units === "month" || units === "quarter") {
            output = monthDiff(this, that);
            if (units === "quarter") {
                output = output / 3;
            } else if (units === "year") {
                output = output / 12;
            }
        } else {
            const delta = this - that;
            output = units === "second" ? delta / 1e3 : // 1000
                units === "minute" ? delta / 6e4 : // 1000 * 60
                units === "hour" ? delta / 36e5 : // 1000 * 60 * 60
                units === "day" ? (delta - zoneDelta) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                units === "week" ? (delta - zoneDelta) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                delta;
        }
        return asFloat ? output : absFloor(output);
    }

    startOf(units) {
        units = normalizeUnits(units);
        // the following switch intentionally omits break keywords
        // to utilize falling through the cases.
        switch (units) {
            case "year":
                this.month(0);
                /* falls through */
            case "quarter":
            case "month":
                this.date(1);
                /* falls through */
            case "week":
            case "isoWeek":
            case "day":
            case "date":
                this.hours(0);
                /* falls through */
            case "hour":
                this.minutes(0);
                /* falls through */
            case "minute":
                this.seconds(0);
                /* falls through */
            case "second":
                this.milliseconds(0);
        }

        // weeks are a special case
        if (units === "week") {
            this.weekday(0);
        }
        if (units === "isoWeek") {
            this.isoWeekday(1);
        }

        // quarters are also special
        if (units === "quarter") {
            this.month(Math.floor(this.month() / 3) * 3);
        }

        return this;
    }

    endOf(units) {
        units = normalizeUnits(units);
        if (units === undefined || units === "millisecond") {
            return this;
        }

        // 'date' is an alias for 'day', so it should be considered as such.
        if (units === "date") {
            units = "day";
        }

        return this.startOf(units).add(1, (units === "isoWeek" ? "week" : units)).subtract(1, "ms");
    }

    toString() {
        return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
    }

    toISOString() {
        const m = this.clone().utc();
        if (0 < m.year() && m.year() <= 9999) {
            if (adone.is.function(Date.prototype.toISOString)) {
                // native implementation is ~50x faster, use it when we can
                return this.toDate().toISOString();
            } else {
                return formatExDate(m, "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
            }
        } else {
            return formatExDate(m, "YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
        }
    }

    /**
     * Return a human readable representation of an ExDate that can
     * also be evaluated to get a new ExDate which is the same
     *
     * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
     */
    inspect() {
        if (!this.isValid()) {
            return "adone.date.invalid(/* " + this._i + " */)";
        }
        let func = "adone.date";
        let zone = "";
        if (!this.isLocal()) {
            func = this.utcOffset() === 0 ? "adone.date.utc" : "adone.date.parseZone";
            zone = "Z";
        }
        const prefix = "[" + func + "(\"]";
        const year = (0 < this.year() && this.year() <= 9999) ? "YYYY" : "YYYYYY";
        const datetime = "-MM-DD[T]HH:mm:ss.SSS";
        const suffix = zone + "[\")]";

        return this.format(prefix + year + datetime + suffix);
    }

    format(inputString) {
        if (!inputString) {
            inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
        }
        const output = formatExDate(this, inputString);
        return this.localeData().postformat(output);
    }

    from(time, withoutSuffix) {
        if (this.isValid() &&
                ((is.exdate(time) && time.isValid()) ||
                 createLocal(time).isValid())) {
            return new Duration({ to: this, from: time }).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    fromNow(withoutSuffix) {
        return this.from(createLocal(), withoutSuffix);
    }

    to(time, withoutSuffix) {
        if (this.isValid() &&
                ((is.exdate(time) && time.isValid()) ||
                 createLocal(time).isValid())) {
            return new Duration({ from: this, to: time }).locale(this.locale()).humanize(!withoutSuffix);
        } else {
            return this.localeData().invalidDate();
        }
    }

    toNow(withoutSuffix) {
        return this.to(createLocal(), withoutSuffix);
    }

    isValid() {
        return _isValid(this);
    }

    parsingFlags() {
        return extend({}, getParsingFlags(this));
    }

    invalidAt() {
        return getParsingFlags(this).overflow;
    }

    isAfter(input, units) {
        const localInput = is.exdate(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(!is.undefined(units) ? units : "millisecond");
        if (units === "millisecond") {
            return this.valueOf() > localInput.valueOf();
        } else {
            return localInput.valueOf() < this.clone().startOf(units).valueOf();
        }
    }

    isBefore(input, units) {
        const localInput = is.exdate(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(!is.undefined(units) ? units : "millisecond");
        if (units === "millisecond") {
            return this.valueOf() < localInput.valueOf();
        } else {
            return this.clone().endOf(units).valueOf() < localInput.valueOf();
        }
    }

    isBetween(from, to, units, inclusivity) {
        inclusivity = inclusivity || "()";
        return (inclusivity[0] === "(" ? this.isAfter(from, units) : !this.isBefore(from, units)) &&
            (inclusivity[1] === ")" ? this.isBefore(to, units) : !this.isAfter(to, units));
    }

    isSame(input, units) {
        const localInput = is.exdate(input) ? input : createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = normalizeUnits(units || "millisecond");
        if (units === "millisecond") {
            return this.valueOf() === localInput.valueOf();
        } else {
            const inputMs = localInput.valueOf();
            return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
        }
    }

    isSameOrAfter(input, units) {
        return this.isSame(input, units) || this.isAfter(input, units);
    }

    isSameOrBefore(input, units) {
        return this.isSame(input, units) || this.isBefore(input, units);
    }

    locale(key) {
        let newLocaleData;

        if (is.undefined(key)) {
            return this._locale._abbr;
        } else {
            newLocaleData = getLocale(key);
            if (is.exist(newLocaleData)) {
                this._locale = newLocaleData;
            }
            return this;
        }
    }

    localeData() {
        return this._locale;
    }

    valueOf() {
        return this._d.valueOf() - ((this._offset || 0) * 60000);
    }

    unix() {
        return Math.floor(this.valueOf() / 1000);
    }

    toDate() {
        return new Date(this.valueOf());
    }

    toArray() {
        const m = this;
        return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
    }

    toObject() {
        const m = this;
        return {
            years: m.year(),
            months: m.month(),
            date: m.date(),
            hours: m.hours(),
            minutes: m.minutes(),
            seconds: m.seconds(),
            milliseconds: m.milliseconds()
        };
    }

    toJSON() {
        // new Date(NaN).toJSON() === null
        return this.isValid() ? this.toISOString() : null;
    }

    creationData() {
        return {
            input: this._i,
            format: this._f,
            locale: this._locale,
            isUTC: this._isUTC,
            strict: this._strict
        };
    }

    isLeapYear() {
        return isLeapYear(this.year());
    }

    weekYear(input) {
        return getSetWeekYearHelper.call(this,
                input,
                this.week(),
                this.weekday(),
                this.localeData()._week.dow,
                this.localeData()._week.doy);
    }

    isoWeekYear(input) {
        return getSetWeekYearHelper.call(this,
                input, this.isoWeek(), this.isoWeekday(), 1, 4);
    }

    weeksInYear() {
        const weekInfo = this.localeData()._week;
        return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    isoWeeksInYear() {
        return weeksInYear(this.year(), 1, 4);
    }

    quarter(input) {
        if (is.nil(input)) {
            return Math.ceil((this.month() + 1) / 3);
        } else {
            return this.month((input - 1) * 3 + this.month() % 3);
        }
    }

    month(value) {
        if (is.exist(value)) {
            setMonth(this, value);
            hooks.updateOffset(this, true);
            return this;
        } else {
            return get(this, "Month");
        }
    }

    daysInMonth() {
        return daysInMonth(this.year(), this.month());
    }

    week(input) {
        const week = this.localeData().week(this);
        return is.nil(input) ? week : this.add((input - week) * 7, "d");
    }

    isoWeek(input) {
        const week = weekOfYear(this, 1, 4).week;
        return is.nil(input) ? week : this.add((input - week) * 7, "d");
    }

    day(input) {
        if (!this.isValid()) {
            return is.exist(input) ? this : NaN;
        }
        const day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
        if (is.exist(input)) {
            input = parseWeekday(input, this.localeData());
            return this.add(input - day, "d");
        } else {
            return day;
        }
    }

    weekday(input) {
        if (!this.isValid()) {
            return is.exist(input) ? this : NaN;
        }
        const weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
        return is.nil(input) ? weekday : this.add(input - weekday, "d");
    }

    isoWeekday(input) {
        if (!this.isValid()) {
            return is.exist(input) ? this : NaN;
        }

        // behaves the same as exdate#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.

        if (is.exist(input)) {
            const weekday = parseIsoWeekday(input, this.localeData());
            return this.day(this.day() % 7 ? weekday : weekday - 7);
        } else {
            return this.day() || 7;
        }
    }

    dayOfYear(input) {
        const dayOfYear = Math.round((this.clone().startOf("day") - this.clone().startOf("year")) / 864e5) + 1;
        return is.nil(input) ? dayOfYear : this.add((input - dayOfYear), "d");
    }

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    utcOffset(input, keepLocalTime) {
        const offset = this._offset || 0;
        if (!this.isValid()) {
            return is.exist(input) ? this : NaN;
        }
        if (is.exist(input)) {
            if (is.string(input)) {
                input = offsetFromString(matchShortOffset, input);
                if (input === null) {
                    return this;
                }
            } else if (Math.abs(input) < 16) {
                input = input * 60;
            }
            let localAdjust;
            if (!this._isUTC && keepLocalTime) {
                localAdjust = getDateOffset(this);
            }
            this._offset = input;
            this._isUTC = true;
            if (is.exist(localAdjust)) {
                this.add(localAdjust, "m");
            }
            if (offset !== input) {
                if (!keepLocalTime || this._changeInProgress) {
                    addSubtract(this, new Duration(input - offset, "m"), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        } else {
            return this._isUTC ? offset : getDateOffset(this);
        }
    }

    utc(keepLocalTime) {
        return this.utcOffset(0, keepLocalTime);
    }

    local(keepLocalTime) {
        if (this._isUTC) {
            this.utcOffset(0, keepLocalTime);
            this._isUTC = false;

            if (keepLocalTime) {
                this.subtract(getDateOffset(this), "m");
            }
        }
        return this;
    }

    parseZone() {
        if (is.exist(this._tzm)) {
            this.utcOffset(this._tzm);
        } else if (is.string(this._i)) {
            const tZone = offsetFromString(matchOffset, this._i);
            if (is.exist(tZone)) {
                this.utcOffset(tZone);
            }        else {
                this.utcOffset(0, true);
            }
        }
        return this;
    }

    hasAlignedHourOffset(input) {
        if (!this.isValid()) {
            return false;
        }
        input = input ? createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    isDST() {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset() ||
            this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    isDSTShifted() {
        if (!adone.is.undefined(this._isDSTShifted)) {
            return this._isDSTShifted;
        }

        let c = {};

        copyConfig(c, this);
        c = prepareConfig(c);

        if (c._a) {
            const other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
            this._isDSTShifted = this.isValid() &&
                compareArrays(c._a, other.toArray()) > 0;
        } else {
            this._isDSTShifted = false;
        }

        return this._isDSTShifted;
    }

    isLocal() {
        return this.isValid() ? !this._isUTC : false;
    }

    isUtcOffset() {
        return this.isValid() ? this._isUTC : false;
    }

    isUtc() {
        return this.isValid() ? this._isUTC && this._offset === 0 : false;
    }

    zoneAbbr() {
        return this._isUTC ? "UTC" : "";
    }

    zoneName() {
        return this._isUTC ? "Coordinated Universal Time" : "";
    }
}

adone.tag.set(ExDate, adone.tag.EXDATE);

ExDate.prototype.isUTC    = ExDate.prototype.isUtc;
ExDate.prototype.add      = createAdder(1, "add");
ExDate.prototype.subtract = createAdder(-1, "subtract");


// Units
ExDate.prototype.year        = makeGetSet("FullYear", true);
ExDate.prototype.quarters    = ExDate.prototype.quarter;
ExDate.prototype.date        = makeGetSet("Date", true);
ExDate.prototype.days        = ExDate.prototype.day;
ExDate.prototype.weeks       = ExDate.prototype.week;
ExDate.prototype.isoWeeks    = ExDate.prototype.isoWeek;
ExDate.prototype.minute      = ExDate.prototype.minutes = makeGetSet("Minutes", false);
ExDate.prototype.second      = ExDate.prototype.seconds = makeGetSet("Seconds", false);
ExDate.prototype.millisecond = ExDate.prototype.milliseconds = makeGetSet("Milliseconds", false);

// Setting the hour should keep the time, because the user explicitly
// specified which hour he wants. So trying to maintain the same hour (in
// a new timezone) makes sense. Adding/subtracting hours does not follow
// this rule.
ExDate.prototype.hours = ExDate.prototype.hour = makeGetSet("Hours", true);

export default ExDate;
