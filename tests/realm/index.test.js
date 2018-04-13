const {
    is,
    fs,
    // cli,
    realm,
    std,
    system: { process: { exec } },
    text
} = adone;

const PACKAGES_PATH = std.path.join(__dirname, "packages");
const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
const fixture = (...args) => std.path.join(FIXTURES_PATH, ...args);

describe("realm", () => {
    let runtimeRealmManager;
    let realmManager;
    let realmPath;
    let adoneCliPath;
    let cliConfig;

    const randomName = (prefix = "test") => `${prefix}${text.random(4)}_${text.random(5)}_${text.random(6)}`;

    // before(async () => {
    //     await realm.init(".adone_test");
    //     await realm.clean();
    //     realmManager = await realm.getManager();
    //     adone.cli.kit.setSilent(true);
    // });

    after(async () => {
        // await fs.rm(realmPath);
        //     await adone.omnitron.dispatcher.stopOmnitron();
    });

    it("get default manager", async () => {
        runtimeRealmManager = await realm.getManager();
        const anotherInstance = await realm.getManager();
        assert.false(is.nil(runtimeRealmManager));
        assert.strictEqual(runtimeRealmManager, anotherInstance);

        assert.strictEqual(runtimeRealmManager, adone.runtime.realm.manager);
        assert.strictEqual(runtimeRealmManager.cwd, runtimeRealmManager.config.ROOT_PATH);
        assert.deepEqual(runtimeRealmManager.config.identity.server, adone.runtime.realm.identity);
        assert.deepEqual(runtimeRealmManager.config, adone.runtime.realm.config);
    });

    it("fork without 'cwd' should throw", async () => {
        const observer = await runtimeRealmManager.forkRealm({
            name: "test"
        });
        const err = await assert.throws(async () => observer.result);
        assert.instanceOf(err, adone.error.NotValid);
    });

    it("fork without 'name' should throw", async () => {
        realmPath = await fs.tmpName({
            prefix: "realm-"
        });

        const observer = await runtimeRealmManager.forkRealm({
            cwd: realmPath
        });
        const err = await assert.throws(async () => observer.result);
        assert.instanceOf(err, adone.error.NotValid);
    });

    it("fork", async () => {
        realmPath = await fs.tmpName({
            prefix: "realm-"
        });

        assert.false(await fs.exists(realmPath));

        // runtimeRealmManager.onNotification("progress", (task, name, info) => {
        //     adone.log(info.message);
        // });

        const observer = await runtimeRealmManager.forkRealm({
            cwd: realmPath,
            name: "test"
        });
        realmManager = await observer.result;

        assert.true(await fs.exists(realmPath));
        assert.true(await fs.isDirectory(realmPath));

        let files = await fs.readdir(realmPath);
        assert.sameMembers(files, ["test"]);

        assert.instanceOf(realmManager, adone.realm.Manager);

        files = await fs.readdir(realmManager.cwd);
        assert.includeMembers(files, [
            ".adone",
            "LICENSE",
            "README.md",
            "adone.json",
            "bin",
            "configs",
            "etc",
            "lib",
            "package.json",
            "packages",
            "runtime",
            "var"
        ]);

        adoneCliPath = std.path.join(realmManager.config.ROOT_PATH, "bin", "adone.js");
        cliConfig = await adone.cli.Configuration.load({
            cwd: realmManager.config.CONFIGS_PATH
        });
    });

    it("lock/unlock", async () => {
        const lockPath = std.path.join(realmManager.config.RUNTIME_PATH, "realm");
        await realmManager.lock();
        assert.true(await adone.application.lockfile.check(lockPath));
        await realmManager.unlock();
        assert.false(await adone.application.lockfile.check(lockPath));
    });

    it("default tasks", async () => {
        assert.sameMembers(realmManager.getTaskNames(), [
            "createRealm",
            "forkRealm",
            "validateRealm",
            "install",
            "uninstall",
            "mount",
            "unmount",
            "list"
        ]);
    });

    it("default type handlers", async () => {
        assert.sameMembers(Object.keys(realmManager.typeHandler), [
            "cli.command",
            "omnitron.service"
        ]);
    });

    describe("install/uninstall packages", () => {
        it("bad install argument", async () => {
            const err = await assert.throws(async () => {
                const observer = await realmManager.install(std.path.join(__dirname));
                return observer.result;
            });
            assert.instanceOf(err, adone.error.InvalidArgument);
        });

        describe("cli commands", () => {
            for (const name of ["simple", "good", "es6", "complex"]) {
                for (const symlink of [false, true]) {
                    // eslint-disable-next-line
                    it(`install/uninstall cli command with${symlink ? " with symlink" : ""} (${name})`, async () => {
                        const cliCommandPath = std.path.join(__dirname, "packages", `cli_command_${name}`);
                        const installOptions = {
                            name: cliCommandPath,
                            symlink
                        };
                        if (name === "es6") {
                            installOptions.build = true;
                        }

                        let observer = await realmManager.install(installOptions);
                        await observer.result;

                        const config = await adone.configuration.Adone.load({
                            cwd: cliCommandPath
                        });

                        const packageName = name === "complex" ? config.raw.name : `${config.raw.type}.${config.raw.name}`;
                        const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

                        const dir = new fs.Directory(packagePath);
                        assert.true(await dir.exists());
                        if (symlink) {
                            assert.true(await dir.isSymbolicLink());
                        }

                        if (name === "complex") {
                            let result = await exec("node", [adoneCliPath, "sub1"]);
                            assert.equal(result.stdout, "well done 1");

                            result = await exec("node", [adoneCliPath, "sub2"]);
                            assert.equal(result.stdout, "well done 2");
                        } else {
                            const result = await exec("node", [adoneCliPath, name]);
                            assert.equal(result.stdout, "well done");
                        }

                        observer = await realmManager.uninstall({
                            name: packageName
                        });
                        await observer.result;

                        assert.false(await dir.exists());

                        if (name === "es6") {
                            await fs.rm(std.path.join(cliCommandPath, "lib"));
                        }

                        await cliConfig.load();
                        if (name === "complex") {
                            assert.false(cliConfig.hasCommand("sub1"));
                            assert.false(cliConfig.hasCommand("sub2"));
                        } else {
                            assert.false(cliConfig.hasCommand(config.raw.name));
                        }
                    });
                }
            }

            for (const name of ["invalid_type", "no_name", "no_script", "bad_script1", "bad_script2", "bad_script3", "invalid_complex"]) {
                for (const symlink of [false]) {
                    // eslint-disable-next-line
                    it(`should rollback installation of invalid cli command${symlink ? " with symlink " : " "}(${name})`, async () => {
                        const cliCommandPath = std.path.join(__dirname, "packages", `cli_command_${name}`);

                        const config = await adone.configuration.Adone.load({
                            cwd: cliCommandPath
                        });

                        await cliConfig.load();
                        if (name === "invalid_complex") {
                            assert.false(cliConfig.hasCommand("sub1"));
                            assert.false(cliConfig.hasCommand("sub2"));
                        } else {
                            assert.false(cliConfig.hasCommand(config.raw.name));
                        }

                        const packageName = name === "invalid_complex" ? config.raw.name : `${config.raw.type}.${config.raw.name}`;
                        const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

                        const dir = new fs.Directory(packagePath);
                        assert.false(await dir.exists());

                        const installOptions = {
                            name: cliCommandPath,
                            symlink
                        };

                        const err = await assert.throws(async () => {
                            const observer = await realmManager.install(installOptions);
                            return observer.result;
                        });
                        assert.instanceOf(err, Error);

                        assert.false(await dir.exists());

                        await cliConfig.load();
                        if (name === "invalid_complex") {
                            assert.false(cliConfig.hasCommand("sub1"));
                            assert.false(cliConfig.hasCommand("sub2"));
                        } else {
                            assert.false(cliConfig.hasCommand(config.raw.name));
                        }
                    });
                }
            }
        });

        describe.todo("omnitron services", () => {
            it("install/uninstall with inactive omnitron", async () => {
                const omnitronServicePath = std.path.join(__dirname, "packages", "omnitron_service_good");

                const config = await adone.configuration.Adone.load({
                    cwd: omnitronServicePath
                });

                const packageName = `${config.raw.type}.${config.raw.name}`;
                const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

                const dir = new fs.Directory(packagePath);
                assert.false(await dir.exists());

                const installOptions = {
                    name: omnitronServicePath
                };

                let observer = await realmManager.install(installOptions);
                await observer.result;

                assert.true(await dir.exists());

                observer = await realmManager.uninstall({
                    name: packageName
                });
                await observer.result;

                assert.false(await dir.exists());
            });

            it("install/uninstall with active omnitron", async () => {
                await adone.omnitron.dispatcher.startOmnitron();
                await adone.omnitron.dispatcher.connectLocal();
                assert.true(await adone.omnitron.dispatcher.ping());

                const omnitronServicePath = std.path.join(__dirname, "packages", "omnitron_service_good");

                const config = await adone.configuration.Adone.load({
                    cwd: omnitronServicePath
                });

                const packageName = `${config.raw.type}.${config.raw.name}`;
                const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

                const dir = new fs.Directory(packagePath);
                assert.false(await dir.exists());

                const installOptions = {
                    name: omnitronServicePath
                };

                let observer = await realmManager.install(installOptions);
                await observer.result;

                assert.true(await dir.exists());

                observer = await realmManager.uninstall({
                    name: packageName
                });
                await observer.result;

                assert.false(await dir.exists());

                await adone.omnitron.dispatcher.stopOmnitron();
            });

            it("should not install service in case of omnitron's system db is busy", async () => {
                const systemDb = new adone.omnitron.DB();
                await systemDb.open();

                const omnitronServicePath = std.path.join(__dirname, "packages", "omnitron_service_good");

                const config = await adone.configuration.Adone.load({
                    cwd: omnitronServicePath
                });

                const packageName = `${config.raw.type}.${config.raw.name}`;
                const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

                const dir = new fs.Directory(packagePath);
                assert.false(await dir.exists());

                const installOptions = {
                    name: omnitronServicePath
                };

                const err = await assert.throws(async () => {
                    const observer = await realmManager.install(installOptions);
                    return observer.result;
                });
                assert.instanceOf(err, Error);

                assert.false(await dir.exists());

                await systemDb.close();
            });
        });

        describe("uninstall broken packages", () => {
            afterEach(async () => {
                await fs.rm(FIXTURES_PATH);
            });

            it.todo("uninstall non-existing package", async () => {

            });

            // This is incomplete test
            it("cli.command (broken symlinks)", async () => {
                const name = randomName("project");
                const cwd = fixture(name);

                await fs.mkdirp(cwd);

                await fs.copyTo(std.path.join(PACKAGES_PATH, "cli_command_simple", "*"), cwd);

                const installOptions = {
                    name: cwd,
                    symlink: true
                };

                let observer = await realmManager.install(installOptions);
                await observer.result;

                observer = await realmManager.list();
                const list = await observer.result;
                assert.lengthOf(list, 1);
                assert.equal(list[0].name, "cli.command.simple");

                await cliConfig.load();
                assert.lengthOf(cliConfig.raw.commands, 1);

                const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, "cli.command.simple");

                assert.true(await fs.exists(packagePath));

                await fs.rm(cwd);

                const lstat = await fs.lstat(packagePath);
                assert.true(lstat.isSymbolicLink());

                observer = await realmManager.uninstall({
                    name: list[0].name
                });
                await observer.result;

                await assert.throws(async () => fs.lstat(packagePath));
            });

            it.todo("cli.command (present in config but not installed)", async () => {

            });
        });
    });
});
