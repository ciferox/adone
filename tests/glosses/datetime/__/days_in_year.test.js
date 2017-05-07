describe("days in year", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("YYYYDDD should not parse DDD=000", () => {
        assert.equal(adone.datetime(7000000, adone.datetime.ISO_8601, true).isValid(), false);
        assert.equal(adone.datetime("7000000", adone.datetime.ISO_8601, true).isValid(), false);
        assert.equal(adone.datetime(7000000, adone.datetime.ISO_8601, false).isValid(), false);
    });
});
