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
    const id = PeerId.create({ bits: 1024 });
    const peer = PeerInfo.create(id);
    peer.multiaddrs.add(maddr);
    const node = new Node(peer);
    node.start((err) => callback(err, node));
};
