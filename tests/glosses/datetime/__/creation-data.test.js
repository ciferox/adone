describe("datetime", "creation data", () => {
    before(() => {
        adone.datetime.locale("en");
    });

    it("valid date", () => {
        const dat = adone.datetime("1992-10-22");
        const orig = dat.creationData();

        assert.equal(dat.isValid(), true, "1992-10-22 is valid");
        assert.equal(orig.input, "1992-10-22", "original input is not correct.");
        assert.equal(orig.format, "YYYY-MM-DD", "original format is defined.");
        assert.equal(orig.locale._abbr, "en", "default locale is en");
        assert.equal(orig.isUTC, false, "not a UTC date");
    });

    it("valid date at fr locale", () => {
        const dat = adone.datetime("1992-10-22", "YYYY-MM-DD", "fr");
        const orig = dat.creationData();

        assert.equal(orig.locale._abbr, "fr", "locale is fr");
    });

    it("valid date with formats", () => {
        const dat = adone.datetime("29-06-1995", ["MM-DD-YYYY", "DD-MM", "DD-MM-YYYY"]);
        const orig = dat.creationData();

        assert.equal(orig.format, "DD-MM-YYYY", "DD-MM-YYYY format is defined.");
    });

    it("strict", () => {
        assert.ok(adone.datetime("2015-01-02", "YYYY-MM-DD", true).creationData().strict, "strict is true");
        assert.ok(!adone.datetime("2015-01-02", "YYYY-MM-DD").creationData().strict, "strict is true");
    });
});
