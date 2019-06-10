const randomBytes = require("iso-random-stream/src/random");

module.exports = function (number) {
    if (!number || !adone.is.number(number)) {
        throw new Error("first argument must be a Number bigger than 0");
    }
    return randomBytes(number);
};
