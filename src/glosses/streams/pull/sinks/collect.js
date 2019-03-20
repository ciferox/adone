

const reduce = require("./reduce");

module.exports = function collect(cb) {
    return reduce((arr, item) => {
        arr.push(item);
        return arr;
    }, [], cb);
};
