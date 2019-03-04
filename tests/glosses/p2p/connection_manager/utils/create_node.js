const waterfall = require("async/waterfall");

const {
    p2p: { Node, secio: SECIO, TCP, PeerId, PeerInfo, multiplex }
} = adone;

class TestNode extends Node {
    constructor(peerInfo, options) {
        options = options || {};

        const modules = {
            transport: [new TCP()],
            connection: {
                muxer: multiplex,
                crypto: SECIO
            }
        };

        super(modules, peerInfo, null, options.DHT || {});
    }
}

const createLibp2pNode = function (options, callback) {
    let node;

    waterfall([
        (cb) => PeerId.create({ bits: 1024 }, cb),
        (id, cb) => PeerInfo.create(id, cb),
        (peerInfo, cb) => {
            peerInfo.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
            node = new TestNode(peerInfo, options);
            node.start(cb);
        }
    ], (err) => callback(err, node));
};

exports = module.exports = createLibp2pNode;
exports.bundle = TestNode;
