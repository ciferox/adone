const {
    async: { waterfall },
    p2p: { ConnectionManager, Node, secio: SECIO, transport: { TCP }, PeerId, PeerInfo, muxer: { mplex } }
} = adone;

class TestNode extends Node {
    constructor(peerInfo) {
        const modules = {
            transport: [TCP],
            streamMuxer: [mplex],
            connEncryption: [SECIO]
        };

        super({
            peerInfo,
            modules,
            config: {
                peerDiscovery: {
                    autoDial: false
                }
            }
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
            node = new TestNode(peerInfo);
            // Replace the connection manager so we use source code instead of dep code
            node.connectionManager = new ConnectionManager(node, options);
            node.start(cb);
        }
    ], (err) => callback(err, node));
};

exports = module.exports = createNode;
exports.bundle = TestNode;
