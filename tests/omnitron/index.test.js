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
    const installedServices = [];

    const waitForServiceStatus = (name, status, timeout = 5000) => {
        return new Promise((resolve, reject) => {
            let elapsed = 0;
            const checkStatus = async () => {
                const list = await iOmnitron.enumerate(name);
                if (list.length > 0 && list[0].status === status) {
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

    const checkServiceStatus = async (name, status) => {
        const list = await iOmnitron.enumerate(name);
        if (list.length === 0 || list[0].status !== status) {
            throw new x.NotValid(`Status: ${list[0].status}`);
        }
    };

    const installServices = async (paths) => {
        for (const name of paths) {
            // eslint-disable-next-line
            const adoneConf = await realmInstance.install({
                name,
                symlink: false
            });
            installedServices.push(adoneConf);
            await checkServiceStatus(adoneConf.name, STATUS.DISABLED); // eslint-disable-line
        }
    };

    const uninstallServices = async () => {
        for (const conf of installedServices) {
            // eslint-disable-next-line
            await realmInstance.uninstall({
                name: `omnitron.service.${conf.raw.name}`
            });
        }

        installedServices.length = 0;
    };

    const installService = async (path, symlink = false) => {
        installedServices.push(await realmInstance.install({
            name: path,
            symlink
        }));
    };

    const uninstallService = async (name) => {
        await realmInstance.uninstall({
            name: `omnitron.service.${name}`
        });

        const index = installedServices.findIndex((conf) => conf.raw.name === name);
        if (index >= 0) {
            installedServices.splice(index, 1);
        }
    };

    const enableServices = async (names) => {
        const awaiters = [];
        const ops = [];
        for (const name of names) {
            ops.push(iOmnitron.enableService(name)); // eslint-disable-line
            awaiters.push(checkServiceStatus(name, STATUS.INACTIVE));
        }

        await Promise.all(ops);
        return Promise.all(awaiters);
    };

    const disableServices = async (names) => {
        const awaiters = [];
        const ops = [];
        for (const name of names) {
            ops.push(iOmnitron.disableService(name)); // eslint-disable-line
            awaiters.push(checkServiceStatus(name, STATUS.DISABLED));
        }

        await Promise.all(ops);
        return Promise.all(awaiters);
    };

    const enableService = async (name) => {
        await iOmnitron.enableService(name);
        await checkServiceStatus(name, STATUS.INACTIVE);
    };

    const disableService = async (name) => {
        await iOmnitron.disableService(name);
        await checkServiceStatus(name, STATUS.DISABLED);
    };

    const startServices = async (names) => {
        const ops = [];
        for (const name of names) {
            ops.push(iOmnitron.startService(name)); // eslint-disable-line
        }

        await Promise.all(ops);
        
        for (const name of names) {
            await checkServiceStatus(name, STATUS.ACTIVE); // eslint-disable-line
        }
    };

    const stopServices = async (names) => {
        const ops = [];
        for (const name of names) {
            ops.push(iOmnitron.stopService(name)); // eslint-disable-line
        }

        await Promise.all(ops);
        
        for (const name of names) {
            await checkServiceStatus(name, STATUS.INACTIVE); // eslint-disable-line
        }
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
        // await realm.clean();
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
        await uninstallServices();
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

        await installService(service1Path);

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

        await installService(service2Path);

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

        await uninstallService("test2");

        result = await iOmnitron.enumerate();
        assert.lengthOf(result, 1);

        assert.equal(result[0].name, service1Config.raw.name);
        assert.equal(result[0].author, service1Config.raw.author);
        assert.equal(result[0].description, service1Config.raw.description);
        assert.equal(result[0].version, service1Config.raw.version);
        assert.equal(result[0].status, STATUS.DISABLED);
    });

    it("should not start disabled service", async () => {
        await installService(std.path.join(__dirname, "services", "test1"));
        const list = await iOmnitron.enumerate();
        assert.lengthOf(list, 1);
        assert.equal(list[0].status, STATUS.DISABLED);

        const err = await assert.throws(async () => iOmnitron.startService("test1"));
        assert.instanceOf(err, adone.x.IllegalState);
    });

    it("enable/disable service", async () => {
        await installService(std.path.join(__dirname, "services", "test1"));
        await enableServices(["test1"]);
        await disableServices(["test1"]);
    });

    it("start/stop service", async () => {
        const servicePath = std.path.join(__dirname, "services", "test1");
        await installService(servicePath);
        await enableServices(["test1"]);
        await startServices(["test1"]);

        await dispatcher.peer.waitForContext("test1");
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
    });

    it("enabled service should be started during omnitron startup", async () => {
        await installService(std.path.join(__dirname, "services", "test1"));
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
    });

    it("start already active services should have throws", async () => {
        await installService(std.path.join(__dirname, "services", "test1"));
        await enableServices(["test1"]);
        await startServices(["test1"]);

        const err = await assert.throws(async () => iOmnitron.startService("test1"));
        assert.instanceOf(err, x.IllegalState);

        await stopServices(["test1"]);
    });

    it("stop single service in a group should initiate process exit(0)", async () => {
        await installService(std.path.join(__dirname, "services", "test1"));

        await enableServices(["test1"]);
        await startServices(["test1"]);

        const list = await iOmnitron.enumerate("test1");
        const iMaintainer = await iOmnitron.getMaintainer(list[0].group);
        const pid = await iMaintainer.getPid();
        assert.isTrue(adone.system.process.exists(pid));

        await stopServices(["test1"]);

        await adone.promise.delay(1000);

        assert.isFalse(adone.system.process.exists(pid));
    });

    describe("groups", () => {
        it("change group of disabled service", async () => {
            await installService(std.path.join(__dirname, "services", "test1"));
    
            let list = await iOmnitron.enumerate();
    
            assert.isTrue(list[0].group.startsWith("group-"));
    
            await iOmnitron.configureService("test1", {
                group: "some-group"
            });
    
            list = await iOmnitron.enumerate();
    
            assert.equal(list[0].group, "some-group");
        });
    
        it("change group of inactive service", async () => {
            await installService(std.path.join(__dirname, "services", "test1"));
    
            let list = await iOmnitron.enumerate();
    
            assert.isTrue(list[0].group.startsWith("group-"));
    
            await enableService("test1");
    
            await iOmnitron.configureService("test1", {
                group: "some-group"
            });
    
            list = await iOmnitron.enumerate();
    
            assert.equal(list[0].group, "some-group");
        });
    
        it("change group of active service should have thrown", async () => {
            await installService(std.path.join(__dirname, "services", "test1"));
    
            const list = await iOmnitron.enumerate();
    
            assert.isTrue(list[0].group.startsWith("group-"));
    
            await enableService("test1");
            await startServices(["test1"]);
    
            const err = await assert.throws(async () => iOmnitron.configureService("test1", {
                group: "some-group"
            }));
    
            await stopServices(["test1"]);
    
            assert.instanceOf(err, adone.x.NotAllowed);
        });
    
        it("change group of service should relate group of maintainer (single service in old and new group)", async () => {
            await installService(std.path.join(__dirname, "services", "test1"));
    
            const list = await iOmnitron.enumerate();
    
            assert.isTrue(list[0].group.startsWith("group-"));
    
            await iOmnitron.getMaintainer(list[0].group);
    
            await iOmnitron.configureService("test1", {
                group: "some-group"
            });
    
            const err = await assert.throws(async () => iOmnitron.getMaintainer(list[0].group));
            assert.instanceOf(err, adone.x.Unknown);
            await iOmnitron.getMaintainer("some-group");
        });

        it("change group of service should not affect maintainer's group (two services in old group)", async () => {
            await installServices([
                std.path.join(__dirname, "services", "test1"),
                std.path.join(__dirname, "services", "test2")
            ]);
    
            const list = await iOmnitron.enumerate();
    
            assert.isTrue(list[0].group.startsWith("group-"));
            assert.isTrue(list[1].group.startsWith("group-"));
    
            let iM1 = await iOmnitron.getMaintainer(list[0].group);
            let iM2 = await iOmnitron.getMaintainer(list[1].group);
            assert.notDeepEqual(iM1, iM2);
    
            await iOmnitron.configureService(list[0].name, {
                group: "group1"
            });

            await iOmnitron.configureService(list[1].name, {
                group: "group1"
            });

            iM1 = await iOmnitron.getMaintainer("group1");

            await iOmnitron.configureService(list[0].name, {
                group: "group2"
            });

            assert.equal(await iM1.getGroup(), "group1");

            iM2 = await iOmnitron.getMaintainer("group2");

            let err = await assert.throws(async () => iOmnitron.getMaintainer(list[0].group));
            assert.instanceOf(err, adone.x.Unknown);

            err = await assert.throws(async () => iOmnitron.getMaintainer(list[1].group));
            assert.instanceOf(err, adone.x.Unknown);
        });
    });

    it.only("in-group services should start in single process", async () => {
        await installServices([
            std.path.join(__dirname, "services", "test1"),
            std.path.join(__dirname, "services", "test2")
        ]);

        await enableServices(["test1", "test2"]);

        const omniInfo = await iOmnitron.getInfo({
            pid: true
        });

        let children = await adone.system.process.getChildPids(omniInfo.pid);

        assert.lengthOf(children, 0);

        await iOmnitron.configureService("test1", {
            group: "group1"
        });

        await iOmnitron.configureService("test2", {
            group: "group1"
        });

        const list = await iOmnitron.enumerate();

        assert.equal(list[0].group, "group1");
        assert.equal(list[1].group, "group1");

        await startServices(["test1", "test2"]);

        children = await adone.system.process.getChildPids(omniInfo.pid);
        assert.lengthOf(children, 1);

        // const list = await iOmnitron.enumerate();
        const iMaintainer = await iOmnitron.getMaintainer("group1");
        const pid = await iMaintainer.getPid();
        assert.isTrue(adone.system.process.exists(pid));

        await dispatcher.peer.waitForContext("test1");
        await dispatcher.peer.waitForContext("test2");
        const iTest1 = await dispatcher.getInterface("test1");
        const iTest2 = await dispatcher.getInterface("test2");

        const info1 = await iTest1.getInfo();
        assert.equal(info1.name, "test1");

        const info2 = await iTest2.getInfo();
        assert.equal(info2.name, "test2");

        await stopServices(["test1", "test2"]);

        await adone.promise.delay(1000);

        assert.isFalse(adone.system.process.exists(pid));
    });
});
