describe("invalid", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("invalid", () => {
        const m = adone.date.invalid();
        assert.equal(m.isValid(), false);
        assert.equal(m.parsingFlags().userInvalidated, true);
        assert.ok(isNaN(m.valueOf()));
    });

    it("invalid with existing flag", () => {
        const m = adone.date.invalid({ invalidMonth: "whatchamacallit" });
        assert.equal(m.isValid(), false);
        assert.equal(m.parsingFlags().userInvalidated, false);
        assert.equal(m.parsingFlags().invalidMonth, "whatchamacallit");
        assert.ok(isNaN(m.valueOf()));
    });

    it("invalid with custom flag", () => {
        const m = adone.date.invalid({ tooBusyWith: "reiculating splines" });
        assert.equal(m.isValid(), false);
        assert.equal(m.parsingFlags().userInvalidated, false);
        assert.equal(m.parsingFlags().tooBusyWith, "reiculating splines");
        assert.ok(isNaN(m.valueOf()));
    });

    it("invalid operations", () => {
        const invalids = [
            adone.date.invalid(),
            adone.date("xyz", "l"),
            adone.date("2015-01-35", "YYYY-MM-DD"),
            adone.date("2015-01-25 a", "YYYY-MM-DD", true)
        ];

        const valid = adone.date();

        for (let i = 0; i < invalids.length; ++i) {
            const invalid = invalids[i];

            assert.ok(!invalid.clone().add(5, "hours").isValid(), "invalid.add is invalid");
            assert.equal(invalid.calendar(), "Invalid date", "invalid.calendar is 'Invalid date'");
            assert.ok(!invalid.clone().isValid(), "invalid.clone is invalid");
            assert.ok(isNaN(invalid.diff(valid)), "invalid.diff(valid) is NaN");
            assert.ok(isNaN(valid.diff(invalid)), "valid.diff(invalid) is NaN");
            assert.ok(isNaN(invalid.diff(invalid)), "invalid.diff(invalid) is NaN");
            assert.ok(!invalid.clone().endOf("month").isValid(), "invalid.endOf is invalid");
            assert.equal(invalid.format(), "Invalid date", "invalid.format is 'Invalid date'");
            assert.equal(invalid.from(), "Invalid date");
            assert.equal(invalid.from(valid), "Invalid date");
            assert.equal(valid.from(invalid), "Invalid date");
            assert.equal(invalid.fromNow(), "Invalid date");
            assert.equal(invalid.to(), "Invalid date");
            assert.equal(invalid.to(valid), "Invalid date");
            assert.equal(valid.to(invalid), "Invalid date");
            assert.equal(invalid.toNow(), "Invalid date");
            assert.ok(isNaN(invalid.get("year")), "invalid.get is NaN");
            // TODO invalidAt
            assert.ok(!invalid.isAfter(valid));
            assert.ok(!valid.isAfter(invalid));
            assert.ok(!invalid.isAfter(invalid));
            assert.ok(!invalid.isBefore(valid));
            assert.ok(!valid.isBefore(invalid));
            assert.ok(!invalid.isBefore(invalid));
            assert.ok(!invalid.isBetween(valid, valid));
            assert.ok(!valid.isBetween(invalid, valid));
            assert.ok(!valid.isBetween(valid, invalid));
            assert.ok(!invalid.isSame(invalid));
            assert.ok(!invalid.isSame(valid));
            assert.ok(!valid.isSame(invalid));
            assert.ok(!invalid.isValid());
            assert.equal(invalid.locale(), "en");
            assert.equal(invalid.localeData()._abbr, "en");
            assert.ok(!adone.date.min(invalid, valid).isValid());
            assert.ok(!adone.date.min(valid, invalid).isValid());
            assert.ok(!adone.date.max(invalid, valid).isValid());
            assert.ok(!adone.date.max(valid, invalid).isValid());
            assert.ok(!invalid.clone().set("year", 2005).isValid());
            assert.ok(!invalid.clone().startOf("month").isValid());

            assert.ok(!invalid.clone().subtract(5, "days").isValid());
            assert.deepEqual(invalid.toArray(), [NaN, NaN, NaN, NaN, NaN, NaN, NaN]);
            assert.deepEqual(invalid.toObject(), {
                years: NaN,
                months: NaN,
                date: NaN,
                hours: NaN,
                minutes: NaN,
                seconds: NaN,
                milliseconds: NaN
            });
            assert.ok(isNaN(invalid.toDate().valueOf()));
            assert.equal(invalid.toJSON(), null);
            assert.equal(invalid.toString(), "Invalid date");
            assert.ok(isNaN(invalid.unix()));
            assert.ok(isNaN(invalid.valueOf()));

            assert.ok(isNaN(invalid.year()));
            assert.ok(isNaN(invalid.weekYear()));
            assert.ok(isNaN(invalid.isoWeekYear()));
            assert.ok(isNaN(invalid.quarter()));
            assert.ok(isNaN(invalid.quarters()));
            assert.ok(isNaN(invalid.month()));
            assert.ok(isNaN(invalid.daysInMonth()));
            assert.ok(isNaN(invalid.week()));
            assert.ok(isNaN(invalid.weeks()));
            assert.ok(isNaN(invalid.isoWeek()));
            assert.ok(isNaN(invalid.isoWeeks()));
            assert.ok(isNaN(invalid.weeksInYear()));
            assert.ok(isNaN(invalid.isoWeeksInYear()));
            assert.ok(isNaN(invalid.date()));
            assert.ok(isNaN(invalid.day()));
            assert.ok(isNaN(invalid.days()));
            assert.ok(isNaN(invalid.weekday()));
            assert.ok(isNaN(invalid.isoWeekday()));
            assert.ok(isNaN(invalid.dayOfYear()));
            assert.ok(isNaN(invalid.hour()));
            assert.ok(isNaN(invalid.hours()));
            assert.ok(isNaN(invalid.minute()));
            assert.ok(isNaN(invalid.minutes()));
            assert.ok(isNaN(invalid.second()));
            assert.ok(isNaN(invalid.seconds()));
            assert.ok(isNaN(invalid.millisecond()));
            assert.ok(isNaN(invalid.milliseconds()));
            assert.ok(isNaN(invalid.utcOffset()));

            assert.ok(!invalid.clone().year(2001).isValid());
            assert.ok(!invalid.clone().weekYear(2001).isValid());
            assert.ok(!invalid.clone().isoWeekYear(2001).isValid());
            assert.ok(!invalid.clone().quarter(1).isValid());
            assert.ok(!invalid.clone().quarters(1).isValid());
            assert.ok(!invalid.clone().month(1).isValid());
            assert.ok(!invalid.clone().week(1).isValid());
            assert.ok(!invalid.clone().weeks(1).isValid());
            assert.ok(!invalid.clone().isoWeek(1).isValid());
            assert.ok(!invalid.clone().isoWeeks(1).isValid());
            assert.ok(!invalid.clone().date(1).isValid());
            assert.ok(!invalid.clone().day(1).isValid());
            assert.ok(!invalid.clone().days(1).isValid());
            assert.ok(!invalid.clone().weekday(1).isValid());
            assert.ok(!invalid.clone().isoWeekday(1).isValid());
            assert.ok(!invalid.clone().dayOfYear(1).isValid());
            assert.ok(!invalid.clone().hour(1).isValid());
            assert.ok(!invalid.clone().hours(1).isValid());
            assert.ok(!invalid.clone().minute(1).isValid());
            assert.ok(!invalid.clone().minutes(1).isValid());
            assert.ok(!invalid.clone().second(1).isValid());
            assert.ok(!invalid.clone().seconds(1).isValid());
            assert.ok(!invalid.clone().millisecond(1).isValid());
            assert.ok(!invalid.clone().milliseconds(1).isValid());
            assert.ok(!invalid.clone().utcOffset(1).isValid());

            assert.ok(!invalid.clone().utc().isValid());
            assert.ok(!invalid.clone().local().isValid());
            assert.ok(!invalid.clone().parseZone("05:30").isValid());
            assert.ok(!invalid.hasAlignedHourOffset());
            assert.ok(!invalid.isDST());
            assert.ok(!invalid.isLocal());
            assert.ok(!invalid.isUtcOffset());
            assert.ok(!invalid.isUtc());
            assert.ok(!invalid.isUTC());

            assert.ok(!invalid.isLeapYear());

            assert.equal(adone.date.duration({ from: invalid, to: valid }).asMilliseconds(), 0);
            assert.equal(adone.date.duration({ from: valid, to: invalid }).asMilliseconds(), 0);
            assert.equal(adone.date.duration({ from: invalid, to: invalid }).asMilliseconds(), 0);
        }
    });
});
