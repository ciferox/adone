describe("geoip", "mmdb", "api", () => {
    const { geoip: { mmdb } } = adone;

    const fixtures = new adone.fs.Directory(__dirname, "fixtures");
    const db = fixtures.getFile("GeoIP2-City-Test.mmdb");
    const dbPath = db.path();

    describe("open()", () => {
        it("should work with most basic usage", async () => {
            const lookup = await mmdb.open(dbPath);
            assert(lookup.get("2001:230::"));
        });

        it("should successfully handle errors while opening a db", async () => {
            const err = await mmdb.open("/foo/bar").then(() => null, (e) => e);
            expect(err).not.to.be.null;
            expect(err.message).to.be.match(/no such file or directory/);
        });

        it("should handler reader errors", async () => {
            await assert.throws(async () => {
                await mmdb.open(fixtures.getFile("broken.dat").path());
            }, "Cannot parse binary database");
        });
    });

    describe("openSync()", () => {
        it("should successfully handle database", () => {
            const lookup = mmdb.openSync(dbPath);
            assert(lookup.get("2001:230::"));
        });
    });
});
