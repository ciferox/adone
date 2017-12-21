const waterfall = require("async/waterfall");
const support = require("../support");
const crypto = require("./crypto");


// step 2. Exchange
// -- exchange (signed) ephemeral keys. verify signatures.
module.exports = function exchange(state, cb) {
    adone.log("2. exchange - start");

    adone.log("2. exchange - writing exchange");
    waterfall([
        (cb) => crypto.createExchange(state, cb),
        (ex, cb) => {
            support.write(state, ex);
            support.read(state.shake, cb);
        },
        (msg, cb) => {
            adone.log("2. exchange - reading exchange");
            crypto.verify(state, msg, cb);
        },
        (cb) => crypto.generateKeys(state, cb)
    ], (err) => {
        if (err) {
            return cb(err);
        }

        adone.log("2. exchange - finish");
        cb();
    });
};
