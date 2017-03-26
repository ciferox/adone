import OmnitronRunner from "./runner";

describe("Omnitron", () => {
    let omnitronRunner;
    let iOmnitron;

    before(async function () {
        this.timeout(25000);

        omnitronRunner = new OmnitronRunner();
        await omnitronRunner.run();
        omnitronRunner.createDispatcher();
        await omnitronRunner.startOmnitron();
        await adone.promise.delay(100);
        iOmnitron = omnitronRunner.getInterface("omnitron");
    });

    after(async () => {
        await omnitronRunner.stopOmnitron();
    });

    it("correct environment", async () => {
        const envs = await iOmnitron.envs();
        const env = await iOmnitron.environment();

        assert.equal(env, "test");
        assert.equal(envs.ADONE_DIRNAME, ".adone_test");
        assert.equal(envs.ADONE_ENV, env);
        assert.isOk(envs.ADONE_HOME.endsWith(".adone_test"));
    });
});
