const {
    is,
    util: { ltgt },
    collection: { RedBlackTree },
    database: { level: { AbstractIterator, AbstractBackend } }
} = adone;

const gt = function (value) {
    return ltgt.compare(value, this._upperBound) > 0;
};

const gte = function (value) {
    return ltgt.compare(value, this._upperBound) >= 0;
};

const lt = function (value) {
    return ltgt.compare(value, this._upperBound) < 0;
};

const lte = function (value) {
    return ltgt.compare(value, this._upperBound) <= 0;
};

class MemoryIterator extends AbstractIterator {
    constructor(db, options) {
        super(db);
        this._limit = options.limit;

        if (this._limit === -1) {
            this._limit = Infinity;
        }

        const tree = db._store;

        this.keyAsBuffer = options.keyAsBuffer !== false;
        this.valueAsBuffer = options.valueAsBuffer !== false;
        this._reverse = options.reverse;
        this._options = options;
        this._done = 0;

        if (!this._reverse) {
            this._incr = "next";
            this._lowerBound = ltgt.lowerBound(options);
            this._upperBound = ltgt.upperBound(options);

            if (is.undefined(this._lowerBound)) {
                this._tree = tree.begin;
            } else if (ltgt.lowerBoundInclusive(options)) {
                this._tree = tree.ge(this._lowerBound);
            } else {
                this._tree = tree.gt(this._lowerBound);
            }

            if (this._upperBound) {
                if (ltgt.upperBoundInclusive(options)) {
                    this._test = lte;
                } else {
                    this._test = lt;
                }
            }
        } else {
            this._incr = "prev";
            this._lowerBound = ltgt.upperBound(options);
            this._upperBound = ltgt.lowerBound(options);

            if (is.undefined(this._lowerBound)) {
                this._tree = tree.end;
            } else if (ltgt.upperBoundInclusive(options)) {
                this._tree = tree.le(this._lowerBound);
            } else {
                this._tree = tree.lt(this._lowerBound);
            }

            if (this._upperBound) {
                if (ltgt.lowerBoundInclusive(options)) {
                    this._test = gte;
                } else {
                    this._test = gt;
                }
            }
        }
    }

    _next(callback) {
        let key;
        let value;

        if (this._done++ >= this._limit) {
            return setImmediate(callback);
        }
        if (!this._tree.valid) {
            return setImmediate(callback);
        }

        key = this._tree.key;
        value = this._tree.value;

        if (!this._test(key)) {
            return setImmediate(callback);
        }

        if (this.keyAsBuffer && !is.buffer(key)) {
            key = Buffer.from(String(key));
        }

        if (this.valueAsBuffer && !is.buffer(value)) {
            value = Buffer.from(String(value));
        }

        this._tree[this._incr]();

        setImmediate(function callNext() {
            callback(null, key, value);
        });
    }

    _test() {
        return true;
    }
}

export default class MemoryBackend extends AbstractBackend {
    constructor() {
        super("");

        this._store = new RedBlackTree(ltgt.compare);
    }

    _open(options, callback) {
        setImmediate(() => {
            callback(null, this);
        });
    }

    _serializeKey(key) {
        return key;
    }

    _serializeValue(value) {
        return is.nil(value) ? "" : value;
    }

    _put(key, value, options, callback) {
        const iter = this._store.find(key);

        if (iter.valid) {
            this._store = iter.update(value);
        } else {
            this._store = this._store.insert(key, value);
        }

        setImmediate(callback);
    }

    _get(key, options, callback) {
        let value = this._store.get(key);

        if (is.undefined(value)) {
            // 'NotFound' error, consistent with LevelDOWN API
            return setImmediate(function callNext() {
                callback(new Error("NotFound"));
            });
        }

        if (options.asBuffer !== false && !is.buffer(value)) {
            value = Buffer.from(String(value));
        }

        setImmediate(function callNext() {
            callback(null, value);
        });
    }

    _del(key, options, callback) {
        this._store = this._store.remove(key);
        setImmediate(callback);
    }

    _batch(array, options, callback) {
        let i = -1;
        let key;
        let value;
        let iter;
        const len = array.length;
        let tree = this._store;

        while (++i < len) {
            key = array[i].key;
            iter = tree.find(key);

            if (array[i].type === "put") {
                value = array[i].value;
                tree = iter.valid ? iter.update(value) : tree.insert(key, value);
            } else {
                tree = iter.remove();
            }
        }

        this._store = tree;

        setImmediate(callback);
    }

    _iterator(options) {
        return new MemoryIterator(this, options);
    }
}
