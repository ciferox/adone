

const reduce = require("./reduce");

module.exports = function concat(cb) {
    return reduce((a, b) => {
        return a + b;
    }, "", cb);
};
