const { is, database: { level: { AbstractBackend, AbstractIterator, ltgt } } } = adone;
let globalStore = {};

const gt = function (value) {
    return ltgt.compare(value, this._end) > 0;
};

const gte = function (value) {
    return ltgt.compare(value, this._end) >= 0;
};

const lt = function (value) {
    return ltgt.compare(value, this._end) < 0;
};

const lte = function (value) {
    return ltgt.compare(value, this._end) <= 0;
};

class MemoryIterator extends AbstractIterator {
    constructor(db, options) {
        super(db);
        this._limit = options.limit;

        if (this._limit === -1) {
            this._limit = Infinity;
        }

        const tree = db._store[db._location];

        this.keyAsBuffer = options.keyAsBuffer !== false;
        this.valueAsBuffer = options.valueAsBuffer !== false;
        this._reverse = options.reverse;
        this._options = options;
        this._done = 0;

        if (!this._reverse) {
            this._incr = "next";
            this._start = ltgt.lowerBound(options);
            this._end = ltgt.upperBound(options);

            if (is.undefined(this._start)) {
                this._tree = tree.begin;
            } else if (ltgt.lowerBoundInclusive(options)) {
                this._tree = tree.ge(this._start);
            } else {
                this._tree = tree.gt(this._start);
            }

            if (this._end) {
                if (ltgt.upperBoundInclusive(options)) {
                    this._test = lte;
                } else {
                    this._test = lt;
                }
            }
        } else {
            this._incr = "prev";
            this._start = ltgt.upperBound(options);
            this._end = ltgt.lowerBound(options);

            if (is.undefined(this._start)) {
                this._tree = tree.end;
            } else if (ltgt.upperBoundInclusive(options)) {
                this._tree = tree.le(this._start);
            } else {
                this._tree = tree.lt(this._start);
            }

            if (this._end) {
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
            return callback(null);
        }

        if (!this._tree.valid) {
            return callback(null);
        }

        key = this._tree.key;
        value = this._tree.value;

        if (!this._test(key)) {
            return callback(null);
        }

        if (this.keyAsBuffer) {
            key = new Buffer(key);
        }

        if (this.valueAsBuffer) {
            value = new Buffer(value);
        }

        this._tree[this._incr]();

        callback(null, { key, value });
    }

    _test() {
        return true;
    }
}

export default class Memory extends AbstractBackend {
    constructor(location) {
        super(is.string(location) ? location : "");

        this._location = this.location ? (`$${this.location}`) : "_tree";
        this._store = this.location ? globalStore : this;
        this._store[this._location] = this._store[this._location] || new adone.collection.RedBlackTree(ltgt.compare);
    }

    _open(options, callback) {
        setImmediate(() => callback(null, this));
    }

    _put(key, value, options, callback) {
        if (is.undefined(value) || value === null) {
            value = "";
        }

        const iter = this._store[this._location].find(key);

        if (iter.valid) {
            this._store[this._location] = iter.update(value);
        } else {
            this._store[this._location] = this._store[this._location].insert(key, value);
        }

        setImmediate(callback);
    }

    _get(key, options, callback) {
        let value = this._store[this._location].get(key);

        if (is.undefined(value)) {
            // 'NotFound' error, consistent with LevelDOWN API
            return setImmediate(function callNext() {
                callback(new Error("NotFound"));
            });
        }

        if (options.asBuffer !== false && !is.buffer(value)) {
            value = new Buffer(String(value));
        }

        setImmediate(function callNext() {
            callback(null, value);
        });
    }

    _del(key, options, callback) {
        this._store[this._location] = this._store[this._location].remove(key);
        setImmediate(callback);
    }

    _batch(array, options, callback) {
        let i = -1;
        let key;
        let value;
        let iter;
        const len = array.length;
        let tree = this._store[this._location];

        while (++i < len) {
            if (!array[i]) {
                continue;
            }

            key = is.buffer(array[i].key) ? array[i].key : String(array[i].key);
            iter = tree.find(key);

            if (array[i].type === "put") {
                value = is.buffer(array[i].value) ? array[i].value : String(array[i].value);
                tree = iter.valid ? iter.update(value) : tree.insert(key, value);
            } else {
                tree = iter.remove();
            }
        }

        this._store[this._location] = tree;

        setImmediate(callback);
    }

    _iterator(options) {
        return new MemoryIterator(this, options);
    }

    static clearGlobalStore(strict) {
        if (strict) {
            Object.keys(globalStore).forEach((key) => {
                delete globalStore[key];
            });
        } else {
            globalStore = {};
        }
    }

    static destroy(name) {
        const key = `$${name}`;

        if (key in globalStore) {
            delete globalStore[key];
        }
    }
}
