describe("normalize units", () => {
    before(() => {
        adone.date.locale("en");
    });

    it("normalize units", () => {
        const fullKeys = ["year", "quarter", "month", "isoWeek", "week", "day", "hour", "minute", "second", "millisecond", "date", "dayOfYear", "weekday", "isoWeekday", "weekYear", "isoWeekYear"];
        const aliases = ["y", "Q", "M", "W", "w", "d", "h", "m", "s", "ms", "D", "DDD", "e", "E", "gg", "GG"];
        const length = fullKeys.length;

        for (let index = 0; index < length; index += 1) {
            const fullKey = fullKeys[index];
            const fullKeyCaps = fullKey.toUpperCase();
            const fullKeyLower = fullKey.toLowerCase();
            const fullKeyPlural = `${fullKey}s`;
            const fullKeyCapsPlural = `${fullKeyCaps}s`;
            const alias = aliases[index];
            assert.equal(adone.date.normalizeUnits(fullKey), fullKey, `Testing full key ${fullKey}`);
            assert.equal(adone.date.normalizeUnits(fullKeyCaps), fullKey, `Testing full key capitalised ${fullKey}`);
            assert.equal(adone.date.normalizeUnits(fullKeyLower), fullKey, `Testing full key lowercased ${fullKey}`);
            assert.equal(adone.date.normalizeUnits(fullKeyPlural), fullKey, `Testing full key plural ${fullKey}`);
            assert.equal(adone.date.normalizeUnits(fullKeyCapsPlural), fullKey, `Testing full key capitalised and plural ${fullKey}`);
            assert.equal(adone.date.normalizeUnits(alias), fullKey, `Testing alias ${fullKey}`);
        }
    });
});
