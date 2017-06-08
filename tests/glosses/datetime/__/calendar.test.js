// These tests are for locale independent features
// locale dependent tests would be in locale test folder
describe("datetime", "calendar", () => {
    it("passing a function", () => {
        const a = adone.datetime().hours(13).minutes(0).seconds(0);
        assert.equal(adone.datetime(a).calendar(null, {
            "sameDay"() {
                return "h:mmA";
            }
        }), "1:00PM", "should equate");
    });

    it("extending calendar options", () => {
        const calendarFormat = adone.datetime.calendarFormat;

        adone.datetime.calendarFormat = function (myMoment, now) {
            const diff = myMoment.diff(now, "days", true);
            const nextMonth = now.clone().add(1, "month");

            const retVal = diff < -6 ? "sameElse" :
                diff < -1 ? "lastWeek" :
                diff < 0 ? "lastDay" :
                diff < 1 ? "sameDay" :
                diff < 2 ? "nextDay" :
                diff < 7 ? "nextWeek" :
                (myMoment.month() === now.month() && myMoment.year() === now.year()) ? "thisMonth" :
                (nextMonth.month() === myMoment.month() && nextMonth.year() === myMoment.year()) ? "nextMonth" : "sameElse";
            return retVal;
        };

        adone.datetime.updateLocale("en", {
            calendar: {
                sameDay: "[Today at] LT",
                nextDay: "[Tomorrow at] LT",
                nextWeek: "dddd [at] LT",
                lastDay: "[Yesterday at] LT",
                lastWeek: "[Last] dddd [at] LT",
                thisMonth: "[This month on the] Do",
                nextMonth: "[Next month on the] Do",
                sameElse: "L"
            }
        });
        const a = adone.datetime("2016-01-01").add(28, "days");
        const b = adone.datetime("2016-01-01").add(1, "month");
        try {
            assert.equal(a.calendar("2016-01-01"), "This month on the 29th", "Ad hoc calendar format for this month");
            assert.equal(b.calendar("2016-01-01"), "Next month on the 1st", "Ad hoc calendar format for next month");
            assert.equal(a.locale("fr").calendar("2016-01-01"), a.locale("fr").format("L"), "French falls back to default because thisMonth is not defined in that locale");
        } finally {
            adone.datetime.calendarFormat = calendarFormat;
            adone.datetime.updateLocale("en", null);
        }
    });
});
