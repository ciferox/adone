const times = require("async/times");
const waterfall = require("async/waterfall");
const timeout = require("async/timeout");
const errors = require("./errors");
const c = require("./constants");

const {
    assert,
    is,
    multi,
    crypto: { Identity },
    std
} = adone;

class RandomWalk {
    constructor(kadDHT) {
        assert(kadDHT, "Random Walk needs an instance of the Kademlia DHT");
        this._running = false;
        this._kadDHT = kadDHT;
    }

    /**
     * Start the Random Walk process. This means running a number of queries
     * every interval requesting random data. This is done to keep the dht
     * healthy over time.
     *
     * @param {number} [queries=1] - how many queries to run per period
     * @param {number} [period=300000] - how often to run the the random-walk process, in milliseconds (5min)
     * @param {number} [maxTimeout=10000] - how long to wait for the the random-walk query to run, in milliseconds (10s)
     * @returns {void}
     */
    start(queries, period, maxTimeout) {
        if (is.nil(queries)) {
            queries = 1;
        }
        if (is.nil(period)) {
            period = 5 * c.minute;
        }
        if (is.nil(maxTimeout)) {
            maxTimeout = 10 * c.second;
        }
        // Don't run twice
        if (this._running) {
            return;
        }

        this._running = setInterval(
            () => this._walk(queries, maxTimeout),
            period
        );
    }

    /**
     * Stop the random-walk process.
     *
     * @returns {void}
     */
    stop() {
        if (this._running) {
            clearInterval(this._running);
        }
    }

    /**
     * Do the random walk work.
     *
     * @param {number} queries
     * @param {number} maxTimeout
     * @returns {void}
     *
     * @private
     */
    _walk(queries, maxTimeout) {
        this._kadDHT._log("random-walk:start");

        times(queries, (i, cb) => {
            waterfall([
                (cb) => timeout((cb) => {
                    this._query(this._randomPeerId(), cb);
                }, maxTimeout)(cb)
            ], (err) => {
                if (err) {
                    return this._kadDHT._log.error("random-walk:error", err);
                }

                this._kadDHT._log("random-walk:done");
            });
        });
    }

    /**
     * The query run during a random walk request.
     *
     * @param {PeerId} id
     * @param {function(Error)} callback
     * @returns {void}
     *
     * @private
     */
    _query(id, callback) {
        this._kadDHT.findPeer(id, (err, peer) => {
            if (err instanceof errors.NotFoundError) {
                // expected case, we asked for random stuff after all
                return callback();
            }
            if (err) {
                return callback(err);
            }
            this._kadDHT._log("random-walk:query:found", err, peer);

            // wait what, there was something found? Lucky day!
            callback(new Error(`random-walk: ACTUALLY FOUND PEER: ${peer}, ${id.asBase58()}`));
        });
    }

    /**
     * Generate a random peer id for random-walk purposes.
     *
     * @returns {crypto.Identity}
     *
     * @private
     */
    _randomPeerId() {
        return new Identity(multi.hash.create(std.crypto.randomBytes(16), "sha2-256"));
    }
}

module.exports = RandomWalk;
