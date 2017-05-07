describe("days in month", () => {
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
});
