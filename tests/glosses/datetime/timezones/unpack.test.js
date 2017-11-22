describe("datetime", "timezone", "unpack", () => {
    const { datetime: { tz } } = adone;

    const compare = (source, expected) => {
        const actual = tz.unpack(source);

        assert.deepEqual(actual.name, expected.name, "should be able to unpack name");
        assert.deepEqual(actual.abbrs, expected.abbrs, "should be able to unpack abbrs");
        assert.deepEqual(actual.untils, expected.untils, "should be able to unpack untils");
        assert.deepEqual(actual.offsets, expected.offsets, "should be able to unpack offsets");
    };

    specify("single", () => {
        compare("Some/Zone_Name|ABC DEF GHI|10 3X 10|010121|-1aX 20 3X 20 3X", {
            name: "Some/Zone_Name",
            abbrs: ["ABC", "DEF", "ABC", "DEF", "GHI", "DEF"],
            offsets: [60, 239, 60, 239, 60, 239],
            untils: [
                -4259 * 60000,
                -4139 * 60000,
                -3900 * 60000,
                -3780 * 60000,
                -3541 * 60000,
                Infinity
            ]
        }
        );
    });
});
