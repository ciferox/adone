const {
    is,
    crypto: { Identity },
    net: { p2p: { PeerInfo } },
    multi
} = adone;

const {
    protocol
} = adone.private(adone.net.p2p.circuit);

export default function (sw) {
    /**
     * Get b58 string from multiaddr or peerinfo
     *
     * @param {Multiaddr|PeerInfo} peer
     * @return {*}
     */
    const getB58String = function (peer) {
        let b58Id = null;
        if (is.multiAddress(peer)) {
            const relayMa = multi.address.create(peer);
            b58Id = relayMa.getPeerId();
        } else if (is.p2pPeerInfo(peer)) {
            b58Id = peer.id.asBase58();
        }
        return b58Id;
    };
    /**
     * Helper to make a peer info from a multiaddrs
     *
     * @param {Multiaddr|PeerInfo|Identity} ma
     * @param {Switch} sw
     * @return {PeerInfo}
     * @private
     */
    // TODO: this is ripped off of libp2p, should probably be a generally available util function
    const peerInfoFromMa = function (peer) {
        let p;
        // PeerInfo
        if (is.p2pPeerInfo(peer)) {
            p = peer;
            // Multiaddr instance (not string)
        } else if (is.multiAddress(peer)) {
            const peerIdB58Str = peer.getPeerId();
            try {
                p = sw._peerBook.get(peerIdB58Str);
            } catch (err) {
                p = new PeerInfo(Identity.createFromBase58(peerIdB58Str));
            }
            p.multiaddrs.add(peer);
            // Identity
        } else if (is.identity(peer)) {
            const peerIdB58Str = peer.asBase58();
            p = sw._peerBook.has(peerIdB58Str) ? sw._peerBook.get(peerIdB58Str) : peer;
        }
        return p;
    };
    /**
     * Checks if peer has an existing connection
     *
     * @param {String} peerId
     * @param {Switch} sw
     * @return {Boolean}
     */
    const isPeerConnected = function (peerId) {
        return sw.muxedConns[peerId] || sw.conns[peerId];
    };
    /**
     * Write a response
     *
     * @param {StreamHandler} streamHandler
     * @param {CircuitRelay.Status} status
     * @returns {*}
     */
    const writeResponse = function (streamHandler, status) {
        streamHandler.write(protocol.CircuitRelay.encode({
            type: protocol.CircuitRelay.Type.STATUS,
            code: status
        }));
    };
    /**
     * Validate incomming HOP/STOP message
     *
     * @param {CircuitRelay} msg
     * @param {StreamHandler} streamHandler
     * @param {CircuitRelay.Type} type
     * @returns {*}
     * @param {Function} cb
     */
    const validateAddrs = function (msg, streamHandler, type) {
        try {
            msg.dstPeer.addrs.forEach((addr) => {
                return multi.address.create(addr);
            });
        } catch (err) {
            writeResponse(streamHandler, type === protocol.CircuitRelay.Type.HOP
                ? protocol.CircuitRelay.Status.HOP_DST_MULTIADDR_INVALID
                : protocol.CircuitRelay.Status.STOP_DST_MULTIADDR_INVALID);
            throw err;
        }
        try {
            msg.srcPeer.addrs.forEach((addr) => {
                return multi.address.create(addr);
            });
        } catch (err) {
            writeResponse(streamHandler, type === protocol.CircuitRelay.Type.HOP
                ? protocol.CircuitRelay.Status.HOP_SRC_MULTIADDR_INVALID
                : protocol.CircuitRelay.Status.STOP_SRC_MULTIADDR_INVALID);
            throw err;
        }
    };
    return {
        getB58String,
        peerInfoFromMa,
        isPeerConnected,
        validateAddrs,
        writeResponse
    };
}
