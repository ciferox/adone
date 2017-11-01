const {
    is,
    fs,
    project: { Manager, Configuration },
    std,
    text,
    x,
    util
} = adone;

const FIXTURES_PATH = std.path.join(__dirname, "fixtures");
const fixture = (...args) => std.path.join(FIXTURES_PATH, ...args);

describe("project", "manager", () => {
    describe("initialization", () => {
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
            const path = getPathFor(name);
            await fs.mkdir(path);
            await fs.writeFile(std.path.join(path, "some_file"), "abc");

            const manager = new Manager(path);
            const err = await assert.throws(async () => manager.create({
                name: "test1"
            }));
            assert.instanceOf(err, x.Exists);
        });

        it("should have thrown if name of project is not specified", async () => {
            const name = randomName();
            const path = getPathFor(name);
            const manager = new Manager(path);
            const err = await assert.throws(async () => manager.create({
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
                name: "cliApplication",
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

                    const manager = new Manager(FIXTURES_PATH);
                    await manager.generateFile({
                        type: type.name,
                        name,
                        cwd: FIXTURES_PATH
                    });

                    assert.isTrue(await fs.exists(filePath));
                    if (!["application", "cliApplication"].includes(type.name)) {
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

                    const manager = new Manager(projectPath);
                    if (["application", "cliApplication"].includes(type.name)) {
                        const err = await assert.throws(async () => manager.generateFile({
                            type: type.name,
                            cwd: projectPath
                        }));
                        assert.instanceOf(err, adone.x.NotValid);
                    } else {
                        await manager.generateFile({
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

                    const manager = new Manager(FIXTURES_PATH);
                    const err = await assert.throws(async () => manager.generateFile({
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

                    const manager = new Manager(FIXTURES_PATH);
                    await manager.generateFile({
                        type: type.name,
                        name,
                        cwd: FIXTURES_PATH,
                        rewriteFile: true
                    });

                    assert.isTrue(await fs.exists(filePath));
                    if (!["application", "cliApplication"].includes(type.name)) {
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
                    skipJsconfig: true,
                    skipGit: true,
                    skipEslint: true,
                    files: ["adone.json"]
                },
                {
                    skipJsconfig: true,
                    skipGit: false,
                    skipEslint: true,
                    files: ["adone.json", ".git", ".gitignore"]
                },
                {
                    skipJsconfig: true,
                    skipGit: false,
                    skipEslint: false,
                    files: ["adone.json", ".git", ".gitignore", ".eslintrc.js", "package.json", "package-lock.json", "node_modules"]
                },
                {
                    skipJsconfig: false,
                    skipGit: false,
                    skipEslint: false,
                    files: ["adone.json", ".git", ".gitignore", ".eslintrc.js", "package.json", "package-lock.json", "node_modules", "jsconfig.json"]
                }
            ];

            for (const { skipGit, skipJsconfig, skipEslint, files } of defaultProjects) {
                it(`default project (skipGit=${skipGit}, skipJsconfig=${skipJsconfig}, skipEslint=${skipEslint})`, async () => {
                    const name = randomName();
                    const description = "project description";
                    const path = getPathFor(name);
                    await fs.mkdir(path);

                    const manager = new Manager(path);
                    await manager.create({
                        name,
                        description,
                        skipJsconfig,
                        skipEslint,
                        skipGit
                    });

                    const adoneConf = await Configuration.load({
                        cwd: path
                    });

                    assert.equal(adoneConf.raw.name, name);
                    assert.equal(adoneConf.raw.description, description);
                    assert.sameMembers(await fs.readdir(path), files);
                    if (!skipGit) {
                        assert.isTrue(await fs.is.directory(std.path.join(path, ".git")));
                    }
                });
            }

            for (const type of ["application", "cli.application", "cli.command", "omnitron.service"]) {
                it(`${type} project`, async () => {
                    const name = `project_${text.random(8)}`;
                    const path = getPathFor(name);
                    await fs.mkdir(path);

                    const manager = new Manager(path);
                    const projectConfig = {
                        name,
                        description: "project description",
                        version: "1.0.0",
                        author: "Adone Core Team",
                        type
                    };
                    await manager.create(projectConfig);

                    const adoneConf = await Configuration.load({
                        cwd: path
                    });

                    if (["cli.command", "omnitron.service"].includes(type)) {
                        assert.deepEqual(util.pick(adoneConf.raw, ["name", "description", "version", "author", "type", "main"]), {
                            ...projectConfig,
                            main: "lib"
                        });
                    } else {
                        assert.deepEqual(util.pick(adoneConf.raw, ["name", "description", "version", "author", "type", "bin", "main"]), {
                            ...projectConfig,
                            main: "lib",
                            bin: "bin/app.js"
                        });
                    }
                    
                    assert.sameMembers(await fs.readdir(path), ["adone.json", ".git", ".gitignore", ".eslintrc.js", "package.json", "package-lock.json", "node_modules", "jsconfig.json", "src"]);
                    assert.isTrue(await fs.is.directory(std.path.join(path, ".git")));
                    assert.isTrue(await fs.is.directory(std.path.join(path, "node_modules")));
                    assert.isTrue(await fs.is.directory(std.path.join(path, "src")));
                    if (["cli.command", "omnitron.service"].includes(type)) {
                        assert.isTrue(await fs.exists(std.path.join(path, "src", "index.js")));
                    } else {
                        assert.isTrue(await fs.exists(std.path.join(path, "src", "app.js")));
                    }
                });
            }
        });
    });
});
