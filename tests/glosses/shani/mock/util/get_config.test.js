/* global it describe assert */

import getConfig from "adone/glosses/shani/mock/util/get-config";
import defaultConfig from "adone/glosses/shani/mock/util/default-config";

describe("core/util/getConfig", function () {
    describe(".getConfig", function () {
        it("gets copy of default config", function () {
            const config = getConfig();

            assert.deepEqual(config, defaultConfig);
            assert.equal(config.injectIntoThis, defaultConfig.injectIntoThis);
            assert.equal(config.injectInto, defaultConfig.injectInto);
            assert.deepEqual(config.properties, defaultConfig.properties);
        });

        it("should override specified properties", function () {
            const config = getConfig({
                properties: ["stub", "mock"],
                useFakeServer: false
            });

            assert.notDeepEqual(config, defaultConfig);
            assert.equal(config.injectIntoThis, defaultConfig.injectIntoThis);
            assert.equal(config.injectInto, defaultConfig.injectInto);
            assert.deepEqual(config.properties, ["stub", "mock"]);
        });
    });
});
