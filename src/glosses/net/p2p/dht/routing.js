const utils = require("./utils");

const {
    net: { p2p: { KBucket } }
} = adone;

/**
 * A wrapper around `k-bucket`, to provide easy store and
 * retrival for peers.
 */
class RoutingTable {
    /**
     * @param {PeerId} self
     * @param {number} kBucketSize
     */
    constructor(self, kBucketSize) {
        this.self = self;
        this._onPing = this._onPing.bind(this);

        const selfKey = utils.convertPeerId(self);
        this.kb = new KBucket({
            localNodeId: selfKey,
            numberOfNodesPerKBucket: kBucketSize,
            numberOfNodesToPing: 1
        });

        this.kb.on("ping", this._onPing);
    }

    // -- Private Methods

    /**
     * Called on the `ping` event from `k-bucket`.
     * Currently this just removes the oldest contact from
     * the list, without acutally pinging the individual peers.
     * This is the same as go does, but should probably
     * be upgraded to actually ping the individual peers.
     *
     * @param {Array<Object>} oldContacts
     * @param {Object} newContact
     * @returns {undefined}
     * @private
     */
    _onPing(oldContacts, newContact) {
        // just use the first one (k-bucket sorts from oldest to newest)
        const oldest = oldContacts[0];

        // remove the oldest one
        this.kb.remove(oldest.id);

        // add the new one
        this.kb.add(newContact);
    }

    // -- Public Interface

    /**
     * Amount of currently stored peers.
     *
     * @type {number}
     */
    get size() {
        return this.kb.count();
    }

    /**
     * Find a specific peer by id.
     *
     * @param {PeerId} peer
     * @returns {void}
     */
    find(peer) {
        const key = utils.convertPeerId(peer);
        const closest = this.closestPeer(key);

        if (closest && closest.isEqual(peer)) {
            return closest;
        }
    }

    /**
     * Retrieve the closest peers to the given key.
     *
     * @param {Buffer} key
     * @param {number} count
     * @returns {PeerId|undefined}
     */
    closestPeer(key, count) {
        const res = this.closestPeers(key, 1);
        if (res.length > 0) {
            return res[0];
        }
    }

    /**
     * Retrieve the `count`-closest peers to the given key.
     *
     * @param {Buffer} key
     * @param {number} count
     * @returns {Array<PeerId>}
     */
    closestPeers(key, count) {
        return this.kb.closest(key, count).map((p) => p.peer);
    }

    /**
     * Add or update the routing table with the given peer.
     *
     * @param {PeerId} peer
     * @returns {undefined}
     */
    add(peer) {
        const id = utils.convertPeerId(peer);
        this.kb.add({ id, peer });
    }

    /**
     * Remove a given peer from the table.
     *
     * @param {PeerId} peer
     * @returns {undefined}
     */
    remove(peer) {
        const id = utils.convertPeerId(peer);
        this.kb.remove(id);
    }
}

module.exports = RoutingTable;