const {
    is
} = adone;

const hasOwnProperty = Object.prototype.hasOwnProperty;
const isEmptyRangeOption = (v) => v === "" || is.nil(v) || is.buffer(v) && v.length === 0;
const RANGE_KEYS = ["start", "end", "gt", "gte", "lt", "lte"];

export class AbstractIterator {
    constructor(db) {
        this.db = db;
        this._ended = false;
        this._nexting = false;
    }

    next() {
        if (this._ended) {
            throw new Error("cannot call next() after end()");
        }
        if (this._nexting) {
            throw new Error("cannot call next() before previous next() has completed");
        }

        this._nexting = true;
        return new Promise((resolve, reject) => {
            return this._next((err, result) => {
                this._nexting = false;
                return (err) ? reject(err) : resolve(result);
            });
        });
    }

    _next(callback) {
        process.nextTick(callback);
    }

    end() {
        if (this._ended) {
            throw new Error("end() already called on iterator");
        }

        this._ended = true;

        return new Promise((resolve, reject) => {
            this._end((err) => (err) ? reject(err) : resolve());
        });
    }

    _end(callback) {
        process.nextTick(callback);
    }
}


export class AbstractChainedBatch {
    constructor(db) {
        this._db = db;
        this._operations = [];
        this._written = false;
    }

    _serializeKey(key) {
        return this._db._serializeKey(key);
    }

    _serializeValue(value) {
        return this._db._serializeValue(value);
    }

    _checkWritten() {
        if (this._written) {
            throw new Error("write() already called on this batch");
        }
    }

    put(key, value) {
        this._checkWritten();

        const err = this._db._checkKey(key, "key");
        if (err) {
            throw err;
        }

        this._put(this._serializeKey(key), this._serializeValue(value));

        return this;
    }

    _put(key, value) {
        this._operations.push({ type: "put", key, value });
    }

    del(key) {
        this._checkWritten();

        const err = this._db._checkKey(key, "key");
        if (err) {
            throw err;
        }

        this._del(this._serializeKey(key));

        return this;
    }

    _del(key) {
        this._operations.push({ type: "del", key });
    }

    clear() {
        this._checkWritten();

        this._operations.length = 0;

        this._clear();

        return this;
    }

    _clear() {
    }

    write(options = {}) {
        this._checkWritten();
        this._written = true;

        return new Promise((resolve, reject) => {
            const cb = (err) => (err) ? reject(err) : resolve();
            if (is.function(this._write)) {
                this._write(cb);
            } else if (is.function(this._db._batch)) {
                this._db._batch(this._operations, options, cb);
            } else {
                resolve();
            }
        });
    }
}

export class AbstractBackend {
    constructor(location) {
        if (!is.string(location)) {
            throw new adone.error.InvalidArgument("AbstractBackend constructor requires a location string argument");
        }

        this.location = location;
        this.status = "new";
    }

    open(options = {}) {
        options.createIfMissing = options.createIfMissing !== false;
        options.errorIfExists = Boolean(options.errorIfExists);

        const oldStatus = this.status;
        this.status = "opening";
        return new Promise((resolve, reject) => {
            this._open(options, (err) => {
                if (err) {
                    this.status = oldStatus;
                    return reject(err);
                }
                this.status = "open";
                resolve();
            });
        });
    }

    _open(options, callback) {
        process.nextTick(callback);
    }

    close() {
        const oldStatus = this.status;
        this.status = "closing";
        return new Promise((resolve, reject) => {
            this._close((err) => {
                if (err) {
                    this.status = oldStatus;
                    return reject(err);
                }
                this.status = "closed";
                resolve();
            });
        });
    }

    _close(callback) {
        process.nextTick(callback);
    }

    get(key, options = {}) {
        this._checkKey(key, "key");
        options.asBuffer = options.asBuffer !== false;

        return new Promise((resolve, reject) => {
            this._get(this._serializeKey(key), options, (err, value) => (err) ? reject(err) : resolve(value));
        });
    }

    _get(key, options, callback) {
        process.nextTick(() => callback(new adone.error.NotImplemented("Method AbstractBackend#_get() is not implemented")));
    }

    put(key, value, options = {}) {
        this._checkKey(key, "key");

        return new Promise((resolve, reject) => {
            this._put(this._serializeKey(key), this._serializeValue(value), options, (err) => (err) ? reject(err) : resolve());
        });
    }

    _put(key, value, options, callback) {
        process.nextTick(callback);
    }

    del(key, options = {}) {
        this._checkKey(key, "key");

        return new Promise((resolve, reject) => {
            return this._del(this._serializeKey(key), options, (err) => (err) ? reject(err) : resolve());
        });
    }

    _del(key, options, callback) {
        process.nextTick(callback);
    }

    batch(array, options) {
        if (arguments.length === 0) {
            return this._chainedBatch();
        }

        if (!is.array(array)) {
            throw new Error("batch(array) requires an array argument");
        }

        options = {
            ...options
        };

        const serialized = new Array(array.length);

        for (let i = 0; i < array.length; i++) {
            if (typeof array[i] !== "object" || is.null(array[i])) {
                throw new Error("batch(array) element must be an object and not `null`");
            }

            const e = {
                ...array[i]
            };

            if (e.type !== "put" && e.type !== "del") {
                throw new Error("`type` must be 'put' or 'del'");
            }
            this._checkKey(e.key, "key");
            e.key = this._serializeKey(e.key);

            if (e.type === "put") {
                e.value = this._serializeValue(e.value);
            }

            serialized[i] = e;
        }

        return new Promise((resolve, reject) => {
            this._batch(serialized, options, (err) => (err) ? reject(err) : resolve());
        });
    }

    _batch(array, options, callback) {
        process.nextTick(callback);
    }

    _chainedBatch() {
        return new AbstractChainedBatch(this);
    }

    iterator(options = {}) {
        return this._iterator(this._setupIteratorOptions(options));
    }

    _setupIteratorOptions(options) {
        const normOptions = {};

        for (const k in options) {
            if (!hasOwnProperty.call(options, k) || (RANGE_KEYS.includes(k) && isEmptyRangeOption(options[k]))) {
                continue;
            }
            normOptions[k] = options[k];
        }

        normOptions.reverse = Boolean(normOptions.reverse);
        normOptions.keys = normOptions.keys !== false;
        normOptions.values = normOptions.values !== false;
        normOptions.limit = "limit" in normOptions ? normOptions.limit : -1;
        normOptions.keyAsBuffer = normOptions.keyAsBuffer !== false;
        normOptions.valueAsBuffer = normOptions.valueAsBuffer !== false;
        return normOptions;
    }

    _iterator() {
        return new AbstractIterator(this);
    }

    _serializeKey(key) {
        return is.buffer(key) ? key : String(key);
    }

    _serializeValue(value) {
        if (is.nil(value)) {
            return "";
        }
        return is.buffer(value) ? value : String(value);
    }

    _checkKey(obj, type) {
        if (is.nil(obj)) {
            throw new Error(`${type} cannot be \`null\` or \`undefined\``);
        }
        if (is.buffer(obj) && obj.length === 0) {
            throw new Error(`${type} cannot be an empty Buffer`);
        } else if (String(obj) === "") {
            throw new Error(`${type} cannot be an empty String`);
        }
    }
}
