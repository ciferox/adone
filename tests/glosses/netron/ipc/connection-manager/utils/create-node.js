const TCP = require("libp2p-tcp");
const Multiplex = require("libp2p-mplex");
const waterfall = require("async/waterfall");
const PeerInfo = require("peer-info");
const PeerId = require("peer-id");

const ConnManager = require(adone.getPath("src/glosses/netron/ipc/connection-manager"));

class Node extends adone.netron.ipc.Node {
    constructor(peerInfo) {
        const modules = {
            transport: [TCP],
            streamMuxer: [Multiplex]
        };

        super({
            peerInfo,
            modules,
            config: {
            }
        });
    }
}

function createLibp2pNode(options, callback) {
    let node;

    waterfall([
        (cb) => PeerId.create({ bits: 1024 }, cb),
        (id, cb) => PeerInfo.create(id, cb),
        (peerInfo, cb) => {
            peerInfo.multiaddrs.add("/ip4/127.0.0.1/tcp/0");
            node = new Node(peerInfo);
            // Replace the connection manager so we use source code instead of dep code
            node.connectionManager = new ConnManager(node, options);
            node.start(cb);
        }
    ], (err) => callback(err, node));
}

exports = module.exports = createLibp2pNode;
exports.bundle = Node;
