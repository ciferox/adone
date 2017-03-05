/* global describe it */

let prerelease = adone.semver.prerelease;

describe("semver", function () {
    describe("prerelease", function () {
        it("prerelease", function() {
        // [prereleaseParts, version, loose]
            [
                [["alpha", 1], "1.2.2-alpha.1"],
                [[1], "0.6.1-1"],
                [["beta", 2], "1.0.0-beta.2"],
                [["pre"], "v0.5.4-pre"],
                [["alpha", 1], "1.2.2-alpha.1", false],
                [["beta"], "0.6.1beta", true],
                [null, "1.0.0", true],
                [null, "~2.0.0-alpha.1", false],
                [null, "invalid version"],
            ].forEach(function(tuple) {
                let expected = tuple[0];
                let version = tuple[1];
                let loose = tuple[2];
                let msg = "prerelease(" + version + ")";
                assert.deepEqual(prerelease(version, loose), expected, msg);
            });
        });
    });
});
