const {
    multiformat: { CID, multihashingAsync: multihashing },
    p2p: { crypto }
} = adone;

const times = require("async/times");
const waterfall = require("async/waterfall");

function createValues(n, callback) {
    times(n, (i, cb) => {
        const bytes = crypto.randomBytes(32);

        waterfall([
            (cb) => multihashing(bytes, "sha2-256", cb),
            (h, cb) => cb(null, { cid: new CID(h), value: bytes })
        ], cb);
    }, callback);
}

module.exports = createValues;
