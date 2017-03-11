import OmnitronRunner from "../runner";

describe("Database service", () => {
    let omnitronRunner;
    let iDatabase;
    let appConfig;

    before(async function () {
        this.timeout(25000);

        omnitronRunner = new OmnitronRunner();
        await omnitronRunner.run();
        appConfig = omnitronRunner.config;
        omnitronRunner.createDispatcher();
        await omnitronRunner.startOmnitron();
        await omnitronRunner.dispatcher.enable("database");
        await omnitronRunner.dispatcher.start("database");
        await adone.promise.delay(100);
        iDatabase = omnitronRunner.getInterface("db");
    });

    after(async () => {
        await omnitronRunner.stopOmnitron();
    });

    it("get new datastore", async () => {
        const iDatastore = await iDatabase.getDatastore({ filename: "test" });
        assert.equal(await iDatastore.count(), 0);
        await iDatastore.insert({ name: "Document1", size: 12, type: "dat" });
    });

    it("get existing datastore", async () => {
        const iDatastore = await iDatabase.getDatastore({ filename: "test" });
        assert.equal(await iDatastore.count(), 1);
        const doc = await iDatastore.findOne({ name: "Document1" });
        assert.equal(doc.size, 12);
        assert.equal(doc.type, "dat");
    });

    it("delete database", async () => {
        const iDatastore = await iDatabase.getDatastore({ filename: "test" });
        await iDatabase.deleteDatastore("test");
        const storesPath = await appConfig.omnitron.getServicePath("database", "stores");
        assert.isOk(!(await adone.fs.exists(adone.std.path.join(storesPath, "test.db"))));

        try {
            await iDatastore.insert({ field1: "test" });
        } catch (err) {
            assert.isOk(err instanceof adone.x.NotExists);
            assert.equal(err.message, "Context not exists");
            return;
        }

        assert.fail("should throw exception");
    });
});
