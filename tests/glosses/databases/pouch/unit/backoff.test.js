describe("database", "pouch", "backoff", () => {
    const { util: { defaultBackOff } } = adone.private(adone.database.pouch);

    it("defaultBackoff should start off at most 2 seconds and never exceed 10 minutes", () => {
        assert.exists(defaultBackOff);
        const limit = 600000;
        let delay = 0;
        const values = [];
        for (let i = 0; i < 100; i++) {
            delay = defaultBackOff(delay);
            values.push(delay);
        }
        const max = Math.max.apply(null, values);
        assert.isAtMost(values[0], 2000);
        assert.isAtMost(max, limit);
    });
});
