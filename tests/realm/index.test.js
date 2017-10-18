const {
    fs,
    std,
    system: { process: { exec } }
} = adone;

const ADONE_PATH = std.path.join(adone.rootPath, "bin", "adone.js");

describe("realm", () => {
    let realmInstance;
    let cliConfig;

    before(async () => {
        await adone.realm.init("test");
        realmInstance = await adone.realm.getInstance();
        realmInstance.setSilent(true);

        cliConfig = await adone.realm.cli.getConfig();
    });

    after(async () => {
        await new adone.fs.Directory(adone.realm.homePath).clean(); 
    });

    it("check environment", () => {
        assert.equal(process.env.ADONE_REALM, "test");
        assert.equal(process.env.ADONE_DIRNAME, ".adone_test");
    });

    describe("cli commands", () => {
        it("bad install argument", async () => {
            const err = await assert.throws(async () => realmInstance.install(std.path.join(__dirname, "packages", "cli_command_simple")));
            assert.instanceOf(err, adone.x.InvalidArgument);
        });

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

                    const config = await adone.project.Configuration.load({
                        cwd: cliCommandPath
                    });

                    const packageName = name === "complex" ? config.raw.name : `${config.raw.type}.${config.raw.name}`;
                    const packagePath = std.path.join(adone.realm.config.packagesPath, packageName);

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
                it(`should rollbak installation of invalid cli command${symlink ? " with symlink " : " "}(${name})`, async () => {
                    const cliCommandPath = std.path.join(__dirname, "packages", `cli_command_${name}`);
                    
                    const config = await adone.project.Configuration.load({
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
                    const packagePath = std.path.join(adone.realm.config.packagesPath, packageName);

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

    });
});
