const each = require("async/each");
const whilst = require("async/whilst");

const {
    is,
    datastore: { interface: { error } }
} = adone;

/**
 * ::
 * import type {Key, Datastore, Callback, Batch, Query, QueryResult} from 'interface-datastore'
 */

/**
 * A datastore that can combine multiple stores. Puts and deletes
 * will write through to all datastores. Has and get will
 * try each store sequentially. Query will always try the
 * last one first.
 *
 */
class TieredDatastore /* :: <Value> */ {
    /**
     * :: stores: Array<Datastore<Value>>
     */

    constructor(stores /* : Array<Datastore<Value>> */) {
        this.stores = stores.slice();
    }

    open(callback /* : Callback<void> */) /* : void */ {
        each(this.stores, (store, cb) => {
            store.open(cb);
        }, (err) => {
            if (err) {
                return callback(error.dbOpenFailedError());
            }
            callback();
        });
    }

    put(key /* : Key */, value /* : Value */, callback /* : Callback<void> */) /* : void */ {
        each(this.stores, (store, cb) => {
            store.put(key, value, cb);
        }, (err) => {
            if (err) {
                return callback(error.dbWriteFailedError());
            }
            callback();
        });
    }

    get(key /* : Key */, callback /* : Callback<Value> */) /* : void */ {
        const storeLength = this.stores.length;
        let done = false;
        let i = 0;
        whilst(() => !done && i < storeLength, (cb) => {
            const store = this.stores[i++];
            store.get(key, (err, res) => {
                if (is.nil(err)) {
                    done = true;
                    return cb(null, res);
                }
                cb();
            });
        }, (err, res) => {
            if (err || !res) {
                return callback(error.notFoundError());
            }
            callback(null, res);
        });
    }

    has(key /* : Key */, callback /* : Callback<bool> */) /* : void */ {
        const storeLength = this.stores.length;
        let done = false;
        let i = 0;
        whilst(() => !done && i < storeLength, (cb) => {
            const store = this.stores[i++];
            store.has(key, (err, exists) => {
                if (is.nil(err)) {
                    done = true;
                    return cb(null, exists);
                }
                cb();
            });
        }, callback);
    }

    delete(key /* : Key */, callback /* : Callback<void> */) /* : void */ {
        each(this.stores, (store, cb) => {
            store.delete(key, cb);
        }, (err) => {
            if (err) {
                return callback(error.dbDeleteFailedError());
            }
            callback();
        });
    }

    close(callback /* : Callback<void> */) /* : void */ {
        each(this.stores, (store, cb) => {
            store.close(cb);
        }, callback);
    }

    batch() /* : Batch<Value> */ {
        const batches = this.stores.map((store) => store.batch());

        return {
            put: (key /* : Key */, value /* : Value */) /* : void */ => {
                batches.forEach((b) => b.put(key, value));
            },
            delete: (key /* : Key */) /* : void */ => {
                batches.forEach((b) => b.delete(key));
            },
            commit: (callback /* : Callback<void> */) /* : void */ => {
                each(batches, (b, cb) => {
                    b.commit(cb);
                }, callback);
            }
        };
    }

    query(q /* : Query<Value> */) /* : QueryResult<Value> */ {
        return this.stores[this.stores.length - 1].query(q);
    }
}

module.exports = TieredDatastore;
