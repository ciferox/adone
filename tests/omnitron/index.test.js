import OmnitronRunner from "./runner";

const {
    fs
} = adone;

describe("omnitron", () => {
    let omnitronRunner;
    let iOmnitron;

    before(async function () {
        this.timeout(25000);

        omnitronRunner = new OmnitronRunner();
        await omnitronRunner.cleanHome();
    });

    after(async () => {
        await omnitronRunner.cleanHome();
    });

    beforeEach(async () => {
        await omnitronRunner.startOmnitron();
        iOmnitron = omnitronRunner.getInterface("omnitron");
    });

    afterEach(async () => {
        await omnitronRunner.stopOmnitron();
    });

    describe("first start", () => {
        it("should create pidfile and log files", async () => {
            assert.isTrue(await fs.exists(adone.config.omnitron.pidFilePath));
            assert.isTrue(await fs.exists(adone.config.omnitron.logFilePath));
            assert.isTrue(await fs.exists(adone.config.omnitron.logFilePath));
        });
    
        it("correct omnitron information", async () => {
            const info = await iOmnitron.getInfo();
    
            assert.equal(info.version, adone.package.version);
    
            assert.equal(info.realm.name, "test");
            assert.equal(info.realm.uid, (await adone.realm.getLocal()).id);
    
            assert.equal(info.envs.ADONE_REALM, info.realm.name);
            assert.equal(info.envs.ADONE_DIRNAME, ".adone_test");
            assert.isOk(info.envs.ADONE_HOME.endsWith(".adone_test"));
        });
    
        it("should not be any services initially", async () => {
            const result = await iOmnitron.list();
            assert.lengthOf(result, 0);
        });
    });
});
