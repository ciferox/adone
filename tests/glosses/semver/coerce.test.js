const {
    semver
} = adone;
const { coerce, valid } = semver;

describe("semver", () => {
    const r = (text) => (count) => text.repeat(count);

    it("coerce", () => {
        // Expected to be null (cannot be coerced).
        [
            null,
            { version: "1.2.3" },
            function () {
                return "1.2.3";
            },
            "",
            ".",
            "version one",
            r("9")(16),
            r("1")(17),
            `a${r("9")(16)}`,
            `a${r("1")(17)}`,
            `${r("9")(16)}a`,
            `${r("1")(17)}a`,
            `${r("9")(16)}.4.7.4`,
            `${r("9")(16)}.${r("2")(16)}.${r("3")(16)}`,
            `${r("1")(16)}.${r("9")(16)}.${r("3")(16)}`,
            `${r("1")(16)}.${r("2")(16)}.${r("9")(16)}`
        ].forEach((input) => {
            const msg = `coerce(${input}) should be null`;
            assert.equal(coerce(input), null, msg);
        });

        // Expected to be the valid.
        [
            [semver.parse("1.2.3"), "1.2.3"],
            [".1", "1.0.0"],
            [".1.", "1.0.0"],
            ["..1", "1.0.0"],
            [".1.1", "1.1.0"],
            ["1.", "1.0.0"],
            ["1.0", "1.0.0"],
            ["1.0.0", "1.0.0"],
            ["0", "0.0.0"],
            ["0.0", "0.0.0"],
            ["0.0.0", "0.0.0"],
            ["0.1", "0.1.0"],
            ["0.0.1", "0.0.1"],
            ["0.1.1", "0.1.1"],
            ["1", "1.0.0"],
            ["1.2", "1.2.0"],
            ["1.2.3", "1.2.3"],
            ["1.2.3.4", "1.2.3"],
            ["13", "13.0.0"],
            ["35.12", "35.12.0"],
            ["35.12.18", "35.12.18"],
            ["35.12.18.24", "35.12.18"],
            ["v1", "1.0.0"],
            ["v1.2", "1.2.0"],
            ["v1.2.3", "1.2.3"],
            ["v1.2.3.4", "1.2.3"],
            [" 1", "1.0.0"],
            ["1 ", "1.0.0"],
            ["1 0", "1.0.0"],
            ["1 1", "1.0.0"],
            ["1.1 1", "1.1.0"],
            ["1.1-1", "1.1.0"],
            ["1.1-1", "1.1.0"],
            ["a1", "1.0.0"],
            ["a1a", "1.0.0"],
            ["1a", "1.0.0"],
            ["version 1", "1.0.0"],
            ["version1", "1.0.0"],
            ["version1.0", "1.0.0"],
            ["version1.1", "1.1.0"],
            ["42.6.7.9.3-alpha", "42.6.7"],
            ["v2", "2.0.0"],
            ["v3.4 replaces v3.3.1", "3.4.0"],
            ["4.6.3.9.2-alpha2", "4.6.3"],
            [`${r("1")(17)}.2`, "2.0.0"],
            [`${r("1")(17)}.2.3`, "2.3.0"],
            [`1.${r("2")(17)}.3`, "1.0.0"],
            [`1.2.${r("3")(17)}`, "1.2.0"],
            [`${r("1")(17)}.2.3.4`, "2.3.4"],
            [`1.${r("2")(17)}.3.4`, "1.0.0"],
            [`1.2.${r("3")(17)}.4`, "1.2.0"],
            [
                `${r("1")(17)}.${r("2")(16)}.${r("3")(16)}`,
                `${r("2")(16)}.${r("3")(16)}.0`],
            [
                `${r("1")(16)}.${r("2")(17)}.${r("3")(16)}`,
                `${r("1")(16)}.0.0`],
            [
                `${r("1")(16)}.${r("2")(16)}.${r("3")(17)}`,
                `${r("1")(16)}.${r("2")(16)}.0`
            ],
            [`11${r(".1")(126)}`, "11.1.1"],
            [r("1")(16), `${r("1")(16)}.0.0`],
            [`a${r("1")(16)}`, `${r("1")(16)}.0.0`],
            [`${r("1")(16)}.2.3.4`, `${r("1")(16)}.2.3`],
            [`1.${r("2")(16)}.3.4`, `1.${r("2")(16)}.3`],
            [`1.2.${r("3")(16)}.4`, `1.2.${r("3")(16)}`],
            [
                `${r("1")(16)}.${r("2")(16)}.${r("3")(16)}`,
                `${r("1")(16)}.${r("2")(16)}.${r("3")(16)}`
            ],
            [`1.2.3.${r("4")(252)}.5`, "1.2.3"],
            [`1.2.3.${r("4")(1024)}`, "1.2.3"],
            [`${r("1")(17)}.4.7.4`, "4.7.4"]
        ].forEach((tuple) => {
            const input = tuple[0];
            const expected = tuple[1];
            const msg = `coerce(${input}) should become ${expected}`;
            assert.equal((coerce(input) || {}).version, expected, msg);
        });

        // assert.equal(valid(coerce("42.6.7.9.3-alpha")), "42.6.7");
        // assert.equal(valid(coerce("v2")), "2.0.0");
    });
});
