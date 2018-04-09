const each = require("async/each");
const c = require("./constants");
const utils = require("./utils");

const {
    is,
    crypto: { Identity },
    data: { varint },
    datastore: { Key },
    net: { p2p: { CID } },
    stream: { pull }
} = adone;


/**
 * Encode the given key its matching datastore key.
 *
 * @param {CID} cid
 * @returns {string}
 *
 * @private
 */
const makeProviderKey = (cid) => c.PROVIDERS_KEY_PREFIX + utils.encodeBase32(cid.buffer);

/**
 * Write a provider into the given store.
 *
 * @param {Datastore} store
 * @param {CID} cid
 * @param {Identity} peer
 * @param {number} time
 * @param {function(Error)} callback
 * @returns {undefined}
 *
 * @private
 */
const writeProviderEntry = (store, cid, peer, time, callback) => {
    const dsKey = [
        makeProviderKey(cid),
        "/",
        utils.encodeBase32(peer.id)
    ].join("");

    store.put(new Key(dsKey), Buffer.from(varint.encode(time))).catch(callback).then(() => callback());
};

const readTime = (buf) => varint.decode(buf);

/**
 * Load providers from the store.
 *
 * @param {Datastore} store
 * @param {CID} cid
 * @param {function(Error, Map<Identity, Date>)} callback
 * @returns {undefined}
 *
 * @private
 */
const loadProviders = async (store, cid) => {
    const src = await store.query({ prefix: makeProviderKey(cid) });
    return new Promise((resolve, reject) => {
        pull(
            src,
            pull.map((entry) => {
                const parts = entry.key.toString().split("/");
                const lastPart = parts[parts.length - 1];
                const rawPeerId = utils.decodeBase32(lastPart);
                return [new Identity(rawPeerId), entry.value ? readTime(entry.value) : undefined];
            }),
            pull.collect((err, res) => {
                if (err) {
                    return reject(err);
                }

                return resolve(new Map(res));
            })
        );
    });
};

/**
 * This class manages known providers.
 * A provider is a peer that we know to have the content for a given CID.
 *
 * Every `cleanupInterval` providers are checked if they
 * are still valid, i.e. younger than the `provideValidity`.
 * If they are not, they are deleted.
 *
 * To ensure the list survives restarts of the daemon,
 * providers are stored in the datastore, but to ensure
 * access is fast there is an LRU cache in front of that.
 */
class Providers {
    /**
     * @param {Object} datastore
     * @param {Identity} [self]
     * @param {number} [cacheSize=256]
     */
    constructor(datastore, self, cacheSize) {
        this.datastore = datastore;

        /**
         * How often invalid records are cleaned. (in seconds)
         *
         * @type {number}
         */
        this._cleanupInterval = c.PROVIDERS_CLEANUP_INTERVAL;

        /**
         * How long is a provider valid for. (in seconds)
         *
         * @type {number}
         */
        this.provideValidity = c.PROVIDERS_VALIDITY;

        /**
         * LRU cache size
         *
         * @type {number}
         */
        this.lruCacheSize = cacheSize || c.PROVIDERS_LRU_CACHE_SIZE;

        this.providers = new adone.collection.FastLRU(this.lruCacheSize);
    }

    /**
     * Release any resources.
     *
     * @returns {undefined}
     */
    stop() {
        if (this._cleaner) {
            clearInterval(this._cleaner);
            this._cleaner = null;
        }
    }

    /**
     * Check all providers if they are still valid, and if not
     * delete them.
     *
     * @returns {undefined}
     *
     * @private
     */
    _cleanup() {
        this._getProviderCids((err, cids) => {
            if (err) {
                return adone.logError(err);
            }

            each(cids, (cid, cb) => {
                this._getProvidersMap(cid, (err, provs) => {
                    if (err) {
                        return cb(err);
                    }

                    provs.forEach((time, provider) => {
                        if (Date.now() - time > this.provideValidity) {
                            provs.delete(provider);
                        }
                    });

                    if (provs.size === 0) {
                        return this._deleteProvidersMap(cid, cb);
                    }

                    cb();
                });
            }, (err) => {
                if (err) {
                    return adone.logError(err);
                }
            });
        });
    }

    /**
     * Get a list of all cids that providers are known for.
     *
     * @param {function(Error, Array<CID>)} callback
     * @returns {undefined}
     *
     * @private
     */
    _getProviderCids(callback) {
        this.datastore.query({ prefix: c.PROVIDERS_KEY_PREFIX }).then((src) => {
            pull(
                src,
                pull.map((entry) => {
                    const parts = entry.key.toString().split("/");
                    if (parts.length !== 4) {
                        return undefined;
                    }

                    let decoded;
                    try {
                        decoded = utils.decodeBase32(parts[2]);
                    } catch (err) {
                        return undefined;
                    }

                    let cid;
                    try {
                        cid = new CID(decoded);
                    } catch (err) {
                        adone.logError(err.message);
                    }

                    return cid;
                }),
                pull.filter(Boolean),
                pull.collect(callback)
            );
        });
    }

    /**
     * Get the currently known provider maps for a given CID.
     *
     * @param {CID} cid
     * @param {function(Error, Map<Identity, Date>)} callback
     * @returns {undefined}
     *
     * @private
     */
    _getProvidersMap(cid, callback) {
        const provs = this.providers.get(makeProviderKey(cid));

        if (!provs) {
            return loadProviders(this.datastore, cid).catch((err) => callback(err)).then((result) => callback(null, result));
        }

        callback(null, provs);
    }

    /**
     * Completely remove a providers map entry for a given CID.
     *
     * @param {CID} cid
     * @param {function(Error)} callback
     * @returns {undefined}
     *
     * @private
     */
    _deleteProvidersMap(cid, callback) {
        const dsKey = makeProviderKey(cid);
        this.providers.set(dsKey, null);
        const batch = this.datastore.batch();

        this.datastore.query({
            keysOnly: true,
            prefix: dsKey
        }).then((src) => {
            pull(
                src,
                pull.through((entry) => batch.delete(entry.key)),
                pull.onEnd((err) => {
                    if (err) {
                        return callback(err);
                    }
                    batch.commit().catch(callback).then(() => callback());
                })
            );
        });

    }

    get cleanupInterval() {
        return this._cleanupInterval;
    }

    set cleanupInterval(val) {
        this._cleanupInterval = val;

        if (this._cleaner) {
            clearInterval(this._cleaner);
        }

        this._cleaner = setInterval(() => this._cleanup(), this._cleanupInterval);
    }

    /**
     * Add a new provider.
     *
     * @param {CID} cid
     * @param {Identity} provider
     * @param {function(Error)} callback
     * @returns {undefined}
     */
    addProvider(cid, provider, callback) {
        const dsKey = makeProviderKey(cid);
        const provs = this.providers.get(dsKey);

        const next = (err, provs) => {
            if (err) {
                return callback(err);
            }

            const now = Date.now();
            provs.set(provider, now);

            this.providers.set(dsKey, provs);
            writeProviderEntry(this.datastore, cid, provider, now, callback);
        };

        if (!provs) {
            const promise = loadProviders(this.datastore, cid);
            this.providers.set(dsKey, promise);
            promise.catch(next).then((result) => next(null, result));
        } else if (is.promise(provs)) {
            provs.catch(next).then((result) => next(null, result));
        } else {
            next(null, provs);
        }
    }

    /**
     * Get a list of providers for the given CID.
     *
     * @param {CID} cid
     * @param {function(Error, Array<Identity>)} callback
     * @returns {undefined}
     */
    getProviders(cid, callback) {
        this._getProvidersMap(cid, (err, provs) => {
            if (err) {
                return callback(err);
            }

            callback(null, Array.from(provs.keys()));
        });
    }
}

module.exports = Providers;
