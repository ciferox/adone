const { asyncFilter, asyncSort } = require("../utils");

const {
    is,
    stream: { pull }
} = adone;

export default class MemoryDatastore {
    constructor() {
        this.data = {};
    }

    open() {
    }

    put(key, val) {
        this.data[key.toString()] = val;
    }

    get(key) {
        if (!this.has(key)) {
            throw new Error("No value");
        }

        return this.data[key.toString()];
    }

    has(key) {
        return !is.undefined(this.data[key.toString()]);
    }

    delete(key) {
        delete this.data[key.toString()];
    }

    batch() {
        let puts = [];
        let deletes = [];

        return {
            put(key, value) {
                puts.push([key, value]);
            },
            delete(key) {
                deletes.push(key);
            },
            commit: () => {
                puts.forEach((v) => {
                    this.data[v[0].toString()] = v[1];
                });

                puts = [];
                deletes.forEach((key) => {
                    delete this.data[key.toString()];
                });
                deletes = [];
            }
        };
    }

    async query(q) {
        let tasks = [pull.keys(this.data), pull.map((k) => ({
            key: new adone.datastore.Key(k),
            value: this.data[k]
        }))];

        let filters = [];

        if (!is.nil(q.prefix)) {
            const prefix = q.prefix;
            filters.push((e, cb) => cb(null, e.key.toString().startsWith(prefix)));
        }

        if (!is.nil(q.filters)) {
            filters = filters.concat(q.filters);
        }

        tasks = tasks.concat(filters.map((f) => asyncFilter(f)));

        if (!is.nil(q.orders)) {
            tasks = tasks.concat(q.orders.map((o) => asyncSort(o)));
        }

        if (!is.nil(q.offset)) {
            let i = 0;
            tasks.push(pull.filter(() => i++ >= q.offset));
        }

        if (!is.nil(q.limit)) {
            tasks.push(pull.take(q.limit));
        }

        if (q.keysOnly === true) {
            tasks.push(pull.map((e) => ({ key: e.key })));
        }

        return pull.apply(null, tasks);
    }

    close() {
    }
}
