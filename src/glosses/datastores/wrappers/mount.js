const each = require("async/each");

const {
    is,
    stream: { pull },
    datastore: { Key, utils, wrapper: { Keytransform } }
} = adone;

const { asyncFilter, asyncSort, replaceStartWith } = utils;

/**
 * A datastore that can combine multiple stores inside various key prefixs.
 */
export default class MountDatastore {
    constructor(mounts) {
        this.mounts = mounts.slice();
    }

    async open() {
        for (const m of this.mounts) {
            await m.datastore.open(); // eslint-disable-line
        }
    }

    /**
     * Lookup the matching datastore for the given key.
     *
     * @private
     * @param {Key} key
     * @returns {{Datastore, Key, Key}}
     */
    _lookup(key) {
        for (const mount of this.mounts) {
            if (mount.prefix.toString() === key.toString() || mount.prefix.isAncestorOf(key)) {
                const s = replaceStartWith(key.toString(), mount.prefix.toString());
                return {
                    datastore: mount.datastore,
                    mountpoint: mount.prefix,
                    rest: new Key(s)
                };
            }
        }
    }

    put(key, value) {
        const match = this._lookup(key);
        if (is.nil(match)) {
            throw new Error("No datastore mounted for this key");
        }

        return match.datastore.put(match.rest, value);
    }

    get(key) {
        const match = this._lookup(key);
        if (is.nil(match)) {
            throw new Error("No datastore mounted for this key");
        }

        return match.datastore.get(match.rest);
    }

    has(key) {
        const match = this._lookup(key);
        if (is.nil(match)) {
            return false;
        }

        return match.datastore.has(match.rest);
    }

    delete(key) {
        const match = this._lookup(key);
        if (is.nil(match)) {
            throw new Error("No datastore mounted for this key");
        }

        return match.datastore.delete(match.rest);
    }

    async close() {
        for (const m of this.mounts) {
            await m.datastore.close(); // eslint-disable-line
        }
    }

    batch() {
        const batchMounts = {};
        const lookup = (key) => {
            const match = this._lookup(key);
            if (is.nil(match)) {
                throw new Error("No datastore mounted for this key");
            }

            const m = match.mountpoint.toString();
            if (is.nil(batchMounts[m])) {
                batchMounts[m] = match.datastore.batch();
            }

            return {
                batch: batchMounts[m],
                rest: match.rest
            };
        };

        return {
            put: (key, value) => {
                const match = lookup(key);
                match.batch.put(match.rest, value);
            },
            delete: (key) => {
                const match = lookup(key);
                match.batch.delete(match.rest);
            },
            commit: async () => {
                for (const p of Object.keys(batchMounts)) {
                    await batchMounts[p].commit(); // eslint-disable-line
                }
            }
        };
    }

    async query(q) {
        const qs = [];

        for (const m of this.mounts) {
            const ks = new Keytransform(m.datastore, {
                convert: (key) => {
                    throw new Error("should never be called");
                },
                invert: (key) => {
                    return m.prefix.child(key);
                }
            });

            let prefix;
            if (!is.nil(q.prefix)) {
                prefix = replaceStartWith(q.prefix, m.prefix.toString());
            }

            // eslint-disable-next-line
            qs.push(await ks.query({
                prefix,
                filters: q.filters,
                keysOnly: q.keysOnly
            }));
        }

        let tasks = [pull.many(qs)];

        if (!is.nil(q.filters)) {
            tasks = tasks.concat(q.filters.map((f) => asyncFilter(f)));
        }

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
