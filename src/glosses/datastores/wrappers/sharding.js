const {
    is,
    datastore: { Key, shard: sh, wrapper: { Keytransform } }
} = adone;

const shardKey = new Key(sh.SHARDING_FN);
const shardReadmeKey = new Key(sh.README_FN);

/**
 * Backend independent abstraction of go-ds-flatfs.
 *
 * Wraps another datastore such that all values are stored
 * sharded according to the given sharding function.
 */
export default class ShardingDatastore {
    constructor(store, shard) {
        this.child = new Keytransform(store, {
            convert: this._convertKey.bind(this),
            invert: this._invertKey.bind(this)
        });
        this.shard = shard;
    }

    open() {
        return this.child.open();
    }

    _convertKey(key) {
        const s = key.toString();
        if (s === shardKey.toString() || s === shardReadmeKey.toString()) {
            return key;
        }

        const parent = new Key(this.shard.fun(s));
        return parent.child(key);
    }

    _invertKey(key) {
        const s = key.toString();
        if (s === shardKey.toString() || s === shardReadmeKey.toString()) {
            return key;
        }
        return Key.withNamespaces(key.list().slice(1));
    }

    static async createOrOpen(store, shard) {
        try {
            await ShardingDatastore.create(store, shard);
        } catch (err) {
            if (err.message !== "datastore exists") {
                throw err;
            }
        }
        return ShardingDatastore.open(store);
    }

    static async open(store) {
        const shard = await sh.readShardFun("/", store);
        return new ShardingDatastore(store, shard);
    }

    static async create(store, shard) {
        const exists = await store.has(shardKey);
        if (!exists) {
            const put = is.function(store.putRaw) ? store.putRaw.bind(store) : store.put.bind(store);
            await Promise.all([
                put(shardKey, Buffer.from(`${shard.toString()}\n`)),
                put(shardReadmeKey, Buffer.from(sh.readme))
            ]);
            return;
        }

        const diskShard = await sh.readShardFun("/", store);
        const a = (diskShard || "").toString();
        const b = shard.toString();
        if (a !== b) {
            throw new Error(`specified fun ${b} does not match repo shard fun ${a}`);
        }

        throw new Error("datastore exists");
    }

    put(key, val) {
        return this.child.put(key, val);
    }

    get(key) {
        return this.child.get(key);
    }

    has(key) {
        return this.child.has(key);
    }

    delete(key) {
        return this.child.delete(key);
    }

    batch() {
        return this.child.batch();
    }

    query(q) {
        const tq = {
            keysOnly: q.keysOnly,
            offset: q.offset,
            limit: q.limit,
            filters: [
                (e, cb) => cb(null, e.key.toString() !== shardKey.toString()),
                (e, cb) => cb(null, e.key.toString() !== shardReadmeKey.toString())
            ]
        };

        if (!is.nil(q.prefix)) {
            tq.filters.push((e, cb) => {
                cb(null, this._invertKey(e.key).toString().startsWith(q.prefix));
            });
        }

        if (!is.nil(q.filters)) {
            const filters = q.filters.map((f) => (e, cb) => {
                f(Object.assign({}, e, {
                    key: this._invertKey(e.key)
                }), cb);
            });
            tq.filters = tq.filters.concat(filters);
        }

        if (!is.nil(q.orders)) {
            tq.orders = q.orders.map((o) => (res, cb) => {
                res.forEach((e) => {
                    e.key = this._invertKey(e.key);
                });
                o(res, (err, ordered) => {
                    if (err) {
                        return cb(err);
                    }
                    ordered.forEach((e) => {
                        e.key = this._convertKey(e.key);
                    });
                    cb(null, ordered);
                });
            });
        }

        return this.child.query(tq);
    }

    close() {
        return this.child.close();
    }
}
