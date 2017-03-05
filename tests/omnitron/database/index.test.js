import OmnitronRunner from "../runner";

describe("Database service", function() {
    let omnitronRunner;
    let iDatabase;
    let appConfig;

    before(async function() {
        this.timeout(25000);

        omnitronRunner = new OmnitronRunner();
        await omnitronRunner.run();
        appConfig = adone.appinstance.config;
        await omnitronRunner.startOmnitron();
        await omnitronRunner.connectOmnitron();
        iDatabase = omnitronRunner.getInterface("database");
    });

    after(async function() {
        await omnitronRunner.stopOmnitron();
    });

    it("get new datastore", async function() {
        const iDatastore = await iDatabase.getDatastore({ filename: "test" });
        assert.equal(await iDatastore.count(), 0);
        await iDatastore.insert({ name: "Document1", size: 12, type: "dat" });
    });

    it("get existing datastore", async function() {
        const iDatastore = await iDatabase.getDatastore({ filename: "test" });
        assert.equal(await iDatastore.count(), 1);
        const doc = await iDatastore.findOne({ name: "Document1" });
        assert.equal(doc.size, 12);
        assert.equal(doc.type, "dat");
    });

    it("delete database", async function() {
        const iDatastore = await iDatabase.getDatastore({ filename: "test" });
        await iDatabase.deleteDatastore("test");
        assert.isOk(!(await adone.fs.exists(adone.std.path.join(appConfig.adone.omnitron.services.database.options.base, "test.db"))));
        
        try {
            await iDatastore.insert({ field1: "test"});
        } catch (err) {
            assert.isOk(err instanceof adone.x.NotExists);
            assert.equal(err.message, "Context not exists");
            return;
        }

        assert.fail("should throw exception");
    });
});
