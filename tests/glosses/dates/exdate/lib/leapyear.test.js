describe("leap year", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("leap year", () => {
        assert.equal(adone.date([2010, 0, 1]).isLeapYear(), false, "2010");
        assert.equal(adone.date([2100, 0, 1]).isLeapYear(), false, "2100");
        assert.equal(adone.date([2008, 0, 1]).isLeapYear(), true, "2008");
        assert.equal(adone.date([2000, 0, 1]).isLeapYear(), true, "2000");
    });
});
