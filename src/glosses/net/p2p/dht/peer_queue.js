const utils = require("./utils");

const {
    collection: { Heap },
    util: { xorDistance }
} = adone;

/**
 * PeerQueue is a heap that sorts its entries (PeerIds) by their
 * xor distance to the inital provided key.
 */
class PeerQueue {
    /**
     * Create from a given peer id.
     *
     * @param {PeerId} id
     * @param {function(Error, PeerQueue)} callback
     * @returns {void}
     */
    static fromPeerId(id) {
        const key = utils.convertPeerId(id);
        return new PeerQueue(key);
    }

    /**
     * Create from a given buffer.
     *
     * @param {Buffer} key
     * @param {function(Error, PeerQueue)} callback
     * @returns {void}
     */
    static fromKey(key) {
        return new PeerQueue(utils.convertBuffer(key));
    }

    /**
     * Create a new PeerQueue.
     *
     * @param {Buffer} from - The sha2-256 encoded peer id
     */
    constructor(from) {
        this.from = from;
        this.heap = new Heap(utils.xorCompare);
    }

    /**
     * Add a new PeerId to the queue.
     *
     * @param {PeerId} id
     * @param {function(Error)} callback
     * @returns {void}
     */
    enqueue(id) {
        const key = utils.convertPeerId(id);
        const el = {
            id,
            distance: xorDistance.create(this.from, key)
        };

        this.heap.push(el);
    }

    /**
     * Returns the closest peer to the `from` peer.
     *
     * @returns {PeerId}
     */
    dequeue() {
        const el = this.heap.pop();
        return el.id;
    }

    get length() {
        return this.heap.size();
    }
}

module.exports = PeerQueue;
