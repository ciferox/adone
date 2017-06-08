describe("datetime", "leap year", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("leap year", () => {
        assert.equal(adone.datetime([2010, 0, 1]).isLeapYear(), false, "2010");
        assert.equal(adone.datetime([2100, 0, 1]).isLeapYear(), false, "2100");
        assert.equal(adone.datetime([2008, 0, 1]).isLeapYear(), true, "2008");
        assert.equal(adone.datetime([2000, 0, 1]).isLeapYear(), true, "2000");
    });
});
