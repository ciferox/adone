const {
    is,
    data: { base58 }
} = adone;

const getB58Str = (peer) => {
    let b58Str;

    if (is.string(peer)) {
        b58Str = peer;
    } else if (is.buffer(peer)) {
        b58Str = base58.encode(peer).toString();
    } else if (is.peerId(peer)) {
        b58Str = peer.asBase58();
    } else if (is.peerInfo(peer)) {
        b58Str = peer.id.asBase58();
    } else {
        throw new Error("not valid PeerId or PeerInfo, or B58Str");
    }

    return b58Str;
};

export default class PeerBook {
    constructor() {
        this._peers = new Map();
    }

    /**
     * Checks if peer exists.
     * 
     * @param {AbstractPeer|PeerId|PeerInfo|String|Buffer} peer
     */
    has(peer) {
        return this._peers.has(getB58Str(peer));
    }

    /**
     * Stores a peerInfo, if already exist, throws adone.x.Exists exception.
     *
     * @param {PeerInfo} peerInfo
     */
    set(peerInfo, replace) {
        const base58Str = peerInfo.id.asBase58();
        const localPeerInfo = this._peers.get(base58Str);

        // insert if doesn't exist or replace if replace flag is true
        if (!localPeerInfo || replace) {
            this._peers.set(base58Str, peerInfo);
            return peerInfo;
        }

        // peerInfo.replace merges by default if none to replace are passed
        peerInfo.multiaddrs.forEach((ma) => localPeerInfo.multiaddrs.add(ma));

        // pass active connection state
        const ma = peerInfo.isConnected();
        if (ma) {
            localPeerInfo.connect(ma);
        }

        // pass known protocols
        peerInfo.protocols.forEach((p) => localPeerInfo.protocols.add(p));

        if (!localPeerInfo.id.privKey && peerInfo.id.privKey) {
            localPeerInfo.id.privKey = peerInfo.id.privKey;
        }

        if (!localPeerInfo.id.pubKey && peerInfo.id.pubKey) {
            localPeerInfo.id.pubKey = peerInfo.id.pubKey;
        }

        return localPeerInfo;
    }

    /**
     * Get the info to the given PeerId, PeerInfo or b58Str id
     *
     * @param {PeerId} peer
     * @returns {PeerInfo}
     */
    get(peer) {
        const base58 = getB58Str(peer);
        const peerInfo = this._peers.get(base58);
        if (is.undefined(peerInfo)) {
            throw new Error(`PeerInfo '${base58}' not found`);
        }

        return peerInfo;
    }

    getAll() {
        return this._peers;
    }

    getAllAsArray() {
        return [...this._peers.values()];
    }

    getMultiaddrs(peer) {
        const info = this.get(peer);
        return info.multiaddrs.toArray();
    }

    delete(peer) {
        this._peers.delete(getB58Str(peer));
    }
}
