const baseTest = require("./base");
const stressTest = require("./stress");
const megaStressTest = require("./mega_stress");

module.exports = (common) => {
    describe("interface", () => {
        baseTest(common);
        if (adone.is.nodejs) {
            const closeTest = require("./close");
            closeTest(common);
        }
        stressTest(common);
        megaStressTest(common);
    });
};
