const {
    async: { waterfall },
    p2p: { PeerId, PeerInfo }
} = adone;

const Node = require("./nodejs_bundle");

exports.createNode = (callback) => {
    waterfall([
        (cb) => PeerId.create({ bits: 1024 }, cb),
        (id, cb) => PeerInfo.create(id, cb),
        (peerInfo, cb) => {
            cb(null, new Node({ peerInfo }));
        },
        (node, cb) => node.start((err) => cb(err, node))
    ], callback);
};
