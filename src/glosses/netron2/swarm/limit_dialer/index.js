const map = require("async/map");
import DialQueue from "./queue";

const {
    util: { once }
} = adone;

/**
 * Track dials per peer and limited them.
 */
export default class LimitDialer {
    /**
     * Create a new dialer.
     *
     * @param {number} perPeerLimit
     * @param {number} dialTimeout
     */
    constructor(perPeerLimit, dialTimeout) {
        this.perPeerLimit = perPeerLimit;
        this.dialTimeout = dialTimeout;
        this.queues = new Map();
    }

    /**
     * Dial a list of multiaddrs on the given transport.
     *
     * @param {PeerId} peer
     * @param {SwarmTransport} transport
     * @param {Array<Multiaddr>} addrs
     * @returns {void}
     */
    async dialMany(peer, transport, addrs) {
        // we use a token to track if we want to cancel following dials
        const token = { cancel: false };

        const promises = [];
        for (const m of addrs) {
            promises.push(this.dialSingle(peer, transport, m, token));
        }

        const results = await Promise.all(promises);
        const success = results.filter((res) => res.conn);
        if (success.length > 0) {
            return success[0];
        }

        const error = new Error("Failed to connect any provided address");
        error.errors = results.filter((res) => res.error).map((res) => res.error);
        throw error;
    }

    /**
     * Dial a single multiaddr on the given transport.
     *
     * @param {PeerId} peer
     * @param {SwarmTransport} transport
     * @param {Multiaddr} addr
     * @param {CancelToken} token
     */
    dialSingle(peer, transport, addr, token) {
        const ps = peer.asBase58();
        let q;
        if (this.queues.has(ps)) {
            q = this.queues.get(ps);
        } else {
            q = new DialQueue(this.perPeerLimit, this.dialTimeout);
            this.queues.set(ps, q);
        }

        return new Promise((resolve, reject) => {
            q.push(transport, addr, token, (err, result) => err ? reject(err) : resolve(result));
        });
    }
}
