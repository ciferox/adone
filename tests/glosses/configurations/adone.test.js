const {
    is,
    configuration,
    std
} = adone;

const fixture = (name) => std.path.join(__dirname, "fixtures", "adone_configs", name);

describe("configuration", "Adone", () => {
    it("invalid configuration", async () => {
        await assert.throws(async () => configuration.Adone.load({
            cwd: fixture("invalid")
        }), adone.x.NotAllowed);
    });

    describe("simple", () => {
        let config;
        let rawConfig;

        beforeEach(async () => {
            config = await configuration.Adone.load({
                cwd: fixture("simple")
            });
            rawConfig = config.raw;
        });

        it("load config", async () => {
            assert.equal(rawConfig.name, "adone");
            assert.equal(rawConfig.description, "The generalized core of 'cyber-fractal systems' infrastructure.");
            assert.equal(rawConfig.version, "0.6.70");
            assert.equal(rawConfig.author, "Adone Core Team <info@adone.io>");
            assert.true(is.plainObject(rawConfig.struct));
        });

        it.only("project entries", async () => {
            assert.includeDeepMembers(config.getEntries(), [
                {
                    id: "assets",
                    description: "Assets",
                    src: [
                        "src/**/*",
                        "!src/**/*.js",
                        "!src/glosses/schema/__/dot/*",
                        "!src/**/native/**/*"
                    ],
                    dst: "lib"
                },
                {
                    id: "code.data",
                    description: "Data generic manipulation utilites and serializers",
                    index: "glosses/data/index.js",
                    src: "src/glosses/data/**/*.js",
                    dst: "lib/glosses/data",
                    task: "adoneTranspile",
                    namespace: "data"
                },
                {
                    id: "code.data.base64",
                    description: "Implementation of BASE64 serializer",
                    index: "glosses/data/base64",
                    src: "src/glosses/data/base64.js",
                    dst: "lib/glosses/data",
                    task: "adoneTranspile",
                    namespace: "base64"
                }
            ]);
        });

        it("project entries for path", async () => {
            assert.sameDeepMembers(config.getEntries("code.templating"), [
                {
                    id: "code.templating",
                    description: "Template engines",
                    index: "glosses/templating/index.js",
                    task: "adoneTranspile",
                    src: "src/glosses/templating/**/*.js",
                    dst: "lib/glosses/templating",
                    namespace: "templating"
                },
                {
                    id: "code.templating.dot",
                    src: "src/glosses/templating/dot/*.js",
                    dst: "lib/glosses/templating/dot",
                    namespace: "dot"
                },
                {
                    id: "code.templating.nunjucks",
                    src: "src/glosses/templating/nunjucks/*.js",
                    dst: "lib/glosses/templating/nunjucks",
                    namespace: "nunjucks"
                }
            ]);
        });
    });

    describe("sub configurations", () => {
        let config;

        beforeEach(async () => {
            config = await configuration.Adone.load({
                cwd: fixture("sub_configs")
            });
        });

        it("should load all sub configurations", async () => {
            const subConfigs = config.getSubConfigs();
            assert.lengthOf(subConfigs, 2);
        });

        it("get sub configuration by name", async () => {
            const subConfig = config.getSubConfig("sub2").config;

            assert.equal(subConfig.raw.name, "another_name");
            assert.equal(subConfig.raw.description, "another_descr");
            assert.equal(subConfig.raw.version, "2.0.0");
            assert.equal(subConfig.raw.author, "noname");
        });

        it("project entries of main configuration", async () => {
            assert.sameDeepMembers(config.getEntries(), [
                {
                    id: "sub1.js",
                    task: "transpile",
                    src: "sub1/src/*",
                    dst: "sub1/dst"
                },
                {
                    id: "sub2.js",
                    task: "transpile",
                    src: "sub2/src/**/*.js",
                    dst: "sub2/lib"
                },
                {
                    id: "sub2.other",
                    src: ["!sub2/src/**/*.js", "sub2/src/**/*"],
                    dst: "sub2/lib"
                }
            ]);

            assert.sameDeepMembers(config.getEntries("sub2"), [
                {
                    id: "sub2.js",
                    task: "transpile",
                    src: "sub2/src/**/*.js",
                    dst: "sub2/lib"
                },
                {
                    id: "sub2.other",
                    src: ["!sub2/src/**/*.js", "sub2/src/**/*"],
                    dst: "sub2/lib"
                }
            ]);
        });

        it("project entries of sub configurations", async () => {
            const subConfig1 = config.getSubConfig("sub1").config;
            const subConfig2 = config.getSubConfig("sub2").config;

            assert.sameDeepMembers(subConfig1.getEntries(), [
                {
                    id: "js",
                    task: "transpile",
                    src: "src/*",
                    dst: "dst"
                }
            ]);

            assert.sameDeepMembers(subConfig2.getEntries(), [
                {
                    id: "js",
                    task: "transpile",
                    src: "src/**/*.js",
                    dst: "lib"
                },
                {
                    id: "other",
                    src: ["!src/**/*.js", "src/**/*"],
                    dst: "lib"
                }
            ]);

            assert.sameDeepMembers(subConfig2.getEntries("js"), [
                {
                    id: "js",
                    task: "transpile",
                    src: "src/**/*.js",
                    dst: "lib"
                }
            ]);
        });
    });
});
