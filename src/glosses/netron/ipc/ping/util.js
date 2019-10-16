const { crypto } = adone.p2p;
const constants = require("./constants");

exports = module.exports;

exports.rnd = (length) => {
    if (!length) {
        length = constants.PING_LENGTH;
    }
    return crypto.randomBytes(length);
};
