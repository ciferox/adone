const {
    is,
    fs,
    project,
    std,
    text,
    error,
    util
} = adone;

const {
    Manager
} = project;

const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
const fixture = (...args) => std.path.join(FIXTURES_PATH, ...args);
const projectPath = (...args) => std.path.join(__dirname, "projects", ...args);

const DEFAULT_TASKS = [];

for (const name of Object.keys(project.task)) {
    DEFAULT_TASKS.push(adone.text.toCamelCase(name));
}

describe("project", function () {
    this.timeout(90000);

    const createManagerFor = async (name, shouldLoad = true) => {
        const manager = new Manager({
            cwd: projectPath(name)
        });
        shouldLoad && await manager.load();
        return manager;
    };

    let projectCounter = 1;
    const getProjectName = () => `project${projectCounter++}`;

    it("load project twice should be throw", async () => {
        const proj = await createManagerFor("no_tasks");
        const err = await assert.throws(async () => {
            await proj.load("no_tasks");
        });
        assert.instanceOf(err, error.IllegalStateException);
        assert.equal(err.message, "Project already loaded");
    });

    it("should throw when try to get name of unloaded project", async () => {
        const proj = await createManagerFor("no_tasks", false);
        assert.throws(async () => {
            console.log(proj.name);
        }, "Project is not loaded");
    });

    it("should throw when try to set name of unloaded project", async () => {
        const proj = await createManagerFor("no_tasks", false);
        assert.throws(async () => {
            proj.name = "a";
        }, "Project is not loaded");
    });

    it("change project name for loaded project", async () => {
        const proj = await createManagerFor("no_tasks");
        assert.equal(proj.name, "test");

        proj.name = "new_name1";

        assert.equal(proj.config.raw.name, "new_name1");
    });

    it("load project (without custom tasks)", async () => {
        const proj = await createManagerFor("no_tasks");

        assert.strictEqual(proj.config.raw.name, "test");
        assert.strictEqual(proj.config.raw.description, "Tesk project");
        assert.strictEqual(proj.config.raw.type, "application");
        assert.strictEqual(proj.config.raw.main, "lib");

        assert.equal(proj.name, "test");

        assert.sameMembers(proj.getTaskNames(), DEFAULT_TASKS);
    });

    it("load project (with custom tasks)", async () => {
        const proj = await createManagerFor("with_tasks");

        assert.strictEqual(proj.config.raw.name, "test2");
        assert.strictEqual(proj.config.raw.description, "Tesk project 2");
        assert.strictEqual(proj.config.raw.type, "application");
        assert.strictEqual(proj.config.raw.main, "lib");

        assert.sameMembers(proj.getTaskNames(), ["task1", "task2"].concat(DEFAULT_TASKS));
    });

    it("subclass project manager", async () => {
        class CustomTask extends project.TransformTask {
        }

        class ExManager extends project.Manager {
            async loadCustomTasks() {
                await this.addTask("task3", CustomTask);
            }
        }

        const proj = new ExManager({
            cwd: std.path.join(__dirname, "projects", "with_tasks")
        });
        await proj.load();

        assert.sameMembers(proj.getTaskNames(), ["task1", "task2", "task3"].concat(DEFAULT_TASKS));
    });

    describe.only("initialize projects", () => {
        const basePath = fixture("empty_projects");

        before(async () => {
            await fs.mkdir(basePath);
        });

        after(async () => {
            // await fs.rm(basePath);
        });

        it("init project without name should be thrown", async () => {
            const proj = await project.getDefaultManager();

            await assert.throws(async () => {
                await proj.createProject();
            }, error.InvalidArgumentException);
        });

        it("init project with default 'basePath' should be thrown", async () => {
            const proj = await project.getDefaultManager();

            await assert.throws(async () => {
                await proj.createProject({
                    name: "project1"
                });
            }, error.InvalidArgumentException);
        });

        it("init project at existing location should be thrown", async () => {
            const proj = await project.getDefaultManager();

            const projPath = fixture("project1");
            try {
                await fs.mkdirp(projPath);
            } catch (err) {
                //
            }

            await assert.throws(async () => {
                await proj.createProject({
                    name: "no_tasks",
                    basePath: projectPath()
                });
            }, error.ExistsException);

            await fs.rm(projPath);
        });

        it("init empty project", async () => {
            const proj = await project.getDefaultManager();

            const name = getProjectName();
            
            const info = {
                name,
                description: "Sample project",
                basePath
            };

            await proj.createProject(info);

            assert.equal(info.cwd, std.path.join(basePath, info.name));
            assert.true(await fs.exists(info.cwd));
            assert.true(await fs.isFile(std.path.join(info.cwd, "adone.json")));
            assert.true(await fs.isFile(std.path.join(info.cwd, ".gitignore")));
            assert.true(await fs.isDirectory(std.path.join(info.cwd, ".git")));
            assert.true(await fs.isFile(std.path.join(info.cwd, ".eslintrc.js")));
            assert.true(await fs.isFile(std.path.join(info.cwd, "jsconfig.json")));

            const adoneConfig = await adone.configuration.Adone.load({
                cwd: info.cwd
            });

            assert.equal(adoneConfig.raw.name, name);
            assert.equal(adoneConfig.raw.description, "Sample project");
            assert.equal(std.path.basename(info.cwd), name);
        });

        it("init empty project with 'dirName'", async () => {
            const proj = await project.getDefaultManager();

            const name = "myproject";
            const dirName = getProjectName();
            
            const info = {
                name,
                dirName,
                basePath
            };

            await proj.createProject(info);

            assert.equal(info.cwd, std.path.join(basePath, info.dirName));

            const adoneConfig = await adone.configuration.Adone.load({
                cwd: info.cwd
            });
            
            assert.equal(adoneConfig.raw.name, name);
            assert.equal(std.path.basename(info.cwd), dirName);
        });

        it("init empty project without git initialization", async () => {
            const proj = await project.getDefaultManager();

            const name = getProjectName();
            
            const info = {
                name,
                skipGit: true,
                basePath
            };

            await proj.createProject(info);

            assert.true(await fs.exists(std.path.join(info.cwd, ".eslintrc.js")));
            assert.true(await fs.isFile(std.path.join(info.cwd, "jsconfig.json")));
            assert.false(await fs.exists(std.path.join(info.cwd, ".gitignore")));
            assert.false(await fs.exists(std.path.join(info.cwd, ".git")));
        });

        it("init empty project without eslint initialization", async () => {
            const proj = await project.getDefaultManager();

            const name = getProjectName();
            
            const info = {
                name,
                skipEslint: true,
                basePath
            };

            await proj.createProject(info);

            assert.false(await fs.exists(std.path.join(info.cwd, ".eslintrc.js")));
            assert.true(await fs.isFile(std.path.join(info.cwd, "jsconfig.json")));
            assert.true(await fs.exists(std.path.join(info.cwd, ".gitignore")));
            assert.true(await fs.exists(std.path.join(info.cwd, ".git")));
        });

        it("init empty project without jsconfig initialization", async () => {
            const proj = await project.getDefaultManager();

            const name = getProjectName();
            
            const info = {
                name,
                skipJsconfig: true,
                basePath
            };

            await proj.createProject(info);

            assert.false(await fs.exists(std.path.join(info.cwd, "jsconfig.json")));
            assert.true(await fs.isFile(std.path.join(info.cwd, ".eslintrc.js")));
            assert.true(await fs.isFile(std.path.join(info.cwd, ".gitignore")));
            assert.true(await fs.exists(std.path.join(info.cwd, ".git")));
        });
    });

    describe.skip("generator", () => {
        const paths = [];

        const getPathFor = (...args) => {
            const path = fixture(...args);
            paths.push(path);
            return path;
        };

        before(async () => {
            await fs.mkdirp(fixture());
        });

        after(async function () {
            this.timeout(30000);
            // await fs.rm(fixture());
        });

        const randomName = (prefix = "test") => `${prefix}${text.random(4)}_${text.random(5)}_${text.random(6)}`;

        afterEach(async function () {
            this.timeout(30000);
            for (const path of paths) {
                await fs.rm(path); // eslint-disable-line
            }
        });

        it("should have thrown if path exists and is not empty", async () => {
            const name = randomName();
            const cwd = getPathFor(name);
            await fs.mkdir(cwd);
            await fs.writeFile(std.path.join(cwd, "some_file"), "abc");

            const manager = new Manager({ cwd });
            const err = await assert.throws(async () => manager.createProject({
                name: "test1"
            }));
            assert.instanceOf(err, error.ExistsException);
        });

        it("should have thrown if name of project is not specified", async () => {
            const name = randomName();
            const cwd = getPathFor(name);
            const manager = new Manager({ cwd });
            const err = await assert.throws(async () => manager.createProject({
                description: "test1"
            }));
            assert.instanceOf(err, error.InvalidArgumentException);
        });

        const fileTypes = [
            {
                name: "application",
                check: (moduleExport) => {

                }
            },
            {
                name: "cli.application",
                check: (moduleExport) => {

                }
            },
            {
                name: "cli.command",
                check: (moduleExport) => {
                    const Class = moduleExport.default;
                    const instance = new Class();
                    assert.true(is.subsystem(instance));
                }
            },
            {
                name: "omnitron.service",
                check: (moduleExport) => {
                    const Class = moduleExport.default;
                    const instance = new Class({
                        config: {
                            name: "test"
                        }
                    });
                    assert.true(is.subsystem(instance));
                    assert.true(is.omnitronService(instance));
                }
            }
        ];

        for (const type of fileTypes) {
            describe(`generate '${type.name}'`, () => {
                it("named", async () => {
                    const name = randomName();
                    const filePath = getPathFor(`${name}.js`);

                    const manager = new Manager({
                        cwd: FIXTURES_PATH
                    });
                    await manager.createFile({
                        type: type.name,
                        name,
                        cwd: FIXTURES_PATH
                    });

                    assert.true(await fs.exists(filePath));
                    if (!["application", "cli.application"].includes(type.name)) {
                        const moduleExport = adone.require(filePath);
                        assert.true(is.class(moduleExport.default));
                        assert.equal(moduleExport.default.name, text.capitalize(text.toCamelCase(name)));
                        await type.check(moduleExport);
                    }
                });

                it("unnamed", async () => {
                    const name = "index";
                    const projectPath = getPathFor(randomName());
                    const filePath = std.path.join(projectPath, `${name}.js`);

                    const manager = new Manager({
                        cwd: projectPath
                    });
                    if (["application", "cli.application"].includes(type.name)) {
                        const err = await assert.throws(async () => manager.createFile({
                            type: type.name,
                            cwd: projectPath
                        }));
                        assert.instanceOf(err, adone.error.NotValidException);
                    } else {
                        await manager.createFile({
                            type: type.name,
                            cwd: projectPath
                        });

                        assert.true(await fs.exists(filePath));
                        const moduleExport = adone.require(filePath);
                        assert.true(is.class(moduleExport.default));
                        assert.true(moduleExport.default.name.startsWith("_class") || moduleExport.default.name.startsWith("_default"));
                        await type.check(moduleExport);
                    }
                });

                it("should have thrown is file already exists", async () => {
                    const name = randomName();
                    const filePath = getPathFor(`${name}.js`);

                    await fs.writeFile(filePath, "888");

                    const manager = new Manager({
                        cwd: FIXTURES_PATH
                    });
                    const err = await assert.throws(async () => manager.createFile({
                        type: type.name,
                        name,
                        cwd: FIXTURES_PATH
                    }));
                    assert.instanceOf(err, adone.error.ExistsException);
                });

                it("should not throw is file exists and flag 'rewriteFile=true'", async () => {
                    const name = randomName();
                    const filePath = getPathFor(`${name}.js`);

                    await fs.writeFile(filePath, "888");

                    const manager = new Manager({
                        cwd: FIXTURES_PATH
                    });
                    await manager.createFile({
                        type: type.name,
                        name,
                        cwd: FIXTURES_PATH,
                        rewriteFile: true
                    });

                    assert.true(await fs.exists(filePath));
                    if (!["application", "cli.application"].includes(type.name)) {
                        const moduleExport = adone.require(filePath);
                        assert.true(is.class(moduleExport.default));
                        assert.equal(moduleExport.default.name, text.capitalize(text.toCamelCase(name)));
                        await type.check(moduleExport);
                    }
                });
            });
        }

        describe("project generating", () => {
            const defaultProjects = [
                {
                    skipNpm: false,
                    skipJsconfig: true,
                    skipGit: true,
                    skipEslint: true,
                    files: ["adone.json"]
                },
                {
                    skipNpm: false,
                    skipJsconfig: true,
                    skipGit: false,
                    skipEslint: true,
                    files: ["adone.json", ".git", ".gitignore"]
                },
                {
                    skipNpm: false,
                    skipJsconfig: true,
                    skipGit: false,
                    skipEslint: false,
                    files: ["adone.json", ".git", ".gitignore", ".eslintrc.js", "package.json", "package-lock.json", "node_modules"]
                },
                {
                    skipNpm: false,
                    skipJsconfig: false,
                    skipGit: false,
                    skipEslint: false,
                    files: ["adone.json", ".git", ".gitignore", ".eslintrc.js", "package.json", "package-lock.json", "node_modules", "jsconfig.json"]
                },
                {
                    skipNpm: true,
                    skipJsconfig: false,
                    skipGit: false,
                    skipEslint: false,
                    files: ["adone.json", ".git", ".gitignore", ".eslintrc.js", "package.json", "jsconfig.json"]
                }
            ];

            for (const { skipGit, skipJsconfig, skipEslint, skipNpm, files } of defaultProjects) {
                it(`default project (skipGit=${skipGit}, skipJsconfig=${skipJsconfig}, skipEslint=${skipEslint})`, async function () {
                    this.timeout(120000);
                    const name = randomName("project");
                    const cwd = getPathFor(name);
                    await fs.mkdir(cwd);

                    const manager = new Manager({ cwd });
                    const projectConfig = {
                        name,
                        description: "project description",
                        version: "1.1.1",
                        author: "Adone Core Team",
                        skipJsconfig,
                        skipEslint,
                        skipGit,
                        skipNpm
                    };
                    await manager.createProject(projectConfig);

                    const adoneConfig = await adone.configuration.Adone.load({
                        cwd
                    });
                    assert.deepEqual(util.pick(adoneConfig.raw, ["name", "description", "version", "author"]), util.pick(projectConfig, ["name", "description", "version", "author"]));
                    assert.sameMembers(await fs.readdir(cwd), files);
                    if (!skipGit) {
                        assert.true(await fs.isDirectory(std.path.join(cwd, ".git")));
                    }

                    if (await fs.exists(std.path.join(cwd, adone.configuration.Npm.name))) {
                        const npmConfig = await adone.configuration.Npm.load({
                            cwd
                        });
                        assert.deepEqual(util.pick(npmConfig.raw, ["name", "description", "version", "author"]), util.pick(projectConfig, ["name", "description", "version", "author"]));
                    }

                    // if (!skipEslint) {
                    //     assert.true(is.configuration(context.config.eslint));
                    // }

                    if (!skipJsconfig) {
                        const jsconfig = await adone.configuration.Jsconfig.load({
                            cwd
                        });
                        assert.false(is.propertyOwned(jsconfig.raw, "include"));
                    }
                });
            }

            for (const type of ["application", "cli.application", "cli.command", "omnitron.service"]) {
                it(`${type} project`, async () => {
                    const name = `project_${text.random(8)}`;
                    const cwd = getPathFor(name);
                    await fs.mkdir(cwd);

                    const manager = new Manager({ cwd });
                    const projectConfig = {
                        name,
                        description: "project description",
                        version: "3.0.0",
                        author: "Adone Core Team",
                        type
                    };
                    await manager.createProject(projectConfig);

                    const adoneConfig = await adone.configuration.Adone.load({
                        cwd
                    });
                    if (["cli.command", "omnitron.service"].includes(type)) {
                        assert.deepEqual(util.pick(adoneConfig.raw, ["name", "description", "version", "author", "type", "main"]), {
                            ...projectConfig,
                            main: "lib"
                        });
                    } else {
                        assert.deepEqual(util.pick(adoneConfig.raw, ["name", "description", "version", "author", "type", "bin", "main"]), {
                            ...projectConfig,
                            main: "lib",
                            bin: "bin/app.js"
                        });
                    }

                    assert.sameMembers(await fs.readdir(cwd), ["adone.json", ".git", ".gitignore", ".eslintrc.js", "package.json", "package-lock.json", "node_modules", "jsconfig.json", "src"]);
                    assert.true(await fs.isDirectory(std.path.join(cwd, ".git")));
                    assert.true(await fs.isDirectory(std.path.join(cwd, "node_modules")));
                    assert.true(await fs.isDirectory(std.path.join(cwd, "src")));
                    if (["cli.command", "omnitron.service"].includes(type)) {
                        assert.true(await fs.exists(std.path.join(cwd, "src", "index.js")));
                    } else {
                        assert.true(await fs.exists(std.path.join(cwd, "src", "app.js")));
                    }

                    const npmConfig = await adone.configuration.Npm.load({
                        cwd
                    });
                    assert.deepEqual(util.pick(npmConfig.raw, ["name", "description", "version", "author"]), util.pick(projectConfig, ["name", "description", "version", "author"]));

                    // assert.true(is.configuration(context.config.eslint));

                    const jsconfig = await adone.configuration.Jsconfig.load({
                        cwd
                    });
                    assert.true(is.array(jsconfig.raw.include));
                });
            }

            describe("sub projects", () => {
                it("create one subproject", async () => {
                    const name = `project_${text.random(8)}`;
                    const cwd = getPathFor(name);
                    await fs.mkdir(cwd);

                    const manager = new Manager({ cwd });
                    const projectConfig = {
                        name,
                        description: "project description",
                        version: "3.0.0",
                        author: "Adone Core Team"
                    };
                    const context = await manager.createProject(projectConfig);

                    const adoneConfig = await adone.configuration.Adone.load({
                        cwd
                    });

                    assert.lengthOf(adoneConfig.getSubConfigs(), 0);

                    const subContext = await manager.createSubProject({
                        name: "jit",
                        dirName: "service",
                        type: "omnitron.service"
                    });

                    await adoneConfig.load();
                    assert.lengthOf(adoneConfig.getSubConfigs(), 1);

                    const subCwd = std.path.join(cwd, "service");
                    assert.sameMembers(await fs.readdir(subCwd), [
                        "adone.json",
                        "src",
                        ".eslintrc.js",
                        "node_modules",
                        "package-lock.json",
                        "package.json"
                    ]);
                    assert.true(await fs.isDirectory(std.path.join(subCwd, "src")));
                    assert.true(await fs.exists(std.path.join(subCwd, "src", "index.js")));

                    assert.equal(manager.config.raw.struct.service, "service");

                    const relativeDir = std.path.relative(context.cwd, std.path.join(subContext.cwd, "src"));
                    const jsconfig = await adone.configuration.Jsconfig.load({
                        cwd
                    });
                    assert.true(jsconfig.raw.include.includes(relativeDir));
                });
            });

        });
    });
});
