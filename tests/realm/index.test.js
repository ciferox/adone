const {
    fs,
    cli,
    realm,
    std,
    system: { process: { exec } },
    text
} = adone;

const ADONE_PATH = std.path.join(adone.rootPath, "bin", "adone.js");

const PACKAGES_PATH = std.path.join(__dirname, "packages");
const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
const fixture = (...args) => std.path.join(FIXTURES_PATH, ...args);

describe("realm", () => {
    let realmInstance;
    let cliConfig;

    const randomName = (prefix = "test") => `${prefix}${text.random(4)}_${text.random(5)}_${text.random(6)}`;

    before(async () => {
        await realm.init(".adone_test");
        await realm.clean();
        realmInstance = await realm.getInstance();
        realmInstance.setSilent(true);

        cliConfig = await cli.Configuration.load();
    });

    after(async () => {
        // await realm.clean();

        await adone.omnitron.dispatcher.stopOmnitron();
    });

    it("check environment", () => {
        assert.equal(process.env.ADONE_REALM, ".adone_test");
    });

    it("bad install argument", async () => {
        const err = await assert.throws(async () => realmInstance.install(std.path.join(__dirname)));
        assert.instanceOf(err, adone.x.InvalidArgument);
    });

    it("lock/unlock", async () => {
        const lockPath = std.path.join(realm.config.runtimePath, "realm");
        await realmInstance.lock();
        assert.isTrue(await adone.application.locking.check(lockPath));
        await realmInstance.unlock();
        assert.isFalse(await adone.application.locking.check(lockPath));
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

                    await realmInstance.install(installOptions);

                    const config = await adone.configuration.Adone.load({
                        cwd: cliCommandPath
                    });

                    const packageName = name === "complex" ? config.raw.name : `${config.raw.type}.${config.raw.name}`;
                    const packagePath = std.path.join(realm.config.packagesPath, packageName);

                    const dir = new fs.Directory(packagePath);
                    assert.isTrue(await dir.exists());
                    if (symlink) {
                        assert.isTrue(await dir.isSymbolicLink());
                    }

                    if (name === "complex") {
                        let result = await exec("node", [ADONE_PATH, "sub1"]);
                        assert.equal(result.stdout, "well done 1");

                        result = await exec("node", [ADONE_PATH, "sub2"]);
                        assert.equal(result.stdout, "well done 2");
                    } else {
                        const result = await exec("node", [ADONE_PATH, name]);
                        assert.equal(result.stdout, "well done");
                    }

                    await realmInstance.uninstall({
                        name: packageName
                    });

                    assert.isFalse(await dir.exists());

                    if (name === "es6") {
                        await fs.rm(std.path.join(cliCommandPath, "lib"));
                    }

                    await cliConfig.load();
                    if (name === "complex") {
                        assert.isFalse(cliConfig.hasCommand("sub1"));
                        assert.isFalse(cliConfig.hasCommand("sub2"));
                    } else {
                        assert.isFalse(cliConfig.hasCommand(config.raw.name));
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
                        assert.isFalse(cliConfig.hasCommand("sub1"));
                        assert.isFalse(cliConfig.hasCommand("sub2"));
                    } else {
                        assert.isFalse(cliConfig.hasCommand(config.raw.name));
                    }

                    const packageName = name === "invalid_complex" ? config.raw.name : `${config.raw.type}.${config.raw.name}`;
                    const packagePath = std.path.join(realm.config.packagesPath, packageName);

                    const dir = new fs.Directory(packagePath);
                    assert.isFalse(await dir.exists());

                    const installOptions = {
                        name: cliCommandPath,
                        symlink
                    };

                    const err = await assert.throws(async () => realmInstance.install(installOptions));
                    assert.instanceOf(err, Error);

                    assert.isFalse(await dir.exists());

                    await cliConfig.load();
                    if (name === "invalid_complex") {
                        assert.isFalse(cliConfig.hasCommand("sub1"));
                        assert.isFalse(cliConfig.hasCommand("sub2"));
                    } else {
                        assert.isFalse(cliConfig.hasCommand(config.raw.name));
                    }
                });
            }
        }
    });

    describe("omnitron services", () => {
        it("install/uninstall with inactive omnitron", async () => {
            const omnitronServicePath = std.path.join(__dirname, "packages", "omnitron_service_good");

            const config = await adone.configuration.Adone.load({
                cwd: omnitronServicePath
            });

            const packageName = `${config.raw.type}.${config.raw.name}`;
            const packagePath = std.path.join(realm.config.packagesPath, packageName);

            const dir = new fs.Directory(packagePath);
            assert.isFalse(await dir.exists());

            const installOptions = {
                name: omnitronServicePath
            };

            await realmInstance.install(installOptions);

            assert.isTrue(await dir.exists());

            await realmInstance.uninstall({
                name: packageName
            });

            assert.isFalse(await dir.exists());
        });

        it("install/uninstall with active omnitron", async () => {
            await adone.omnitron.dispatcher.startOmnitron();
            await adone.omnitron.dispatcher.connectLocal({
                forceStart: false
            });
            assert.isTrue(await adone.omnitron.dispatcher.ping());

            const omnitronServicePath = std.path.join(__dirname, "packages", "omnitron_service_good");

            const config = await adone.configuration.Adone.load({
                cwd: omnitronServicePath
            });

            const packageName = `${config.raw.type}.${config.raw.name}`;
            const packagePath = std.path.join(realm.config.packagesPath, packageName);

            const dir = new fs.Directory(packagePath);
            assert.isFalse(await dir.exists());

            const installOptions = {
                name: omnitronServicePath
            };

            await realmInstance.install(installOptions);

            assert.isTrue(await dir.exists());

            await realmInstance.uninstall({
                name: packageName
            });

            assert.isFalse(await dir.exists());


            await adone.omnitron.dispatcher.stopOmnitron();
        });

        it("should not install service in case of omnitron's system db is busy", async () => {
            const systemDb = new adone.omnitron.SystemDB();
            await systemDb.open();
            
            const omnitronServicePath = std.path.join(__dirname, "packages", "omnitron_service_good");

            const config = await adone.configuration.Adone.load({
                cwd: omnitronServicePath
            });

            const packageName = `${config.raw.type}.${config.raw.name}`;
            const packagePath = std.path.join(realm.config.packagesPath, packageName);

            const dir = new fs.Directory(packagePath);
            assert.isFalse(await dir.exists());

            const installOptions = {
                name: omnitronServicePath
            };

            const err = await assert.throws(async () => realmInstance.install(installOptions));
            assert.instanceOf(err, Error);

            assert.isFalse(await dir.exists());

            await systemDb.close();
        });
    });

    describe("uninstall packages with broken symlinks", () => {

        afterEach(async () => {
            await fs.rmdir(FIXTURES_PATH);
        });

        // This is incomplete test
        it("cli.command", async () => {
            const name = randomName("project");
            const cwd = fixture(name);
            
            await fs.mkdirp(cwd);
    
            await fs.copyTo(std.path.join(PACKAGES_PATH, "cli_command_simple", "*"), cwd);
    
            const installOptions = {
                name: cwd,
                symlink: true
            };
    
            await realmInstance.install(installOptions);
            
            const list = await realmInstance.list();
            assert.lengthOf(list, 1);
            assert.equal(list[0].name, "cli.command.simple");
    
            await cliConfig.load();
            assert.lengthOf(cliConfig.raw.commands, 1);
    
            const packagePath = std.path.join(adone.realm.config.packagesPath, "cli.command.simple");
            
            assert.isTrue(await fs.exists(packagePath));
    
            await fs.rm(cwd);
    
            const lstat = await fs.lstat(packagePath);
            assert.isTrue(lstat.isSymbolicLink());
    
            await realmInstance.uninstall({
                name: list[0].name
            });
    
            await assert.throws(async () => fs.lstat(packagePath));
        });
    });
});
