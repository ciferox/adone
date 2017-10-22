const {
    is,
    project: { Configuration },
    std
} = adone;

const fixture = (name) => std.path.join(__dirname, "fixtures", name);

describe("project", "configuration", () => {
    describe("simple configuration", () => {
        let config;
        let rawConfig;

        beforeEach(async () => {
            config = await Configuration.load({
                cwd: fixture("simple")
            });
            rawConfig = config.raw;
        });

        it("load config", async () => {
            assert.equal(rawConfig.name, "sample");
            assert.equal(rawConfig.description, "descr");
            assert.equal(rawConfig.version, "1.0.0");
            assert.equal(rawConfig.author, "unknown");
            assert.equal(rawConfig.type, "app");
            assert.isTrue(is.plainObject(rawConfig.structure));
        });

        it("project entries", async () => {
            assert.sameDeepMembers(config.getProjectEntries(), [
                {
                    $id: "src",
                    $task: "transpile",
                    $src: "src/*",
                    $dst: "dst"
                }
            ]);
        });
    });

    describe("sub configurations", () => {
        let config;

        beforeEach(async () => {
            config = await Configuration.load({
                cwd: fixture("sub_configs")
            });
        });

        it("should load all sub configurations", async () => {
            const subConfigs = config.getSubConfigs();
            assert.lengthOf(subConfigs, 2);
        });

        it("sub configuration should inherit parent properties", async () => {
            const subConfig = config.getSubConfig("sub1");

            assert.equal(subConfig.raw.name, "sample");
            assert.equal(subConfig.raw.description, "descr");
            assert.equal(subConfig.raw.version, "1.0.0");
            assert.equal(subConfig.raw.author, "unknown");
        });

        it("sub configuration should redefine parent properties", async () => {
            const subConfig = config.getSubConfig("sub2");

            assert.equal(subConfig.raw.name, "another_name");
            assert.equal(subConfig.raw.description, "another_descr");
            assert.equal(subConfig.raw.version, "2.0.0");
            assert.equal(subConfig.raw.author, "noname");
        });

        it("project entries (relative)", async () => {
            const subConfig1 = config.getSubConfig("sub1");
            const subConfig2 = config.getSubConfig("sub2");

            assert.sameDeepMembers(subConfig1.getProjectEntries(), [
                {
                    $id: "src",
                    $task: "transpile",
                    $src: "sub1/src/*",
                    $dst: "sub1/dst"
                }
            ]);

            assert.sameDeepMembers(subConfig2.getProjectEntries(), [
                {
                    $id: "src.js",
                    $task: "transpile",
                    $src: "sub2/src/**/*.js",
                    $dst: "sub2/lib"
                },
                {
                    $id: "src.other",
                    $src: ["!sub2/src/**/*.js", "sub2/src/**/*"],
                    $dst: "sub2/lib"
                }
            ]);

            assert.sameDeepMembers(subConfig2.getProjectEntries({ path: "src.js" }), [
                {
                    $id: "src.js",
                    $task: "transpile",
                    $src: "sub2/src/**/*.js",
                    $dst: "sub2/lib"
                }
            ]);

            assert.sameDeepMembers(config.getProjectEntries(), [
                {
                    $id: "sub1.src",
                    $task: "transpile",
                    $src: "sub1/src/*",
                    $dst: "sub1/dst"
                },
                {
                    $id: "sub2.src.js",
                    $task: "transpile",
                    $src: "sub2/src/**/*.js",
                    $dst: "sub2/lib"
                },
                {
                    $id: "sub2.src.other",
                    $src: ["!sub2/src/**/*.js", "sub2/src/**/*"],
                    $dst: "sub2/lib"
                }
            ]);

            assert.sameDeepMembers(config.getProjectEntries({ path: "sub2" }), [
                {
                    $id: "sub2.src.js",
                    $task: "transpile",
                    $src: "sub2/src/**/*.js",
                    $dst: "sub2/lib"
                },
                {
                    $id: "sub2.src.other",
                    $src: ["!sub2/src/**/*.js", "sub2/src/**/*"],
                    $dst: "sub2/lib"
                }
            ]);
        });

        it("project entries (original)", async () => {
            const subConfig1 = config.getSubConfig("sub1", "origFull");
            const subConfig2 = config.getSubConfig("sub2", "origFull");

            assert.sameDeepMembers(subConfig1.getProjectEntries(), [
                {
                    $id: "src",
                    $task: "transpile",
                    $src: "src/*",
                    $dst: "dst"
                }
            ]);

            assert.sameDeepMembers(subConfig2.getProjectEntries(), [
                {
                    $id: "src.js",
                    $task: "transpile",
                    $src: "src/**/*.js",
                    $dst: "lib"
                },
                {
                    $id: "src.other",
                    $src: ["!src/**/*.js", "src/**/*"],
                    $dst: "lib"
                }
            ]);

            assert.sameDeepMembers(subConfig2.getProjectEntries({ path: "src.js" }), [
                {
                    $id: "src.js",
                    $task: "transpile",
                    $src: "src/**/*.js",
                    $dst: "lib"
                }
            ]);

            assert.sameDeepMembers(config.getProjectEntries({ type: "origFull" }), [
                {
                    $id: "src",
                    $task: "transpile",
                    $src: "src/*",
                    $dst: "dst"
                },
                {
                    $id: "src.js",
                    $task: "transpile",
                    $src: "src/**/*.js",
                    $dst: "lib"
                },
                {
                    $id: "src.other",
                    $src: ["!src/**/*.js", "src/**/*"],
                    $dst: "lib"
                }
            ]);

            assert.sameDeepMembers(config.getProjectEntries({ path: "sub2", type: "origFull" }), [
                {
                    $id: "src.js",
                    $task: "transpile",
                    $src: "src/**/*.js",
                    $dst: "lib"
                },
                {
                    $id: "src.other",
                    $src: ["!src/**/*.js", "src/**/*"],
                    $dst: "lib"
                }
            ]);
        });
    });
});
