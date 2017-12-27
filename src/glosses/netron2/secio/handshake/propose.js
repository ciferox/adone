const waterfall = require("async/waterfall");

const support = require("../support");
const crypto = require("./crypto");

// step 1. Propose
// -- propose cipher suite + send pubkeys + nonce
module.exports = function propose(state, cb) {
    adone.log("1. propose - start");

    adone.log("1. propose - writing proposal");
    support.write(state, crypto.createProposal(state));

    waterfall([
        (cb) => support.read(state.shake, cb),
        (msg, cb) => {
            adone.log("1. propose - reading proposal", msg);
            crypto.identify(state, msg);
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

        adone.log("1. propose - finish");
        cb();
    });
};
