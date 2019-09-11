const hasOwnProperty = Object.prototype.hasOwnProperty;
const rangeOptions = "start end gt gte lt lte".split(" ");

const {
    is
} = adone;

const __ = adone.lazify({
    AbstractIterator: "./iterator",
    AbstractChainedBatch: "./chained_batch"
}, null, require);

const isRangeOption = function (k) {
    return rangeOptions.indexOf(k) !== -1;
};

const cleanRangeOptions = function (db, options) {
    const result = {};

    for (const k in options) {
        if (!hasOwnProperty.call(options, k)) {
            continue;
        }

        let opt = options[k];

        if (isRangeOption(k)) {
            // Note that we don't reject nullish and empty options here. While
            // those types are invalid as keys, they are valid as range options.
            opt = db._serializeKey(opt);
        }

        result[k] = opt;
    }

    return result;
};

export default class AbstractBackend {
    constructor() {
        this.status = "new";
    }

    open(options, callback) {
        const oldStatus = this.status;

        if (is.function(options)) {
            callback = options;
        }

        if (!is.function(callback)) {
            throw new Error("open() requires a callback argument");
        }

        if (typeof options !== "object" || is.null(options)) {
            options = {};
        }

        options.createIfMissing = options.createIfMissing !== false;
        options.errorIfExists = Boolean(options.errorIfExists);

        this.status = "opening";
        this._open(options, (err) => {
            if (err) {
                this.status = oldStatus;
                return callback(err);
            }
            this.status = "open";
            callback();
        });
    }

    _open(options, callback) {
        process.nextTick(callback);
    }

    close(callback) {
        const oldStatus = this.status;

        if (!is.function(callback)) {
            throw new Error("close() requires a callback argument");
        }

        this.status = "closing";
        this._close((err) => {
            if (err) {
                this.status = oldStatus;
                return callback(err);
            }
            this.status = "closed";
            callback();
        });
    }

    _close(callback) {
        process.nextTick(callback);
    }

    get(key, options, callback) {
        if (is.function(options)) {
            callback = options;
        }

        if (!is.function(callback)) {
            throw new Error("get() requires a callback argument");
        }

        const err = this._checkKey(key);
        if (err) {
            return process.nextTick(callback, err);
        }

        key = this._serializeKey(key);

        if (typeof options !== "object" || is.null(options)) {
            options = {};
        }

        options.asBuffer = options.asBuffer !== false;

        this._get(key, options, callback);
    }

    _get(key, options, callback) {
        process.nextTick(() => {
            callback(new Error("NotFound"));
        });
    }

    put(key, value, options, callback) {
        if (is.function(options)) {
            callback = options;
        }

        if (!is.function(callback)) {
            throw new Error("put() requires a callback argument");
        }

        const err = this._checkKey(key) || this._checkValue(value);
        if (err) {
            return process.nextTick(callback, err);
        }

        key = this._serializeKey(key);
        value = this._serializeValue(value);

        if (typeof options !== "object" || is.null(options)) {
            options = {};
        }

        this._put(key, value, options, callback);
    }

    _put(key, value, options, callback) {
        process.nextTick(callback);
    }

    del(key, options, callback) {
        if (is.function(options)) {
            callback = options;
        }

        if (!is.function(callback)) {
            throw new Error("del() requires a callback argument");
        }

        const err = this._checkKey(key);
        if (err) {
            return process.nextTick(callback, err);
        }

        key = this._serializeKey(key);

        if (typeof options !== "object" || is.null(options)) {
            options = {};
        }

        this._del(key, options, callback);
    }

    _del(key, options, callback) {
        process.nextTick(callback);
    }

    batch(array, options, callback) {
        if (!arguments.length) {
            return this._chainedBatch();
        }

        if (is.function(options)) {
            callback = options;
        }

        if (is.function(array)) {
            callback = array;
        }

        if (!is.function(callback)) {
            throw new Error("batch(array) requires a callback argument");
        }

        if (!is.array(array)) {
            return process.nextTick(callback, new Error("batch(array) requires an array argument"));
        }

        if (array.length === 0) {
            return process.nextTick(callback);
        }

        if (typeof options !== "object" || is.null(options)) {
            options = {};
        }

        const serialized = new Array(array.length);

        for (let i = 0; i < array.length; i++) {
            if (typeof array[i] !== "object" || is.null(array[i])) {
                return process.nextTick(callback, new Error("batch(array) element must be an object and not `null`"));
            }

            const e = Object.assign({}, array[i]);

            if (e.type !== "put" && e.type !== "del") {
                return process.nextTick(callback, new Error("`type` must be 'put' or 'del'"));
            }

            const err = this._checkKey(e.key);
            if (err) {
                return process.nextTick(callback, err);
            }

            e.key = this._serializeKey(e.key);

            if (e.type === "put") {
                const valueErr = this._checkValue(e.value);
                if (valueErr) {
                    return process.nextTick(callback, valueErr);
                }

                e.value = this._serializeValue(e.value);
            }

            serialized[i] = e;
        }

        this._batch(serialized, options, callback);
    }

    _batch(array, options, callback) {
        process.nextTick(callback);
    }

    clear(options, callback) {
        if (is.function(options)) {
            callback = options;
        } else if (!is.function(callback)) {
            throw new Error("clear() requires a callback argument");
        }

        options = cleanRangeOptions(this, options);
        options.reverse = Boolean(options.reverse);
        options.limit = "limit" in options ? options.limit : -1;

        this._clear(options, callback);
    }

    _clear(options, callback) {
        // Avoid setupIteratorOptions, would serialize range options a second time.
        options.keys = true;
        options.values = false;
        options.keyAsBuffer = true;
        options.valueAsBuffer = true;

        const iterator = this._iterator(options);
        const emptyOptions = {};
        const self = this;

        const next = function (err) {
            if (err) {
                return iterator.end(() => {
                    callback(err);
                });
            }

            iterator.next((err, key) => {
                if (err) {return next(err)};
                if (is.undefined(key)) {return iterator.end(callback)};

                // This could be optimized by using a batch, but the default _clear
                // is not meant to be fast. Implementations have more room to optimize
                // if they override _clear. Note: using _del bypasses key serialization.
                self._del(key, emptyOptions, next);
            });
        };

        next();
    }

    _setupIteratorOptions(options) {
        options = cleanRangeOptions(this, options);

        options.reverse = Boolean(options.reverse);
        options.keys = options.keys !== false;
        options.values = options.values !== false;
        options.limit = "limit" in options ? options.limit : -1;
        options.keyAsBuffer = options.keyAsBuffer !== false;
        options.valueAsBuffer = options.valueAsBuffer !== false;

        return options;
    }


    iterator(options) {
        if (typeof options !== "object" || is.null(options)) {
            options = {};
        }
        options = this._setupIteratorOptions(options);
        return this._iterator(options);
    }

    _iterator(options) {
        return new __.AbstractIterator(this);
    }

    _chainedBatch() {
        return new __.AbstractChainedBatch(this);
    }

    _serializeKey(key) {
        return key;
    }

    _serializeValue(value) {
        return value;
    }

    _checkKey(key) {
        if (is.nil(key)) {
            return new Error("key cannot be `null` or `undefined`");
        } else if (is.buffer(key) && key.length === 0) {
            return new Error("key cannot be an empty Buffer");
        } else if (key === "") {
            return new Error("key cannot be an empty String");
        } else if (is.array(key) && key.length === 0) {
            return new Error("key cannot be an empty Array");
        }
    }

    _checkValue(value) {
        if (is.nil(value)) {
            return new Error("value cannot be `null` or `undefined`");
        }
    }
}

