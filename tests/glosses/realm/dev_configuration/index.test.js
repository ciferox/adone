import { getRealmPathFor } from "../utils";

const {
    error,
    realm: { DevConfiguration }
} = adone;

describe("realm", "dev configuration", () => {

    it("empty config", () => {
        const cfg = new DevConfiguration();
        assert.lengthOf(cfg.getUnits(), 0);
    });

    it("default 'basedir' should be equal to 'cwd'", async () => {
        const cfg = new DevConfiguration({
            cwd: __dirname
        });

        assert.equal(cfg.get("basedir"), __dirname);

        const cfg1 = await DevConfiguration.load({
            cwd: getRealmPathFor("realm1")
        });

        assert.equal(cfg1.get("basedir"), cfg1.cwd);
    });

    it("no default task", async () => {
        const cfg = new DevConfiguration({
            cwd: __dirname
        });

        assert.equal(cfg.get("defaultTask"), undefined);

        const cfg1 = await DevConfiguration.load({
            cwd: getRealmPathFor("realm2")
        });

        assert.equal(cfg1.get("defaultTask"), undefined);
    });

    it("config with empty units should be ok", async () => {
        const cfg = await DevConfiguration.load({
            cwd: getRealmPathFor("realm2")
        });

        assert.lengthOf(cfg.getUnits(), 0);
    });

    it("should throw if unit without task", () => {
        const cfg = new DevConfiguration();
        cfg.raw.units = {
            1: {
                src: "src/**/*",
                dst: "lib"
            }
        };

        assert.throws(() => cfg.getUnits(), error.NotValidException);
    });

    it("should accept default task if unit 'task' is not specified", () => {
        const cfg = new DevConfiguration();
        cfg.raw.defaultTask = "copy";
        cfg.raw.units = {
            1: {
                src: "src/**/*",
                dst: "lib"
            }
        };

        const units = cfg.getUnits();
        assert.lengthOf(units, 1);
        assert.equal(units[0].task, "copy");
    });

    describe("units", () => {
        it("simple", () => {
            const cfg = new DevConfiguration();
            cfg.raw.units = {
                1: {
                    description: "ok",
                    src: "src/**/*",
                    dst: "lib",
                    task: "task1"
                }
            };

            const units = cfg.getUnits();
            assert.sameDeepMembers(units, [
                {
                    id: "1",
                    description: "ok",
                    src: "src/**/*",
                    dst: "lib",
                    task: "task1"
                }
            ]);
        });

        it("unit without 'src' should be ignored", () => {
            const cfg = new DevConfiguration();
            cfg.raw.units = {
                1: {
                    description: "ok",
                    src: "src/**/*",
                    dst: "lib",
                    task: "task1"
                },
                2: {
                    description: "some nested units",
                    units: {
                        3: {
                            src: "src/2/**/*.js",
                            dst: "dst/2",
                            task: "task2"
                        }
                    }
                }
            };

            const units = cfg.getUnits();
            assert.sameDeepMembers(units, [
                {
                    id: "1",
                    description: "ok",
                    src: "src/**/*",
                    dst: "lib",
                    task: "task1"
                },
                {
                    id: "2.3",
                    src: "src/2/**/*.js",
                    dst: "dst/2",
                    task: "task2"
                }
            ]);
        });

        it("unit without 'src' should be ignored (with default task)", () => {
            const cfg = new DevConfiguration();
            cfg.raw.defaultTask = "default";
            cfg.raw.units = {
                1: {
                    description: "ok",
                    src: "src/**/*",
                    dst: "lib",
                    task: "task1"
                },
                2: {
                    description: "some nested units",
                    units: {
                        3: {
                            src: "src/2/**/*.js",
                            dst: "dst/2",
                            task: "task2"
                        }
                    }
                }
            };

            const units = cfg.getUnits();
            assert.sameDeepMembers(units, [
                {
                    id: "1",
                    description: "ok",
                    src: "src/**/*",
                    dst: "lib",
                    task: "task1"
                },
                {
                    id: "2.3",
                    src: "src/2/**/*.js",
                    dst: "dst/2",
                    task: "task2"
                }
            ]);
        });

        it("should globize child exclusions", () => {
            const cfg = new DevConfiguration();
            cfg.raw.units = {
                snappy: {
                    description: "Snappy, a fast compressor/decompressor",
                    task: "transpile",
                    src: "src/snappy/**/*.js",
                    dst: "lib/snappy",
                    units: {
                        native: {
                            task: "cmake",
                            src: "src/snappy/native",
                            dst: "lib/snappy/native"
                        }
                    }
                }
            };

            const units = cfg.getUnits();
            assert.sameDeepMembers(units, [
                {
                    id: "snappy",
                    description: "Snappy, a fast compressor/decompressor",
                    task: "transpile",
                    src: [
                        "src/snappy/**/*.js",
                        "!src/snappy/native/**/*"
                    ],
                    dst: "lib/snappy"
                },
                {
                    id: "snappy.native",
                    task: "cmake",
                    src: "src/snappy/native",
                    dst: "lib/snappy/native"
                }
            ]);
        });

        it("for non-glob 'src' child exclusions should not be aggregated", () => {
            const cfg = new DevConfiguration();
            cfg.raw.units = {
                snappy: {
                    description: "Snappy, a fast compressor/decompressor",
                    task: "transpile",
                    src: "src/snappy/index.js",
                    dst: "lib/snappy",
                    units: {
                        native: {
                            task: "cmake",
                            src: "src/snappy/native",
                            dst: "lib/snappy/native"
                        }
                    }
                }
            };

            const units = cfg.getUnits();
            assert.sameDeepMembers(units, [
                {
                    id: "snappy",
                    description: "Snappy, a fast compressor/decompressor",
                    task: "transpile",
                    src: "src/snappy/index.js",
                    dst: "lib/snappy"
                },
                {
                    id: "snappy.native",
                    task: "cmake",
                    src: "src/snappy/native",
                    dst: "lib/snappy/native"
                }
            ]);
        });
    });
});
