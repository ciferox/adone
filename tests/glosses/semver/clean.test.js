const {
    semver
} = adone;

const {
    clean
} = semver;

describe("semver", () => {
    it("clean tests", () => {
        // [range, version]
        // Version should be detectable despite extra characters
        [
            ["1.2.3", "1.2.3"],
            [" 1.2.3 ", "1.2.3"],
            [" 1.2.3-4 ", "1.2.3-4"],
            [" 1.2.3-pre ", "1.2.3-pre"],
            ["  =v1.2.3   ", "1.2.3"],
            ["v1.2.3", "1.2.3"],
            [" v1.2.3 ", "1.2.3"],
            ["\t1.2.3", "1.2.3"],
            [">1.2.3", null],
            ["~1.2.3", null],
            ["<=1.2.3", null],
            ["1.2.x", null]
        ].forEach((tuple) => {
            const range = tuple[0];
            const version = tuple[1];
            const msg = `clean(${range}) = ${version}`;
            assert.equal(clean(range), version, msg);
        });
    });
});
