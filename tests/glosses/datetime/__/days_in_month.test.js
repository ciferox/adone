describe("datetime", "days in month", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("days in month", () => {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31].forEach((days, i) => {
            const firstDay = adone.datetime([2012, i]);
            const lastDay = adone.datetime([2012, i, days]);
            assert.equal(firstDay.daysInMonth(), days, `${firstDay.format("L")} should have ${days} days.`);
            assert.equal(lastDay.daysInMonth(), days, `${lastDay.format("L")} should have ${days} days.`);
        });
    });

    it("days in month leap years", () => {
        assert.equal(adone.datetime([2010, 1]).daysInMonth(), 28, "Feb 2010 should have 28 days");
        assert.equal(adone.datetime([2100, 1]).daysInMonth(), 28, "Feb 2100 should have 28 days");
        assert.equal(adone.datetime([2008, 1]).daysInMonth(), 29, "Feb 2008 should have 29 days");
        assert.equal(adone.datetime([2000, 1]).daysInMonth(), 29, "Feb 2000 should have 29 days");
    });

    it("days in month with NaN inputs", () => {
        assert.ok(!adone.datetime([2010, null, null]).isValid(), "Invalid date because month is NaN");
        // somehow export daysInMonth
        // assert.ok(isNaN(daysInMonth(2, NaN)), "month NaN inputs should return NaN");
        // assert.ok(isNaN(daysInMonth(NaN, 0)), "year NaN inputs should return NaN");
    });

    it.skip("days in month with overflow", () => {
        assert.equal(daysInMonth(14, 22), daysInMonth(15, 10), "positive overflow by 1");
        assert.equal(daysInMonth(14, 122), daysInMonth(24, 2), "positive overflow by 10");
        assert.equal(daysInMonth(8, -2), daysInMonth(7, 10), "negative overflow by 1");
        assert.equal(daysInMonth(-2380, -25), daysInMonth(-2383, 11), "negative overflow by 3");
    });

    it.skip("days in month consistent with Date()", () => {
        const oldMethod = function (year, month) {
            return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        };
        assert.equal(daysInMonth(14, 22), oldMethod(14, 22), "positive overflow by 1");
        assert.equal(daysInMonth(14, 122), oldMethod(14, 122), "positive overflow by 10");
        assert.equal(daysInMonth(8, -2), oldMethod(8, -2), "negative overflow by 1");
        assert.equal(daysInMonth(-2380, -25), oldMethod(-2380, -25), "negative overflow by 3");
    });
});
