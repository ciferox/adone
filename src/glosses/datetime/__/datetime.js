const { is, datetime } = adone;
const __ = adone.private(datetime);

const { hooks, absRound, absFloor, toInt, compareArrays } = __.util;

const get = (mom, unit) => {
    return mom.isValid()
        ? mom._d[`get${mom._isUTC ? "UTC" : ""}${unit}`]()
        : NaN;
};

const set = (mom, unit, value) => {
    if (mom.isValid() && !isNaN(value)) {
        if (unit === "FullYear" && __.unit.year.isLeapYear(mom.year()) && mom.month() === 1 && mom.date() === 29) {
            mom._d[`set${mom._isUTC ? "UTC" : ""}${unit}`](value, mom.month(), __.unit.month.daysInMonth(value, mom.month()));
        } else {
            mom._d[`set${mom._isUTC ? "UTC" : ""}${unit}`](value);
        }
    }
};

const makeGetSet = (unit, keepTime) => function (value) {
    if (is.exist(value)) {
        set(this, unit, value);
        hooks.updateOffset(this, keepTime);
        return this;
    }
    return get(this, unit);
};

export const addSubtract = (mom, duration, isAdding, updateOffset = true) => {
    const milliseconds = duration._milliseconds;
    const days = absRound(duration._days);
    const months = absRound(duration._months);

    if (!mom.isValid()) {
        // No op
        return;
    }

    if (months) {
        setMonth(mom, get(mom, "Month") + months * isAdding);
    }
    if (days) {
        set(mom, "Date", get(mom, "Date") + days * isAdding);
    }
    if (milliseconds) {
        mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
    }
    if (updateOffset) {
        hooks.updateOffset(mom, days || months);
    }
};

const createAdder = (direction) => function (val, period) {
    val = is.string(val) ? Number(val) : val;
    const dur = new datetime.Duration(val, period);
    addSubtract(this, dur, direction);
    return this;
};

export const getCalendarFormat = (datetime, now) => {
    const diff = datetime.diff(now, "days", true);

    if (diff < -6) {
        return "sameElse";
    }

    if (diff < -1) {
        return "lastWeek";
    }

    if (diff < 0) {
        return "lastDay";
    }

    if (diff < 1) {
        return "sameDay";
    }

    if (diff < 2) {
        return "nextDay";
    }

    if (diff < 7) {
        return "nextWeek";
    }

    return "sameElse";
};

// Plugins that add properties should also add the key here (null value),
// so we can properly clone ourselves.
const customProperties = hooks.customProperties = [];

export const copyConfig = (to, from) => {
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
        to._pf = __.create.getParsingFlags(from);
    }
    if (!is.undefined(from._locale)) {
        to._locale = from._locale;
    }
    if (!is.undefined(from._z)) {
        to._z = from._z;
    }
    if (!is.undefined(from._a)) {
        to._a = from._a;
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
};

const monthDiff = (a, b) => {
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
};

const setMonth = (mom, value) => {
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
            if (!is.number(value)) {
                return mom;
            }
        }
    }

    const dayOfMonth = Math.min(mom.date(), __.unit.month.daysInMonth(mom.year(), value));
    mom._d[`set${mom._isUTC ? "UTC" : ""}Month`](value, dayOfMonth);
    return mom;
};

const parseWeekday = (input, locale) => {
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
};

const parseIsoWeekday = (input, locale) => {
    if (is.string(input)) {
        return locale.weekdaysParse(input) % 7 || 7;
    }
    return isNaN(input) ? null : input;
};

const getDateOffset = (m) => {
    return -m._d.getTimezoneOffset();
};

export const now = function () {
    return Date.now ? Date.now() : Number(new Date());
};

// Pick a datetime m from datetimes so that m[fn](other) is true for all
// other. This relies on the function fn to be transitive.
//
// datetimes should either be an array of datetime objects or an array, whose
// first element is an array of datetime objects.
const pickBy = (fn, datetimes) => {
    if (datetimes.length === 1 && is.array(datetimes[0])) {
        datetimes = datetimes[0];
    }
    if (!datetimes.length) {
        return __.create.createLocal();
    }
    let res = datetimes[0];
    for (let i = 1; i < datetimes.length; ++i) {
        if (!datetimes[i].isValid() || datetimes[i][fn](res)) {
            res = datetimes[i];
        }
    }
    return res;
};

export const min = (...args) => pickBy("isBefore", args);

export const max = (...args) => pickBy("isAfter", args);

let updateInProgress = false;

export class Datetime {
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
        units = __.unit.alias.normalizeUnits(units);
        if (is.function(this[units])) {
            return this[units]();
        }
        return this;
    }


    set(units, value) {
        if (is.object(units)) {
            units = __.unit.alias.normalizeObjectUnits(units);
            const prioritized = __.unit.priority.getPrioritizedUnits(units);
            for (let i = 0; i < prioritized.length; i++) {
                this[prioritized[i].unit](units[prioritized[i].unit]);
            }
        } else {
            units = __.unit.alias.normalizeUnits(units);
            if (is.function(this[units])) {
                return this[units](value);
            }
        }
        return this;
    }

    calendar(time, formats) {
        // We want to compare the start of today, vs this.
        // Getting start-of-today depends on whether we're local/utc/offset or not.
        const now = time || __.create.createLocal();
        const sod = __.unit.offset.cloneWithOffset(now, this).startOf("day");
        const format = hooks.calendarFormat(this, sod) || "sameElse";

        const output = formats && (is.function(formats[format]) ? formats[format].call(this, now) : formats[format]);

        return this.format(output || this.localeData().calendar(format, this, __.create.createLocal(now)));
    }

    clone() {
        return new Datetime(this);
    }

    diff(input, units, asFloat) {
        if (!this.isValid()) {
            return NaN;
        }

        const that = __.unit.offset.cloneWithOffset(input, this);

        if (!that.isValid()) {
            return NaN;
        }

        units = __.unit.alias.normalizeUnits(units);

        const zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;
        let output;

        switch (units) {
            case "year": output = monthDiff(this, that) / 12; break;
            case "month": output = monthDiff(this, that); break;
            case "quarter": output = monthDiff(this, that) / 3; break;
            case "second": output = (this - that) / 1e3; break; // 1000
            case "minute": output = (this - that) / 6e4; break; // 1000 * 60
            case "hour": output = (this - that) / 36e5; break; // 1000 * 60 * 60
            case "day": output = (this - that - zoneDelta) / 864e5; break; // 1000 * 60 * 60 * 24, negate dst
            case "week": output = (this - that - zoneDelta) / 6048e5; break; // 1000 * 60 * 60 * 24 * 7, negate dst
            default: output = this - that;
        }
        return asFloat ? output : absFloor(output);
    }

    startOf(units) {
        units = __.unit.alias.normalizeUnits(units);
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
        units = __.unit.alias.normalizeUnits(units);
        if (is.undefined(units) || units === "millisecond") {
            return this;
        }

        // 'date' is an alias for 'day', so it should be considered as such.
        if (units === "date") {
            units = "day";
        }

        return this.startOf(units).add(1, units === "isoWeek" ? "week" : units).subtract(1, "ms");
    }

    toString() {
        return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
    }

    toISOString(keepOffset) {
        if (!this.isValid()) {
            return null;
        }
        const utc = keepOffset !== true;
        const m = utc ? this.clone().utc() : this;
        if (m.year() < 0 || m.year() > 9999) {
            return __.format.formatExDate(m, utc ? "YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]" : "YYYYYY-MM-DD[T]HH:mm:ss.SSSZ");
        }
        if (is.function(Date.prototype.toISOString)) {
            // native implementation is ~50x faster, use it when we can
            if (utc) {
                return this.toDate().toISOString();
            }
            return new Date(this._d.valueOf()).toISOString().replace("Z", __.format.formatExDate(m, "Z"));

        }
        return __.format.formatExDate(m, utc ? "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]" : "YYYY-MM-DD[T]HH:mm:ss.SSSZ");
    }

    /**
     * Return a human readable representation of an ExDate that can
     * also be evaluated to get a new ExDate which is the same
     *
     * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
     */
    inspect() {
        if (!this.isValid()) {
            return `adone.datetime.invalid(/* ${this._i} */)`;
        }
        let func = "adone.datetime";
        let zone = "";
        if (!this.isLocal()) {
            func = this.utcOffset() === 0 ? "adone.datetime.utc" : "adone.datetime.parseZone";
            zone = "Z";
        }
        const prefix = `[${func}("]`;
        const year = this.year() >= 0 && this.year() <= 9999 ? "YYYY" : "YYYYYY";
        const datetime = "-MM-DD[T]HH:mm:ss.SSS";
        const suffix = `${zone}[")]`;

        return this.format(prefix + year + datetime + suffix);
    }

    format(inputString) {
        if (!inputString) {
            inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
        }
        const output = __.format.formatExDate(this, inputString);
        return this.localeData().postformat(output);
    }

    from(time, withoutSuffix) {
        if (
            this.isValid()
            && (
                (is.datetime(time) && time.isValid())
                || __.create.createLocal(time).isValid()
            )
        ) {
            return new datetime.Duration({ to: this, from: time }).locale(this.locale()).humanize(!withoutSuffix);
        }
        return this.localeData().invalidDate();

    }

    fromNow(withoutSuffix) {
        return this.from(__.create.createLocal(), withoutSuffix);
    }

    to(time, withoutSuffix) {
        if (
            this.isValid()
            && (
                (is.datetime(time) && time.isValid())
                || __.create.createLocal(time).isValid()
            )
        ) {
            return new datetime.Duration({ from: this, to: time }).locale(this.locale()).humanize(!withoutSuffix);
        }
        return this.localeData().invalidDate();

    }

    toNow(withoutSuffix) {
        return this.to(__.create.createLocal(), withoutSuffix);
    }

    isValid() {
        return __.create.isValid(this);
    }

    parsingFlags() {
        return { ...__.create.getParsingFlags(this) };
    }

    invalidAt() {
        return __.create.getParsingFlags(this).overflow;
    }

    isAfter(input, units) {
        const localInput = is.datetime(input) ? input : __.create.createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = __.unit.alias.normalizeUnits(!is.undefined(units) ? units : "millisecond");
        if (units === "millisecond") {
            return this.valueOf() > localInput.valueOf();
        }
        return localInput.valueOf() < this.clone().startOf(units).valueOf();

    }

    isBefore(input, units) {
        const localInput = is.datetime(input) ? input : __.create.createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = __.unit.alias.normalizeUnits(!is.undefined(units) ? units : "millisecond");
        if (units === "millisecond") {
            return this.valueOf() < localInput.valueOf();
        }
        return this.clone().endOf(units).valueOf() < localInput.valueOf();

    }

    isBetween(from, to, units, inclusivity) {
        inclusivity = inclusivity || "()";
        return (inclusivity[0] === "(" ? this.isAfter(from, units) : !this.isBefore(from, units))
            && (inclusivity[1] === ")" ? this.isBefore(to, units) : !this.isAfter(to, units));
    }

    isSame(input, units) {
        const localInput = is.datetime(input) ? input : __.create.createLocal(input);
        if (!(this.isValid() && localInput.isValid())) {
            return false;
        }
        units = __.unit.alias.normalizeUnits(units || "millisecond");
        if (units === "millisecond") {
            return this.valueOf() === localInput.valueOf();
        }
        const inputMs = localInput.valueOf();
        return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();

    }

    isSameOrAfter(input, units) {
        return this.isSame(input, units) || this.isAfter(input, units);
    }

    isSameOrBefore(input, units) {
        return this.isSame(input, units) || this.isBefore(input, units);
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

    valueOf() {
        return this._d.valueOf() - ((this._offset || 0) * 60000);
    }

    unix() {
        return Math.floor(this.valueOf() / 1000);
    }

    toDate() {
        return new Date(this.valueOf());
    }

    toDOS() {
        let date = 0;
        date |= this.date() & 0x1f; // 1-31
        date |= ((this.month() + 1) & 0xf) << 5; // 0-11, 1-12
        date |= ((this.year() - 1980) & 0x7f) << 9; // 0-128, 1980-2108

        let time = 0;
        time |= Math.floor(this.seconds() / 2); // 0-59, 0-29 (lose odd numbers)
        time |= (this.minutes() & 0x3f) << 5; // 0-59
        time |= (this.hours() & 0x1f) << 11; // 0-23

        return { date, time };
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
        return __.unit.year.isLeapYear(this.year());
    }

    weekYear(input) {
        return __.unit.weekYear.getSetWeekYearHelper.call(this,
            input,
            this.week(),
            this.weekday(),
            this.localeData()._week.dow,
            this.localeData()._week.doy
        );
    }

    isoWeekYear(input) {
        return __.unit.weekYear.getSetWeekYearHelper.call(this,
            input,
            this.isoWeek(),
            this.isoWeekday(),
            1,
            4
        );
    }

    weeksInYear() {
        const weekInfo = this.localeData()._week;
        return __.unit.weekCalendar.weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    isoWeeksInYear() {
        return __.unit.weekCalendar.weeksInYear(this.year(), 1, 4);
    }

    quarter(input) {
        if (is.nil(input)) {
            return Math.ceil((this.month() + 1) / 3);
        }
        return this.month((input - 1) * 3 + this.month() % 3);

    }

    month(value) {
        if (is.exist(value)) {
            setMonth(this, value);
            hooks.updateOffset(this, true);
            return this;
        }
        return get(this, "Month");

    }

    daysInMonth() {
        return __.unit.month.daysInMonth(this.year(), this.month());
    }

    week(input) {
        const week = this.localeData().week(this);
        return is.nil(input) ? week : this.add((input - week) * 7, "d");
    }

    isoWeek(input) {
        const week = __.unit.weekCalendar.weekOfYear(this, 1, 4).week;
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
        }
        return day;

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

        // behaves the same as datetime#day except
        // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
        // as a setter, sunday should belong to the previous week.

        if (is.exist(input)) {
            const weekday = parseIsoWeekday(input, this.localeData());
            return this.day(this.day() % 7 ? weekday : weekday - 7);
        }
        return this.day() || 7;

    }

    dayOfYear(input) {
        const dayOfYear = Math.round((this.clone().startOf("day") - this.clone().startOf("year")) / 864e5) + 1;
        return is.nil(input) ? dayOfYear : this.add(input - dayOfYear, "d");
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
    utcOffset(input, keepLocalTime, keepMinutes) {
        const offset = this._offset || 0;
        if (!this.isValid()) {
            return is.exist(input) ? this : NaN;
        }
        if (is.exist(input)) {
            if (is.string(input)) {
                input = __.unit.offset.offsetFromString(__.parse.matchShortOffset, input);
                if (is.null(input)) {
                    return this;
                }
            } else if (Math.abs(input) < 16 && !keepMinutes) {
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
                    addSubtract(this, new datetime.Duration(input - offset, "m"), 1, false);
                } else if (!this._changeInProgress) {
                    this._changeInProgress = true;
                    hooks.updateOffset(this, true);
                    this._changeInProgress = null;
                }
            }
            return this;
        }
        return this._isUTC ? offset : getDateOffset(this);

    }

    utc(keepLocalTime) {
        this._z = null;
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
            this.utcOffset(this._tzm, false, true);
        } else if (is.string(this._i)) {
            const tZone = __.unit.offset.offsetFromString(__.parse.matchOffset, this._i);
            if (is.exist(tZone)) {
                this.utcOffset(tZone);
            } else {
                this.utcOffset(0, true);
            }
        }
        return this;
    }

    hasAlignedHourOffset(input) {
        if (!this.isValid()) {
            return false;
        }
        input = input ? __.create.createLocal(input).utcOffset() : 0;

        return (this.utcOffset() - input) % 60 === 0;
    }

    isDST() {
        return (
            this.utcOffset() > this.clone().month(0).utcOffset()
            || this.utcOffset() > this.clone().month(5).utcOffset()
        );
    }

    isDSTShifted() {
        if (!is.undefined(this._isDSTShifted)) {
            return this._isDSTShifted;
        }

        let c = {};

        copyConfig(c, this);
        c = __.create.prepareConfig(c);

        if (c._a) {
            const other = c._isUTC ? __.create.createUTC(c._a) : __.create.createLocal(c._a);
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
        if (this._z) {
            return this._z.abbr(this);
        }
        return this._isUTC ? "UTC" : "";
    }

    zoneName() {
        if (this._z) {
            return this._z.abbr(this);
        }
        return this._isUTC ? "Coordinated Universal Time" : "";
    }

    tz(name, keepTime) {
        if (name) {
            this._z = __.tz.getZone(name);
            if (this._z) {
                datetime.updateOffset(this, keepTime);
            } else {
                throw new Error(`datetime timezone has no data for ${name}.`);
            }
            return this;
        }
        if (this._z) {
            return this._z.name;
        }
    }
}

adone.tag.add(Datetime, "DATETIME");

Datetime.prototype.isUTC = Datetime.prototype.isUtc;
Datetime.prototype.add = createAdder(1, "add");
Datetime.prototype.subtract = createAdder(-1, "subtract");


// Units
Datetime.prototype.year = makeGetSet("FullYear", true);
Datetime.prototype.quarters = Datetime.prototype.quarter;
Datetime.prototype.date = makeGetSet("Date", true);
Datetime.prototype.days = Datetime.prototype.day;
Datetime.prototype.weeks = Datetime.prototype.week;
Datetime.prototype.isoWeeks = Datetime.prototype.isoWeek;
Datetime.prototype.minute = Datetime.prototype.minutes = makeGetSet("Minutes", false);
Datetime.prototype.second = Datetime.prototype.seconds = makeGetSet("Seconds", false);
Datetime.prototype.millisecond = Datetime.prototype.milliseconds = makeGetSet("Milliseconds", false);

// Setting the hour should keep the time, because the user explicitly
// specified which hour he wants. So trying to maintain the same hour (in
// a new timezone) makes sense. Adding/subtracting hours does not follow
// this rule.
Datetime.prototype.hours = Datetime.prototype.hour = makeGetSet("Hours", true);
