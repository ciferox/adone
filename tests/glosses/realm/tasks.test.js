import { realmPathFor, createManagerFor, fixturePath, getRealmName } from "./utils";

const {
    is,
    configuration,
    error,
    fs,
    realm,
    std
} = adone;

describe("realm", "common tasks", () => {
    const { rootRealm } = realm;

    const newRealmsPath = fixturePath("new_realms");

    before(async () => {
        await rootRealm.connect();
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
                await rootRealm.runAndWait("realmCreate");
            }, error.InvalidArgumentException);
        });

        it("create realm without 'basePath' should be thrown", async () => {
            await assert.throws(async () => {
                await rootRealm.runAndWait("realmCreate", {
                    name: "realm1"
                });
            }, error.InvalidArgumentException);
        });

        it("create realm at existing location should have thrown", async () => {
            await assert.throws(async () => {
                await rootRealm.runAndWait("realmCreate", {
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

            await rootRealm.runAndWait("realmCreate", info);

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

            await rootRealm.runAndWait("realmCreate", info);

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

            await rootRealm.runAndWait("realmCreate", info);

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

            await rootRealm.runAndWait("realmCreate", info);

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

            await rootRealm.runAndWait("realmCreate", info);

            assert.isTrue(await fs.isFile(std.path.join(info.cwd, "jsconfig.json")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".eslintrc.js")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".gitignore")));
            assert.isFalse(await fs.exists(std.path.join(info.cwd, ".git")));
        });
    });

    describe.only("fork realm", () => {
        let tmpPath;
        before(async () => {
            await fs.mkdirp(newRealmsPath);
        });

        after(async () => {
            await fs.rm(fixturePath());
            if (is.string(tmpPath) && await fs.exists(tmpPath)) {
                await fs.rm(tmpPath);
            }
        });

        it("fork without 'name' should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                srcRealm: rootRealm
            }), error.NotValidException);
        });

        it("fork without 'basePath' should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                srcRealm: rootRealm,
                name: "test"
            }), error.NotValidException);
        });

        it("fork at existing path should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                srcRealm: rootRealm,
                name: "realm1",
                basePath: realmPathFor()
            }), error.ExistsException);
        });

        const invalidSrcRealms = [
            12,
            null,
            adone.realm.Manager
        ];

        for (const srcRealm of invalidSrcRealms) {
            it(`for when srcRealm=${adone.typeOf(srcRealm)} should be thrown`, async () => {
                await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                    srcRealm,
                    name: ".adone",
                    basePath: newRealmsPath
                }), error.NotValidException);
            }); 
        }

        it("fork empty dir should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                srcRealm: realmPathFor("empty_dir"),
                name: "bad",
                basePath: newRealmsPath
            }), /no such file or directory/);
        });

        it("fork dir without .adone/config.json should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                srcRealm: realmPathFor("realm_no_config"),
                name: "bad",
                basePath: newRealmsPath
            }), /no such file or directory/);
        });

        it("fork empty realm", async () => {
            const destRealm = await rootRealm.runAndWait("realmFork", {
                srcRealm: realmPathFor("no_tasks"),
                name: "1",
                basePath: newRealmsPath
            });

            const destPath = std.path.join(newRealmsPath, "1");
            assert.equal(destRealm.cwd, destPath);
            assert.sameMembers(await fs.readdir(realmPathFor("no_tasks")), await fs.readdir(destRealm.cwd));
        });

        it("fork simple realm", async () => {
            const destRealm = await rootRealm.runAndWait("realmFork", {
                srcRealm: realmPathFor("realm3"),
                name: "2",
                basePath: newRealmsPath
            });

            const destPath = std.path.join(newRealmsPath, "2");
            assert.equal(destRealm.cwd, destPath);
            assert.sameMembers(await fs.readdir(realmPathFor("realm3")), await fs.readdir(destRealm.cwd));
            assert.sameMembers(await fs.readdir(std.path.join(realmPathFor("realm3"), "lib", "tasks")), await fs.readdir(std.path.join(destRealm.cwd, "lib", "tasks")));
        });

        it("fork adone realm", async function () {
            this.timeout(120 * 1000);
            const destRealm = await rootRealm.runAndWait("realmFork", {
                srcRealm: rootRealm,
                name: ".adone",
                basePath: await fs.tmpName()
            });
            tmpPath = std.path.dirname(destRealm.cwd);

            const DIRS = [
                std.path.relative(rootRealm.cwd, rootRealm.BIN_PATH),
                std.path.relative(rootRealm.cwd, rootRealm.ETC_PATH),
                std.path.relative(rootRealm.cwd, rootRealm.VAR_PATH),
                std.path.relative(rootRealm.cwd, rootRealm.SHARE_PATH),
                std.path.relative(rootRealm.cwd, rootRealm.LIB_PATH),
                std.path.relative(rootRealm.cwd, rootRealm.RUNTIME_PATH),
                std.path.relative(rootRealm.cwd, rootRealm.SPECIAL_PATH),
                std.path.relative(rootRealm.cwd, rootRealm.SRC_PATH),
                std.path.relative(rootRealm.cwd, rootRealm.PACKAGES_PATH),
                std.path.relative(rootRealm.cwd, rootRealm.TESTS_PATH)
            ];

            for (const dir of DIRS) {
                // eslint-disable-next-line no-await-in-loop
                const srcFiles = await fs.readdir(std.path.join(rootRealm.cwd, dir));

                if (srcFiles.length > 0) {
                    // eslint-disable-next-line no-await-in-loop
                    const dstFiles = await fs.readdir(std.path.join(destRealm.cwd, dir));
                    assert.sameMembers(srcFiles, dstFiles);
                }
            }
            
            const srcRootFiles = (await fs.readdir(rootRealm.cwd)).filter((name) => !DIRS.includes(name));
            const dstRootFiles = (await fs.readdir(destRealm.cwd)).filter((name) => !DIRS.includes(name));
            assert.sameMembers(srcRootFiles, dstRootFiles);
        });
    });
});
