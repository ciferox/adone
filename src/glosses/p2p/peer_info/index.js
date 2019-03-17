const { ensureMultiaddr } = require("./utils");
const MultiaddrSet = require("./multiaddr-set");

const {
    error,
    is,
    p2p: { PeerId }
} = adone;

// Peer represents a peer on the IPFS network
export default class PeerInfo {
    constructor(peerId) {
        if (!peerId) {
            throw new error.InvalidArgumentException("Missing peerId. Use Peer.create(cb) to create one");
        }

        this.id = peerId;
        this.multiaddrs = new MultiaddrSet();

        /**
         * Stores protocols this peers supports
         *
         * @type {Set<string>}
         */
        this.protocols = new Set();

        this._connectedMultiaddr = undefined;
    }

    // only stores the current multiaddr being used
    connect(ma) {
        ma = ensureMultiaddr(ma);
        if (!this.multiaddrs.has(ma) && ma.toString() !== `/ipfs/${this.id.toB58String()}`) {
            throw new Error("can't be connected to missing multiaddr from set");
        }
        this._connectedMultiaddr = ma;
    }

    disconnect() {
        this._connectedMultiaddr = undefined;
    }

    isConnected() {
        return this._connectedMultiaddr;
    }

    static create(peerId, callback) {
        if (is.function(peerId)) {
            callback = peerId;
            peerId = null;

            PeerId.create((err, id) => {
                if (err) {
                    return callback(err);
                }

                callback(null, new PeerInfo(id));
            });
            return;
        }

        // Already a PeerId instance
        if (is.function(peerId.toJSON)) {
            callback(null, new PeerInfo(peerId));
        } else {
            PeerId.createFromJSON(peerId, (err, id) => callback(err, new PeerInfo(id)));
        }
    }

    static isPeerInfo(peerInfo) {
        return Boolean(typeof peerInfo === "object" && peerInfo.id && peerInfo.multiaddrs);
    }
}
