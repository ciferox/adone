describe("isLevelEnabled()", () => {
    it("can check if current level enabled", async () => {
        const log = adone.logger({ level: "debug" });
        assert.equal(true, log.isLevelEnabled("debug"));
    });
    
    it("can check if level enabled after level set", async () => {
        const log = adone.logger();
        assert.equal(false, log.isLevelEnabled("debug"));
        log.level = "debug";
        assert.equal(true, log.isLevelEnabled("debug"));
    });
    
    it("can check if higher level enabled", async () => {
        const log = adone.logger({ level: "debug" });
        assert.equal(true, log.isLevelEnabled("error"));
    });
    
    it("can check if lower level is disabled", async () => {
        const log = adone.logger({ level: "error" });
        assert.equal(false, log.isLevelEnabled("trace"));
    });
    
    it("can check if child has current level enabled", async () => {
        const log = adone.logger().child({ level: "debug" });
        assert.equal(true, log.isLevelEnabled("debug"));
        assert.equal(true, log.isLevelEnabled("error"));
        assert.equal(false, log.isLevelEnabled("trace"));
    });
    
    it("can check if custom level is enabled", async () => {
        const log = adone.logger({
            customLevels: { foo: 35 },
            level: "debug"
        });
        assert.equal(true, log.isLevelEnabled("foo"));
        assert.equal(true, log.isLevelEnabled("error"));
        assert.equal(false, log.isLevelEnabled("trace"));
    });    
});
