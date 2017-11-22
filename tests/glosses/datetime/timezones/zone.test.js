describe("datetime", "timezone", "Zone", () => {
    const { datetime: { tz } } = adone;

    // gE = 1000; 1E = 100; 2k = 140
    const PACKED = "SomeZone|TIM TAM IAM|60.u 50 60|012101|gE 1E 2k 1E 2k";

    let moveAmbiguousForward;
    let moveInvalidForward;

    beforeEach(() => {
        moveAmbiguousForward = tz.moveAmbiguousForward;
        moveInvalidForward = tz.moveInvalidForward;
    });

    afterEach(() => {
        tz.moveAmbiguousForward = moveAmbiguousForward;
        tz.moveInvalidForward = moveInvalidForward;
    });

    specify("construct", () => {
        const zone = new tz.Zone(PACKED);

        assert.equal(zone.name, "SomeZone", "Should unpack name onto .name property.");
        assert.deepEqual(zone.abbrs, ["TIM", "TAM", "IAM", "TAM", "TIM", "TAM"], "Should unpack abbrs onto .abbrs property.");
        assert.deepEqual(zone.offsets, [360.5, 300, 360, 300, 360.5, 300], "Should unpack offsets onto .offsets property.");
        assert.deepEqual(zone.untils, [
            1000 * 60000,
            1100 * 60000,
            1240 * 60000,
            1340 * 60000,
            1480 * 60000,
            Infinity
        ], "Should unpack untils onto .untils property.");
    });

    specify("abbr", () => {
        const zone = new tz.Zone(PACKED);
        const tests = [
            [-999 * 60000, "TIM"],
            [999 * 60000, "TIM"],
            [1000 * 60000, "TAM"],
            [1099 * 60000, "TAM"],
            [1100 * 60000, "IAM"],
            [1239 * 60000, "IAM"],
            [1240 * 60000, "TAM"],
            [1339 * 60000, "TAM"],
            [1340 * 60000, "TIM"],
            [1479 * 60000, "TIM"],
            [1480 * 60000, "TAM"],
            [3000 * 60000, "TAM"]
        ];
        let i;
        let source;
        let expected;

        for (i = 0; i < tests.length; i++) {
            source = tests[i][0];
            expected = tests[i][1];
            assert.equal(zone.abbr(source), expected, `The abbr for ${source} should be ${expected}`);
        }
    });

    specify("offset", () => {
        const zone = new tz.Zone(PACKED);
        const tests = [
            [-999 * 60000, 360.5],
            [999 * 60000, 360.5],
            [1000 * 60000, 300],
            [1099 * 60000, 300],
            [1100 * 60000, 360],
            [1239 * 60000, 360],
            [1240 * 60000, 300],
            [1339 * 60000, 300],
            [1340 * 60000, 360.5],
            [1479 * 60000, 360.5],
            [1480 * 60000, 300],
            [3000 * 60000, 300]
        ];
        let i;
        let source;
        let expected;

        for (i = 0; i < tests.length; i++) {
            source = tests[i][0];
            expected = tests[i][1];
            assert.equal(zone.utcOffset(source), expected, `The offset for ${source} should be ${expected}`);
        }
    });

    specify("_index", () => {
        const zone = new tz.Zone(PACKED);
        const tests = [
            [-999 * 60000, 0],
            [999 * 60000, 0],
            [1000 * 60000, 1],
            [1099 * 60000, 1],
            [1100 * 60000, 2],
            [1239 * 60000, 2],
            [1240 * 60000, 3],
            [1339 * 60000, 3],
            [1340 * 60000, 4],
            [1479 * 60000, 4],
            [1480 * 60000, 5],
            [3000 * 60000, 5]
        ];
        let i;
        let source;
        let expected;

        for (i = 0; i < tests.length; i++) {
            source = tests[i][0];
            expected = tests[i][1];
            assert.equal(zone._index(source), expected, `The _index for ${source} should be ${expected}`);
        }
    });

    specify("parse", () => {
        const zone = new tz.Zone(PACKED);
        const tests = [
            [(999 - 360.5) * 60000, 360.5],
            [(1000 - 360.5) * 60000, 300],

            [(1099 - 300) * 60000, 300],
            [(1100 - 300) * 60000, 360],

            [(1239 - 360) * 60000, 360],
            [(1240 - 360) * 60000, 300],

            [(1339 - 300) * 60000, 300],
            [(1340 - 300) * 60000, 360.5],

            [(1479 - 360.5) * 60000, 360.5],
            [(1480 - 360.5) * 60000, 300]
        ];
        let i;
        let source;
        let expected;

        tz.moveInvalidForward = false;

        for (i = 0; i < tests.length; i++) {
            source = tests[i][0];
            expected = tests[i][1];
            assert.equal(zone.parse(source), expected, `The parse for ${source} should be ${expected}`);
        }
    });
});
