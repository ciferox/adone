const {
    netron2: { PeerId, PeerInfo, transport: { TCP }, spdy, secio, NetCore }
} = adone;

class TestNetCore extends NetCore {
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

exports.createNetCore = async (maddr) => {
    const id = PeerId.create({ bits: 1024 });
    const peer = PeerInfo.create(id);
    peer.multiaddrs.add(maddr);
    const node = new TestNetCore(peer);
    await node.start();
    return node;
};
