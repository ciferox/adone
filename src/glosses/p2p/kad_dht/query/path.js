const PeerQueue = require("../peer-queue");
const utils = require("../utils");

const {
    is
} = adone;

// TODO: Temporary until parallel dial in Switch have a proper
// timeout. Requires async/await refactor of transports and
// dial abort logic. This gives us 30s to complete the `queryFunc`.
// This should help reduce the high end call times of queries
const QUERY_FUNC_TIMEOUT = 30e3;

/**
 * Manages a single Path through the DHT.
 */
class Path {
    /**
     * Creates a Path.
     *
     * @param {Run} run
     * @param {queryFunc} queryFunc
     */
    constructor(run, queryFunc) {
        this.run = run;
        this.queryFunc = utils.withTimeout(queryFunc, QUERY_FUNC_TIMEOUT);
        if (!this.queryFunc) {
            throw new Error("Path requires a `queryFn` to be specified");
        }
        if (!is.function(this.queryFunc)) {
            throw new Error(`Path expected \`queryFn\` to be a function. Got ${typeof this.queryFunc}`);
        }

        /**
         * @type {Array<PeerId>}
         */
        this.initialPeers = [];

        /**
         * @type {PeerQueue}
         */
        this.peersToQuery = null;
    }

    /**
     * Add a peer to the set of peers that are used to intialize the path.
     *
     * @param {PeerId} peer
     */
    addInitialPeer(peer) {
        this.initialPeers.push(peer);
    }

    /**
     * Execute the path.
     *
     * @returns {Promise}
     *
     */
    async execute() {
        // Create a queue of peers ordered by distance from the key
        const queue = await PeerQueue.fromKey(this.run.query.key);
        // Add initial peers to the queue
        this.peersToQuery = queue;
        await Promise.all(this.initialPeers.map((peer) => this.addPeerToQuery(peer)));
        await this.run.workerQueue(this);
    }

    /**
     * Add a peer to the peers to be queried.
     *
     * @param {PeerId} peer
     * @returns {Promise<void>}
     */
    async addPeerToQuery(peer) {
        // Don't add self
        if (this.run.query.dht._isSelf(peer)) {
            return;
        }

        // The paths must be disjoint, meaning that no two paths in the Query may
        // traverse the same peer
        if (this.run.peersSeen.has(peer)) {
            return;
        }

        await this.peersToQuery.enqueue(peer);
    }
}

module.exports = Path;
