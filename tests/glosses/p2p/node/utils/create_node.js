const {
    p2p: { PeerInfo, PeerId }
} = adone;

const waterfall = require("async/waterfall");
const Node = require("./bundle_nodejs");

function createNode(multiaddrs, options, callback) {
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
}

function createPeerInfo(callback) {
    waterfall([
        (cb) => PeerId.create({ bits: 512 }, cb),
        (peerId, cb) => PeerInfo.create(peerId, cb)
    ], callback);
}

module.exports = createNode;
module.exports.createPeerInfo = createPeerInfo;
