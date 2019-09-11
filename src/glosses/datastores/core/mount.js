const {
    is,
    datastore: { KeyTransformDatastore, interface: { Key, error, util } }
} = adone;

const { filter, take, replaceStartWith, sortAll } = util;

const _many = (iterable) => {
    return (async function* () {
        const completed = iterable.map(() => false);
        while (!completed.every(Boolean)) {
            for (const [idx, itr] of iterable.entries()) {
                const it = await itr.next();
                if (it.done) {
                    completed[idx] = true;
                    continue;
                }
                yield it.value;
            }
        }
    })();
};


/**
 * A datastore that can combine multiple stores inside various
 * key prefixs.
 */
export default class MountDatastore {
    constructor(mounts) {
        this.mounts = mounts.slice();
    }

    open() {
        return Promise.all(this.mounts.map((m) => m.datastore.open()));
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
            throw error.dbWriteFailedError(new Error("No datastore mounted for this key"));
        }

        return match.datastore.put(match.rest, value);
    }

    get(key) {
        const match = this._lookup(key);
        if (is.nil(match)) {
            throw error.notFoundError(new Error("No datastore mounted for this key"));
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
            throw error.dbDeleteFailedError(new Error("No datastore mounted for this key"));
        }

        return match.datastore.delete(match.rest);
    }

    close() {
        return Promise.all(this.mounts.map((m) => {
            return m.datastore.close();
        }));
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
            commit: () => {
                return Promise.all(Object.keys(batchMounts).map((p) => batchMounts[p].commit()));
            }
        };
    }

    query(q) {
        const qs = this.mounts.map((m) => {
            const ks = new KeyTransformDatastore(m.datastore, {
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

            return ks.query({
                prefix,
                filters: q.filters,
                keysOnly: q.keysOnly
            });
        });

        let it = _many(qs);
        if (q.filters) {
            q.filters.forEach((f) => {
                it = filter(it, f);
            });
        }
        if (q.orders) {
            q.orders.forEach((o) => {
                it = sortAll(it, o);
            });
        }
        if (!is.nil(q.offset)) {
            let i = 0;
            it = filter(it, () => i++ >= q.offset);
        }
        if (!is.nil(q.limit)) {
            it = take(it, q.limit);
        }

        return it;
    }
}
