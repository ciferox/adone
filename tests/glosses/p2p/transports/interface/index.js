const dial = require("./dial");
const listen = require("./listen");

module.exports = (common) => {
    describe("interface-transport", () => {
        dial(common);
        listen(common);
    });
};
