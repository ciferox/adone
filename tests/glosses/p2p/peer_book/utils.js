const {
    async: { waterfall },
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
        (cb) => PeerId.create({ bits: 1024 }).then((peerId) => cb(null, peerId), cb),
        (peerId, cb) => PeerInfo.create(peerId).then((peerInfo) => cb(null, peerInfo), cb),
        (peerInfo, cb) => {
            multiaddrs.map((ma) => peerInfo.multiaddrs.add(ma));
            cb(null, peerInfo);
        }
    ], callback);
};

module.exports = {
    createPeerInfo
};
