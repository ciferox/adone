describe("database", "redis", "unit", "cluster key slot", () => {
    const { database: { redis } } = adone;
    const { calculateSlot } = adone.private(redis);
    const { generateMulti } = calculateSlot;

    const tests = {
        123465: 1492,
        foobar: 12325,
        abcdefghijklmnopqrstuvwxyz: 9132,
        "gsdfhan$%^&*(sdgsdnhshcs": 15532,
        "abc{foobar}": 12325,
        "{foobar}": 12325,
        "h8a9sd{foobar}}{asd}}": 12325,
        "{foobar": 16235,
        "foobar{}": 4435,
        "{{foobar}": 16235,
        éêe: 13690,
        àâa: 3872,
        漢字: 14191,
        汉字: 16196,
        호텔: 4350,
        "\uD800\uDC00": 11620 // surrogate pair
    };

    const testsMulti = [
        "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz"
    ];

    const testsMultiResult = 9132;

    const assertHash = (string) => {
        assert.strictEqual(calculateSlot(string), tests[string], `${string} - generated invalid hash: ${calculateSlot(string)}`);
    };

    describe("single hash: calculateSlot()", () => {
        it("generate a correct hash from string", () => {
            Object.keys(tests).forEach(assertHash);
        });
    });

    describe("multiple hashes: generateMulti()", () => {
        it("generate a correct hash from multiple strings", () => {
            assert.strictEqual(generateMulti(testsMulti), testsMultiResult);
        });

        it("returns -1 if any of the keys generates a different hash slot than the rest", () => {
            assert.strictEqual(generateMulti(Object.keys(tests)), -1);
        });
    });
});
