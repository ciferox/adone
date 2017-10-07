const {
    is,
    project: { Configuration },
    std
} = adone;

const fixture = (name) => std.path.join(__dirname, "fixtures", name);

describe("project", "configuration", () => {
    describe("simple configuration", () => {
        let config;

        beforeEach(async () => {
            config = await Configuration.load({
                cwd: fixture("simple")
            });
        });

        it("load config", async () => {
            assert.equal(config.name, "sample");
            assert.equal(config.description, "descr");
            assert.equal(config.version, "1.0.0");
            assert.equal(config.author, "unknown");
            assert.equal(config.type, "app");
            assert.isTrue(is.plainObject(config.structure));
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
            assert.sameMembers([...config.getSubConfigs().keys()], ["sub1", "sub2"]);
        });

        it("sub configuration should inherit parent properties", async () => {
            const subConfig = config.getSubConfigs().get("sub1");

            assert.equal(subConfig.name, "sample");
            assert.equal(subConfig.description, "descr");
            assert.equal(subConfig.version, "1.0.0");
            assert.equal(subConfig.author, "unknown");
        });

        it("sub configuration should redefine parent properties", async () => {
            const subConfig = config.getSubConfigs().get("sub2");

            assert.equal(subConfig.name, "another_name");
            assert.equal(subConfig.description, "another_descr");
            assert.equal(subConfig.version, "2.0.0");
            assert.equal(subConfig.author, "noname");
        });

        it("project entries", async () => {
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

            assert.sameDeepMembers(subConfig2.getProjectEntries("src.js"), [
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

            assert.sameDeepMembers(config.getProjectEntries("sub2"), [
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
    });
});
