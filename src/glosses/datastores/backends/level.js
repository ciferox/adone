const {
    is,
    database: { level },
    datastore: { interface: { Key, error, util: { asyncFilter, asyncSort } } },
    stream: { pull }
} = adone;

/**
 * A datastore backed by leveldb.
 */
/**
 * :: export type LevelOptions = {
 * createIfMissing?: bool,
 * errorIfExists?: bool,
 * compression?: bool,
 * cacheSize?: number,
 * db?: Object
 */
class LevelDatastore {
    /**
     * :: db: levelup
     */

    constructor(path /* : string */, opts /* : ?LevelOptions */) {
        let Database;

        if (opts && opts.db) {
            Database = opts.db;
            delete opts.db;
        } else {
            Database = level.backend.LevelDB;
        }

        this.db = new level.DB(
            new level.backend.Encoding(new Database(path), { valueEncoding: "binary" }),
            Object.assign({}, opts, {
                compression: false // same default as go
            }),
            (err) => {
                // Prevent an uncaught exception error on duplicate locks
                if (err) {
                    throw err;
                }
            }
        );
    }

    open(callback /* : Callback<void> */) /* : void */ {
        this.db.open((err) => {
            if (err) {
                return callback(error.dbOpenFailedError(err));
            }
            callback();
        });
    }

    put(key /* : Key */, value /* : Buffer */, callback /* : Callback<void> */) /* : void */ {
        this.db.put(key.toString(), value, (err) => {
            if (err) {
                return callback(error.dbWriteFailedError(err));
            }
            callback();
        });
    }

    get(key /* : Key */, callback /* : Callback<Buffer> */) /* : void */ {
        this.db.get(key.toString(), (err, data) => {
            if (err) {
                return callback(error.notFoundError(err));
            }
            callback(null, data);
        });
    }

    has(key /* : Key */, callback /* : Callback<bool> */) /* : void */ {
        this.db.get(key.toString(), (err, res) => {
            if (err) {
                if (err instanceof adone.error.NotFoundException) {
                    callback(null, false);
                    return;
                }
                callback(err);
                return;
            }

            callback(null, true);
        });
    }

    delete(key /* : Key */, callback /* : Callback<void> */) /* : void */ {
        this.db.del(key.toString(), (err) => {
            if (err) {
                return callback(error.dbDeleteFailedError(err));
            }
            callback();
        });
    }

    close(callback /* : Callback<void> */) /* : void */ {
        this.db.close(callback);
    }

    batch() /* : Batch<Buffer> */ {
        const ops = [];
        return {
            put: (key /* : Key */, value /* : Buffer */) /* : void */ => {
                ops.push({
                    type: "put",
                    key: key.toString(),
                    value
                });
            },
            delete: (key /* : Key */) /* : void */ => {
                ops.push({
                    type: "del",
                    key: key.toString()
                });
            },
            commit: (callback /* : Callback<void> */) /* : void */ => {
                this.db.batch(ops, callback);
            }
        };
    }

    query(q /* : Query<Buffer> */) /* : QueryResult<Buffer> */ {
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

                const res /* : QueryEntry<Buffer> */ = {
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

module.exports = LevelDatastore;
