import { getRealmPathFor, getTmpPath, getRealmName } from "./utils";

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

    let tmpTestPath;
    let newRealmsPath;

    before(async () => {
        tmpTestPath = await getTmpPath();
        newRealmsPath = std.path.join(tmpTestPath, "new_realms");
        await rootRealm.connect();
    });

    describe("create realm", () => {
        before(async () => {
            await fs.mkdirp(newRealmsPath);
        });

        after(async () => {
            await fs.rm(tmpTestPath);
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
                    basePath: getRealmPathFor()
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

    describe("fork realm", () => {
        let tmpPath;

        beforeEach(async () => {
            await fs.mkdirp(newRealmsPath);
        });

        afterEach(async () => {
            await fs.rm(tmpTestPath);
            if (is.string(tmpPath) && await fs.exists(tmpPath)) {
                await fs.rm(tmpPath);
            }
        });

        it("fork without 'name' should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                realm: rootRealm
            }), error.NotValidException);
        });

        it("fork without 'basePath' should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                realm: rootRealm,
                name: "test"
            }), error.NotValidException);
        });

        it("fork at existing path should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                realm: rootRealm,
                name: "realm1",
                path: getRealmPathFor()
            }), error.ExistsException);
        });

        const invalidSrcRealms = [
            12,
            null,
            adone.realm.Manager
        ];

        for (const srcRealm of invalidSrcRealms) {
            // eslint-disable-next-line no-loop-func
            it(`for when srcRealm=${adone.typeOf(srcRealm)} should be thrown`, async () => {
                await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                    srcRealm,
                    name: ".adone",
                    path: newRealmsPath
                }), error.NotValidException);
            });
        }

        it("fork empty dir should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                realm: getRealmPathFor("empty_dir"),
                name: "bad",
                path: newRealmsPath
            }), /no such file or directory/);
        });

        it("fork dir without .adone/config.json should be thrown", async () => {
            await assert.throws(async () => rootRealm.runAndWait("realmFork", {
                realm: getRealmPathFor("realm_no_config"),
                name: "bad",
                path: newRealmsPath
            }), /no such file or directory/);
        });

        it("fork empty realm", async () => {
            const destRealm = await rootRealm.runAndWait("realmFork", {
                realm: getRealmPathFor("no_tasks"),
                name: "1",
                path: newRealmsPath
            });

            const destPath = std.path.join(newRealmsPath, "1");
            assert.equal(destRealm.cwd, destPath);
            assert.sameMembers(await fs.readdir(getRealmPathFor("no_tasks")), await fs.readdir(destRealm.cwd));
        });

        it("fork simple realm", async () => {
            const destRealm = await rootRealm.runAndWait("realmFork", {
                realm: getRealmPathFor("realm3"),
                name: "2",
                path: newRealmsPath
            });

            const destPath = std.path.join(newRealmsPath, "2");
            assert.equal(destRealm.cwd, destPath);
            assert.sameMembers(await fs.readdir(getRealmPathFor("realm3")), await fs.readdir(destRealm.cwd));
            assert.sameMembers(await fs.readdir(std.path.join(getRealmPathFor("realm3"), "lib", "tasks")), await fs.readdir(std.path.join(destRealm.cwd, "lib", "tasks")));
        });

        it("fork whole realm when 'artifactTags=[]'", async () => {
            const destRealm = await rootRealm.runAndWait("realmFork", {
                realm: getRealmPathFor("realm1"),
                name: "1",
                path: newRealmsPath,
                artifactTags: []
            });

            const destPath = std.path.join(newRealmsPath, "1");
            assert.equal(destRealm.cwd, destPath);
            assert.sameMembers(await fs.readdir(getRealmPathFor("realm1")), await fs.readdir(destRealm.cwd));
        });

        it("fork whole adone realm", async function () {
            this.timeout(300 * 1000);
            const destRealm = await rootRealm.runAndWait("realmFork", {
                realm: rootRealm,
                name: ".adone",
                path: await fs.tmpName()
            });
            tmpPath = std.path.dirname(destRealm.cwd);

            const srcRootFiles = (await fs.readdir(rootRealm.cwd));
            const dstRootFiles = (await fs.readdir(destRealm.cwd));
            assert.sameMembers(srcRootFiles, dstRootFiles);
        });

        it("fork only specified artifactTags of adone realm", async () => {
            const destRealm = await rootRealm.runAndWait("realmFork", {
                realm: rootRealm,
                name: ".adone",
                path: await fs.tmpName(),
                artifactTags: ["share", "info"]
            });
            tmpPath = std.path.dirname(destRealm.cwd);

            const dstRootFiles = (await fs.readdir(destRealm.cwd));
            assert.sameMembers(dstRootFiles, [".adone", "package.json", "share", "LICENSE", "README.md"]);
        });
    });

    describe("merge realm", () => {
        let superRealm;
        let tmpPath;
        before(async function () {
            this.timeout(300 * 1000);
            superRealm = await rootRealm.runAndWait("realmFork", {
                realm: rootRealm,
                name: "adone",
                path: await getTmpPath()
            });
            tmpPath = std.path.dirname(superRealm.cwd);
        });

        after(async () => {
            await fs.rm(tmpPath);
        });

        it("merge realm without superRealm should be thrown", async () => {
            await assert.throws(async () => {
                await rootRealm.runAndWait("realmMerge", {
                    subRealm: getRealmPathFor("realm1")
                });
            }, error.NotValidException);
        });

        it("merge realm without subRealm should be thrown", async () => {
            await assert.throws(async () => {
                await rootRealm.runAndWait("realmMerge", {
                    superRealm
                });
            }, error.NotValidException);
        });

        it("merge realm with symlink=false", async () => {
            const subRealm = getRealmPathFor("realm1");
            const mergedPath = await rootRealm.runAndWait("realmMerge", {
                superRealm,
                subRealm
            });

            const origList = (await fs.readdirp(subRealm)).map((entry) => std.path.relative(subRealm, entry.fullPath));
            const mergedList = (await fs.readdirp(mergedPath)).map((entry) => std.path.relative(mergedPath, entry.fullPath));
            assert.sameDeepMembers(origList, mergedList);
            assert.isFalse(mergedList.includes(std.path.join(".adone", "dev.json")));

            await fs.rm(mergedPath);
        });

        it("merge realm with symlink=true", async () => {
            const subRealm = await getTmpPath();
            const origPath = getRealmPathFor("realm1");
            await fs.copy(origPath, subRealm);
            const mergedPath = await rootRealm.runAndWait("realmMerge", {
                superRealm,
                subRealm,
                symlink: true
            });

            const st = await fs.lstat(mergedPath);
            assert.isTrue(st.isSymbolicLink());
            const mergedList = (await fs.readdirp(mergedPath)).map((entry) => std.path.relative(subRealm, entry.fullPath));
            assert.isTrue(mergedList.includes(std.path.join(".adone", "dev.json")));
            const mergedRealm = new realm.RealmManager({
                cwd: mergedPath
            });
            assert.equal(mergedRealm.devConfig.raw.superRealm, superRealm.cwd);
            assert.equal(mergedRealm.devConfig.raw.mergedAs, mergedRealm.name);
            await fs.unlink(mergedPath);
        });
    });
});
