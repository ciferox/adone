import schemes from "./schemes";
import interfaceSuite from "../../configurations/interface";

const {
    is,
    realm: { Configuration },
    std
} = adone;

describe("realm", "Configuration", () => {
    const fixturePath = (...args) => std.path.join(__dirname, "fixtures", ...args);
    const fixtureDir = new adone.fs.Directory(fixturePath());

    afterEach(async () => {
        await fixtureDir.unlink();
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

    describe("scheme", () => {
        for (const s of schemes) {
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
                            scheme: {
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
            assert.isTrue(is.plainObject(rawConfig.scheme));
        });

        it("project entries", async () => {
            assert.includeDeepMembers(config.getEntries(), [
                {
                    id: "assets",
                    description: "All assets",
                    index: "index.js",
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
                    id: "app",
                    description: "ADONE cli utility",
                    src: "src/app/adone.js",
                    dst: "bin",
                    index: "index.js",
                    task: "transpileExe"
                },
                {
                    id: "index",
                    description: "ADONE index file",
                    src: "src/index.js",
                    dst: "lib",
                    index: "index.js",
                    task: "transpile"
                }
            ]);
        });

        it("project entries for path", async () => {
            assert.sameDeepMembers(config.getEntries("app"), [
                {
                    id: "app",
                    description: "ADONE cli utility",
                    src: "src/app/adone.js",
                    index: "index.js",
                    dst: "bin",
                    task: "transpileExe"
                }
            ]);
        });
    });

    interfaceSuite(Configuration);
});
