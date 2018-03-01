const levelup = require("levelup");

const {
    is,
    datastore: { Key, utils: { asyncFilter, asyncSort } },
    stream: { pull }
} = adone;

/**
 * A datastore backed by leveldb.
 */
export default class Level {
    constructor(path, opts) {
        this.db = levelup(path, Object.assign({}, opts, {
            compression: false, // same default as go
            valueEncoding: "binary"
        }));
    }

    open(callback) {
        this.db.open(callback);
    }

    put(key, value, callback) {
        this.db.put(key.toString(), value, callback);
    }

    get(key, callback) {
        this.db.get(key.toString(), callback);
    }

    has(key, callback) {
        this.db.get(key.toString(), (err, res) => {
            if (err) {
                if (err.notFound) {
                    callback(null, false);
                    return;
                }
                callback(err);
                return;
            }

            callback(null, true);
        });
    }

    delete(key, callback) {
        this.db.del(key.toString(), callback);
    }

    close(callback) {
        this.db.close(callback);
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
            commit: (callback) => {
                this.db.batch(ops, callback);
            }
        };
    }

    query(q) {
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
                return iter.end((err) => {
                    cb(err || end);
                });
            }

            iter.next((err, key, value) => {
                if (err) {
                    return cb(err);
                }

                if (is.nil(err) && is.nil(key) && is.nil(value)) {
                    return iter.end((err) => {
                        cb(err || true);
                    });
                }

                const res = {
                    key: new Key(key, false)
                };

                if (values) {
                    res.value = Buffer.from(value);
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
