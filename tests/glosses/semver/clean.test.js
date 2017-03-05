/* global describe it */


const clean = adone.semver.clean;

describe("semver", function() {
    describe("clean", function() {
        it("multiple tests", function() {
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
            ].forEach(function(tuple) {
                let range = tuple[0];
                let version = tuple[1];
                let msg = "clean(" + range + ") = " + version;
                assert.equal(clean(range), version, msg);
            });
        });
    });
});
