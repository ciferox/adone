const {
    is,
    database: { level: { DB } },
    datastore: { Key, utils: { asyncFilter, asyncSort } },
    stream: { pull }
} = adone;

/**
 * A datastore backed by leveldb.
 */
export default class Level {
    constructor(options) {
        this.db = new DB({
            compression: false,
            valueEncoding: "binary",
            ...options
        });
    }

    open() {
        return this.db.open();
    }

    put(key, value) {
        return this.db.put(key.toString(), value);
    }

    get(key) {
        return this.db.get(key.toString());
    }

    async has(key) {
        try {
            await this.db.get(key.toString());
            return true;
        } catch (err) {
            if (err instanceof adone.error.NotFound) {
                return false;
            }
            throw err;
        }
    }

    delete(key) {
        return this.db.del(key.toString());
    }

    close() {
        return this.db.close();
    }

    batch() {
        const ops = [];
        return {
            put: (key, value) => {
                ops.push({
                    type: "put",
                    key: key.toString(),
                    value
                });
            },
            delete: (key) => {
                ops.push({
                    type: "del",
                    key: key.toString()
                });
            },
            commit: () => this.db.batch(ops)
        };
    }

    async query(q) {
        let values = true;
        if (!is.nil(q.keysOnly)) {
            values = !q.keysOnly;
        }

        const iter = this.db.db.iterator({
            keys: true,
            values,
            keyAsBuffer: true
        });

        const rawStream = (end, cb) => {
            if (end) {
                return iter.end().catch(cb).then(() => cb(end));
            }

            iter.next().catch(cb).then((result) => {
                if (is.nil(result)) {
                    return iter.end().catch(cb).then(() => cb(true));
                }

                const res = {
                    key: new Key(result.key, false)
                };

                if (values) {
                    res.value = Buffer.from(result.value);
                }

                cb(null, res);
            });
        };

        let tasks = [rawStream];
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

        return pull.apply(null, tasks);
    }
}
