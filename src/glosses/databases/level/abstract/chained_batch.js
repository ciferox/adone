const {
    is
} = adone;

export default class AbstractChainedBatch {
    constructor(db) {
        if (typeof db !== "object" || is.null(db)) {
            throw new TypeError("First argument must be an abstract-leveldown compliant store");
        }

        this.db = db;
        this._operations = [];
        this._written = false;
    }

    _checkWritten() {
        if (this._written) {
            throw new Error("write() already called on this batch");
        }
    }

    put(key, value) {
        this._checkWritten();

        const err = this.db._checkKey(key) || this.db._checkValue(value);
        if (err) {
            throw err;
        }

        key = this.db._serializeKey(key);
        value = this.db._serializeValue(value);

        this._put(key, value);

        return this;
    }

    _put(key, value) {
        this._operations.push({ type: "put", key, value });
    }

    del(key) {
        this._checkWritten();

        const err = this.db._checkKey(key);
        if (err) {
            throw err;
        }

        key = this.db._serializeKey(key);
        this._del(key);

        return this;
    }

    _del(key) {
        this._operations.push({ type: "del", key });
    }

    clear() {
        this._checkWritten();
        this._clear();

        return this;
    }

    _clear() {
        this._operations = [];
    }

    write(options, callback) {
        this._checkWritten();

        if (is.function(options)) {
            callback = options;
        }
        if (!is.function(callback)) {
            throw new Error("write() requires a callback argument");
        }
        if (typeof options !== "object" || is.null(options)) {
            options = {};
        }

        this._written = true;
        this._write(options, callback);
    }

    _write(options, callback) {
        this.db._batch(this._operations, options, callback);
    }
}
