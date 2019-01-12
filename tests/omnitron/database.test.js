const {
    omnitron
} = adone;

describe("omnitron", "DB", () => {
    let adoneRootPath;
    let dispatcher;
    let db;

    before(async function () {
        adoneRootPath = this.adoneRootPath;
        dispatcher = omnitron.dispatcher;

        await omnitron.DB.destroy(true);
    });

    it("open database", async () => {
        assert.null(omnitron.DB.instance);
        db = await omnitron.DB.open();
        assert.instanceOf(omnitron.DB.instance, omnitron.DB);
    });

    describe("common configuration", () => {
        it("should be created when first time obtain it", async () => {
            const config = await db.getConfiguration("common");
        });
    });

    describe("networks", () => {
        it("no networks by default", async () => {
            const networks = await db.getConfiguration("networks");
            assert.strictEqual(networks.size(), 0);
        });
    });
});
