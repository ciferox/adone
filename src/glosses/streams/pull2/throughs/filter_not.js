

const tester = require("../util/tester");
const filter = require("./filter");

module.exports = function filterNot(test) {
    test = tester(test);
    return filter((data) => {
        return !test(data); 
    });
};
