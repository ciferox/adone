describe("datetime", "locale update", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("calendar", () => {
        adone.datetime.defineLocale("cal", null);
        adone.datetime.defineLocale("cal", {
            calendar: {
                sameDay: "[Today at] HH:mm",
                nextDay: "[Tomorrow at] HH:mm",
                nextWeek: "[Next week at] HH:mm",
                lastDay: "[Yesterday at] HH:mm",
                lastWeek: "[Last week at] HH:mm",
                sameElse: "[whatever]"
            }
        });
        adone.datetime.updateLocale("cal", {
            calendar: {
                sameDay: "[Today] HH:mm",
                nextDay: "[Tomorrow] HH:mm",
                nextWeek: "[Next week] HH:mm"
            }
        });

        adone.datetime.locale("cal");
        const anchor = adone.datetime.utc("2015-05-05T12:00:00", adone.datetime.ISO_8601);
        assert.equal(anchor.clone().add(3, "hours").calendar(anchor), "Today 15:00", "today uses child version");
        assert.equal(anchor.clone().add(1, "day").calendar(anchor), "Tomorrow 12:00", "tomorrow uses child version");
        assert.equal(anchor.clone().add(3, "days").calendar(anchor), "Next week 12:00", "next week uses child version");

        assert.equal(anchor.clone().subtract(1, "day").calendar(anchor), "Yesterday at 12:00", "yesterday uses parent version");
        assert.equal(anchor.clone().subtract(3, "days").calendar(anchor), "Last week at 12:00", "last week uses parent version");
        assert.equal(anchor.clone().subtract(7, "days").calendar(anchor), "whatever", "sameElse uses parent version -");
        assert.equal(anchor.clone().add(7, "days").calendar(anchor), "whatever", "sameElse uses parent version +");
    });

    it("missing", () => {
        adone.datetime.defineLocale("cal-2", null);
        adone.datetime.defineLocale("cal-2", {
            calendar: {
                sameDay: "[Today at] HH:mm",
                nextDay: "[Tomorrow at] HH:mm",
                nextWeek: "[Next week at] HH:mm",
                lastDay: "[Yesterday at] HH:mm",
                lastWeek: "[Last week at] HH:mm",
                sameElse: "[whatever]"
            }
        });
        adone.datetime.updateLocale("cal-2", {
        });
        adone.datetime.locale("cal-2");
        const anchor = adone.datetime.utc("2015-05-05T12:00:00", adone.datetime.ISO_8601);
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
        adone.datetime.defineLocale("ldf", null);
        adone.datetime.defineLocale("ldf", {
            longDateFormat: {
                LTS: "h:mm:ss A",
                LT: "h:mm A",
                L: "MM/DD/YYYY",
                LL: "MMMM D, YYYY",
                LLL: "MMMM D, YYYY h:mm A",
                LLLL: "dddd, MMMM D, YYYY h:mm A"
            }
        });
        adone.datetime.updateLocale("ldf", {
            longDateFormat: {
                LLL: "[child] MMMM D, YYYY h:mm A",
                LLLL: "[child] dddd, MMMM D, YYYY h:mm A"
            }
        });

        adone.datetime.locale("ldf");
        const anchor = adone.datetime.utc("2015-09-06T12:34:56", adone.datetime.ISO_8601);
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
        adone.datetime.defineLocale("ordinal-1", null);
        adone.datetime.defineLocale("ordinal-1", {
            ordinal: "%dx"
        });
        adone.datetime.updateLocale("ordinal-1", {
            ordinal: "%dy"
        });

        assert.equal(adone.datetime.utc("2015-02-03", adone.datetime.ISO_8601).format("Do"), "3y", "ordinal uses child string");

        adone.datetime.defineLocale("ordinal-2", null);
        adone.datetime.defineLocale("ordinal-2", {
            ordinal: "%dx"
        });
        adone.datetime.updateLocale("ordinal-2", {
            ordinal(num) {
                return `${num}y`;
            }
        });

        assert.equal(adone.datetime.utc("2015-02-03", adone.datetime.ISO_8601).format("Do"), "3y", "ordinal uses child function");

        adone.datetime.defineLocale("ordinal-3", null);
        adone.datetime.defineLocale("ordinal-3", {
            ordinal(num) {
                return `${num}x`;
            }
        });
        adone.datetime.updateLocale("ordinal-3", {
            ordinal: "%dy"
        });

        assert.equal(adone.datetime.utc("2015-02-03", adone.datetime.ISO_8601).format("Do"), "3y", "ordinal uses child string (overwrite parent function)");
    });

    it("ordinal parse", () => {
        adone.datetime.defineLocale("ordinal-parse-1", null);
        adone.datetime.defineLocale("ordinal-parse-1", {
            dayOfMonthOrdinalParse: /\d{1,2}x/
        });
        adone.datetime.updateLocale("ordinal-parse-1", {
            dayOfMonthOrdinalParse: /\d{1,2}y/
        });

        assert.ok(adone.datetime.utc("2015-01-1y", "YYYY-MM-Do", true).isValid(), "ordinal parse uses child");

        adone.datetime.defineLocale("ordinal-parse-2", null);
        adone.datetime.defineLocale("ordinal-parse-2", {
            dayOfMonthOrdinalParse: /\d{1,2}x/
        });
        adone.datetime.updateLocale("ordinal-parse-2", {
            dayOfMonthOrdinalParse: /\d{1,2}/
        });

        assert.ok(adone.datetime.utc("2015-01-1", "YYYY-MM-Do", true).isValid(), "ordinal parse uses child (default)");
    });

    it("months", () => {
        adone.datetime.defineLocale("months", null);
        adone.datetime.defineLocale("months", {
            months: "One_Two_Three_Four_Five_Six_Seven_Eight_Nine_Ten_Eleven_Twelve".split("_")
        });
        adone.datetime.updateLocale("months", {
            parentLocale: "base-months",
            months: "First_Second_Third_Fourth_Fifth_Sixth_Seventh_Eighth_Ninth_Tenth_Eleventh_Twelveth ".split("_")
        });
        assert.ok(adone.datetime.utc("2015-01-01", "YYYY-MM-DD").format("MMMM"), "First", "months uses child");
    });

    it("update existing locale", () => {
        adone.datetime.updateLocale("de", {
            monthsShort: ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"]
        });
        assert.equal(adone.datetime("2017-02-01").format("YYYY MMM MMMM"), "2017 FEB Februar");
        adone.datetime.updateLocale("de", null);
    });
});
