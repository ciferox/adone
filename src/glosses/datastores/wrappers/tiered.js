const each = require("async/each");
const whilst = require("async/whilst");

const {
    is
} = adone;

/**
 * A datastore that can combine multiple stores. Puts and deletes
 * will write through to all datastores. Has and get will
 * try each store sequentially. Query will always try the
 * last one first.
 *
 */
export default class TieredDatastore {
    constructor(stores) {
        this.stores = stores.slice();
    }

    async open() {
        const promises = [];
        for (const store of this.stores) {
            promises.push(store.open());
        }
        await Promise.all(promises);
    }

    async put(key, value) {
        const promises = [];
        for (const store of this.stores) {
            promises.push(store.put(key, value));
        }
        await Promise.all(promises);
    }

    get(key, callback) {
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
        }, callback);
    }

    has(key, callback) {
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

    async delete(key) {
        const promises = [];
        for (const store of this.stores) {
            promises.push(store.delete(key));
        }
        await Promise.all(promises);
    }

    async close() {
        const promises = [];
        for (const store of this.stores) {
            promises.push(store.close());
        }
        await Promise.all(promises);
    }

    batch() {
        const batches = this.stores.map((store) => store.batch());

        return {
            put: (key, value) => {
                batches.forEach((b) => b.put(key, value));
            },
            delete: (key) => {
                batches.forEach((b) => b.delete(key));
            },
            commit: (callback) => {
                each(batches, (b, cb) => {
                    b.commit(cb);
                }, callback);
            }
        };
    }

    query(q) {
        return this.stores[this.stores.length - 1].query(q);
    }
}
