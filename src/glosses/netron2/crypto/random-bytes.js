const rsa = require("./keys/rsa");

const {
    is
} = adone;

const randomBytes = function (number) {
    if (!number || !is.number(number)) {
        throw new Error("first argument must be a Number bigger than 0");
    }

    return rsa.getRandomValues(new Uint8Array(number));
};

module.exports = randomBytes;
