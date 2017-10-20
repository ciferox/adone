const {
    fs,
    project,
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

    const runProjectsTask = async (taskName) => {
        const servicePath = std.path.join(__dirname, "services");
        const names = await fs.readdir(servicePath);

        for (const name of names) {
            const projectManager = new adone.project.Manager(std.path.join(servicePath, name));
            projectManager.setSilent(true);
            await projectManager.load(); // eslint-disable-line
            await projectManager[taskName](); // eslint-disable-line
        }
    };

    beforeEach(async () => {
        await dispatcher.startOmnitron();
        await dispatcher.connectLocal({
            forceStart: false
        });
        iOmnitron = dispatcher.getInterface("omnitron");

        await runProjectsTask("build");
    });

    afterEach(async () => {
        await dispatcher.stopOmnitron();
        await runProjectsTask("clean");
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
            const result = await iOmnitron.enumerate();
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
        const service1Config = await project.Configuration.load({
            cwd: service1Path
        });
        const service2Config = await project.Configuration.load({
            cwd: service2Path
        });

        let result = await iOmnitron.enumerate();
        assert.lengthOf(result, 0);

        await realmInstance.install({
            name: service1Path,
            symlink: false
        });

        result = await iOmnitron.enumerate();
        assert.lengthOf(result, 1);

        assert.deepEqual(adone.vendor.lodash.omit(result[0], "group"), {
            name: service1Config.raw.name,
            author: service1Config.raw.author,
            description: service1Config.raw.description,
            version: service1Config.raw.version,
            status: STATUS.DISABLED,
            mainPath: std.path.join(adone.realm.config.omnitron.servicesPath, "test1", service1Config.getMainPath())
        });

        assert.isTrue(result[0].group.startsWith("group-"));

        await realmInstance.install({
            name: service2Path,
            symlink: false
        });

        result = await iOmnitron.enumerate();

        assert.lengthOf(result, 2);

        assert.sameDeepMembers(result, [
            {
                name: service1Config.raw.name,
                author: service1Config.raw.author,
                description: service1Config.raw.description,
                version: service1Config.raw.version,
                status: STATUS.DISABLED,
                group: (result[0].name === service1Config.raw.name) ? result[0].group : result[1].group,
                mainPath: std.path.join(adone.realm.config.omnitron.servicesPath, "test1", service1Config.getMainPath())
            },
            {
                name: service2Config.raw.name,
                author: "",
                description: service2Config.raw.description,
                version: service2Config.raw.version,
                status: "disabled",
                group: (result[0].name === service2Config.raw.name) ? result[0].group : result[1].group,
                mainPath: std.path.join(adone.realm.config.omnitron.servicesPath, "test2", service2Config.getMainPath())
            }
        ]);

        assert.isTrue(result[0].group.startsWith("group-"));
        assert.isTrue(result[1].group.startsWith("group-"));

        const groups = await iOmnitron.enumerateGroups();
        assert.sameMembers(groups, [result[0].group, result[1].group]);

        await realmInstance.uninstall({
            name: "omnitron.service.test2"
        });

        result = await iOmnitron.enumerate();
        assert.lengthOf(result, 1);

        assert.equal(result[0].name, service1Config.raw.name);
        assert.equal(result[0].author, service1Config.raw.author);
        assert.equal(result[0].description, service1Config.raw.description);
        assert.equal(result[0].version, service1Config.raw.version);
        assert.equal(result[0].status, STATUS.DISABLED);

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        result = await iOmnitron.enumerate();
        assert.lengthOf(result, 0);
    });

    it("should not start disabled service", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");

        await realmInstance.install({
            name: servicePath
        });

        let list = await iOmnitron.enumerate();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.DISABLED);

        const err = await assert.throws(async () => iOmnitron.startService("test1"));
        assert.instanceOf(err, adone.x.IllegalState);

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        list = await iOmnitron.enumerate();
        assert.lengthOf(list, 0);
    });

    it("enable/disable service", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");

        await realmInstance.install({
            name: servicePath,
            symlink: false
        });

        let list = await iOmnitron.enumerate();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.DISABLED);

        await iOmnitron.enableService("test1");

        list = await iOmnitron.enumerate();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.INACTIVE);

        await iOmnitron.disableService("test1");

        list = await iOmnitron.enumerate();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.DISABLED);

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        list = await iOmnitron.enumerate();
        assert.lengthOf(list, 0);
    });

    it("start/stop service", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");

        await realmInstance.install({
            name: servicePath,
            symlink: false
        });

        let list = await iOmnitron.enumerate();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.DISABLED);

        await iOmnitron.enableService("test1");

        list = await iOmnitron.enumerate();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.INACTIVE);

        await iOmnitron.startService("test1");
        let serviceData = await iOmnitron.enumerate("test1");
        assert.equal(serviceData.status, STATUS.ACTIVE);

        // await dispatcher.peer.waitForContext("test1");
        const iTest1 = await dispatcher.getInterface("test1");

        const info = await iTest1.getInfo();

        const adoneConf = await project.Configuration.load({
            cwd: servicePath
        });

        assert.equal(info.name, adoneConf.raw.name);
        assert.equal(info.description, adoneConf.raw.description);
        assert.equal(info.version, adoneConf.raw.version);
        assert.equal(info.author, adoneConf.raw.author);

        await iOmnitron.stopService("test1");
        serviceData = await iOmnitron.enumerate("test1");
        assert.equal(serviceData.status, STATUS.INACTIVE);

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        list = await iOmnitron.enumerate();
        assert.lengthOf(list, 0);
    });
});
