const {
    is,
    fs,
    project: { Manager },
    std,
    text,
    x,
    util
} = adone;

const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
const fixture = (...args) => std.path.join(FIXTURES_PATH, ...args);

describe("project", () => {
    describe("generator", () => {
        const paths = [];

        const getPathFor = (...args) => {
            const path = fixture(...args);
            paths.push(path);
            return path;
        };

        const randomName = (prefix = "test") => `${prefix}${text.random(4)}_${text.random(5)}_${text.random(6)}`;

        afterEach(async () => {
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
            assert.instanceOf(err, x.Exists);
        });

        it("should have thrown if name of project is not specified", async () => {
            const name = randomName();
            const cwd = getPathFor(name);
            const manager = new Manager({ cwd });
            const err = await assert.throws(async () => manager.createProject({
                description: "test1"
            }));
            assert.instanceOf(err, x.InvalidArgument);
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
                    assert.isTrue(is.subsystem(instance));
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
                    assert.isTrue(is.subsystem(instance));
                    assert.isTrue(is.omnitronService(instance));
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

                    assert.isTrue(await fs.exists(filePath));
                    if (!["application", "cli.application"].includes(type.name)) {
                        const moduleExport = adone.require(filePath);
                        assert.isTrue(is.class(moduleExport.default));
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
                        assert.instanceOf(err, adone.x.NotValid);
                    } else {
                        await manager.createFile({
                            type: type.name,
                            cwd: projectPath
                        });

                        assert.isTrue(await fs.exists(filePath));
                        const moduleExport = adone.require(filePath);
                        assert.isTrue(is.class(moduleExport.default));
                        assert.equal(moduleExport.default.name, "_default");
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
                    assert.instanceOf(err, adone.x.Exists);
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

                    assert.isTrue(await fs.exists(filePath));
                    if (!["application", "cli.application"].includes(type.name)) {
                        const moduleExport = adone.require(filePath);
                        assert.isTrue(is.class(moduleExport.default));
                        assert.equal(moduleExport.default.name, text.capitalize(text.toCamelCase(name)));
                        await type.check(moduleExport);
                    }
                });
            });
        }

        describe("projects", () => {
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
                it(`default project (skipGit=${skipGit}, skipJsconfig=${skipJsconfig}, skipEslint=${skipEslint})`, async () => {
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
                    const context = await manager.createProject(projectConfig);

                    assert.deepEqual(util.pick(context.config.adone.raw, ["name", "description", "version", "author"]), util.pick(projectConfig, ["name", "description", "version", "author"]));
                    assert.sameMembers(await fs.readdir(cwd), files);
                    if (!skipGit) {
                        assert.isTrue(await fs.is.directory(std.path.join(cwd, ".git")));
                    }

                    if (is.configuration(context.config.npm)) {
                        assert.deepEqual(util.pick(context.config.npm.raw, ["name", "description", "version", "author"]), util.pick(projectConfig, ["name", "description", "version", "author"]));
                    }

                    // if (!skipEslint) {
                    //     assert.isTrue(is.configuration(context.config.eslint));
                    // }

                    if (!skipJsconfig) {
                        assert.isTrue(is.configuration(context.config.jsconfig));
                        assert.isFalse(is.propertyOwned(context.config.jsconfig.raw, "include"));
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
                    const context = await manager.createProject(projectConfig);

                    if (["cli.command", "omnitron.service"].includes(type)) {
                        assert.deepEqual(util.pick(context.config.adone.raw, ["name", "description", "version", "author", "type", "main"]), {
                            ...projectConfig,
                            main: "lib"
                        });
                    } else {
                        assert.deepEqual(util.pick(context.config.adone.raw, ["name", "description", "version", "author", "type", "bin", "main"]), {
                            ...projectConfig,
                            main: "lib",
                            bin: "bin/app.js"
                        });
                    }

                    assert.sameMembers(await fs.readdir(cwd), ["adone.json", ".git", ".gitignore", ".eslintrc.js", "package.json", "package-lock.json", "node_modules", "jsconfig.json", "src"]);
                    assert.isTrue(await fs.is.directory(std.path.join(cwd, ".git")));
                    assert.isTrue(await fs.is.directory(std.path.join(cwd, "node_modules")));
                    assert.isTrue(await fs.is.directory(std.path.join(cwd, "src")));
                    if (["cli.command", "omnitron.service"].includes(type)) {
                        assert.isTrue(await fs.exists(std.path.join(cwd, "src", "index.js")));
                    } else {
                        assert.isTrue(await fs.exists(std.path.join(cwd, "src", "app.js")));
                    }

                    if (is.configuration(context.config.npm)) {
                        assert.deepEqual(util.pick(context.config.npm.raw, ["name", "description", "version", "author"]), util.pick(projectConfig, ["name", "description", "version", "author"]));
                    }

                    // assert.isTrue(is.configuration(context.config.eslint));

                    assert.isTrue(is.configuration(context.config.jsconfig));
                    assert.isTrue(is.array(context.config.jsconfig.raw.include));
                });
            }

            it("sub project", async () => {
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
                const subContext = await manager.createSubProject({
                    name: "jit",
                    dirName: "service",
                    type: "omnitron.service"
                });

                const subCwd = std.path.join(cwd, "service");
                assert.sameMembers(await fs.readdir(subCwd), ["adone.json", "src"]);
                assert.isTrue(await fs.is.directory(std.path.join(subCwd, "src")));
                assert.isTrue(await fs.exists(std.path.join(subCwd, "src", "index.js")));

                assert.equal(manager.config.raw.structure.service, "service");
                
                const relativeDir = std.path.relative(context.project.cwd, std.path.join(subContext.project.cwd, "src"));                
                await context.config.jsconfig.load();
                assert.isTrue(context.config.jsconfig.raw.include.includes(relativeDir));
            });
        });
    });
});
