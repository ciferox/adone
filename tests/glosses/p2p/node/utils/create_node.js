const Node = require("./bundle_nodejs");

const {
    async: { waterfall },
    is,
    p2p: { PeerId, PeerInfo }
} = adone;

const createPeerInfo = function (callback) {
    waterfall([
        (cb) => PeerId.create({ bits: 512 }, cb),
        (peerId, cb) => PeerInfo.create(peerId, cb)
    ], callback);
};

const createNode = function (multiaddrs, options, callback) {
    if (is.function(options)) {
        callback = options;
        options = {};
    }

    options = options || {};

    if (!is.array(multiaddrs)) {
        multiaddrs = [multiaddrs];
    }

    waterfall([
        (cb) => createPeerInfo(cb),
        (peerInfo, cb) => {
            multiaddrs.map((ma) => peerInfo.multiaddrs.add(ma));
            options.peerInfo = peerInfo;
            cb(null, new Node(options));
        }
    ], callback);
};

module.exports = createNode;
module.exports.createPeerInfo = createPeerInfo;
