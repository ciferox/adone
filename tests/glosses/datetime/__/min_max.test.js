describe("min max", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("min", () => {
        const now = adone.datetime();
        const future = now.clone().add(1, "month");
        const past = now.clone().subtract(1, "month");
        const invalid = adone.datetime.invalid();

        assert.equal(adone.datetime.min(now, future, past), past, "min(now, future, past)");
        assert.equal(adone.datetime.min(future, now, past), past, "min(future, now, past)");
        assert.equal(adone.datetime.min(future, past, now), past, "min(future, past, now)");
        assert.equal(adone.datetime.min(past, future, now), past, "min(past, future, now)");
        assert.equal(adone.datetime.min(now, past), past, "min(now, past)");
        assert.equal(adone.datetime.min(past, now), past, "min(past, now)");
        assert.equal(adone.datetime.min(now), now, "min(now, past)");

        assert.equal(adone.datetime.min([now, future, past]), past, "min([now, future, past])");
        assert.equal(adone.datetime.min([now, past]), past, "min(now, past)");
        assert.equal(adone.datetime.min([now]), now, "min(now)");

        assert.equal(adone.datetime.min([now, invalid]), invalid, "min(now, invalid)");
        assert.equal(adone.datetime.min([invalid, now]), invalid, "min(invalid, now)");
    });

    it("max", () => {
        const now = adone.datetime();
        const future = now.clone().add(1, "month");
        const past = now.clone().subtract(1, "month");
        const invalid = adone.datetime.invalid();

        assert.equal(adone.datetime.max(now, future, past), future, "max(now, future, past)");
        assert.equal(adone.datetime.max(future, now, past), future, "max(future, now, past)");
        assert.equal(adone.datetime.max(future, past, now), future, "max(future, past, now)");
        assert.equal(adone.datetime.max(past, future, now), future, "max(past, future, now)");
        assert.equal(adone.datetime.max(now, past), now, "max(now, past)");
        assert.equal(adone.datetime.max(past, now), now, "max(past, now)");
        assert.equal(adone.datetime.max(now), now, "max(now, past)");

        assert.equal(adone.datetime.max([now, future, past]), future, "max([now, future, past])");
        assert.equal(adone.datetime.max([now, past]), now, "max(now, past)");
        assert.equal(adone.datetime.max([now]), now, "max(now)");

        assert.equal(adone.datetime.max([now, invalid]), invalid, "max(now, invalid)");
        assert.equal(adone.datetime.max([invalid, now]), invalid, "max(invalid, now)");
    });
});
