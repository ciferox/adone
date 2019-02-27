const constants = require('./constants')

const {
    p2p: { crypto }
} = adone;

exports = module.exports

exports.rnd = (length) => {
    if (!length) {
        length = constants.PING_LENGTH
    }
    return crypto.randomBytes(length)
}
