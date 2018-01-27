const waterfall = require("async/waterfall");

const support = require("../support");
const crypto = require("./crypto");

// step 1. Propose
// -- propose cipher suite + send pubkeys + nonce
module.exports = function propose(state, cb) {
    support.write(state, crypto.createProposal(state));

    waterfall([
        (cb) => support.read(state.shake, cb),
        (msg, cb) => {
            try {
                crypto.identify(state, msg);
            } catch (err) {
                return cb(err);
            }
            cb();
        },
        (cb) => {
            try {
                crypto.selectProtocols(state);
                cb();
            } catch (err) {
                return cb(err);
            }
        }
    ], (err) => {
        if (err) {
            return cb(err);
        }

        cb();
    });
};
