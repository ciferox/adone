describe("start and end of units", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("start of year", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("year");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("years");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("y");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 0, "strip out the month");
        assert.equal(m.date(), 1, "strip out the day");
        assert.equal(m.hours(), 0, "strip out the hours");
        assert.equal(m.minutes(), 0, "strip out the minutes");
        assert.equal(m.seconds(), 0, "strip out the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of year", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("year");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("years");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("y");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 11, "set the month");
        assert.equal(m.date(), 31, "set the day");
        assert.equal(m.hours(), 23, "set the hours");
        assert.equal(m.minutes(), 59, "set the minutes");
        assert.equal(m.seconds(), 59, "set the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });

    it("start of quarter", () => {
        const m = adone.date(new Date(2011, 4, 2, 3, 4, 5, 6)).startOf("quarter");
        const ms = adone.date(new Date(2011, 4, 2, 3, 4, 5, 6)).startOf("quarters");
        const ma = adone.date(new Date(2011, 4, 2, 3, 4, 5, 6)).startOf("Q");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.quarter(), 2, "keep the quarter");
        assert.equal(m.month(), 3, "strip out the month");
        assert.equal(m.date(), 1, "strip out the day");
        assert.equal(m.hours(), 0, "strip out the hours");
        assert.equal(m.minutes(), 0, "strip out the minutes");
        assert.equal(m.seconds(), 0, "strip out the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of quarter", () => {
        const m = adone.date(new Date(2011, 4, 2, 3, 4, 5, 6)).endOf("quarter");
        const ms = adone.date(new Date(2011, 4, 2, 3, 4, 5, 6)).endOf("quarters");
        const ma = adone.date(new Date(2011, 4, 2, 3, 4, 5, 6)).endOf("Q");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.quarter(), 2, "keep the quarter");
        assert.equal(m.month(), 5, "set the month");
        assert.equal(m.date(), 30, "set the day");
        assert.equal(m.hours(), 23, "set the hours");
        assert.equal(m.minutes(), 59, "set the minutes");
        assert.equal(m.seconds(), 59, "set the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });

    it("start of month", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("month");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("months");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("M");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 1, "strip out the day");
        assert.equal(m.hours(), 0, "strip out the hours");
        assert.equal(m.minutes(), 0, "strip out the minutes");
        assert.equal(m.seconds(), 0, "strip out the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of month", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("month");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("months");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("M");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 28, "set the day");
        assert.equal(m.hours(), 23, "set the hours");
        assert.equal(m.minutes(), 59, "set the minutes");
        assert.equal(m.seconds(), 59, "set the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });

    it("start of week", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("week");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("weeks");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("w");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 0, "rolls back to January");
        assert.equal(m.day(), 0, "set day of week");
        assert.equal(m.date(), 30, "set correct date");
        assert.equal(m.hours(), 0, "strip out the hours");
        assert.equal(m.minutes(), 0, "strip out the minutes");
        assert.equal(m.seconds(), 0, "strip out the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of week", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("week");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("weeks");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("weeks");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.day(), 6, "set the day of the week");
        assert.equal(m.date(), 5, "set the day");
        assert.equal(m.hours(), 23, "set the hours");
        assert.equal(m.minutes(), 59, "set the minutes");
        assert.equal(m.seconds(), 59, "set the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });

    it("start of iso-week", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("isoWeek");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("isoWeeks");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("W");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 0, "rollback to January");
        assert.equal(m.isoWeekday(), 1, "set day of iso-week");
        assert.equal(m.date(), 31, "set correct date");
        assert.equal(m.hours(), 0, "strip out the hours");
        assert.equal(m.minutes(), 0, "strip out the minutes");
        assert.equal(m.seconds(), 0, "strip out the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of iso-week", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("isoWeek");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("isoWeeks");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("W");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.isoWeekday(), 7, "set the day of the week");
        assert.equal(m.date(), 6, "set the day");
        assert.equal(m.hours(), 23, "set the hours");
        assert.equal(m.minutes(), 59, "set the minutes");
        assert.equal(m.seconds(), 59, "set the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });

    it("start of day", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("day");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("days");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("d");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 0, "strip out the hours");
        assert.equal(m.minutes(), 0, "strip out the minutes");
        assert.equal(m.seconds(), 0, "strip out the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of day", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("day");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("days");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("d");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 23, "set the hours");
        assert.equal(m.minutes(), 59, "set the minutes");
        assert.equal(m.seconds(), 59, "set the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });

    it("start of date", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("date");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("dates");

        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 0, "strip out the hours");
        assert.equal(m.minutes(), 0, "strip out the minutes");
        assert.equal(m.seconds(), 0, "strip out the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of date", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("date");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("dates");

        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 23, "set the hours");
        assert.equal(m.minutes(), 59, "set the minutes");
        assert.equal(m.seconds(), 59, "set the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });


    it("start of hour", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("hour");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("hours");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("h");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 3, "keep the hours");
        assert.equal(m.minutes(), 0, "strip out the minutes");
        assert.equal(m.seconds(), 0, "strip out the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of hour", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("hour");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("hours");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("h");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 3, "keep the hours");
        assert.equal(m.minutes(), 59, "set the minutes");
        assert.equal(m.seconds(), 59, "set the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });

    it("start of minute", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("minute");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("minutes");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("m");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 3, "keep the hours");
        assert.equal(m.minutes(), 4, "keep the minutes");
        assert.equal(m.seconds(), 0, "strip out the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of minute", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("minute");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("minutes");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("m");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 3, "keep the hours");
        assert.equal(m.minutes(), 4, "keep the minutes");
        assert.equal(m.seconds(), 59, "set the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });

    it("start of second", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("second");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("seconds");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).startOf("s");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 3, "keep the hours");
        assert.equal(m.minutes(), 4, "keep the minutes");
        assert.equal(m.seconds(), 5, "keep the the seconds");
        assert.equal(m.milliseconds(), 0, "strip out the milliseconds");
    });

    it("end of second", () => {
        const m = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("second");
        const ms = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("seconds");
        const ma = adone.date(new Date(2011, 1, 2, 3, 4, 5, 6)).endOf("s");
        assert.equal(Number(m), Number(ms), "Plural or singular should work");
        assert.equal(Number(m), Number(ma), "Full or abbreviated should work");
        assert.equal(m.year(), 2011, "keep the year");
        assert.equal(m.month(), 1, "keep the month");
        assert.equal(m.date(), 2, "keep the day");
        assert.equal(m.hours(), 3, "keep the hours");
        assert.equal(m.minutes(), 4, "keep the minutes");
        assert.equal(m.seconds(), 5, "keep the seconds");
        assert.equal(m.milliseconds(), 999, "set the seconds");
    });

    it("startOf across DST +1", () => {
        const oldUpdateOffset = adone.date.updateOffset;
        const // Based on a real story somewhere in America/Los_Angeles
            dstAt = adone.date("2014-03-09T02:00:00-08:00").parseZone();
        let m;

        adone.date.updateOffset = function (mom, keepTime) {
            if (mom.isBefore(dstAt)) {
                mom.utcOffset(-8, keepTime);
            } else {
                mom.utcOffset(-7, keepTime);
            }
        };

        m = adone.date("2014-03-15T00:00:00-07:00").parseZone();
        m.startOf("y");
        assert.equal(m.format(), "2014-01-01T00:00:00-08:00", "startOf('year') across +1");

        m = adone.date("2014-03-15T00:00:00-07:00").parseZone();
        m.startOf("M");
        assert.equal(m.format(), "2014-03-01T00:00:00-08:00", "startOf('month') across +1");

        m = adone.date("2014-03-09T09:00:00-07:00").parseZone();
        m.startOf("d");
        assert.equal(m.format(), "2014-03-09T00:00:00-08:00", "startOf('day') across +1");

        m = adone.date("2014-03-09T03:05:00-07:00").parseZone();
        m.startOf("h");
        assert.equal(m.format(), "2014-03-09T03:00:00-07:00", "startOf('hour') after +1");

        m = adone.date("2014-03-09T01:35:00-08:00").parseZone();
        m.startOf("h");
        assert.equal(m.format(), "2014-03-09T01:00:00-08:00", "startOf('hour') before +1");

        // There is no such time as 2:30-7 to try startOf('hour') across that

        adone.date.updateOffset = oldUpdateOffset;
    });

    it("startOf across DST -1", () => {
        const oldUpdateOffset = adone.date.updateOffset;
        const // Based on a real story somewhere in America/Los_Angeles
            dstAt = adone.date("2014-11-02T02:00:00-07:00").parseZone();
        let m;

        adone.date.updateOffset = function (mom, keepTime) {
            if (mom.isBefore(dstAt)) {
                mom.utcOffset(-7, keepTime);
            } else {
                mom.utcOffset(-8, keepTime);
            }
        };

        m = adone.date("2014-11-15T00:00:00-08:00").parseZone();
        m.startOf("y");
        assert.equal(m.format(), "2014-01-01T00:00:00-07:00", "startOf('year') across -1");

        m = adone.date("2014-11-15T00:00:00-08:00").parseZone();
        m.startOf("M");
        assert.equal(m.format(), "2014-11-01T00:00:00-07:00", "startOf('month') across -1");

        m = adone.date("2014-11-02T09:00:00-08:00").parseZone();
        m.startOf("d");
        assert.equal(m.format(), "2014-11-02T00:00:00-07:00", "startOf('day') across -1");

        // note that utc offset is -8
        m = adone.date("2014-11-02T01:30:00-08:00").parseZone();
        m.startOf("h");
        assert.equal(m.format(), "2014-11-02T01:00:00-08:00", "startOf('hour') after +1");

        // note that utc offset is -7
        m = adone.date("2014-11-02T01:30:00-07:00").parseZone();
        m.startOf("h");
        assert.equal(m.format(), "2014-11-02T01:00:00-07:00", "startOf('hour') before +1");

        adone.date.updateOffset = oldUpdateOffset;
    });

    it("endOf millisecond and no-arg", () => {
        const m = adone.date();
        assert.equal(Number(m), Number(m.clone().endOf()), "endOf without argument should change time");
        assert.equal(Number(m), Number(m.clone().endOf("ms")), "endOf with ms argument should change time");
        assert.equal(Number(m), Number(m.clone().endOf("millisecond")), "endOf with millisecond argument should change time");
        assert.equal(Number(m), Number(m.clone().endOf("milliseconds")), "endOf with milliseconds argument should change time");
    });
});
