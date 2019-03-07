const waterfall = require("async/waterfall");

const {
    is,
    p2p: { PeerId, PeerInfo }
} = adone;

const createPeerInfo = function (multiaddrs, options, callback) {
    if (is.function(options)) {
        callback = options;
        options = {};
    }

    if (!is.array(multiaddrs)) {
        multiaddrs = [multiaddrs];
    }

    waterfall([
        (cb) => PeerId.create({ bits: 1024 }, cb),
        (peerId, cb) => PeerInfo.create(peerId, cb),
        (peerInfo, cb) => {
            multiaddrs.map((ma) => peerInfo.multiaddrs.add(ma));
            cb(null, peerInfo);
        }
    ], callback);
};

module.exports = {
    createPeerInfo
};
