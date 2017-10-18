import OmnitronRunner from "./runner";

const {
    fs,
    std,
    omnitron: { STATUS },
    realm
} = adone;

describe("omnitron", () => {
    let omnitronRunner;
    let iOmnitron;

    before(async function () {
        this.timeout(25000);

        await realm.init("test");

        omnitronRunner = new OmnitronRunner();
        await omnitronRunner.cleanHome();
    });

    after(async () => {
        // await omnitronRunner.cleanHome();
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
            assert.isTrue(await fs.exists(adone.realm.config.omnitron.pidFilePath));
            assert.isTrue(await fs.exists(adone.realm.config.omnitron.logFilePath));
            assert.isTrue(await fs.exists(adone.realm.config.omnitron.logFilePath));
        });
    
        it("correct omnitron information", async () => {
            const info = await iOmnitron.getInfo();
    
            assert.equal(info.version, adone.package.version);
    
            assert.equal(info.realm.name, "test");
            assert.equal(info.realm.uid, (await realm.getInstance()).id);
    
            assert.equal(info.envs.ADONE_REALM, info.realm.name);
            assert.equal(info.envs.ADONE_DIRNAME, ".adone_test");
            assert.isOk(info.envs.ADONE_HOME.endsWith(".adone_test"));
        });
    
        it("should not be any services initially", async () => {
            const result = await iOmnitron.list();
            assert.lengthOf(result, 0);
        });
    });

    describe("services", () => {
        let realmInstance;
        before(async () => {
            realmInstance = await realm.getInstance();
            realmInstance.setSilent(true);
        });

        it("install service", async () => {    
            const servicePath = std.path.join(__dirname, "services", "test1");
            const serviceConfig = await adone.configuration.load(std.path.join(servicePath, "adone.json"));

            await realmInstance.install({
                name: servicePath,
                symlink: false
            });

            const result = await iOmnitron.list();

            assert.lengthOf(result, 1);

            assert.sameDeepMembers(result, [
                {
                    name: serviceConfig.raw.name,
                    author: serviceConfig.raw.author,
                    description: serviceConfig.raw.description,
                    version: serviceConfig.raw.version,
                    status: STATUS.DISABLED,
                    path: std.path.join(adone.realm.config.omnitron.servicesPath, "test1")
                }
            ]);
        });

        it("uninstall service immediatly after install", async () => {
            const service1Path = std.path.join(__dirname, "services", "test1");
            const service2Path = std.path.join(__dirname, "services", "test2");
            const service1Config = await adone.configuration.load(std.path.join(service1Path, "adone.json"));
            const service2Config = await adone.configuration.load(std.path.join(service2Path, "adone.json"));

            await realmInstance.install({
                name: service2Path,
                symlink: false
            });

            let result = await iOmnitron.list();

            assert.lengthOf(result, 2);

            assert.sameDeepMembers(result, [
                {
                    name: service1Config.raw.name,
                    author: service1Config.raw.author,
                    description: service1Config.raw.description,
                    version: service1Config.raw.version,
                    status: STATUS.DISABLED,
                    path: std.path.join(adone.realm.config.omnitron.servicesPath, "test1")
                },
                {
                    name: service2Config.raw.name,
                    author: "",
                    description: service2Config.raw.description,
                    version: service2Config.raw.version,
                    status: "disabled",
                    path: std.path.join(adone.realm.config.omnitron.servicesPath, "test2")
                }
            ]);

            await realmInstance.uninstall({
                name: "omnitron.service.test2"
            });

            result = await iOmnitron.list();

            assert.lengthOf(result, 1);
            
            assert.equal(result[0].name, service1Config.raw.name);
            assert.equal(result[0].author, service1Config.raw.author);
            assert.equal(result[0].description, service1Config.raw.description);
            assert.equal(result[0].version, service1Config.raw.version);
            assert.equal(result[0].status, STATUS.DISABLED);
        });
    });
});
