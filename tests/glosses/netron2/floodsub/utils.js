const waterfall = require("async/waterfall");

const {
    netron2: { PeerId, PeerInfo, transport: { TCP }, spdy, secio, Node: LibNode }
} = adone;

class Node extends LibNode {
    constructor(peerInfo, peerBook, options) {
        options = options || {};

        const modules = {
            transport: [new TCP()],
            connection: {
                muxer: spdy,
                crypto: [secio]
            }
        };

        super(modules, peerInfo, peerBook, options);
    }
}

exports.first = (map) => map.values().next().value;

exports.expectSet = (set, subs) => {
    expect(Array.from(set.values())).to.eql(subs);
};

exports.createNode = (maddr, callback) => {
    waterfall([
        (cb) => PeerId.create({ bits: 1024 }, cb),
        (id, cb) => PeerInfo.create(id, cb),
        (peer, cb) => {
            peer.multiaddrs.add(maddr);
            cb(null, new Node(peer));
        },
        (node, cb) => node.start((err) => cb(err, node))
    ], callback);
};
