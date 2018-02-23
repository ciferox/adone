const waterfall = require("async/waterfall");
const each = require("async/each");
const queue = require("async/queue");
const c = require("./constants");
const utils = require("./utils");

/**
 * Add a peer to the peers to be queried.
 *
 * @param {Identity} next
 * @param {DHT} dht
 * @param {Object} run
 * @param {function(Error)} callback
 * @returns {void}
 * @private
 */
const addPeerToQuery = function (next, dht, run) {
    if (!dht._isSelf(next) && !run.peersSeen.has(next)) {
        run.peersSeen.add(next);
        run.peersToQuery.enqueue(next);
    }
};

/**
 * Execute a query on the `next` peer.
 *
 * @param {Identity} next
 * @param {Query} query
 * @param {Object} run
 * @param {function(Error)} callback
 * @returns {void}
 * @private
 */
const execQuery = function (next, query, run, callback) {
    query.query(next, (err, res) => {
        if (err) {
            run.errors.push(err);
            callback();
        } else if (res.success) {
            run.res = res;
            callback(null, true);
        } else if (res.closerPeers && res.closerPeers.length > 0) {
            each(res.closerPeers, (closer, cb) => {
                // don't add ourselves
                if (query.dht._isSelf(closer.id)) {
                    return cb();
                }
                closer = query.dht.peerBook.set(closer);
                addPeerToQuery(closer.id, query.dht, run);
                cb();
            }, callback);
        } else {
            callback();
        }
    });
};


/**
 * Use the queue from async to keep `concurrency` amount items running.
 *
 * @param {Query} query
 * @param {Object} run
 * @param {function(Error)} callback
 * @returns {void}
 */
const workerQueue = function (query, run, callback) {
    let killed = false;
    const q = queue((next, cb) => {
        query._log("queue:work");
        execQuery(next, query, run, (err, done) => {
            // Ignore after kill
            if (killed) {
                return cb();
            }
            query._log("queue:work:done", err, done);
            if (err) {
                return cb(err);
            }
            if (done) {
                q.kill();
                killed = true;
                return callback();
            }
            cb();
        });
    }, query.concurrency);

    const fill = () => {
        query._log("queue:fill");
        while (q.length() < query.concurrency &&
            run.peersToQuery.length > 0) {
            q.push(run.peersToQuery.dequeue());
        }
    };

    fill();

    // callback handling
    q.error = (err) => {
        query._log.error("queue", err);
        callback(err);
    };

    q.drain = () => {
        query._log("queue:drain");
        callback();
    };

    q.unsaturated = () => {
        query._log("queue:unsatured");
        fill();
    };

    q.buffer = 0;
};

/**
 * Query peers from closest to farthest away.
 */
class Query {
    /**
     * Create a new query.
     *
     * @param {DHT} dht - DHT instance
     * @param {Buffer} key
     * @param {function(Identity, function(Error, Object))} query - The query function to exectue
     *
     */
    constructor(dht, key, query) {
        this.dht = dht;
        this.key = key;
        this.query = query;
        this.concurrency = c.ALPHA;
        this._log = utils.logger(this.dht.peerInfo.id, `query:${key.toString()}`);
    }

    /**
     * Run this query, start with the given list of peers first.
     *
     * @param {Array<Identity>} peers
     * @param {function(Error, Object)} callback
     * @returns {void}
     */
    run(peers, callback) {
        const run = {
            peersSeen: new Set(),
            errors: [],
            peersToQuery: null
        };

        if (peers.length === 0) {
            this._log.error("Running query with no peers");
            return callback();
        }

        const q = adone.private(adone.net.p2p.dht).PeerQueue.fromKey(this.key);
        waterfall([
            (cb) => {
                run.peersToQuery = q;
                each(peers, (p, cb) => {
                    addPeerToQuery(p, this.dht, run);
                    cb();
                }, cb);
            },
            (cb) => workerQueue(this, run, cb)
        ], (err) => {
            this._log("query:done");
            if (err) {
                return callback(err);
            }

            if (run.errors.length === run.peersSeen.size) {
                return callback(run.errors[0]);
            }
            if (run.res && run.res.success) {
                run.res.finalSet = run.peersSeen;
                return callback(null, run.res);
            }

            callback(null, {
                finalSet: run.peersSeen
            });
        });
    }
}

module.exports = Query;
