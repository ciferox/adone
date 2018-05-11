const {
    fs,
    is,
    configuration,
    multi,
    std,
    omnitron2,
    runtime,
    error
} = adone;

const { STATUS } = omnitron2;

const suite = adone.lazify({
    networks: "./networks"
}, exports, require);


describe("omnitron", () => {
    let iOmnitron;
    let adoneRootPath;
    let realmManager;
    let dispatcher;

    before(function () {
        adoneRootPath = this.adoneRootPath;
        realmManager = this.realmManager;
        dispatcher = omnitron2.dispatcher;
    });

    const startOmnitron = async () => {
        await dispatcher.startOmnitron({
            adoneRootPath
        });
        await dispatcher.connectLocal();
        iOmnitron = dispatcher.queryInterface("omnitron");
        
        return iOmnitron;
    };

    const stopOmnitron = async () => {
        await dispatcher.stopOmnitron();
    };

    describe("Dispatcher", () => {
        it("initialization", () => {
            const d = new omnitron2.Dispatcher();
            const omnitAddrs = omnitron2.LOCAL_PEER_INFO.multiaddrs.toArray();
            assert.lengthOf(omnitAddrs, 1);
            assert.true(omnitAddrs[0].equals(multi.address.create(omnitron2.DEFAULT_ADDRESS)));
            assert.strictEqual(d.netron.peer.info.id.asBase58(), runtime.realm.config.identity.client.id);
        });

        it("isOmnitronActive() should return false when omnitron is not active", async () => {
            assert.false(await dispatcher.isOmnitronActive());
        });
    });

    describe("basics", () => {
        beforeEach(async () => {
            await startOmnitron();
        });

        afterEach(async () => {
            await stopOmnitron();
        });

        it("pidfile and log files should exist", async () => {
            assert.true(await fs.exists(adone.runtime.config.omnitron.PIDFILE_PATH));
            assert.true(await fs.exists(adone.runtime.config.omnitron.LOGFILE_PATH));
            assert.true(await fs.exists(adone.runtime.config.omnitron.ERRORLOGFILE_PATH));
        });

        it("correct omnitron information", async () => {
            const info = await iOmnitron.getInfo();

            assert.equal(info.version.adone, adone.package.version);
            assert.equal(info.realm.id, adone.runtime.realm.identity.id);
        });

        it("should not be any services initially", async () => {
            const result = await iOmnitron.enumerate();
            assert.lengthOf(result, 0);
        });

        it("stop/start omnitron", async () => {
            const ma = adone.multi.address.create(omnitron2.DEFAULT_ADDRESS);
            const socketPath = ma.nodeAddress().path;

            assert.true(await dispatcher.isOmnitronActive());
            assert.true(await adone.fs.exists(socketPath));

            await dispatcher.stopOmnitron();
            assert.false(await dispatcher.isOmnitronActive());
            assert.false(await adone.fs.exists(socketPath));

            await dispatcher.startOmnitron({
                adoneRootPath
            });
            assert.true(await dispatcher.isOmnitronActive());
            assert.true(await adone.fs.exists(socketPath));
        });
    });

    describe("common", () => {
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
                        return reject(new error.Timeout());
                    }
                    setTimeout(checkStatus, 100);
                };
                checkStatus();
            });
        };

        const checkServiceStatus = async (name, status) => {
            const list = await iOmnitron.enumerate(name);
            if (list.length === 0 || list[0].status !== status) {
                throw new error.NotValid(`Status: ${list[0].status}`);
            }
        };

        const installServices = async (paths) => {
            for (const name of paths) {
                // eslint-disable-next-line
                const observer = await realmManager.install({
                    name,
                    symlink: false
                });
                const adoneConf = await observer.result; // eslint-disable-line

                installedServices.push(adoneConf);
                await checkServiceStatus(adoneConf.raw.name, STATUS.DISABLED); // eslint-disable-line
            }
        };

        const uninstallServices = async () => {
            for (const conf of installedServices) {
                // eslint-disable-next-line
                const observer = await realmManager.uninstall({
                    name: `omnitron.service.${conf.raw.name}`
                });
                await observer.result; // eslint-disable-line
            }

            installedServices.length = 0;
        };

        const installService = async (path, symlink = false) => {
            const observer = await realmManager.install({
                name: path,
                symlink
            });
            installedServices.push(await observer.result);
        };

        const uninstallService = async (name) => {
            const observer = await realmManager.uninstall({
                name: `omnitron.service.${name}`
            });
            await observer.result;

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
                const projectManager = new adone.project.Manager({
                    cwd: std.path.join(servicePath, name)
                });
                await projectManager.load(); // eslint-disable-line
                await projectManager[taskName](); // eslint-disable-line
            }
        };

        beforeEach(async () => {
            await dispatcher.startOmnitron({
                adoneRootPath
            });
            await dispatcher.connectLocal();
            iOmnitron = dispatcher.queryInterface("omnitron");

            await runProjectsTask("build");
        });

        afterEach(async () => {
            await uninstallServices();
            await dispatcher.stopOmnitron();
            await runProjectsTask("clean");
        });

        it("install two services and immediatly uninstall them", async () => {
            const service1Path = std.path.join(__dirname, "services", "test1");
            const service2Path = std.path.join(__dirname, "services", "test2");
            const service1Config = await configuration.Adone.load({
                cwd: service1Path
            });
            const service2Config = await configuration.Adone.load({
                cwd: service2Path
            });

            let result = await iOmnitron.enumerate();
            assert.lengthOf(result, 0);

            await installService(service1Path);

            result = await iOmnitron.enumerate();
            assert.lengthOf(result, 1);

            assert.deepEqual(adone.lodash.omit(result[0], ["group"]), {
                name: service1Config.raw.name,
                author: service1Config.raw.author,
                description: service1Config.raw.description,
                version: service1Config.raw.version,
                status: STATUS.DISABLED,
                pid: "",
                mainPath: std.path.join(adone.runtime.config.omnitron.SERVICES_PATH, "test1", service1Config.getMainPath())
            });

            assert.true(result[0].group.startsWith("group-"));

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
                    pid: "",
                    mainPath: std.path.join(adone.runtime.config.omnitron.SERVICES_PATH, "test1", service1Config.getMainPath())
                },
                {
                    name: service2Config.raw.name,
                    author: "",
                    description: service2Config.raw.description,
                    version: service2Config.raw.version,
                    status: "disabled",
                    group: (result[0].name === service2Config.raw.name) ? result[0].group : result[1].group,
                    pid: "",
                    mainPath: std.path.join(adone.runtime.config.omnitron.SERVICES_PATH, "test2", service2Config.getMainPath())
                }
            ]);

            assert.true(result[0].group.startsWith("group-"));
            assert.true(result[1].group.startsWith("group-"));

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
            assert.instanceOf(err, adone.error.IllegalState);
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
            const iTest1 = await dispatcher.queryInterface("test1");

            const info = await iTest1.getInfo();

            const adoneConf = await configuration.Adone.load({
                cwd: servicePath
            });

            assert.equal(info.name, adoneConf.raw.name);

            await stopServices(["test1"]);
        });

        it("enabled service should be started during omnitron startup", async () => {
            await installService(std.path.join(__dirname, "services", "test1"));
            await enableServices(["test1"]);

            await dispatcher.stopOmnitron();
            await dispatcher.startOmnitron({
                adoneRootPath
            });
            await dispatcher.connectLocal();
            iOmnitron = dispatcher.queryInterface("omnitron");

            await waitForServiceStatus("test1", STATUS.ACTIVE);

            const iTest1 = dispatcher.queryInterface("test1");
            const info = await iTest1.getInfo();
            const list = await iOmnitron.enumerate("test1");

            assert.equal(info.name, list[0].name);

            await stopServices(["test1"]);
        });

        it("log files should be created for service", async () => {
            await installService(std.path.join(__dirname, "services", "test2"));
            const serviceInfo = (await iOmnitron.enumerate())[0];
            const stdoutPath = std.path.join(adone.runtime.config.omnitron.LOGS_PATH, `${serviceInfo.group}.log`);
            const stderrPath = std.path.join(adone.runtime.config.omnitron.LOGS_PATH, `${serviceInfo.group}-err.log`);

            await enableServices(["test2"]);
            await startServices(["test2"]);
            assert.true(await fs.exists(stdoutPath));
            assert.true(await fs.exists(stderrPath));
            await stopServices(["test2"]);
        });

        it("start already active services should have throws", async () => {
            await installService(std.path.join(__dirname, "services", "test1"));
            await enableServices(["test1"]);
            await startServices(["test1"]);

            const err = await assert.throws(async () => iOmnitron.startService("test1"));
            assert.instanceOf(err, error.IllegalState);

            await stopServices(["test1"]);
        });

        it("check service data", async () => {
            await installService(std.path.join(__dirname, "services", "test3"));
            await enableServices(["test3"]);
            await startServices(["test3"]);
            const iTest3 = await dispatcher.queryInterface("test3");
            await iTest3.check("test3");
            await stopServices(["test3"]);
        });

        it("stop single service in a group should initiate process exit(0)", async () => {
            await installService(std.path.join(__dirname, "services", "test1"));

            await enableServices(["test1"]);
            await startServices(["test1"]);

            const list = await iOmnitron.enumerate("test1");
            const iMaintainer = await iOmnitron.getMaintainer(list[0].group);
            const pid = await iMaintainer.getPid();
            assert.true(adone.system.process.exists(pid));

            await stopServices(["test1"]);

            await adone.promise.delay(1000);

            assert.false(adone.system.process.exists(pid));
        });

        describe("subsystems", () => {
            it("list subsystems", async () => {
                const subsystems = await iOmnitron.getSubsystems();
                assert.sameMembers(subsystems.map((s) => s.name), ["netron", "database", "services"]);
            });

            it("load/unload subsystem", async () => {
                await iOmnitron.loadSubsystem(std.path.join(__dirname, "subsystems", "injectable.js"), {
                    name: "payload",
                    transpile: true
                });
                let contexts = await iOmnitron.getContexts();
                assert.sameMembers(contexts.map((x) => x.name), ["omnitron", "payload"]);
                const iPayload = dispatcher.queryInterface("payload");
                assert.deepEqual(await iOmnitron.getInfo({
                    env: true,
                    realm: true,
                    version: true
                }), await iPayload.getInfo({
                    env: true,
                    realm: true,
                    version: true
                }));

                await iOmnitron.unloadSubsystem("payload");
                contexts = await iOmnitron.getContexts();
                assert.sameMembers(contexts.map((x) => x.name), ["omnitron"]);

                const err = await assert.throws(async () => iPayload.getInfo());
                assert.instanceOf(err, adone.error.NotExists);
            });

            it("should not allow unload core subsystems", async () => {
                let err = await assert.throws(async () => iOmnitron.unloadSubsystem("netron"));
                assert.instanceOf(err, adone.error.NotAllowed);

                err = await assert.throws(async () => iOmnitron.unloadSubsystem("database"));
                assert.instanceOf(err, adone.error.NotAllowed);

                err = await assert.throws(async () => iOmnitron.unloadSubsystem("services"));
                assert.instanceOf(err, adone.error.NotAllowed);
            });
        });

        describe("groups", () => {
            it("change group of disabled service", async () => {
                await installService(std.path.join(__dirname, "services", "test1"));

                let list = await iOmnitron.enumerate();

                assert.true(list[0].group.startsWith("group-"));

                await iOmnitron.configureService("test1", {
                    group: "some-group"
                });

                list = await iOmnitron.enumerate();

                assert.equal(list[0].group, "some-group");
            });

            it("change group of inactive service", async () => {
                await installService(std.path.join(__dirname, "services", "test1"));

                let list = await iOmnitron.enumerate();

                assert.true(list[0].group.startsWith("group-"));

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

                assert.true(list[0].group.startsWith("group-"));

                await enableService("test1");
                await startServices(["test1"]);

                const err = await assert.throws(async () => iOmnitron.configureService("test1", {
                    group: "some-group"
                }));

                await stopServices(["test1"]);

                assert.instanceOf(err, adone.error.NotAllowed);
            });

            it("change group of service should relate group of maintainer (single service in old and new group)", async () => {
                await installService(std.path.join(__dirname, "services", "test1"));

                const list = await iOmnitron.enumerate();

                assert.true(list[0].group.startsWith("group-"));

                await iOmnitron.getMaintainer(list[0].group);

                await iOmnitron.configureService("test1", {
                    group: "some-group"
                });

                const err = await assert.throws(async () => iOmnitron.getMaintainer(list[0].group));
                assert.instanceOf(err, adone.error.Unknown);
                await iOmnitron.getMaintainer("some-group");
            });

            it("change group of service should not affect maintainer's group (two services in old group)", async () => {
                await installServices([
                    std.path.join(__dirname, "services", "test1"),
                    std.path.join(__dirname, "services", "test2")
                ]);

                const list = await iOmnitron.enumerate();

                assert.true(list[0].group.startsWith("group-"));
                assert.true(list[1].group.startsWith("group-"));

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
                assert.instanceOf(err, adone.error.Unknown);

                err = await assert.throws(async () => iOmnitron.getMaintainer(list[1].group));
                assert.instanceOf(err, adone.error.Unknown);
            });

            it("new log files should be created after change service group", async () => {
                await installService(std.path.join(__dirname, "services", "test2"));
                const serviceInfo = (await iOmnitron.enumerate())[0];
                let stdoutPath = std.path.join(adone.runtime.config.omnitron.LOGS_PATH, `${serviceInfo.group}.log`);
                let stderrPath = std.path.join(adone.runtime.config.omnitron.LOGS_PATH, `${serviceInfo.group}-err.log`);

                await enableServices(["test2"]);
                await startServices(["test2"]);
                assert.true(await fs.exists(stdoutPath));
                assert.true(await fs.exists(stderrPath));
                await stopServices(["test2"]);

                await iOmnitron.configureService("test2", {
                    group: "test2"
                });

                await startServices(["test2"]);

                assert.true(await fs.exists(stdoutPath));
                assert.true(await fs.exists(stderrPath));

                stdoutPath = std.path.join(adone.runtime.config.omnitron.LOGS_PATH, "test2.log");
                stderrPath = std.path.join(adone.runtime.config.omnitron.LOGS_PATH, "test2-err.log");

                assert.true(await fs.exists(stdoutPath));
                assert.true(await fs.exists(stderrPath));

                await stopServices(["test2"]);
            });
        });

        it("in-group services should start in single process", async () => {
            await installServices([
                std.path.join(__dirname, "services", "test1"),
                std.path.join(__dirname, "services", "test2")
            ]);

            await enableServices(["test1", "test2"]);

            const omniInfo = await iOmnitron.getInfo({
                process: true
            });

            let children = await adone.system.process.getChildPids(omniInfo.process.id);
            // adone.log(children);

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

            children = await adone.system.process.getChildPids(omniInfo.process.id);
            assert.lengthOf(children, 1);

            // const list = await iOmnitron.enumerate();
            const iMaintainer = await iOmnitron.getMaintainer("group1");
            const pid = await iMaintainer.getPid();
            assert.true(adone.system.process.exists(pid));

            await dispatcher.peer.waitForContext("test1");
            await dispatcher.peer.waitForContext("test2");
            const iTest1 = await dispatcher.queryInterface("test1");
            const iTest2 = await dispatcher.queryInterface("test2");

            const info1 = await iTest1.getInfo();
            assert.equal(info1.name, "test1");

            const info2 = await iTest2.getInfo();
            assert.equal(info2.name, "test2");

            await stopServices(["test1", "test2"]);

            await adone.promise.delay(1000);

            assert.false(adone.system.process.exists(pid));
        });

        it("use service configuration", async () => {
            await installService(std.path.join(__dirname, "services", "test3"));
            await enableServices(["test3"]);
            await startServices(["test3"]);
            const iTest3 = await dispatcher.queryInterface("test3");
            await iTest3.saveConfig("test3");
            await stopServices(["test3"]);

            const iConfig = await iOmnitron.getServiceConfiguration("test3");
            assert.equal(await iConfig.get("key1"), "adone");
            assert.equal(await iConfig.get("key2"), 888);
            assert.true(is.date(await iConfig.get("key3")));
        });

        for (const stage of ["configure", "initialize"]) {
            // eslint-disable-next-line
            it(`start service with insane ${stage} stage`, async () => {
                await installService(std.path.join(__dirname, "services", `${stage}_fail`));
                await enableServices(["fail"]);
                const info = await iOmnitron.getInfo({
                    process: true
                });
                const err = await assert.throws(async () => startServices(["fail"]));
                assert.instanceOf(err, adone.error.Runtime);

                // Waiting for process exit
                await adone.promise.delay(100);

                const childs = await adone.system.process.getChildPids(info.process.id);
                assert.lengthOf(childs, 0);
            });
        }

        describe.todo("configuration", () => {
            let iConfig;
            beforeEach(async () => {
                iConfig = await dispatcher.getConfiguration();
            });

            it("default service subsystem configuration", async () => {
                assert.deepEqual(await iConfig.get("service"), {
                    startTimeout: 10000,
                    stopTimeout: 10000
                });
            });

            it("default netron options", async () => {
                assert.deepEqual(await iConfig.get("netron"), {
                    responseTimeout: 30000,
                    isSuper: true,
                    connect: {
                        retries: 3,
                        minTimeout: 100,
                        maxTimeout: 10000,
                        factor: 2,
                        randomize: false
                    }

                });
            });

            // it("no gates", async () => {
            //     assert.lengthOf(await iConfig.get("gates"), 0);
            // });

            it("no hosts", async () => {
                assert.lengthOf(await iConfig.get("hosts"), 0);
            });

            it("get nested values", async () => {
                assert.equal(await iConfig.get("service.startTimeout"), 10000);
                assert.equal(await iConfig.get("netron.connect.retries"), 3);
            });

            it("should have thrown on nonexistent keys", async () => {
                await assert.throws(async () => iConfig.get("gate"), /Key not exist/);
                await assert.throws(async () => iConfig.get("some.value"), /Key not exist/);
            });

            it("set service options", async () => {
                const options = {
                    startTimeout: 5000,
                    stopTimeout: 3000
                };
                await iConfig.set("service", options);
                assert.deepEqual(await iConfig.get("service"), options);

                await iConfig.set("service.stopTimeout", 3535);
                assert.equal(await iConfig.get("service.stopTimeout"), 3535);
            });

            it("set invalid service options", async () => {
                await assert.throws(async () => iConfig.set("service", {
                    startTimeout: 100,
                    stopTimeout: 100
                }), adone.error.AggregateException);

                await assert.throws(async () => iConfig.set("service.stopTimeout", 500), adone.error.AggregateException);
                await assert.throws(async () => iConfig.set("service.timeout", 5000), adone.error.AggregateException);
            });

            it("set netron options", async () => {
                const options = {
                    responseTimeout: 10000,
                    isSuper: false,
                    connect: {
                        retries: 3,
                        minTimeout: 100,
                        maxTimeout: 10000,
                        factor: 3,
                        randomize: false
                    }
                };
                await iConfig.set("netron", options);
                assert.deepEqual(await iConfig.get("netron"), options);

                await iConfig.set("netron.isSuper", true);
                assert.equal(await iConfig.get("netron.isSuper"), true);

                await iConfig.set("netron.connect.factor", 2);
                assert.equal(await iConfig.get("netron.connect.factor"), 2);
            });

            it("set invalid service options", async () => {
                await assert.throws(async () => iConfig.set("netron", {
                    someTimeout: 10,
                    isSuper: false,
                    connect: {
                        retries: 3,
                        minTimeout: 100,
                        maxTimeout: 10000,
                        factor: 3,
                        randomize: false
                    }
                }), adone.error.AggregateException);

                await assert.throws(async () => iConfig.set("service.nonexisten", 5000), adone.error.AggregateException);
            });

            it("delete keys", async () => {
                await iConfig.delete("hosts");
                await iConfig.delete("service.stopTimeout");
                await assert.throws(async () => iConfig.get("hosts"), adone.error.NotExists);
                await assert.throws(async () => iConfig.get("netron.stopTimeout"), adone.error.NotExists);
            });
        });
    });

    describe("networks", () => {
        describe("database way", () => {
            suite.networks();
        });

        describe("omnitron way", () => {
            suite.networks({
                startOmnitron,
                stopOmnitron
            });
        });
    });
});
