const {
    semver
} = adone;

describe("semver", () => {
    it("long version is too long", () => {
        const v = `1.2.${new Array(256).join("1")}`;
        assert.throws(() => {
            new semver.SemVer(v); // eslint-disable-line no-new
        });
        assert.equal(semver.valid(v, false), null);
        assert.equal(semver.valid(v, true), null);
        assert.equal(semver.inc(v, "patch"), null);
    });
    
    it("big number is like too long version", () => {
        const v = `1.2.${new Array(100).join("1")}`;
        assert.throws(() => {
            new semver.SemVer(v); // eslint-disable-line no-new
        });
        assert.equal(semver.valid(v, false), null);
        assert.equal(semver.valid(v, true), null);
        assert.equal(semver.inc(v, "patch"), null);
    });
    
    it("parsing null does not throw", () => {
        assert.equal(semver.parse(null), null);
        assert.equal(semver.parse({}), null);
        assert.equal(semver.parse(new semver.SemVer("1.2.3")).version, "1.2.3");
    });
});

