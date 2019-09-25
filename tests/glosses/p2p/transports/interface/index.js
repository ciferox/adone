const dial = require("./dial");
const listen = require("./listen");
const filter = require("./filter");

module.exports = (common) => {
    describe("interface-transport", () => {
        dial(common);
        listen(common);
        filter(common);
    });
};

module.exports.AbortError = require("./errors").AbortError;
module.exports.Adapter = require("./adapter");
