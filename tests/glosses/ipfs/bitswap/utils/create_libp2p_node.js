const {
    p2p: { Node, PeerId, PeerInfo, KadDHT, transport: { TCP }, secio: SECIO, muxer: { mplex: MPLEX } }
} = adone;

const waterfall = require("async/waterfall");
const defaultsDeep = require("@nodeutils/defaults-deep");

class TestNode extends Node {
    constructor(_options) {
        const defaults = {
            modules: {
                transport: [
                    TCP
                ],
                streamMuxer: [
                    MPLEX
                ],
                connEncryption: [
                    SECIO
                ],
                dht: KadDHT//_options.DHT ? KadDHT : undefined
            },
            config: {
                dht: {},
                // EXPERIMENTAL: {
                //     dht: true//Boolean(_options.DHT)
                // }
            }
        };

        delete _options.DHT;
        super(defaultsDeep(_options, defaults));
    }
}

const createLibp2pNode = function (options, callback) {
    let node;

    waterfall([
        (cb) => PeerId.create({ bits: 512 }, cb),
        (id, cb) => PeerInfo.create(id, cb),
        (peerInfo, cb) => {
            peerInfo.multiaddrs.add("/ip4/0.0.0.0/tcp/0");
            options.peerInfo = peerInfo;
            node = new TestNode(options);
            node.start(cb);
        }
    ], (err) => callback(err, node));
}

exports = module.exports = createLibp2pNode;
exports.bundle = TestNode;
