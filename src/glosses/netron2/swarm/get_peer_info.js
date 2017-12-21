const {
    netron2: { PeerId, PeerInfo }
} = adone;

/*
 * Helper method to check the data type of peer and convert it to PeerInfo
 */
const getPeerInfo = function (peer, peerBook) {
    let p;

    // PeerInfo
    if (PeerInfo.isPeerInfo(peer)) {
        p = peer;
        // Multiaddr instance (not string)
    } else if (adone.multi.address.isMultiaddr(peer)) {
        const peerIdB58Str = peer.getPeerId();
        try {
            p = peerBook.get(peerIdB58Str);
        } catch (err) {
            p = new PeerInfo(PeerId.createFromB58String(peerIdB58Str));
        }
        p.multiaddrs.add(peer);

        // PeerId
    } else if (PeerId.isPeerId(peer)) {
        const peerIdB58Str = peer.toB58String();
        try {
            p = peerBook.get(peerIdB58Str);
        } catch (err) {
            throw new Error("Couldnt get PeerInfo");
        }
    } else {
        throw new Error("peer type not recognized");
    }

    return p;
};

module.exports = getPeerInfo;
