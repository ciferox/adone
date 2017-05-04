describe("days in year", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("YYYYDDD should not parse DDD=000", () => {
        assert.equal(adone.date(7000000, adone.date.ISO_8601, true).isValid(), false);
        assert.equal(adone.date("7000000", adone.date.ISO_8601, true).isValid(), false);
        assert.equal(adone.date(7000000, adone.date.ISO_8601, false).isValid(), false);
    });
});
