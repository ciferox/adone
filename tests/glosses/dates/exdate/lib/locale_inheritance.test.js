describe("locale inheritance", () => {
    beforeEach(() => {
        adone.date.locale("en");
    });

    it("calendar", () => {
        adone.date.defineLocale("base-cal", {
            calendar: {
                sameDay: "[Today at] HH:mm",
                nextDay: "[Tomorrow at] HH:mm",
                nextWeek: "[Next week at] HH:mm",
                lastDay: "[Yesterday at] HH:mm",
                lastWeek: "[Last week at] HH:mm",
                sameElse: "[whatever]"
            }
        });
        adone.date.defineLocale("child-cal", {
            parentLocale: "base-cal",
            calendar: {
                sameDay: "[Today] HH:mm",
                nextDay: "[Tomorrow] HH:mm",
                nextWeek: "[Next week] HH:mm"
            }
        });

        adone.date.locale("child-cal");
        const anchor = adone.date.utc("2015-05-05T12:00:00", adone.date.ISO_8601);
        assert.equal(anchor.clone().add(3, "hours").calendar(anchor), "Today 15:00", "today uses child version");
        assert.equal(anchor.clone().add(1, "day").calendar(anchor), "Tomorrow 12:00", "tomorrow uses child version");
        assert.equal(anchor.clone().add(3, "days").calendar(anchor), "Next week 12:00", "next week uses child version");

        assert.equal(anchor.clone().subtract(1, "day").calendar(anchor), "Yesterday at 12:00", "yesterday uses parent version");
        assert.equal(anchor.clone().subtract(3, "days").calendar(anchor), "Last week at 12:00", "last week uses parent version");
        assert.equal(anchor.clone().subtract(7, "days").calendar(anchor), "whatever", "sameElse uses parent version -");
        assert.equal(anchor.clone().add(7, "days").calendar(anchor), "whatever", "sameElse uses parent version +");
    });

    it("missing", () => {
        adone.date.defineLocale("base-cal-2", {
            calendar: {
                sameDay: "[Today at] HH:mm",
                nextDay: "[Tomorrow at] HH:mm",
                nextWeek: "[Next week at] HH:mm",
                lastDay: "[Yesterday at] HH:mm",
                lastWeek: "[Last week at] HH:mm",
                sameElse: "[whatever]"
            }
        });
        adone.date.defineLocale("child-cal-2", {
            parentLocale: "base-cal-2"
        });
        adone.date.locale("child-cal-2");
        const anchor = adone.date.utc("2015-05-05T12:00:00", adone.date.ISO_8601);
        assert.equal(anchor.clone().add(3, "hours").calendar(anchor), "Today at 15:00", "today uses parent version");
        assert.equal(anchor.clone().add(1, "day").calendar(anchor), "Tomorrow at 12:00", "tomorrow uses parent version");
        assert.equal(anchor.clone().add(3, "days").calendar(anchor), "Next week at 12:00", "next week uses parent version");
        assert.equal(anchor.clone().subtract(1, "day").calendar(anchor), "Yesterday at 12:00", "yesterday uses parent version");
        assert.equal(anchor.clone().subtract(3, "days").calendar(anchor), "Last week at 12:00", "last week uses parent version");
        assert.equal(anchor.clone().subtract(7, "days").calendar(anchor), "whatever", "sameElse uses parent version -");
        assert.equal(anchor.clone().add(7, "days").calendar(anchor), "whatever", "sameElse uses parent version +");
    });

    // Test function vs obj both directions

    it("long date format", () => {
        adone.date.defineLocale("base-ldf", {
            longDateFormat: {
                LTS: "h:mm:ss A",
                LT: "h:mm A",
                L: "MM/DD/YYYY",
                LL: "MMMM D, YYYY",
                LLL: "MMMM D, YYYY h:mm A",
                LLLL: "dddd, MMMM D, YYYY h:mm A"
            }
        });
        adone.date.defineLocale("child-ldf", {
            parentLocale: "base-ldf",
            longDateFormat: {
                LLL: "[child] MMMM D, YYYY h:mm A",
                LLLL: "[child] dddd, MMMM D, YYYY h:mm A"
            }
        });

        adone.date.locale("child-ldf");
        const anchor = adone.date.utc("2015-09-06T12:34:56", adone.date.ISO_8601);
        assert.equal(anchor.format("LTS"), "12:34:56 PM", "LTS uses base");
        assert.equal(anchor.format("LT"), "12:34 PM", "LT uses base");
        assert.equal(anchor.format("L"), "09/06/2015", "L uses base");
        assert.equal(anchor.format("l"), "9/6/2015", "l uses base");
        assert.equal(anchor.format("LL"), "September 6, 2015", "LL uses base");
        assert.equal(anchor.format("ll"), "Sep 6, 2015", "ll uses base");
        assert.equal(anchor.format("LLL"), "child September 6, 2015 12:34 PM", "LLL uses child");
        assert.equal(anchor.format("lll"), "child Sep 6, 2015 12:34 PM", "lll uses child");
        assert.equal(anchor.format("LLLL"), "child Sunday, September 6, 2015 12:34 PM", "LLLL uses child");
        assert.equal(anchor.format("llll"), "child Sun, Sep 6, 2015 12:34 PM", "llll uses child");
    });

    it("ordinal", () => {
        adone.date.defineLocale("base-ordinal-1", {
            ordinal: "%dx"
        });
        adone.date.defineLocale("child-ordinal-1", {
            parentLocale: "base-ordinal-1",
            ordinal: "%dy"
        });

        assert.equal(adone.date.utc("2015-02-03", adone.date.ISO_8601).format("Do"), "3y", "ordinal uses child string");

        adone.date.defineLocale("base-ordinal-2", {
            ordinal: "%dx"
        });
        adone.date.defineLocale("child-ordinal-2", {
            parentLocale: "base-ordinal-2",
            ordinal(num) {
                return `${num}y`;
            }
        });

        assert.equal(adone.date.utc("2015-02-03", adone.date.ISO_8601).format("Do"), "3y", "ordinal uses child function");

        adone.date.defineLocale("base-ordinal-3", {
            ordinal(num) {
                return `${num}x`;
            }
        });
        adone.date.defineLocale("child-ordinal-3", {
            parentLocale: "base-ordinal-3",
            ordinal: "%dy"
        });

        assert.equal(adone.date.utc("2015-02-03", adone.date.ISO_8601).format("Do"), "3y", "ordinal uses child string (overwrite parent function)");
    });

    it("ordinal parse", () => {
        adone.date.defineLocale("base-ordinal-parse-1", {
            dayOfMonthOrdinalParse: /\d{1,2}x/
        });
        adone.date.defineLocale("child-ordinal-parse-1", {
            parentLocale: "base-ordinal-parse-1",
            dayOfMonthOrdinalParse: /\d{1,2}y/
        });

        assert.ok(adone.date.utc("2015-01-1y", "YYYY-MM-Do", true).isValid(), "ordinal parse uses child");

        adone.date.defineLocale("base-ordinal-parse-2", {
            dayOfMonthOrdinalParse: /\d{1,2}x/
        });
        adone.date.defineLocale("child-ordinal-parse-2", {
            parentLocale: "base-ordinal-parse-2",
            dayOfMonthOrdinalParse: /\d{1,2}/
        });

        assert.ok(adone.date.utc("2015-01-1", "YYYY-MM-Do", true).isValid(), "ordinal parse uses child (default)");
    });

    it("months", () => {
        adone.date.defineLocale("base-months", {
            months: "One_Two_Three_Four_Five_Six_Seven_Eight_Nine_Ten_Eleven_Twelve".split("_")
        });
        adone.date.defineLocale("child-months", {
            parentLocale: "base-months",
            months: "First_Second_Third_Fourth_Fifth_Sixth_Seventh_Eighth_Ninth_Tenth_Eleventh_Twelveth ".split("_")
        });
        assert.ok(adone.date.utc("2015-01-01", "YYYY-MM-DD").format("MMMM"), "First", "months uses child");
    });

    it("define child locale before parent", () => {
        adone.date.defineLocale("months-x", null);
        adone.date.defineLocale("base-months-x", null);

        adone.date.defineLocale("months-x", {
            parentLocale: "base-months-x",
            months: "First_Second_Third_Fourth_Fifth_Sixth_Seventh_Eighth_Ninth_Tenth_Eleventh_Twelveth ".split("_")
        });
        assert.equal(adone.date.locale(), "en", "failed to set a locale requiring missing parent");
        adone.date.defineLocale("base-months-x", {
            months: "One_Two_Three_Four_Five_Six_Seven_Eight_Nine_Ten_Eleven_Twelve".split("_")
        });
        assert.equal(adone.date.locale(), "base-months-x", "defineLocale should also set the locale (regardless of child locales)");

        assert.equal(adone.date().locale("months-x").month(0).format("MMMM"), "First", "loading child before parent locale works");
    });
});
