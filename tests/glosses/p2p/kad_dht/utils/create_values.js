const {
    async: { times, waterfall },
    multiformat: { CID, multihashingAsync },
    p2p: { crypto }
} = adone;

const createValues = function (n, callback) {
    times(n, (i, cb) => {
        const bytes = crypto.randomBytes(32);

        waterfall([
            (cb) => multihashingAsync(bytes, "sha2-256").then((result) => cb(null, result), cb),
            (h, cb) => cb(null, { cid: new CID(h), value: bytes })
        ], cb);
    }, callback);
};

module.exports = createValues;
