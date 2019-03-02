/**
 * Test suite for adone-centric configurations (like adone.json, cli.json, omnitron.json)
 * 
 * Adone-centric configuration is a configuration that placed at '<REALM_ROOT>/configs' directory.
 */

const {
    is,
    std
} = adone;

export default (ConfigurationClass) => {
    describe("configuration interface", () => {
        describe("static properties", () => {
            it("configName", () => {
                assert.isTrue(is.string(ConfigurationClass.configName));
            });

            it("default configuration", () => {
                assert.isTrue(is.plainObject(ConfigurationClass.default));
            });

            it("load()", () => {
                assert.isTrue(is.function(ConfigurationClass.load));
            });
        });

        describe("interface", () => {
            let config;

            beforeEach(() => {
                config = new ConfigurationClass();
            });

            it("getCwd()", () => {
                assert.isFunction(config.getCwd);
                assert.strictEqual(config.getCwd(), process.cwd());
            });
            
            it("getPath()", () => {
                assert.isFunction(config.getPath);
                assert.strictEqual(config.getPath(), std.path.resolve(ConfigurationClass.configName));
            });
            
            it("load()", () => {
                assert.isFunction(config.load);
                assert.lengthOf(config.load, 0);
            });

            it("save()", () => {
                assert.isFunction(config.save);
                assert.lengthOf(config.save, 0);
            });
        });
    });
};
