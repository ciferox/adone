import { read, write } from "../support";
import { createProposal, identify, selectProtocols } from "./crypto";

const {
    async: { waterfall }
} = adone;

// step 1. Propose
// -- propose cipher suite + send pubkeys + nonce
export default function (state, callback) {
    write(state, createProposal(state));

    waterfall([
        (cb) => read(state.shake, cb),
        (msg, cb) => {
            try {
                identify(state, msg);
            } catch (err) {
                return cb(err);
            }
            cb();
        },
        (cb) => {
            try {
                selectProtocols(state);
                cb();
            } catch (err) {
                return cb(err);
            }
        }
    ], (err) => {
        if (err) {
            return callback(err);
        }
        callback();
    });
}
