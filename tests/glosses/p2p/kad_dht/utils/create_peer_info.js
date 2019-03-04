const times = require("async/times");

const {
    p2p: { PeerId, PeerInfo }
} = adone;

// Creates multiple PeerInfos
const createPeerInfo = function (n, callback) {
    times(n, (i, cb) => PeerId.create({ bits: 512 }, cb), (err, ids) => {
        if (err) {
            return callback(err);
        }
        callback(null, ids.map((i) => new PeerInfo(i)));
    });
};

module.exports = createPeerInfo;
