const Pouch = adone.database.pouch.coverage.DB;
const defaultBackOff = Pouch.utils.defaultBackOff;

describe("db", "pouch", "backoff", () => {
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
