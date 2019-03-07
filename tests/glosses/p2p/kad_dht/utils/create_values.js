const times = require("async/times");
const waterfall = require("async/waterfall");

const {
    multiformat: { CID, multihashingAsync },
    p2p: { crypto }
} = adone;

const createValues = function (n, callback) {
    times(n, (i, cb) => {
        const bytes = crypto.randomBytes(32);

        waterfall([
            (cb) => multihashingAsync(bytes, "sha2-256", cb),
            (h, cb) => cb(null, { cid: new CID(h), value: bytes })
        ], cb);
    }, callback);
};

module.exports = createValues;
