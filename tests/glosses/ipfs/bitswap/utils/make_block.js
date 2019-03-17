const {
    ipfs: { Block },
    multiformat: { CID, multihashingAsync }
} = adone;

const uuid = require("uuid/v4");

module.exports = (callback) => {
    const data = Buffer.from(`hello world ${uuid()}`);

    multihashingAsync(data, "sha2-256", (err, hash) => {
        if (err) {
            return callback(err);
        }
        callback(null, new Block(data, new CID(hash)));
    });
};
