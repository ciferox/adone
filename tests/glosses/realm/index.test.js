const {
    configuration,
    is,
    fs,
    error,
    // cli,
    realm,
    std,
    // text
} = adone;

// const PACKAGES_PATH = std.path.join(__dirname, "packages");
const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
const fixturePath = (...args) => std.path.join(FIXTURES_PATH, ...args);
const realmPathFor = (...args) => std.path.join(__dirname, "realms", ...args);

// // NOTE: tests order matters

describe("realm", () => {
    let rootRealm;
    let realmManager;
    let realmPath;
    // let adoneCliPath;
    // let cliConfig;
    let realmCounter = 1;
    const getRealmName = () => `project${realmCounter++}`;

    const newRealmsPath = fixturePath("new_realms");

    const CORE_TASKS = [
        "createRealm",
        "forkRealm",
        "install",
        "uninstall",
        "mount",
        "unmount",
        "list",
        "listByType",
        "validateRealm",

        "clean",
        "build",
        "copy",
        "transpile",
        "transpileExe",
        "adoneTranspile",
        "adoneTranspileExe",
        "adoneDotCompiler",
        "watch",
        "increaseVersion",
        "nbuild",
        "nclean"
    ];

    // const randomName = (prefix = "test") => `${prefix}${text.random(4)}_${text.random(5)}_${text.random(6)}`;

    const createRealmFor = async (name, shouldInit = true) => {
        const manager = new realm.Manager({
            cwd: realmPathFor(name)
        });
        shouldInit && await manager.initialize();
        return manager;
    };

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

    it("'adone.realm' namespace", () => {
        assert.isTrue(is.namespace(adone.realm));
        assert.isTrue(is.class(adone.realm.Manager));
        assert.isTrue(is.class(adone.realm.BaseTask));
        assert.isTrue(is.class(adone.realm.TransformTask));
        assert.isTrue(is.class(adone.realm.Configuration));
        assert.isTrue(is.realm(adone.realm.rootRealm));
    });

    describe("tasks configuration", () => {
        it("realm without tasks", async () => {
            const mgr = await createRealmFor("no_tasks");
    
            assert.isObject(mgr.config.raw.scheme);
            assert.lengthOf(mgr.getTaskNames(), 0);
        });
    
        it("realm with configuration tasks defaults", async () => {
            const mgr = await createRealmFor("realm1");
    
            assert.isObject(mgr.config.raw.scheme);
            assert.sameMembers(mgr.getTaskNames(), ["task1", "task2"]);
        });
    
        it("realm with configuration tasks with custom index", async () => {
            const mgr = await createRealmFor("realm2");
    
            assert.isObject(mgr.config.raw.scheme);
            assert.sameMembers(mgr.getTaskNames(), ["task1", "task2"]);
        });
    
        it("realm with configuration tasks with dev index", async () => {
            const mgr = await createRealmFor("realm2");
    
            assert.isObject(mgr.config.raw.scheme);
            assert.sameMembers(mgr.getTaskNames(), ["task1", "task2"]);
        });
    });

    describe("root realm", () => {
        it("pre initialize", () => {
            rootRealm = realm.rootRealm;
            assert.instanceOf(rootRealm, adone.realm.Manager);
            assert.equal(rootRealm.ROOT_PATH, adone.ROOT_PATH);
            assert.deepEqual(rootRealm.package, adone.package);
            assert.isObject(rootRealm.config);
        });

        it("after initialize", async () => {
            assert.isNull(rootRealm.typeHandler);
    
            assert.lengthOf(rootRealm.getTaskNames(), 0);
    
            await rootRealm.initialize();
    
            assert.sameMembers(rootRealm.getTaskNames(), CORE_TASKS);
        });

        it("initialize realm manager repeatedly shouldn't be thrown", async () => {
            let i;
            for (i = 0; i < 10; i++) {
                // eslint-disable-next-line no-await-in-loop
                await rootRealm.initialize();
            }
            assert.equal(i, 10);
        });    
    });

    describe.skip("type handlers", () => {
        it("", async () => {

        });
    });

    describe("create realm", () => {
        before(async () => {
            await fs.mkdirp(newRealmsPath);
        });

        after(async () => {
            await fs.rm(fixturePath());
        });

        it("create realm without 'name' should be thrown", async () => {
            await assert.throws(async () => {
                await rootRealm.runAndWait("createRealm");
            }, error.InvalidArgumentException);
        });

        it("create realm without 'basePath' should be thrown", async () => {
            await assert.throws(async () => {
                await rootRealm.runAndWait("createRealm", {
                    name: "realm1"
                });
            }, error.InvalidArgumentException);
        });

        it("create realm at existing location should have thrown", async () => {
            await assert.throws(async () => {
                await rootRealm.runAndWait("createRealm", {
                    name: "no_tasks",
                    basePath: realmPathFor()
                });
            }, error.ExistsException);
        });

        it("create realm", async () => {
            const name = getRealmName();
            
            const info = {
                name,
                description: "Sample project",
                basePath: newRealmsPath
            };

            await rootRealm.runAndWait("createRealm", info);

            assert.equal(info.cwd, std.path.join(newRealmsPath, info.name));
            assert.isTrue(await fs.exists(info.cwd));
            assert.isTrue(await fs.isFile(std.path.join(info.cwd, realm.Configuration.configName)));
            assert.isTrue(await fs.isFile(std.path.join(info.cwd, configuration.Npm.configName)));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".gitignore")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".git")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".eslintrc.js")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, "jsconfig.json")));

            const packageConfig = await configuration.Npm.load({
                cwd: info.cwd
            });

            assert.equal(packageConfig.raw.name, name);
            assert.equal(packageConfig.raw.description, "Sample project");
            assert.equal(std.path.basename(info.cwd), name);
        });

        it("create realm with specified 'dir'", async () => {
            const name = "myproject";
            const dir = getRealmName();
            
            const info = {
                name,
                dir,
                basePath: newRealmsPath
            };

            await rootRealm.runAndWait("createRealm", info);

            assert.equal(info.cwd, std.path.join(newRealmsPath, info.dir));
            assert.isTrue(await fs.exists(info.cwd));
            assert.isTrue(await fs.isFile(std.path.join(info.cwd, realm.Configuration.configName)));
            assert.isTrue(await fs.isFile(std.path.join(info.cwd, configuration.Npm.configName)));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".gitignore")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".git")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".eslintrc.js")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, "jsconfig.json")));

            const packageConfig = await configuration.Npm.load({
                cwd: info.cwd
            });
            
            assert.equal(packageConfig.raw.name, name);
            assert.equal(std.path.basename(info.cwd), dir);
        });

        it("create realm with git initialization", async () => {
            const name = getRealmName();
            
            const info = {
                name,
                initGit: true,
                basePath: newRealmsPath
            };

            await rootRealm.runAndWait("createRealm", info);

            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".eslintrc.js")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, "jsconfig.json")));
            assert.isTrue(await fs.isFile(std.path.join(info.cwd, ".gitignore")));
            assert.isTrue(await fs.isDirectory(std.path.join(info.cwd, ".git")));
        });

        it("create realm with 'eslintrc.js' config", async () => {
            const name = getRealmName();
            
            const info = {
                name,
                initEslint: true,
                basePath: newRealmsPath
            };

            await rootRealm.runAndWait("createRealm", info);

            assert.isTrue(await fs.isFile(std.path.join(info.cwd, ".eslintrc.js")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, "jsconfig.json")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".gitignore")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".git")));
        });

        it("create realm with 'jsconfig.json' config", async () => {
            const name = getRealmName();
            
            const info = {
                name,
                initJsconfig: true,
                basePath: newRealmsPath
            };

            await rootRealm.runAndWait("createRealm", info);

            assert.isTrue(await fs.isFile(std.path.join(info.cwd, "jsconfig.json")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".eslintrc.js")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".gitignore")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".git")));
        });
    });

    describe.skip("fork realm", () => {
        it("fork without 'basePath' should be thrown", async () => {
            const observer = await rootRealm.runSafe("forkRealm", {
                name: "test"
            });
            const err = await assert.throws(async () => observer.result);
            assert.instanceOf(err, error.NotValidException);
        });
    
        it("fork without 'name' should be thrown", async () => {
            realmPath = await fs.tmpName({
                prefix: "realm-"
            });
    
            const observer = await rootRealm.runSafe("forkRealm", {
                basePath: realmPath
            });
            const err = await assert.throws(async () => observer.result);
            assert.instanceOf(err, error.NotValidException);
        });
    
        it("fork", async () => {
            realmPath = await fs.tmpName({
                prefix: "realm-"
            });
    
            assert.isFalse(await fs.exists(realmPath));
    
            // rootRealm.onNotification("progress", (task, name, info) => {
            //     console.log(info.message);
            // });
    
            const name = std.path.basename(realmPath);
            const basePath = std.path.dirname(realmPath);
    
            const observer = await rootRealm.runSafe("forkRealm", {
                basePath,
                name
            });
            const destPath = await observer.result;
    
            assert.isTrue(await fs.exists(realmPath));
            assert.isTrue(await fs.isDirectory(realmPath));
            assert.strictEqual(destPath, realmPath);
    
            realmManager = new realm.Manager({
                cwd: destPath
            });
            await realmManager.initialize();
    
            const files = await fs.readdir(realmManager.cwd);
            assert.includeMembers(files, [
                ".adone",
                "LICENSE",
                "README.md",
                "adone.json",
                "bin",
                "etc",
                "lib",
                "share",
                "package.json",
                "packages",
                // "run",
                "var"
            ]);
    
            adoneCliPath = std.path.join(realmManager.env.ROOT_PATH, "bin", "adone.js");
            cliConfig = await adone.cli.Configuration.load({
                cwd: adone.ETC_ADONE_PATH
            });
        });

        it("lock/unlock", async () => {
            const options = {
                lockfilePath: adone.std.path.join(realmManager.env.ROOT_PATH, "realm.lock")
            };
    
            await realmManager.lock();
            assert.isTrue(await fs.exists(options.lockfilePath));
            assert.isTrue(await adone.app.lockfile.check(realmManager.env.ROOT_PATH, options));
            await realmManager.unlock();
            assert.isFalse(await fs.exists(options.lockfilePath));
            assert.isFalse(await adone.app.lockfile.check(realmManager.env.ROOT_PATH, options));
        });
    
        it("default tasks", async () => {
            assert.sameMembers(realmManager.getTaskNames(), CORE_TASKS);
        });
    
        it("default type handlers", async () => {
            assert.sameMembers(Object.keys(realmManager.typeHandler), [
                "cli.command",
                "omnitron.service"
            ]);
        });
    });

    describe.skip("install/uninstall packages", () => {
        it("invalid install argument", async () => {
            const err = await assert.throws(async () => {
                const observer = await realmManager.install(std.path.join(__dirname));
                return observer.result;
            });
            assert.instanceOf(err, error.InvalidArgumentException);
        });

        //     describe("cli commands", () => {
        //         for (const name of ["simple", "good", "es6", "complex"]) {
        //             for (const symlink of [false, true]) {
        //                 // eslint-disable-next-line
        //                 it(`install/uninstall cli command with${symlink ? " with symlink" : ""} (${name})`, async () => {
        //                     const cliCommandPath = std.path.join(__dirname, "packages", `cli_command_${name}`);
        //                     const installOptions = {
        //                         name: cliCommandPath,
        //                         symlink
        //                     };
        //                     if (name === "es6") {
        //                         installOptions.build = true;
        //                     }

        //                     let observer = await realmManager.install(installOptions);
        //                     await observer.result;

        //                     const config = await realm.Configuration.load({
        //                         cwd: cliCommandPath
        //                     });

        //                     const packageName = name === "complex" ? config.raw.name : `${config.raw.type}.${config.raw.name}`;
        //                     const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

        //                     const dir = new fs.Directory(packagePath);
        //                     assert.isTrue(await dir.exists());
        //                     if (symlink) {
        //                         assert.isTrue(await dir.isSymbolicLink());
        //                     }

        //                     if (name === "complex") {
        //                         let result = await exec("node", [adoneCliPath, "sub1"]);
        //                         assert.equal(result.stdout, "well done 1");

        //                         result = await exec("node", [adoneCliPath, "sub2"]);
        //                         assert.equal(result.stdout, "well done 2");
        //                     } else {
        //                         const result = await exec("node", [adoneCliPath, name]);
        //                         assert.equal(result.stdout, "well done");
        //                     }

        //                     observer = await realmManager.uninstall({
        //                         name: packageName
        //                     });
        //                     await observer.result;

        //                     assert.isFalse(await dir.exists());

        //                     if (name === "es6") {
        //                         await fs.rm(std.path.join(cliCommandPath, "lib"));
        //                     }

        //                     await cliConfig.load();
        //                     if (name === "complex") {
        //                         assert.isFalse(cliConfig.hasCommand("sub1"));
        //                         assert.isFalse(cliConfig.hasCommand("sub2"));
        //                     } else {
        //                         assert.isFalse(cliConfig.hasCommand(config.raw.name));
        //                     }
        //                 });
        //             }
        //         }

        //         for (const name of ["invalid_type", "no_name", "no_script", "bad_script1", "bad_script2", "bad_script3", "invalid_complex"]) {
        //             for (const symlink of [false]) {
        //                 // eslint-disable-next-line
        //                 it(`should rollback installation of invalid cli command${symlink ? " with symlink " : " "}(${name})`, async () => {
        //                     const cliCommandPath = std.path.join(__dirname, "packages", `cli_command_${name}`);

        //                     const config = await realm.Configuration.load({
        //                         cwd: cliCommandPath
        //                     });

        //                     await cliConfig.load();
        //                     if (name === "invalid_complex") {
        //                         assert.isFalse(cliConfig.hasCommand("sub1"));
        //                         assert.isFalse(cliConfig.hasCommand("sub2"));
        //                     } else {
        //                         assert.isFalse(cliConfig.hasCommand(config.raw.name));
        //                     }

        //                     const packageName = name === "invalid_complex" ? config.raw.name : `${config.raw.type}.${config.raw.name}`;
        //                     const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

        //                     const dir = new fs.Directory(packagePath);
        //                     assert.isFalse(await dir.exists());

        //                     const installOptions = {
        //                         name: cliCommandPath,
        //                         symlink
        //                     };

        //                     const err = await assert.throws(async () => {
        //                         const observer = await realmManager.install(installOptions);
        //                         return observer.result;
        //                     });
        //                     assert.instanceOf(err, Error);

        //                     assert.isFalse(await dir.exists());

        //                     await cliConfig.load();
        //                     if (name === "invalid_complex") {
        //                         assert.isFalse(cliConfig.hasCommand("sub1"));
        //                         assert.isFalse(cliConfig.hasCommand("sub2"));
        //                     } else {
        //                         assert.isFalse(cliConfig.hasCommand(config.raw.name));
        //                     }
        //                 });
        //             }
        //         }
        //     });

        //     describe.todo("omnitron services", () => {
        //         it("install/uninstall with inactive omnitron", async () => {
        //             const omnitronServicePath = std.path.join(__dirname, "packages", "omnitron_service_good");

        //             const config = await realm.Configuration.load({
        //                 cwd: omnitronServicePath
        //             });

        //             const packageName = `${config.raw.type}.${config.raw.name}`;
        //             const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

        //             const dir = new fs.Directory(packagePath);
        //             assert.isFalse(await dir.exists());

        //             const installOptions = {
        //                 name: omnitronServicePath
        //             };

        //             let observer = await realmManager.install(installOptions);
        //             await observer.result;

        //             assert.isTrue(await dir.exists());

        //             observer = await realmManager.uninstall({
        //                 name: packageName
        //             });
        //             await observer.result;

        //             assert.isFalse(await dir.exists());
        //         });

        //         it("install/uninstall with active omnitron", async () => {
        //             await adone.omnitron.dispatcher.startOmnitron();
        //             await adone.omnitron.dispatcher.connectLocal();
        //             assert.isTrue(await adone.omnitron.dispatcher.ping());

        //             const omnitronServicePath = std.path.join(__dirname, "packages", "omnitron_service_good");

        //             const config = await realm.Configuration.load({
        //                 cwd: omnitronServicePath
        //             });

        //             const packageName = `${config.raw.type}.${config.raw.name}`;
        //             const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

        //             const dir = new fs.Directory(packagePath);
        //             assert.isFalse(await dir.exists());

        //             const installOptions = {
        //                 name: omnitronServicePath
        //             };

        //             let observer = await realmManager.install(installOptions);
        //             await observer.result;

        //             assert.isTrue(await dir.exists());

        //             observer = await realmManager.uninstall({
        //                 name: packageName
        //             });
        //             await observer.result;

        //             assert.isFalse(await dir.exists());

        //             await adone.omnitron.dispatcher.stopOmnitron();
        //         });

        //         it("should not install service in case of omnitron's system db is busy", async () => {
        //             const systemDb = new adone.omnitron.DB();
        //             await systemDb.open();

        //             const omnitronServicePath = std.path.join(__dirname, "packages", "omnitron_service_good");

        //             const config = await realm.Configuration.load({
        //                 cwd: omnitronServicePath
        //             });

        //             const packageName = `${config.raw.type}.${config.raw.name}`;
        //             const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, packageName);

        //             const dir = new fs.Directory(packagePath);
        //             assert.isFalse(await dir.exists());

        //             const installOptions = {
        //                 name: omnitronServicePath
        //             };

        //             const err = await assert.throws(async () => {
        //                 const observer = await realmManager.install(installOptions);
        //                 return observer.result;
        //             });
        //             assert.instanceOf(err, Error);

        //             assert.isFalse(await dir.exists());

        //             await systemDb.close();
        //         });
        //     });

        //     describe("uninstall broken packages", () => {
        //         afterEach(async () => {
        //             await fs.rm(FIXTURES_PATH);
        //         });

        //         it.todo("uninstall non-existing package", async () => {

        //         });

        //         // This is incomplete test
        //         it("cli.command (broken symlinks)", async () => {
        //             const name = randomName("project");
        //             const cwd = fixture(name);

        //             await fs.mkdirp(cwd);

        //             await fs.copyTo(std.path.join(PACKAGES_PATH, "cli_command_simple", "*"), cwd);

        //             const installOptions = {
        //                 name: cwd,
        //                 symlink: true
        //             };

        //             let observer = await realmManager.install(installOptions);
        //             await observer.result;

        //             observer = await realmManager.list();
        //             const list = await observer.result;
        //             assert.lengthOf(list, 1);
        //             assert.equal(list[0].name, "cli.command.simple");

        //             await cliConfig.load();
        //             assert.lengthOf(cliConfig.raw.commands, 1);

        //             const packagePath = std.path.join(realmManager.config.PACKAGES_PATH, "cli.command.simple");

        //             assert.isTrue(await fs.exists(packagePath));

        //             await fs.rm(cwd);

        //             const lstat = await fs.lstat(packagePath);
        //             assert.isTrue(lstat.isSymbolicLink());

        //             observer = await realmManager.uninstall({
        //                 name: list[0].name
        //             });
        //             await observer.result;

        //             await assert.throws(async () => fs.lstat(packagePath));
        //         });

        //         it.todo("cli.command (present in config but not installed)", async () => {

        //         });
        //     });
    });
});
