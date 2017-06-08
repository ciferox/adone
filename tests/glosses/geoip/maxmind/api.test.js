describe("geoip", "maxmind", "api", () => {
    const { geoip: { maxmind } } = adone;

    const fixtures = new adone.fs.Directory(__dirname, "fixtures");
    const db = fixtures.getVirtualFile("GeoIP2-City-Test.mmdb");
    const dbPath = db.path();

    describe("open()", () => {
        it("should work with most basic usage", async () => {
            const lookup = await maxmind.open(dbPath);
            assert(lookup.get("2001:230::"));
        });

        it("should successfully handle errors while opening a db", async () => {
            const err = await maxmind.open("/foo/bar").then(() => null, (e) => e);
            expect(err).not.to.be.null;
            expect(err.message).to.be.match(/no such file or directory/);
        });
    });

    describe("openSync()", () => {
        it("should successfully handle database", () => {
            const lookup = maxmind.openSync(dbPath);
            assert(lookup.get("2001:230::"));
        });
    });
});
