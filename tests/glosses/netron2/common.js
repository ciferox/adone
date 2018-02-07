const {
    net: { p2p: { PeerInfo } },
    netron2: { Netron }
} = adone;

export const createNetron = (peerId, addrs) => {
    const peerInfo = PeerInfo.create(peerId);
    if (addrs) {
        peerInfo.multiaddrs.add(addrs);
    }
    const netron = new Netron(peerInfo);
    netron.createNetCore("default");
    return netron;
};
