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

    async get(key) {
        const storeLength = this.stores.length;
        let i = 0;

        while (i < storeLength) {
            const store = this.stores[i++];
            try {
                const res = await store.get(key); // eslint-disable-line
                return res;
            } catch (err) {
                //
            }
        }
    }

    async has(key) {
        const storeLength = this.stores.length;
        let i = 0;

        while (i < storeLength) {
            const store = this.stores[i++];
            try {
                const exists = await store.has(key); // eslint-disable-line
                return exists;
            } catch (err) {
                //
            }
        }
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
            commit: async () => {
                for (const b of batches) {
                    await b.commit(); // eslint-disable-line
                }
            }
        };
    }

    async query(q) {
        return this.stores[this.stores.length - 1].query(q);
    }
}
