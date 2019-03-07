const waterfall = require("async/waterfall");

const {
    p2p: { Node, KadDHT, secio: SECIO, transport: { TCP }, PeerId, PeerInfo, muxer: { mplex } }
} = adone;

class TestNode extends Node {
    constructor(options) {
        options = options || {};

        const modules = {
            transport: [TCP],
            streamMuxer: [mplex],
            connEncryption: [SECIO],
            dht: KadDHT
        };

        super({
            ...options,
            modules
        });
    }
}

const createNode = function (options, callback) {
    let node;

    waterfall([
        (cb) => PeerId.create({ bits: 1024 }, cb),
        (id, cb) => PeerInfo.create(id, cb),
        (peerInfo, cb) => {
            peerInfo.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
            node = new TestNode({
                ...options,
                peerInfo
            });
            node.start(cb);
        }
    ], (err) => callback(err, node));
};

exports = module.exports = createNode;
exports.bundle = TestNode;
