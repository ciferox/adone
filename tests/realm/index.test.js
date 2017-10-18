const {
    fs,
    std,
    system: { process: { exec } }
} = adone;

const ADONE_PATH = std.path.join(adone.rootPath, "bin", "adone.js");

describe("realm", () => {
    let realmInstance;
    // let cliConfig;

    before(async () => {
        await adone.realm.init("test");
        realmInstance = await adone.realm.getInstance();
        realmInstance.setSilent(true);

        // cliConfig = await adone.realm.cli.getConfig();
    });

    it("check environment", () => {
        assert.equal(process.env.ADONE_REALM, "test");
        assert.equal(process.env.ADONE_DIRNAME, ".adone_test");
    });

    it("bad install argument", async () => {
        const err = await assert.throws(async () => realmInstance.install(std.path.join(__dirname, "packages", "cli_command_simple")));
        assert.instanceOf(err, adone.x.InvalidArgument);
    });

    for (const name of ["simple", "good", "es6"]) {
        for (const symlink of [false, true]) {
            // eslint-disable-next-line
            it(`install/uninstall cli command with ${name} project structure${symlink ? " with symlink": ""}`, async () => {
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
        
                const packageName = `${config.raw.type}.${config.raw.name}`;
                const packagePath = std.path.join(adone.realm.config.packagesPath, packageName);
        
                const dir = new fs.Directory(packagePath);
                assert.isTrue(await dir.exists());
                if (symlink) {
                    assert.isTrue(await dir.isSymbolicLink());
                }
        
                const result = await exec("node", [ADONE_PATH, name]);
                assert.equal(result.stdout, "well done");
        
                await realmInstance.uninstall({
                    name: packageName
                });
        
                assert.isFalse(await dir.exists());

                if (name === "es6") {
                    await fs.rm(std.path.join(cliCommandPath, "lib"));
                }
            });
        }
    }
});
