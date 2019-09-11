const {
    is,
    database: { level: { AbstractBackend, AbstractIterator, AbstractChainedBatch } }
} = adone;

const LIMIT = process.maxTickDepth / 2 || 1000;
const factory = () => {
    let count = 0;
    return (callback) => {
        if (count >= LIMIT) {
            global.setImmediate(callback);
            count = 0;
        } else {
            process.nextTick(callback);
        }
        count++;
    };
};

const native = adone.requireAddon(adone.path.join(__dirname, "native", "leveldb.node"));

class Iterator extends AbstractIterator {
    constructor(db, options) {
        super(db);

        this.context = native.iterator_init(db.context, options);
        this.cache = null;
        this.finished = false;
    }

    _seek(target) {
        if (target.length === 0) {
            throw new Error("cannot seek() to an empty target");
        }

        this.cache = null;
        native.iterator_seek(this.context, target);
        this.finished = false;
    }

    _next(callback) {
        if (this.cache && this.cache.length) {
            process.nextTick(callback, null, this.cache.pop(), this.cache.pop());
        } else if (this.finished) {
            process.nextTick(callback);
        } else {
            native.iterator_next(this.context, (err, array, finished) => {
                if (err) {
                    return callback(err);
                }

                this.cache = array;
                this.finished = finished;
                this._next(callback);
            });
        }

        return this;
    }

    _end(callback) {
        delete this.cache;
        native.iterator_end(this.context, callback);
    }
}

class ChainedBatch extends AbstractChainedBatch {
    constructor(db) {
        super(db);
        this.context = native.batch_init(db.context);
    }

    _put(key, value) {
        native.batch_put(this.context, key, value);
    }

    _del(key) {
        native.batch_del(this.context, key);
    }

    _clear() {
        native.batch_clear(this.context);
    }

    _write(options, callback) {
        native.batch_write(this.context, options, callback);
    }
}

export default class LevelDBBackend extends AbstractBackend {
    constructor(location) {
        super();

        if (!is.string(location)) {
            throw new Error("constructor requires a location string argument");
        }

        this.location = location;
        this.context = native.db_init();
    }

    _open(options, callback) {
        native.db_open(this.context, this.location, options, callback);
    }

    _close(callback) {
        native.db_close(this.context, callback);
    }

    _serializeKey(key) {
        return is.buffer(key) ? key : String(key);
    }

    _serializeValue(value) {
        return is.buffer(value) ? value : String(value);
    }

    _put(key, value, options, callback) {
        native.db_put(this.context, key, value, options, callback);
    }

    _get(key, options, callback) {
        native.db_get(this.context, key, options, callback);
    }

    _del(key, options, callback) {
        native.db_del(this.context, key, options, callback);
    }

    _chainedBatch() {
        return new ChainedBatch(this);
    }

    _batch(operations, options, callback) {
        native.batch_do(this.context, operations, options, callback);
    }

    approximateSize(start, end, callback) {
        if (is.nil(start) ||
            is.nil(end) ||
            is.function(start) ||
            is.function(end)) {
            throw new Error("approximateSize() requires valid `start` and `end` arguments");
        }

        if (!is.function(callback)) {
            throw new Error("approximateSize() requires a callback argument");
        }

        start = this._serializeKey(start);
        end = this._serializeKey(end);

        native.db_approximate_size(this.context, start, end, callback);
    }

    compactRange(start, end, callback) {
        if (is.nil(start) ||
            is.nil(end) ||
            is.function(start) ||
            is.function(end)) {
            throw new Error("compactRange() requires valid `start` and `end` arguments");
        }

        if (!is.function(callback)) {
            throw new Error("compactRange() requires a callback argument");
        }

        start = this._serializeKey(start);
        end = this._serializeKey(end);

        native.db_compact_range(this.context, start, end, callback);
    }

    getProperty(property) {
        if (!is.string(property)) {
            throw new Error("getProperty() requires a valid `property` argument");
        }

        return native.db_get_property(this.context, property);
    }

    _iterator(options) {
        if (this.status !== "open") {
            // Prevent segfault
            throw new Error("cannot call iterator() before open()");
        }

        return new Iterator(this, options);
    }

    static destroy(location, callback) {
        if (arguments.length < 2) {
            throw new Error("destroy() requires `location` and `callback` arguments");
        }
        if (!is.string(location)) {
            throw new Error("destroy() requires a location string argument");
        }
        if (!is.function(callback)) {
            throw new Error("destroy() requires a callback function argument");
        }

        native.destroy_db(location, callback);
    }

    static repair(location, callback) {
        if (arguments.length < 2) {
            throw new Error("repair() requires `location` and `callback` arguments");
        }
        if (!is.string(location)) {
            throw new Error("repair() requires a location string argument");
        }
        if (!is.function(callback)) {
            throw new Error("repair() requires a callback function argument");
        }

        native.repair_db(location, callback);
    }
}

LevelDBBackend.Iterator = Iterator;
LevelDBBackend.ChainedBatch = ChainedBatch;
