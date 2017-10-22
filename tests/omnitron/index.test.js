const {
    fs,
    project,
    std,
    omnitron: { STATUS, dispatcher },
    realm,
    x
} = adone;

describe("omnitron", () => {
    let iOmnitron;
    let realmInstance;

    const waitForServiceStatus = (name, status, timeout = 5000) => {
        return new Promise((resolve, reject) => {
            let elapsed = 0;
            const checkStatus = async () => {
                const list = await iOmnitron.enumerate(name);
                if (list[0].status === status) {
                    return resolve();
                }
                elapsed += 100;
                if (elapsed >= timeout) {
                    return reject(new x.Timeout());
                }
                setTimeout(checkStatus, 100);
            };
            checkStatus();
        });
    };

    const enableServices = async (names) => {
        const awaiters = [];
        const ops = [];
        for (const name of names) {
            ops.push(iOmnitron.enableService(name)); // eslint-disable-line
            awaiters.push(waitForServiceStatus(name, STATUS.INACTIVE));
        }

        await Promise.all(ops);
        return Promise.all(awaiters);
    };

    const disableServices = async (names) => {
        const awaiters = [];
        const ops = [];
        for (const name of names) {
            ops.push(iOmnitron.disableService(name)); // eslint-disable-line
            awaiters.push(waitForServiceStatus(name, STATUS.DISABLED));
        }

        await Promise.all(ops);
        return Promise.all(awaiters);
    };

    const startServices = async (names) => {
        const awaiters = [];
        const ops = [];
        for (const name of names) {
            ops.push(iOmnitron.startService(name)); // eslint-disable-line
            awaiters.push(waitForServiceStatus(name, STATUS.ACTIVE));
        }

        await Promise.all(ops);
        return Promise.all(awaiters);
    };

    const stopServices = async (names) => {
        const awaiters = [];
        const ops = [];
        for (const name of names) {
            ops.push(iOmnitron.stopService(name)); // eslint-disable-line
            awaiters.push(waitForServiceStatus(name, STATUS.INACTIVE));
        }

        await Promise.all(ops);
        return Promise.all(awaiters);
    };

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

    before(async function () {
        this.timeout(25000);
        await realm.init(".adone_test");
        await realm.clean();

        realmInstance = await realm.getInstance();
        realmInstance.setSilent(true);
    });

    after(async () => {
        await realm.clean();
    });

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
        it("config, pidfile and log files should exist", async () => {
            assert.isTrue(await fs.exists(std.path.join(adone.realm.config.configsPath, adone.omnitron.CONFIG_NAME)));
            assert.isTrue(await fs.exists(adone.realm.config.omnitron.pidFilePath));
            assert.isTrue(await fs.exists(adone.realm.config.omnitron.logFilePath));
            assert.isTrue(await fs.exists(adone.realm.config.omnitron.errorLogFilePath));
        });

        it("correct omnitron information", async () => {
            const info = await iOmnitron.getInfo();

            assert.equal(info.version, adone.package.version);

            assert.equal(info.realm.name, ".adone_test");
            assert.equal(info.realm.uid, (await realm.getInstance()).id);

            assert.equal(info.envs.ADONE_REALM, info.realm.name);
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

        await waitForServiceStatus("test1", STATUS.DISABLED);

        await enableServices(["test1"]);
        await disableServices(["test1"]);

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        assert.lengthOf(await iOmnitron.enumerate(), 0);
    });

    it("start/stop service", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");

        await realmInstance.install({
            name: servicePath,
            symlink: false
        });

        await waitForServiceStatus("test1", STATUS.DISABLED);
        await enableServices(["test1"]);
        await startServices(["test1"]);

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

        await stopServices(["test1"]);

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });

        assert.lengthOf(await iOmnitron.enumerate(), 0);
    });

    it("enabled service should be started during omnitron startup", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");
        
        await realmInstance.install({
            name: servicePath,
            symlink: false
        });

        await enableServices(["test1"]);

        await dispatcher.stopOmnitron();
        await dispatcher.startOmnitron();
        await dispatcher.connectLocal({
            forceStart: false
        });
        iOmnitron = dispatcher.getInterface("omnitron");

        await waitForServiceStatus("test1", STATUS.ACTIVE);

        const iTest1 = dispatcher.getInterface("test1");
        const info = await iTest1.getInfo();
        const list = await iOmnitron.enumerate("test1");
        
        assert.equal(info.name, list[0].name);

        await stopServices(["test1"]);
        
        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });
    });

    it("start already active services should have throws", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");
        
        await realmInstance.install({
            name: servicePath,
            symlink: false
        });
        await enableServices(["test1"]);
        await startServices(["test1"]);
        
        const err = await assert.throws(async () => iOmnitron.startService("test1"));
        assert.instanceOf(err, x.IllegalState);

        await stopServices(["test1"]);
        
        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });
    });

    it("stop single service in a group should initiate process exit(0)", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");
        
        await realmInstance.install({
            name: servicePath,
            symlink: false
        });
        await enableServices(["test1"]);
        await startServices(["test1"]);

        const list = await iOmnitron.enumerate("test1");
        const iMaintainer = await iOmnitron.getMaintainer(list[0].group);
        const pid = await iMaintainer.getPid();
        assert.isTrue(adone.system.process.exists(pid));

        await stopServices(["test1"]);

        await adone.promise.delay(1000);

        assert.isFalse(adone.system.process.exists(pid));

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });
    });

    it.skip("Processes in a group should start in single process", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");
        
        await realmInstance.install({
            name: servicePath,
            symlink: false
        });
        await iOmnitron.enableService("test1");
        await iOmnitron.startService("test1");

        await waitForServiceStatus("test1", STATUS.ACTIVE);

        const list = await iOmnitron.enumerate("test1");
        const iMaintainer = await iOmnitron.getMaintainer(list[0].group);
        const pid = await iMaintainer.getPid();
        assert.isTrue(adone.system.process.exists(pid));

        await iOmnitron.stopService("test1");

        await waitForServiceStatus("test1", STATUS.INACTIVE);

        await adone.promise.delay(1000);

        assert.isFalse(adone.system.process.exists(pid));

        await realmInstance.uninstall({
            name: "omnitron.service.test1"
        });
    });
});
