/* global describe it */


const semver = adone.semver;

describe("semver", function () {
    describe("big numbers", function () {
        it("long version is too long", function() {
            let v = "1.2." + new Array(256).join("1");
            assert.throws(function() {
                new semver.SemVer(v);
            });
            assert.equal(semver.valid(v, false), null);
            assert.equal(semver.valid(v, true), null);
            assert.equal(semver.inc(v, "patch"), null);
        });

        it("big number is like too long version", function() {
            let v = "1.2." + new Array(100).join("1");
            assert.throws(function() {
                new semver.SemVer(v);
            });
            assert.equal(semver.valid(v, false), null);
            assert.equal(semver.valid(v, true), null);
            assert.equal(semver.inc(v, "patch"), null);
        });

        it("parsing null does not throw", function() {
            assert.equal(semver.parse(null), null);
            assert.equal(semver.parse({}), null);
            assert.equal(semver.parse(new semver.SemVer("1.2.3")).version, "1.2.3");
        });
    });
});
