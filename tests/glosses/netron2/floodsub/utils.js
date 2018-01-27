const {
    netron2: { PeerId, PeerInfo, secio, NetCore }
} = adone;

exports.first = (map) => map.values().next().value;

exports.expectSet = (set, subs) => {
    expect(Array.from(set.values())).to.eql(subs);
};

exports.createNetCore = async (maddr) => {
    const id = PeerId.create({ bits: 1024 });
    const peer = PeerInfo.create(id);
    peer.multiaddrs.add(maddr);
    const node = new NetCore({
        peer,
        transport: "tcp",
        muxer: "spdy",
        crypto: [secio]
    });
    await node.start();
    return node;
};
