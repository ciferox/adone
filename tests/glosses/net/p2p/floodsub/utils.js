const {
    crypto: { Identity },
    net: { p2p: { PeerInfo, secio, Core } }
} = adone;

exports.first = (map) => map.values().next().value;

exports.expectSet = (set, subs) => {
    expect(Array.from(set.values())).to.eql(subs);
};

exports.createNetCore = async (maddr) => {
    const id = Identity.create({ bits: 1024 });
    const peer = PeerInfo.create(id);
    peer.multiaddrs.add(maddr);
    const node = new Core({
        peer,
        transport: "tcp",
        muxer: "spdy",
        crypto: [secio]
    });
    await node.start();
    return node;
};
