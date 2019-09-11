const {
    is,
    datastore: { interface: { Key, error, util: { filter, sortAll, take, map } } }
} = adone;

class MemoryDatastore {
    constructor() {
        this.data = {};
    }

    async open() { }

    async put(key, val) { // eslint-disable-line require-await
        this.data[key.toString()] = val;
    }

    async get(key) {
        const exists = await this.has(key);
        if (!exists) {
            throw error.notFoundError();
        }
        return this.data[key.toString()];
    }

    async has(key) { // eslint-disable-line require-await
        return !is.undefined(this.data[key.toString()]);
    }

    async delete(key) { // eslint-disable-line require-await
        delete this.data[key.toString()];
    }

    batch() {
        let puts = [];
        let dels = [];

        return {
            put(key, value) {
                puts.push([key, value]);
            },
            delete(key) {
                dels.push(key);
            },
            commit: async () => { // eslint-disable-line require-await
                puts.forEach((v) => {
                    this.data[v[0].toString()] = v[1];
                });
                puts = [];

                dels.forEach((key) => {
                    delete this.data[key.toString()];
                });
                dels = [];
            }
        };
    }

    query(q) {
        let it = Object.entries(this.data);

        it = map(it, (entry) => ({ key: new Key(entry[0]), value: entry[1] }));

        if (!is.nil(q.prefix)) {
            it = filter(it, (e) => e.key.toString().startsWith(q.prefix));
        }

        if (is.array(q.filters)) {
            it = q.filters.reduce((it, f) => filter(it, f), it);
        }

        if (is.array(q.orders)) {
            it = q.orders.reduce((it, f) => sortAll(it, f), it);
        }

        if (!is.nil(q.offset)) {
            let i = 0;
            it = filter(it, () => i++ >= q.offset);
        }

        if (!is.nil(q.limit)) {
            it = take(it, q.limit);
        }

        if (q.keysOnly === true) {
            it = map(it, (e) => ({ key: e.key }));
        }

        return it;
    }

    async close() { }
}

module.exports = MemoryDatastore;
