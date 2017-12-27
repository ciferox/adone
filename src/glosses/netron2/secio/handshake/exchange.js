const waterfall = require("async/waterfall");
const support = require("../support");
const crypto = require("./crypto");


// step 2. Exchange
// -- exchange (signed) ephemeral keys. verify signatures.
module.exports = function exchange(state, cb) {
    adone.log("2. exchange - start");

    adone.log("2. exchange - writing exchange");

    const ex = crypto.createExchange(state);
    waterfall([
        (cb) => {
            support.write(state, ex);
            support.read(state.shake, cb);
        },
        (msg, cb) => {
            adone.log("2. exchange - reading exchange");
            try {
                crypto.verify(state, msg);
                cb();
            } catch (err) {
                cb(err);
            }
        },
        (cb) => {
            try {
                crypto.generateKeys(state);
                cb();
            } catch (err) {
                cb(err);
            }
        }
    ], (err) => {
        if (err) {
            return cb(err);
        }

        adone.log("2. exchange - finish");
        cb();
    });
};
