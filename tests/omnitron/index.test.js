const {
    fs,
    std,
    omnitron: { STATUS, dispatcher },
    realm
} = adone;

describe("omnitron", () => {
    let iOmnitron;
    let realmInstance;

    before(async function () {
        this.timeout(25000);
        await realm.init("test");
        await realm.clean();

        realmInstance = await realm.getInstance();
        realmInstance.setSilent(true);
    });

    after(async () => {
        // await realm.clean();
    });

    beforeEach(async () => {
        await dispatcher.startOmnitron();
        await dispatcher.connectLocal({
            forceStart: false
        });
        iOmnitron = dispatcher.getInterface("omnitron");
    });

    afterEach(async () => {
        await dispatcher.stopOmnitron();
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

    it("start/stop omnitron", async () => {
        // const pidPath = adone.realm.config.omnitron.pidFilePath;
        assert.isTrue(await dispatcher.isOmnitronActive());
        await dispatcher.stopOmnitron();
        assert.isFalse(await dispatcher.isOmnitronActive());
        await dispatcher.startOmnitron();
        assert.isTrue(await dispatcher.isOmnitronActive());
    });

    it("install two services and immediatly uninstall them", async () => {
        const service1Path = std.path.join(__dirname, "services", "test1");
        const service2Path = std.path.join(__dirname, "services", "test2");
        const service1Config = await adone.configuration.load(std.path.join(service1Path, "adone.json"));
        const service2Config = await adone.configuration.load(std.path.join(service2Path, "adone.json"));

        let result = await iOmnitron.list();
        assert.lengthOf(result, 0);

        await realmInstance.install({
            name: service1Path,
            symlink: false
        });

        result = await iOmnitron.list();
        assert.lengthOf(result, 1);

        assert.deepEqual(adone.vendor.lodash.omit(result[0], "group"), {
            name: service1Config.raw.name,
            author: service1Config.raw.author,
            description: service1Config.raw.description,
            version: service1Config.raw.version,
            status: STATUS.DISABLED,
            path: std.path.join(adone.realm.config.omnitron.servicesPath, "test1")
        });


        await realmInstance.install({
            name: service2Path,
            symlink: false
        });

        result = await iOmnitron.list();

        assert.lengthOf(result, 2);

        assert.sameDeepMembers(result, [
            {
                name: service1Config.raw.name,
                author: service1Config.raw.author,
                description: service1Config.raw.description,
                version: service1Config.raw.version,
                status: STATUS.DISABLED,
                group: (result[0].name === service1Config.raw.name) ? result[0].group : result[1].group,
                path: std.path.join(adone.realm.config.omnitron.servicesPath, "test1")
            },
            {
                name: service2Config.raw.name,
                author: "",
                description: service2Config.raw.description,
                version: service2Config.raw.version,
                status: "disabled",
                group: (result[0].name === service2Config.raw.name) ? result[0].group : result[1].group,
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

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        result = await iOmnitron.list();
        assert.lengthOf(result, 0);
    });

    it("should not start disabled service", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");

        await realmInstance.install({
            name: servicePath
        });

        // let list = await iOmnitron.list();
        // assert.lengthOf(list, 1);
        // assert.equal(list[0].status, STATUS.DISABLED);

        // const err = await assert.throws(async () => iOmnitron.start("test1"));
        // assert.instanceOf(err, adone.x.IllegalState);

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        // list = await iOmnitron.list();
        // assert.lengthOf(list, 0);
    });

    it("enable/disable service", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");

        await realmInstance.install({
            name: servicePath,
            symlink: false
        });

        let list = await iOmnitron.list();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.DISABLED);

        await iOmnitron.enable("test1");

        list = await iOmnitron.list();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.INACTIVE);

        await iOmnitron.disable("test1");

        list = await iOmnitron.list();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.DISABLED);

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        list = await iOmnitron.list();
        assert.lengthOf(list, 0);
    });

    it.skip("start/stop service", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");

        await realmInstance.install({
            name: servicePath,
            symlink: false
        });

        let list = await iOmnitron.list();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.DISABLED);

        await iOmnitron.enable("test1");

        list = await iOmnitron.list();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.INACTIVE);

        await iOmnitron.start("test1");



        // await iOmnitron.disable("test1");

        // list = await iOmnitron.list();
        // assert.lengthOf(list, 1);
        // assert.equal(list[0].status, STATUS.DISABLED);

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        list = await iOmnitron.list();
        assert.lengthOf(list, 0);
    });
});
