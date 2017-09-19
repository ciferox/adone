const __ = adone.private(adone.datetime);

export default function checkOverflow(m) {
    let overflow;
    const a = m._a;

    const { getParsingFlags } = __.create;

    if (a && getParsingFlags(m).overflow === -2) {
        const { YEAR, MONTH, DATE, HOUR, MINUTE, SECOND, MILLISECOND, WEEK, WEEKDAY } = __.unit.c;

        overflow = -1;
        if (a[MONTH] < 0 || a[MONTH] > 11) {
            overflow = MONTH;
        } else if (a[DATE] < 1 || a[DATE] > __.unit.month.daysInMonth(a[YEAR], a[MONTH])) {
            overflow = DATE;
        } else if (a[HOUR] < 0 || a[HOUR] > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0))) {
            overflow = HOUR;
        } else if (a[MINUTE] < 0 || a[MINUTE] > 59) {
            overflow = MINUTE;
        } else if (a[SECOND] < 0 || a[SECOND] > 59) {
            overflow = SECOND;
        } else if (a[MILLISECOND] < 0 || a[MILLISECOND] > 999) {
            overflow = MILLISECOND;
        }

        if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
            overflow = DATE;
        }
        if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
            overflow = WEEK;
        }
        if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
            overflow = WEEKDAY;
        }

        getParsingFlags(m).overflow = overflow;
    }

    return m;
}
