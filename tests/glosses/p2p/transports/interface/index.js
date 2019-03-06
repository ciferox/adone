const dial = require("./dial_test");
const listen = require("./listen_test");

module.exports = (common) => {
    describe("transport interface", () => {
        dial(common);
        listen(common);
    });
};
