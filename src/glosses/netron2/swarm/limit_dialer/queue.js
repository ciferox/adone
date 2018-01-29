const queue = require("async/queue");

const {
    stream: { pull }
} = adone;

/**
 * Queue up the amount of dials to a given peer.
 */
export default class DialQueue {
    /**
     * Create a new connect queue.
     *
     * @param {number} limit
     * @param {number} dialTimeout
     */
    constructor(limit, dialTimeout) {
        this.dialTimeout = dialTimeout;

        this.queue = queue((task, cb) => {
            this._doWork(task.transport, task.addr, task.token, cb);
        }, limit);
    }

    /**
     * The actual work done by the queue.
     *
     * @param {SwarmTransport} transport
     * @param {Multiaddr} addr
     * @param {CancelToken} token
     * @param {function(Error, Connection)} callback
     * @returns {void}
     * @private
     */
    async _doWork(transport, addr, token, callback) {
        try {
            const p = transport.connect(addr);
            const conn = await adone.promise.timeout(p, this.dialTimeout);
            if (token.cancel) {
                // clean up already done dials
                pull(pull.empty(), conn);
                // TODO: proper cleanup once the connection interface supports it
                // return conn.close(() => callback(new Error('Manual cancel'))
                return callback(null, { cancel: true });
            }

            // one is enough
            token.cancel = true;

            callback(null, { multiaddr: addr, conn });
        } catch (err) {
            return callback(null, { error: err });
        }
    }

    /**
     * Add new work to the queue.
     *
     * @param {SwarmTransport} transport
     * @param {Multiaddr} addr
     * @param {CancelToken} token
     * @param {function(Error, Connection)} callback
     * @returns {void}
     */
    push(transport, addr, token, callback) {
        this.queue.push({ transport, addr, token }, callback);
    }
}
