const {
    is,
    multi,
    net: { p2p: { PeerId, PeerInfo } }
} = adone;

/**
 * Helper method to check the data type of peer and convert it to PeerInfo
 */
const getPeerInfo = function (peer, peerBook) {
    let p;

    // PeerInfo
    if (is.p2pPeerInfo(peer)) {
        p = peer;
        // Multiaddr instance (not string)
    } else if (adone.multi.address.isMultiaddr(peer) || is.string(peer)) {
        if (is.string(peer)) {
            peer = multi.address.create(peer);
        }
        const peerIdB58Str = peer.getPeerId();
        try {
            p = peerBook.get(peerIdB58Str);
        } catch (err) {
            p = new PeerInfo(PeerId.createFromBase58(peerIdB58Str));
        }
        p.multiaddrs.add(peer);

        // PeerId
    } else if (is.p2pPeerId(peer)) {
        const peerIdB58Str = peer.asBase58();
        try {
            p = peerBook.get(peerIdB58Str);
        } catch (err) {
            // return this.peerRouting.findPeer(peer, callback);
            throw new Error("Couldnt get PeerInfo");
        }
    } else {
        throw new Error("peer type not recognized");
    }

    return p;
};

module.exports = getPeerInfo;
