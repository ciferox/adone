const {
    crypto: { Identity },
    net: { p2p: { PeerInfo, secio, Core } }
} = adone;

export const first = (map) => map.values().next().value;

export const expectSet = (set, subs) => {
    expect(Array.from(set.values())).to.eql(subs);
};

export const createNetCore = async (maddr) => {
    const peer = PeerInfo.create(Identity.create({ bits: 1024 }));
    peer.multiaddrs.add(maddr);
    const netCore = new Core({
        peer,
        transport: "tcp",
        muxer: "spdy",
        crypto: [secio]
    });
    await netCore.start();
    return netCore;
};
