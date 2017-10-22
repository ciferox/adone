describe("shani", "util", "__", "util", "getConfig", () => {
    const {
        __: { util: {
            getConfig,
            defaultConfig
        } }
    } = adone.shani.util;

    describe(".getConfig", () => {
        it("gets copy of default config", () => {
            const config = getConfig();

            assert.notEqual(config, defaultConfig);
            assert.equal(config.injectIntoThis, defaultConfig.injectIntoThis);
            assert.equal(config.injectInto, defaultConfig.injectInto);
            assert.equal(config.properties, defaultConfig.properties);
            assert.equal(config.useFakeTimers, defaultConfig.useFakeTimers);
            assert.equal(config.useFakeServer, defaultConfig.useFakeServer);
        });

        it("should override specified properties", () => {
            const config = getConfig({
                properties: ["stub", "mock"],
                useFakeServer: false
            });

            assert.notEqual(config, defaultConfig);
            assert.equal(config.injectIntoThis, defaultConfig.injectIntoThis);
            assert.equal(config.injectInto, defaultConfig.injectInto);
            assert.deepEqual(config.properties, ["stub", "mock"]);
            assert.equal(config.useFakeTimers, defaultConfig.useFakeTimers);
            assert.isFalse(config.useFakeServer);
        });
    });
});
