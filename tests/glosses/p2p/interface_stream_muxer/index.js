const baseTest = require("./base_test");
const stressTest = require("./stress_test");
const megaStressTest = require("./mega_stress_test");
const isNode = require("detect-node");

module.exports = (common) => {
    describe("interface stream muxer", () => {
        baseTest(common);
        if (isNode) {
            const closeTest = require("./close_test");
            closeTest(common);
        }
        stressTest(common);
        megaStressTest(common);
    });
};
