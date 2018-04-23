const {
    omnitron2
} = adone;

describe("omnitron", "DB", () => {
    let adoneRootPath;
    let dispatcher;
    let db;

    before(async function () {
        adoneRootPath = this.adoneRootPath;
        dispatcher = omnitron2.dispatcher;

        await omnitron2.DB.destroy(true);
    });

    it("open database", async () => {
        assert.null(omnitron2.DB.instance);
        db = await omnitron2.DB.open();
        assert.instanceOf(omnitron2.DB.instance, omnitron2.DB);
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
