const timeout = require("async/timeout");
const queue = require("async/queue");

const {
    netron2: { Connection },
    stream: { pull }
} = adone;

/**
 * Queue up the amount of dials to a given peer.
 */
class DialQueue {
    /**
     * Create a new dial queue.
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
    _doWork(transport, addr, token, callback) {
        adone.log("work");
        this._dialWithTimeout(transport, addr, (err, conn) => {
            if (err) {
                adone.log("work:error");
                return callback(null, { error: err });
            }

            if (token.cancel) {
                adone.log("work:cancel");
                // clean up already done dials
                pull(pull.empty(), conn);
                // TODO: proper cleanup once the connection interface supports it
                // return conn.close(() => callback(new Error('Manual cancel'))
                return callback(null, { cancel: true });
            }

            // one is enough
            token.cancel = true;

            adone.log("work:success");

            const proxyConn = new Connection();
            proxyConn.setInnerConn(conn);
            callback(null, { multiaddr: addr, conn });
        });
    }

    /**
     * Dial the given transport, timing out with the set timeout.
     *
     * @param {SwarmTransport} transport
     * @param {Multiaddr} addr
     * @param {function(Error, Connection)} callback
     * @returns {void}
     *
     * @private
     */
    _dialWithTimeout(transport, addr, callback) {
        timeout((cb) => {
            const conn = transport.dial(addr, (err) => {
                if (err) {
                    return cb(err);
                }

                cb(null, conn);
            });
        }, this.dialTimeout)(callback);
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

module.exports = DialQueue;