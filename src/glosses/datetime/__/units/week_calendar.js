const __ = adone.getPrivate(adone.datetime);

// start-of-first-week - start-of-year
const firstWeekOffset = (year, dow, doy) => {
    // first-week day -- which january is always in the first week (4 for iso, 1 for other)
    const fwd = 7 + dow - doy;
    // first-week day local weekday -- which local weekday is fwd
    const fwdlw = (7 + __.create.createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

    return -fwdlw + fwd - 1;
};

//http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
export const dayOfYearFromWeeks = (year, week, weekday, dow, doy) => {
    const localWeekday = (7 + weekday - dow) % 7;
    const weekOffset = firstWeekOffset(year, dow, doy);
    const dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset;

    let resYear;
    let resDayOfYear;

    const { daysInYear } = __.unit.year;

    if (dayOfYear <= 0) {
        resYear = year - 1;
        resDayOfYear = daysInYear(resYear) + dayOfYear;
    } else if (dayOfYear > daysInYear(year)) {
        resYear = year + 1;
        resDayOfYear = dayOfYear - daysInYear(year);
    } else {
        resYear = year;
        resDayOfYear = dayOfYear;
    }

    return {
        year: resYear,
        dayOfYear: resDayOfYear
    };
};

export const weeksInYear = (year, dow, doy) => {
    const weekOffset = firstWeekOffset(year, dow, doy);
    const weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
    return (__.unit.year.daysInYear(year) - weekOffset + weekOffsetNext) / 7;
};

export const weekOfYear = (mom, dow, doy) => {
    const weekOffset = firstWeekOffset(mom.year(), dow, doy);
    const week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1;

    let resWeek;
    let resYear;

    if (week < 1) {
        resYear = mom.year() - 1;
        resWeek = week + weeksInYear(resYear, dow, doy);
    } else if (week > weeksInYear(mom.year(), dow, doy)) {
        resWeek = week - weeksInYear(mom.year(), dow, doy);
        resYear = mom.year() + 1;
    } else {
        resYear = mom.year();
        resWeek = week;
    }

    return {
        week: resWeek,
        year: resYear
    };
};

