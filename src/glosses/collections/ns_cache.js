const {
    error,
    collection
} = adone;

export default class NSCache {
    constructor(maxSize, namespaces) {
        this._caches = {};
        this._namesapces = new Set(namespaces);
        for (const namespace of namespaces) {
            this._caches[namespace] = new collection.FastLRU({ maxSize });
        }
    }

    _checkNs(ns) {
        if (!this._namesapces.has(ns)) {
            throw new error.Unknown(`There is no such cache namespace "${ns}"`);
        }
    }

    resize(newSize) {
        for (const ns of this._namesapces) {
            this._caches[ns].resize(newSize);
        }
    }

    set(ns, key, value) {
        this._checkNs(ns);
        this._caches[ns].set(key, value);
    }

    get(ns, key) {
        this._checkNs(ns);
        return this._caches[ns].get(key);
    }

    has(ns, key) {
        this._checkNs(ns);
        return this._caches[ns].has(key);
    }

    delete(ns, key) {
        this._checkNs(ns);
        this._caches[ns].delete(key);
    }

    clear() {
        for (const ns of this._namesapces) {
            this._caches[ns].clear();
        }
    }
}
