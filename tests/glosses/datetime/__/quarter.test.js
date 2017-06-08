describe("datetime", "quarter", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("library quarter getter", () => {
        assert.equal(adone.datetime([1985, 1, 4]).quarter(), 1, "Feb  4 1985 is Q1");
        assert.equal(adone.datetime([2029, 8, 18]).quarter(), 3, "Sep 18 2029 is Q3");
        assert.equal(adone.datetime([2013, 3, 24]).quarter(), 2, "Apr 24 2013 is Q2");
        assert.equal(adone.datetime([2015, 2, 5]).quarter(), 1, "Mar  5 2015 is Q1");
        assert.equal(adone.datetime([1970, 0, 2]).quarter(), 1, "Jan  2 1970 is Q1");
        assert.equal(adone.datetime([2001, 11, 12]).quarter(), 4, "Dec 12 2001 is Q4");
        assert.equal(adone.datetime([2000, 0, 2]).quarter(), 1, "Jan  2 2000 is Q1");
    });

    it("quarter setter singular", () => {
        const m = adone.datetime([2014, 4, 11]);
        assert.equal(m.quarter(2).month(), 4, "set same quarter");
        assert.equal(m.quarter(3).month(), 7, "set 3rd quarter");
        assert.equal(m.quarter(1).month(), 1, "set 1st quarter");
        assert.equal(m.quarter(4).month(), 10, "set 4th quarter");
    });

    it("quarter setter plural", () => {
        const m = adone.datetime([2014, 4, 11]);
        assert.equal(m.quarters(2).month(), 4, "set same quarter");
        assert.equal(m.quarters(3).month(), 7, "set 3rd quarter");
        assert.equal(m.quarters(1).month(), 1, "set 1st quarter");
        assert.equal(m.quarters(4).month(), 10, "set 4th quarter");
    });

    it("quarter setter programmatic", () => {
        const m = adone.datetime([2014, 4, 11]);
        assert.equal(m.set("quarter", 2).month(), 4, "set same quarter");
        assert.equal(m.set("quarter", 3).month(), 7, "set 3rd quarter");
        assert.equal(m.set("quarter", 1).month(), 1, "set 1st quarter");
        assert.equal(m.set("quarter", 4).month(), 10, "set 4th quarter");
    });

    it("quarter setter programmatic plural", () => {
        const m = adone.datetime([2014, 4, 11]);
        assert.equal(m.set("quarters", 2).month(), 4, "set same quarter");
        assert.equal(m.set("quarters", 3).month(), 7, "set 3rd quarter");
        assert.equal(m.set("quarters", 1).month(), 1, "set 1st quarter");
        assert.equal(m.set("quarters", 4).month(), 10, "set 4th quarter");
    });

    it("quarter setter programmatic abbr", () => {
        const m = adone.datetime([2014, 4, 11]);
        assert.equal(m.set("Q", 2).month(), 4, "set same quarter");
        assert.equal(m.set("Q", 3).month(), 7, "set 3rd quarter");
        assert.equal(m.set("Q", 1).month(), 1, "set 1st quarter");
        assert.equal(m.set("Q", 4).month(), 10, "set 4th quarter");
    });

    it("quarter setter only month changes", () => {
        const m = adone.datetime([2014, 4, 11, 1, 2, 3, 4]).quarter(4);
        assert.equal(m.year(), 2014, "keep year");
        assert.equal(m.month(), 10, "set month");
        assert.equal(m.date(), 11, "keep date");
        assert.equal(m.hour(), 1, "keep hour");
        assert.equal(m.minute(), 2, "keep minutes");
        assert.equal(m.second(), 3, "keep seconds");
        assert.equal(m.millisecond(), 4, "keep milliseconds");
    });

    it("quarter setter bubble to next year", () => {
        const m = adone.datetime([2014, 4, 11, 1, 2, 3, 4]).quarter(7);
        assert.equal(m.year(), 2015, "year bubbled");
        assert.equal(m.month(), 7, "set month");
        assert.equal(m.date(), 11, "keep date");
        assert.equal(m.hour(), 1, "keep hour");
        assert.equal(m.minute(), 2, "keep minutes");
        assert.equal(m.second(), 3, "keep seconds");
        assert.equal(m.millisecond(), 4, "keep milliseconds");
    });

    it("quarter diff", () => {
        assert.equal(adone.datetime("2014-01-01").diff(adone.datetime("2014-04-01"), "quarter"),
                -1, "diff -1 quarter");
        assert.equal(adone.datetime("2014-04-01").diff(adone.datetime("2014-01-01"), "quarter"),
                1, "diff 1 quarter");
        assert.equal(adone.datetime("2014-05-01").diff(adone.datetime("2014-01-01"), "quarter"),
                1, "diff 1 quarter");
        assert.ok(Math.abs((4 / 3) - adone.datetime("2014-05-01").diff(
                        adone.datetime("2014-01-01"), "quarter", true)) < 0.00001,
                "diff 1 1/3 quarter");
        assert.equal(adone.datetime("2015-01-01").diff(adone.datetime("2014-01-01"), "quarter"),
                4, "diff 4 quarters");
    });

    it("quarter setter bubble to previous year", () => {
        const m = adone.datetime([2014, 4, 11, 1, 2, 3, 4]).quarter(-3);
        assert.equal(m.year(), 2013, "year bubbled");
        assert.equal(m.month(), 1, "set month");
        assert.equal(m.date(), 11, "keep date");
        assert.equal(m.hour(), 1, "keep hour");
        assert.equal(m.minute(), 2, "keep minutes");
        assert.equal(m.second(), 3, "keep seconds");
        assert.equal(m.millisecond(), 4, "keep milliseconds");
    });
});
