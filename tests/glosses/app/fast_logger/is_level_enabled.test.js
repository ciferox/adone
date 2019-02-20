const {
    app: { fastLogger }
} = adone;

describe("fastLogger", "is level enabled", () => {
    it("can check if current level enabled", async () => {
        const log = fastLogger({ level: "debug" });
        assert.strictEqual(true, log.isLevelEnabled("debug"));
    });

    it("can check if level enabled after level set", async () => {
        const log = fastLogger();
        assert.strictEqual(false, log.isLevelEnabled("debug"));
        log.level = "debug";
        assert.strictEqual(true, log.isLevelEnabled("debug"));
    });

    it("can check if higher level enabled", async () => {
        const log = fastLogger({ level: "debug" });
        assert.strictEqual(true, log.isLevelEnabled("error"));
    });

    it("can check if lower level is disabled", async () => {
        const log = fastLogger({ level: "error" });
        assert.strictEqual(false, log.isLevelEnabled("trace"));
    });

    it("can check if child has current level enabled", async () => {
        const log = fastLogger().child({ level: "debug" });
        assert.strictEqual(true, log.isLevelEnabled("debug"));
        assert.strictEqual(true, log.isLevelEnabled("error"));
        assert.strictEqual(false, log.isLevelEnabled("trace"));
    });

    it("can check if custom level is enabled", async () => {
        const log = fastLogger({
            customLevels: { foo: 35 },
            level: "debug"
        });
        assert.strictEqual(true, log.isLevelEnabled("foo"));
        assert.strictEqual(true, log.isLevelEnabled("error"));
        assert.strictEqual(false, log.isLevelEnabled("trace"));
    });
});
