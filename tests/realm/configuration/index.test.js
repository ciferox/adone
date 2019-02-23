import structs from "./fixtures/structs";
import namespaces from "./fixtures/namespaces";
import interfaceSuite from "../../glosses/configurations/interface";

const {
    is,
    realm: { Configuration },
    std
} = adone;

describe("realm", "Configuration", () => {
    const fixturePath = (...args) => std.path.join(__dirname, "fixtures", ...args);
    const fixtureDir = new adone.fs.Directory(fixturePath());

    afterEach(async () => {
        await fixtureDir.unlink({
            relPath: "realm"
        });
    });

    it("minimum possible configuration", async () => {
        await FS.createStructure(fixtureDir, [
            ["realm", [
                [".adone", [
                    ["config.json", "{}"]
                ]]
            ]]
        ]);

        const conf = await Configuration.load({
            cwd: fixturePath("realm")
        });

        assert.deepEqual(conf.raw, {});
    });

    describe("structure", () => {
        for (const s of structs) {
            // eslint-disable-next-line no-loop-func
            it(s.name, () => {
                const conf = new Configuration();
                conf.raw = s.config;

                assert.sameDeepMembers(conf.getEntries(s.query), s.expectedEntries);
            });
        }

        it("entry with only 'task' should have thrown", async () => {
            await FS.createStructure(fixtureDir, [
                ["proj", [
                    [".adone", [
                        ["config.json", JSON.stringify({
                            struct: {
                                lib: {
                                    task: "copy"
                                }
                            }
                        })]
                    ]]
                ]]
            ]);

            const conf = await Configuration.load({
                cwd: fixturePath("proj")
            });

            await assert.throws(async () => conf.getEntries(), adone.error.NotValidException);
        });

        it("multiple root namespaces is not allowed", async () => {
            const conf = await Configuration.load({
                cwd: fixturePath("multiple_root_namespaces")
            });
            await assert.throws(async () => conf.getNamespace(), adone.error.NotAllowedException);
        });
    });

    describe("sub configurations", () => {
        let config;

        beforeEach(async () => {
            config = await Configuration.load({
                cwd: fixturePath("sub_configs")
            });
        });

        it("should load all sub configurations", async () => {
            const subConfigs = config.getSubConfigs();
            assert.lengthOf(subConfigs, 2);
        });

        it("get sub configuration by name", async () => {
            const subConfig = config.getSubConfig("sub2").config;

            assert.object(subConfig.raw.struct);
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

    describe("core realm configuration", () => {
        let config;
        let rawConfig;

        beforeEach(async () => {
            config = await Configuration.load({
                cwd: std.path.join(adone.ROOT_PATH)
            });
            rawConfig = config.raw;
        });

        it("load config", async () => {
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
                        "!src/**/*.wat",
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
                    id: "bin",
                    description: "Adone CLI",
                    src: "src/cli/adone.js",
                    dst: "bin",
                    task: "adoneTranspileExe"
                },
                {
                    id: "lib.index",
                    description: "Main index file",
                    src: "src/index.js",
                    dst: "lib",
                    task: "transpile"
                }
            ]);
        });

        it("project entries for path", async () => {
            assert.sameDeepMembers(config.getEntries("lib.app"), [
                {
                    id: "lib.app",
                    description: "Application framework",
                    src: [
                        "src/glosses/app/**/*.js",
                        "!src/glosses/app/logger/**/*.js",
                        "!src/glosses/app/lockfile.js",
                        "!src/glosses/app/report/**/*.js",
                        "!src/glosses/app/report/native/**/*"
                    ],
                    dst: "lib/glosses/app",
                    task: "transpile",
                    namespace: "app",
                    index: "index.js"
                },
                {
                    id: "lib.app.logger",
                    description: "Application logger",
                    src: "src/glosses/app/logger/**/*.js",
                    dst: "lib/glosses/app/logger",
                    task: "transpile",
                    namespace: "logger",
                    index: "index.js"
                },
                {
                    id: "lib.app.lockfile",
                    description: "Inter-process file locking implementation",
                    src: "src/glosses/app/lockfile.js",
                    dst: "lib/glosses/app",
                    task: "transpile",
                    namespace: "lockfile",
                    index: "index.js"
                },
                {
                    id: "lib.app.report",
                    description: "Delivers a human-readable diagnostic summary, written to file",
                    namespace: "report",
                    src: [
                        "src/glosses/app/report/**/*.js",
                        "!src/glosses/app/report/native/**/*"
                    ],
                    dst: "lib/glosses/app/report",
                    task: "transpile",
                    native: {
                        src: "src/glosses/app/report/native",
                        dst: "lib/glosses/app/report/native"
                    },
                    index: "index.js"
                }
            ]);
        });
    });

    describe("getNamespace()", () => {
        for (const ns of namespaces) {
            // eslint-disable-next-line no-loop-func
            it(ns.name, () => {
                const conf = new Configuration();
                conf.raw = ns.config;

                assert.deepEqual(conf.getNamespace(), ns.expected);
            });
        }
    });

    interfaceSuite(Configuration);
});
