const times = require("async/times");
const multihashing = require("multihashing-async");
const waterfall = require("async/waterfall");
const CID = require("cids");

const {
    p2p: { crypto }
} = adone;

const createValues = function (n, callback) {
    times(n, (i, cb) => {
        const bytes = crypto.randomBytes(32);

        waterfall([
            (cb) => multihashing(bytes, "sha2-256", cb),
            (h, cb) => cb(null, { cid: new CID(h), value: bytes })
        ], cb);
    }, callback);
}

module.exports = createValues;
