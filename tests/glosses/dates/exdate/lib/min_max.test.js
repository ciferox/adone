describe("min max", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("min", () => {
        const now = adone.date();
        const future = now.clone().add(1, "month");
        const past = now.clone().subtract(1, "month");
        const invalid = adone.date.invalid();

        assert.equal(adone.date.min(now, future, past), past, "min(now, future, past)");
        assert.equal(adone.date.min(future, now, past), past, "min(future, now, past)");
        assert.equal(adone.date.min(future, past, now), past, "min(future, past, now)");
        assert.equal(adone.date.min(past, future, now), past, "min(past, future, now)");
        assert.equal(adone.date.min(now, past), past, "min(now, past)");
        assert.equal(adone.date.min(past, now), past, "min(past, now)");
        assert.equal(adone.date.min(now), now, "min(now, past)");

        assert.equal(adone.date.min([now, future, past]), past, "min([now, future, past])");
        assert.equal(adone.date.min([now, past]), past, "min(now, past)");
        assert.equal(adone.date.min([now]), now, "min(now)");

        assert.equal(adone.date.min([now, invalid]), invalid, "min(now, invalid)");
        assert.equal(adone.date.min([invalid, now]), invalid, "min(invalid, now)");
    });

    it("max", () => {
        const now = adone.date();
        const future = now.clone().add(1, "month");
        const past = now.clone().subtract(1, "month");
        const invalid = adone.date.invalid();

        assert.equal(adone.date.max(now, future, past), future, "max(now, future, past)");
        assert.equal(adone.date.max(future, now, past), future, "max(future, now, past)");
        assert.equal(adone.date.max(future, past, now), future, "max(future, past, now)");
        assert.equal(adone.date.max(past, future, now), future, "max(past, future, now)");
        assert.equal(adone.date.max(now, past), now, "max(now, past)");
        assert.equal(adone.date.max(past, now), now, "max(past, now)");
        assert.equal(adone.date.max(now), now, "max(now, past)");

        assert.equal(adone.date.max([now, future, past]), future, "max([now, future, past])");
        assert.equal(adone.date.max([now, past]), now, "max(now, past)");
        assert.equal(adone.date.max([now]), now, "max(now)");

        assert.equal(adone.date.max([now, invalid]), invalid, "max(now, invalid)");
        assert.equal(adone.date.max([invalid, now]), invalid, "max(invalid, now)");
    });
});
