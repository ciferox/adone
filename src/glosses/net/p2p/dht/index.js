const waterfall = require("async/waterfall");
const each = require("async/each");
const timeout = require("async/timeout");
const RoutingTable = require("./routing");
const utils = require("./utils");
const c = require("./constants");
const Query = require("./query");
const Network = require("./network");
const errors = require("./errors");
const privateApi = require("./private");
const Providers = require("./providers");
const Message = require("./message");
const RandomWalk = require("./random_walk");

const {
    is,
    crypto: { Identity },
    datastore: { backend: { Memory: MemoryStore } },
    net: { p2p: { PeerInfo, crypto, record } }
} = adone;

adone.lazifyPrivate({
    rpc: "./rpc",
    rpcHandler: () => adone.lazify({
        addProvider: "./rpc/handlers/add_provider",
        findNode: "./rpc/handlers/find_node",
        getProviders: "./rpc/handlers/get_providers",
        getValue: "./rpc/handlers/get_value",
        ping: "./rpc/handlers/ping",
        putValue: "./rpc/handlers/put_value"
    }, null, require),
    utils: "./utils",
    constants: "./constants",
    Message: "./message",
    LimitedPeerList: "./limited_peer_list",
    PeerList: "./peer_list",
    PeerQueue: "./peer_queue",
    Providers: "./providers",
    Query: "./query",
    RoutingTable: "./routing"
}, exports, require);

/**
 * A DHT implementation modeled after Kademlia with Coral and S/Kademlia modifications.
 *
 */
export class KadDHT {
    /**
     * Create a new KadDHT.
     *
     * @param {Switch} sw
     * @param {object} options // {kBucketSize=20, datastore=MemoryDatastore}
     */
    constructor(sw, { kBucketSize = 20, ncp = 6, datastore } = {}) {
        /**
         * Local reference to switch.
         *
         * @type {Switch}
         */
        this.switch = sw;

        /**
         * k-bucket size, defaults to 20.
         *
         * @type {number}
         */
        this.kBucketSize = kBucketSize;

        /**
         * Number of closest peers to return on kBucket search, default 6
         *
         * @type {number}
         */
        this.ncp = ncp;

        /**
         * The routing table.
         *
         * @type {RoutingTable}
         */
        this.routingTable = new RoutingTable(this.peerInfo.id, this.kBucketSize);

        /**
         * Reference to the datastore, uses an in-memory store if none given.
         *
         * @type {Datastore}
         */
        this.datastore = datastore || new MemoryStore();

        /**
         * Provider management
         *
         * @type {Providers}
         */
        this.providers = new Providers(this.datastore, this.peerInfo.id);

        this.validators = { pk: record.validator.validators.pk };
        this.selectors = { pk: record.selection.selectors.pk };

        this.network = new Network(this);

        this._log = utils.logger(this.peerInfo.id);

        // Inject private apis so we don't clutter up this file
        const pa = privateApi(this);
        Object.keys(pa).forEach((name) => {
            this[name] = pa[name];
        });

        /**
         * Provider management
         *
         * @type {RandomWalk}
         */
        this.randomWalk = new RandomWalk(this);
    }

    /**
     * Is this DHT running.
     *
     * @type {bool}
     */
    get isStarted() {
        return this._running;
    }

    /**
     * Start listening to incoming connections.
     *
     * @param {function(Error)} callback
     * @returns {void}
     */
    start(callback) {
        this._running = true;
        this.network.start(callback);
    }

    /**
     * Stop accepting incoming connections and sending outgoing
     * messages.
     *
     * @param {function(Error)} callback
     * @returns {void}
     */
    stop(callback) {
        this._running = false;
        this.randomWalk.stop();
        this.providers.stop();
        this.network.stop(callback);
    }

    /**
     * Local peer (yourself)
     *
     * @type {PeerInfo}
     */
    get peerInfo() {
        return this.switch._peerInfo;
    }

    get peerBook() {
        return this.switch._peerBook;
    }

    /**
     * Store the given key/value  pair in the DHT.
     *
     * @param {Buffer} key
     * @param {Buffer} value
     * @param {function(Error)} callback
     * @returns {void}
     */
    put(key, value, callback) {
        this._log("PutValue %s", key);
        let sign;
        try {
            sign = record.validator.isSigned(this.validators, key);
        } catch (err) {
            return callback(err);
        }

        const rec = utils.createPutRecord(key, value, this.peerInfo.id, sign);
        waterfall([
            (cb) => waterfall([
                (cb) => this._putLocal(key, rec, cb),
                (cb) => this.getClosestPeers(key, cb),
                (peers, cb) => each(peers, (peer, cb) => {
                    this._putValueToPeer(key, rec, peer, cb);
                }, cb)
            ], cb)
        ], callback);
    }

    /**
     * Get the value to the given key.
     * Times out after 1 minute.
     *
     * @param {Buffer} key
     * @param {number} [maxTimeout=60000] - optional timeout
     * @param {function(Error, Buffer)} callback
     * @returns {void}
     */
    get(key, maxTimeout, callback) {
        if (is.function(maxTimeout)) {
            callback = maxTimeout;
            maxTimeout = null;
        }

        if (is.nil(maxTimeout)) {
            maxTimeout = c.minute;
        }

        this._get(key, maxTimeout, callback);
    }

    /**
     * Get the `n` values to the given key without sorting.
     *
     * @param {Buffer} key
     * @param {number} nvals
     * @param {number} [maxTimeout=60000]
     * @param {function(Error, Array<{from: Identity, val: Buffer}>)} callback
     * @returns {void}
     */
    getMany(key, nvals, maxTimeout, callback) {
        if (is.function(maxTimeout)) {
            callback = maxTimeout;
            maxTimeout = null;
        }
        if (is.nil(maxTimeout)) {
            maxTimeout = c.minute;
        }

        this._log("getMany %s (%s)", key, nvals);
        const vals = [];

        this._getLocal(key, (err, localRec) => {
            if (err && nvals === 0) {
                return callback(err);
            }
            if (is.nil(err)) {
                vals.push({
                    val: localRec.value,
                    from: this.peerInfo.id
                });
            }

            if (nvals <= 1) {
                return callback(null, vals);
            }

            const id = utils.convertBuffer(key);
            waterfall([
                (cb) => {
                    const rtp = this.routingTable.closestPeers(id, c.ALPHA);
                    this._log("peers in rt: %d", rtp.length);
                    if (rtp.length === 0) {
                        this._log.error("No peers from routing table!");
                        return cb(new Error("Failed to lookup key"));
                    }

                    // we have peers, lets do the actualy query to them
                    const query = new Query(this, key, (peer, cb) => {
                        this._getValueOrPeers(peer, key, (err, rec, peers) => {
                            if (err) {
                                // If we have an invalid record we just want to continue and fetch a new one.
                                if (!(err instanceof errors.InvalidRecordError)) {
                                    return cb(err);
                                }
                            }

                            const res = {
                                closerPeers: peers
                            };

                            if ((rec && rec.value) ||
                                err instanceof errors.InvalidRecordError) {
                                vals.push({
                                    val: rec && rec.value,
                                    from: peer
                                });
                            }

                            // enough is enough
                            if (vals.length >= nvals) {
                                res.success = true;
                            }

                            cb(null, res);
                        });
                    });

                    // run our query
                    timeout((cb) => query.run(rtp, cb), maxTimeout)(cb);
                }
            ], (err) => {
                if (err && vals.length === 0) {
                    return callback(err);
                }

                callback(null, vals);
            });
        });
    }

    /**
     * Kademlia 'node lookup' operation.
     *
     * @param {Buffer} key
     * @param {function(Error, Array<Identity>)} callback
     * @returns {void}
     */
    getClosestPeers(key, callback) {
        try {
            const id = utils.convertBuffer(key);

            const tablePeers = this.routingTable.closestPeers(id, c.ALPHA);

            const q = new Query(this, key, (peer, callback) => {
                waterfall([
                    (cb) => this._closerPeersSingle(key, peer, cb),
                    (closer, cb) => {
                        cb(null, {
                            closerPeers: closer
                        });
                    }
                ], callback);
            });

            q.run(tablePeers, (err, res) => {
                if (err) {
                    return callback(err);
                }

                if (!res || !res.finalSet) {
                    return callback(null, []);
                }

                waterfall([
                    (cb) => utils.sortClosestPeers(Array.from(res.finalSet), id, cb),
                    (sorted, cb) => cb(null, sorted.slice(0, c.K))
                ], callback);
            });
        } catch (err) {
            return callback(err);
        }
    }


    /**
     * Get the public key for the given peer id.
     *
     * @param {Identity} peer
     * @param {function(Error, PubKey)} callback
     * @returns {void}
     */
    getPublicKey(peer, callback) {
        this._log("getPublicKey %s", peer.asBase58());
        // local check
        let info;
        if (this.peerBook.has(peer)) {
            info = this.peerBook.get(peer);

            if (info && info.id.pubKey) {
                this._log("getPublicKey: found local copy");
                return callback(null, info.id.pubKey);
            }
        } else {
            info = this.peerBook.set(new PeerInfo(peer));
        }
        // try the node directly
        this._getPublicKeyFromNode(peer, (err, pk) => {
            if (!err) {
                info.id = new Identity(peer.id, null, pk);
                this.peerBook.set(info);

                return callback(null, pk);
            }

            // dht directly
            const pkKey = utils.keyForPublicKey(peer);
            this.get(pkKey, (err, value) => {
                if (err) {
                    return callback(err);
                }

                const pk = crypto.unmarshalPublicKey(value);
                info.id = new Identity(peer, null, pk);
                this.peerBook.set(info);

                callback(null, pk);
            });
        });
    }

    /**
     * Look if we are connected to a peer with the given id.
     * Returns the `PeerInfo` for it, if found, otherwise `undefined`.
     *
     * @param {Identity} peer
     * @param {function(Error, PeerInfo)} callback
     * @returns {void}
     */
    findPeerLocal(peer) {
        const p = this.routingTable.find(peer);
        if (p && this.peerBook.has(p)) {
            return this.peerBook.get(p);
        }
    }

    /**
     * Announce to the network that a node can provide the given key.
     * This is what Coral and MainlineDHT do to store large values
     * in a DHT.
     *
     * @param {CID} key
     * @param {function(Error)} callback
     * @returns {void}
     */
    provide(key, callback) {
        waterfall([
            (cb) => this.providers.addProvider(key, this.peerInfo.id, cb),
            (cb) => this.getClosestPeers(key.buffer, cb),
            (peers, cb) => {
                const msg = new Message(Message.TYPES.ADD_PROVIDER, key.buffer, 0);
                msg.providerPeers = peers.map((p) => new PeerInfo(p));

                each(peers, (peer, cb) => {
                    this.network.sendMessage(peer, msg, cb);
                }, cb);
            }
        ], (err) => callback(err));
    }

    /**
     * Search the dht for up to `K` providers of the given CID.
     *
     * @param {CID} key
     * @param {number} timeout - how long the query should maximally run, in milliseconds.
     * @param {function(Error, Array<PeerInfo>)} callback
     * @returns {void}
     */
    findProviders(key, timeout, callback) {
        this._findNProviders(key, timeout, c.K, callback);
    }

    // ----------- Peer Routing

    /**
     * Search for a peer with the given ID.
     *
     * @param {Identity} id
     * @param {number} [maxTimeout=60000]
     * @param {function(Error, PeerInfo)} callback
     * @returns {void}
     */
    findPeer(id, maxTimeout, callback) {
        if (is.function(maxTimeout)) {
            callback = maxTimeout;
            maxTimeout = null;
        }

        if (is.nil(maxTimeout)) {
            maxTimeout = c.minute;
        }

        try {
            const pi = this.findPeerLocal(id);

            // already got it
            if (!is.nil(pi)) {
                this._log("found local");
                return callback(null, pi);
            }

            const key = utils.convertPeerId(id);
            waterfall([
                (cb) => {
                    const peers = this.routingTable.closestPeers(key, c.ALPHA);

                    if (peers.length === 0) {
                        return cb(new errors.LookupFailureError());
                    }

                    // sanity check
                    const match = peers.find((p) => p.isEqual(id));
                    if (match && this.peerBook.has(id)) {
                        this._log("found in peerbook");
                        return cb(null, this.peerBook.get(id));
                    }

                    // query the network
                    const query = new Query(this, id.id, (peer, cb) => {
                        waterfall([
                            (cb) => this._findPeerSingle(peer, id, cb),
                            (msg, cb) => {
                                const match = msg.closerPeers.find((p) => p.id.isEqual(id));

                                // found it
                                if (match) {
                                    return cb(null, {
                                        peer: match,
                                        success: true
                                    });
                                }

                                cb(null, {
                                    closerPeers: msg.closerPeers
                                });
                            }
                        ], cb);
                    });

                    timeout((cb) => {
                        query.run(peers, cb);
                    }, maxTimeout)(cb);
                },
                (result, cb) => {
                    this._log("findPeer %s: %s", id.asBase58(), result.success);
                    if (!result.peer) {
                        return cb(new errors.NotFoundError());
                    }
                    cb(null, result.peer);
                }
            ], callback);
        } catch (err) {
            return callback(err);
        }
    }
}
