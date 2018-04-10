import { read, write } from "../support";
import { createExchange, verify, generateKeys } from "./crypto";

const {
    async: { waterfall }
} = adone;

// step 2. Exchange
// -- exchange (signed) ephemeral keys. verify signatures.
export default function (state, callback) {
    const ex = createExchange(state);
    waterfall([
        (cb) => {
            write(state, ex);
            read(state.shake, cb);
        },
        (msg, cb) => {
            try {
                verify(state, msg);
                cb();
            } catch (err) {
                cb(err);
            }
        },
        (cb) => {
            try {
                generateKeys(state);
                cb();
            } catch (err) {
                cb(err);
            }
        }
    ], (err) => {
        if (err) {
            return callback(err);
        }
        callback();
    });
}
