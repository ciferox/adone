const {
    is,
    collection: { RedBlackTree },
    database: { level: { AbstractIterator, AbstractBackend } },
    setImmediate,
    util: { ltgt }
} = adone;

const createRBT = require("functional-red-black-tree");

const NONE = {};

// TODO (perf): replace ltgt.compare with a simpler, buffer-only comparator
function gt(value) {
    return ltgt.compare(value, this._upperBound) > 0;
}

function gte(value) {
    return ltgt.compare(value, this._upperBound) >= 0;
}

function lt(value) {
    return ltgt.compare(value, this._upperBound) < 0;
}

function lte(value) {
    return ltgt.compare(value, this._upperBound) <= 0;
}


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
            this._lowerBound = ltgt.lowerBound(options, NONE);
            this._upperBound = ltgt.upperBound(options, NONE);

            if (this._lowerBound === NONE) {
                this._tree = tree.begin;
            } else if (ltgt.lowerBoundInclusive(options)) {
                this._tree = tree.ge(this._lowerBound);
            } else {
                this._tree = tree.gt(this._lowerBound);
            }

            if (this._upperBound !== NONE) {
                if (ltgt.upperBoundInclusive(options)) {
                    this._test = lte;
                } else {
                    this._test = lt;
                }
            }
        } else {
            this._incr = "prev";
            this._lowerBound = ltgt.upperBound(options, NONE);
            this._upperBound = ltgt.lowerBound(options, NONE);

            if (this._lowerBound === NONE) {
                this._tree = tree.end;
            } else if (ltgt.upperBoundInclusive(options)) {
                this._tree = tree.le(this._lowerBound);
            } else {
                this._tree = tree.lt(this._lowerBound);
            }

            if (this._upperBound !== NONE) {
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

        if (!this.keyAsBuffer) {
            key = key.toString();
        }

        if (!this.valueAsBuffer) {
            value = value.toString();
        }

        this._tree[this._incr]();

        setImmediate(function callNext() {
            callback(null, key, value);
        });
    }

    _test() {
        return true;
    }

    _outOfRange(target) {
        if (!this._test(target)) {
            return true;
        } else if (this._lowerBound === NONE) {
            return false;
        } else if (!this._reverse) {
            if (ltgt.lowerBoundInclusive(this._options)) {
                return ltgt.compare(target, this._lowerBound) < 0;
            }
            return ltgt.compare(target, this._lowerBound) <= 0;

        }
        if (ltgt.upperBoundInclusive(this._options)) {
            return ltgt.compare(target, this._lowerBound) > 0;
        }
        return ltgt.compare(target, this._lowerBound) >= 0;
    }

    _seek(target) {
        if (target.length === 0) {
            throw new Error("cannot seek() to an empty target");
        }

        if (this._outOfRange(target)) {
            this._tree = this.db._store.end;
            this._tree.next();
        } else if (this._reverse) {
            this._tree = this.db._store.le(target);
        } else {
            this._tree = this.db._store.ge(target);
        }
    }
}

class MemoryBackend extends AbstractBackend {
    constructor() {
        super();
        this._store = createRBT(ltgt.compare);
    }

    _open(options, callback) {
        const self = this;
        setImmediate(function callNext() {
            callback(null, self);
        });
    }

    _serializeKey(key) {
        return is.buffer(key) ? key : Buffer.from(String(key));
    }

    _serializeValue(value) {
        return is.buffer(value) ? value : Buffer.from(String(value));
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

        if (!options.asBuffer) {
            value = value.toString();
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

module.exports = MemoryBackend.default = MemoryBackend;
// Exposed for unit tests only
module.exports.Iterator = MemoryIterator;
