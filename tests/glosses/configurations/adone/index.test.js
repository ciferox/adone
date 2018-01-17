import structs from "./fixtures/structs";
import namespaces from "./fixtures/namespaces";

const {
    is,
    configuration,
    std
} = adone;

describe("configuration", "Adone", () => {
    const fixture = (name = "") => std.path.join(__dirname, "fixtures", name);
    const fixtureDir = new adone.fs.Directory(fixture());

    afterEach(async () => {
        await fixtureDir.unlink({
            relPath: "proj"
        });
    });

    it("minimum possible configuration", async () => {
        await FS.createStructure(fixtureDir, [
            ["proj", [
                ["adone.json", "{}"]
            ]]
        ]);

        const conf = await configuration.Adone.load({
            cwd: fixture("proj")
        });

        assert.deepEqual(conf.raw, {});
    });

    describe("structure", () => {
        for (const s of structs) {
            it(s.name, () => {
                const conf = new configuration.Adone();
                conf.raw = s.config;

                assert.sameDeepMembers(conf.getEntries(s.query), s.expectedEntries);
            });
        }

        it("entry with only 'task' should have thrown", async () => {
            await FS.createStructure(fixtureDir, [
                ["proj", [
                    ["adone.json", JSON.stringify({
                        struct: {
                            lib: {
                                task: "copy"
                            }
                        }
                    })]
                ]]
            ]);

            const conf = await configuration.Adone.load({
                cwd: fixture("proj")
            });

            await assert.throws(async () => conf.getEntries(), adone.x.NotValid);
        });

        it("multiple root namespaces is not allowed", async () => {
            const conf = await configuration.Adone.load({
                cwd: fixture("multiple_root_namespaces")
            });
            await assert.throws(async () => conf.getNamespace(), adone.x.NotAllowed);
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
                    src: "src/*",
                    dst: "dst",
                    id: "js",
                    task: "transpile"
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

    describe("adone configuration", () => {
        let config;
        let rawConfig;

        beforeEach(async () => {
            config = await configuration.Adone.load({
                cwd: std.path.join(adone.rootPath)
            });
            rawConfig = config.raw;
        });

        it("load config", async () => {
            assert.equal(rawConfig.name, "adone");
            assert.equal(rawConfig.description, "The generalized core of 'cyber-fractal systems' infrastructure.");
            assert.equal(rawConfig.version, "0.6.71");
            assert.equal(rawConfig.author, "Adone Core Team <info@adone.io>");
            assert.true(is.plainObject(rawConfig.struct));
        });

        it("project entries", async () => {
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
                    dst: "lib",
                    dstClean: [
                        "lib/**/*",
                        "!lib/**/*.js",
                        "!lib/**/*.map",
                        "!lib/**/*.node"
                    ]
                },
                {
                    id: "lib.data",
                    description: "Data generic manipulation utilites and serializers",
                    src: [
                        "src/glosses/data/**/*.js",
                        "!src/glosses/data/base64.js",
                        "!src/glosses/data/bson/**/*.js",
                        "!src/glosses/data/bson/native/**/*",
                        "!src/glosses/data/json/**/*.js",
                        "!src/glosses/data/json5.js",
                        "!src/glosses/data/mpak.js",
                        "!src/glosses/data/yaml/**/*.js",
                        "!src/glosses/data/base58.js",
                        "!src/glosses/data/varint.js",
                        "!src/glosses/data/varint_signed.js",
                        "!src/glosses/data/protobuf/**/*.js"
                    ],
                    dst: "lib/glosses/data",
                    dstClean: "lib/glosses/data/**/*",
                    task: "transpile",
                    namespace: "data",
                    index: "index.js"
                },
                {
                    id: "lib.data.base64",
                    description: "Implementation of BASE64 serializer",
                    index: "glosses/data/base64",
                    src: "src/glosses/data/base64.js",
                    dst: "lib/glosses/data",
                    task: "transpile",
                    namespace: "base64"
                }
            ]);
        });

        it("project entries for path", async () => {
            assert.sameDeepMembers(config.getEntries("lib.templating"), [
                {
                    id: "lib.templating",
                    description: "Template engines",
                    index: "index.js",
                    task: "adoneTranspile",
                    src: [
                        "src/glosses/templating/**/*.js",
                        "!src/glosses/templating/dot/**/*.js",
                        "!src/glosses/templating/nunjucks/**/*.js"
                    ],
                    dst: "lib/glosses/templating",
                    dstClean: "lib/glosses/templating/**/*",
                    namespace: "templating"
                },
                {
                    id: "lib.templating.dot",
                    description: "Implementation of DoT template engine",
                    src: "src/glosses/templating/dot/**/*.js",
                    dst: "lib/glosses/templating/dot",
                    task: "adoneTranspile",
                    namespace: "dot",
                    index: "index.js"
                },
                {
                    id: "lib.templating.nunjucks",
                    description: "Implementation of Nunjucks template engine",
                    src: "src/glosses/templating/nunjucks/**/*.js",
                    dst: "lib/glosses/templating/nunjucks",
                    task: "adoneTranspile",
                    namespace: "nunjucks",
                    index: "index.js"
                }
            ]);
        });
    });

    describe.only("#getNamespace()", () => {
        for (const ns of namespaces) {
            it(ns.name, () => {
                const conf = new configuration.Adone();
                conf.raw = ns.config;

                assert.deepEqual(conf.getNamespace(), ns.expected);
            });
        }
    });
});
