const { is } = adone;

export const isLevelDOWN = (db) => {
    if (!db || typeof db !== "object") {
        return false;
    }
    return Object.keys(adone.database.level.AbstractBackend.prototype).filter((name) => {
        // TODO remove approximateSize check when method is gone
        return name[0] !== "_" && name !== "approximateSize";
    }).every((name) => {
        return typeof db[name] === "function";
    });
};

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
        if (is.function(this._next)) {
            return this._next().then((result) => {
                this._nexting = false;
                return result;
            });
        }

        return new Promise((resolve) => {
            process.nextTick(() => {
                this._nexting = false;
                resolve();
            });
        });
    }

    end(callback) {
        if (typeof callback !== "function") {
            throw new Error("end() requires a callback argument");
        }

        if (this._ended) {
            return callback(new Error("end() already called on iterator"));
        }

        this._ended = true;

        if (typeof this._end === "function") {
            return this._end(callback);
        }

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

        const err = this._db._checkKey(key, "key", this._db._isBuffer);
        if (err) {
            throw err;
        }

        key = this._serializeKey(key);
        value = this._serializeValue(value);

        if (is.function(this._put)) {
            this._put(key, value);
        } else {
            this._operations.push({ type: "put", key, value });
        }

        return this;
    }

    del(key) {
        this._checkWritten();

        const err = this._db._checkKey(key, "key", this._db._isBuffer);
        if (err) {
            throw err;
        }

        key = this._serializeKey(key);

        if (is.function(this._del)) {
            this._del(key);
        } else {
            this._operations.push({ type: "del", key });
        }

        return this;
    }

    clear() {
        this._checkWritten();

        this._operations = [];

        if (is.function(this._clear)) {
            this._clear();
        }

        return this;
    }

    write(options = {}) {
        this._checkWritten();

        this._written = true;

        if (is.function(this._write)) {
            return new Promise((resolve, reject) => {
                this._write((err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }

        if (is.function(this._db._batch)) {
            return new Promise((resolve, reject) => {
                this._db._batch(this._operations, options, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    }
}

export class AbstractBackend {
    constructor(location) {
        if (!arguments.length || location === undefined) {
            throw new Error("constructor requires at least a location argument");
        }

        if (!is.string(location)) {
            throw new Error("constructor requires a location string argument");
        }

        this.location = location;
        this.status = "new";
    }

    open(options = { createIfMissing: true, errorIfExists: false }) {
        const oldStatus = this.status;

        if (is.function(this._open)) {
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
        } else {
            this.status = "open";
        }
    }

    close() {
        const oldStatus = this.status;

        if (is.function(this._close)) {
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
        } else {
            this.status = "closed";
        }
    }

    get(key, options = { asBuffer: true }) {
        this._checkKey(key, "key");

        key = this._serializeKey(key);

        if (is.function(this._get)) {
            return new Promise((resolve, reject) => {
                this._get(key, options, (err, value) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(value);
                });
            });
        }
    }

    put(key, value, options = {}) {
        this._checkKey(key, "key");

        key = this._serializeKey(key);
        value = this._serializeValue(value);

        if (is.function(this._put)) {
            return new Promise((resolve, reject) => {
                this._put(key, value, options, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    }

    del(key, options = {}) {
        this._checkKey(key, "key");

        key = this._serializeKey(key);

        if (is.function(this._del)) {
            return new Promise((resolve, reject) => {
                return this._del(key, options, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    }

    chainedBatch() {
        return new AbstractChainedBatch(this);
    }

    batch(array, options = {}) {
        if (!is.array(array)) {
            throw new Error("batch(array) requires an array argument");
        }

        let i = 0;
        const l = array.length;
        let e;

        for (; i < l; i++) {
            e = array[i];
            if (typeof e !== "object") {
                continue;
            }

            this._checkKey(e.type, "type");
            this._checkKey(e.key, "key");
        }

        if (is.function(this._batch)) {
            return new Promise((resolve, reject) => {
                this._batch(array, options, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    }

    //TODO: remove from here, not a necessary primitive
    approximateSize(start, end, callback) {
        if (start == null || end == null || typeof start === "function" || typeof end === "function") {
            throw new Error("approximateSize() requires valid `start`, `end` and `callback` arguments");
        }

        if (typeof callback !== "function") {
            throw new Error("approximateSize() requires a callback argument");
        }

        start = this._serializeKey(start);
        end = this._serializeKey(end);

        if (typeof this._approximateSize === "function") {
            return this._approximateSize(start, end, callback);
        }

        process.nextTick(() => {
            callback(null, 0);
        });
    }

    _setupIteratorOptions(options) {
        options = Object.assign({}, options);

        ["start", "end", "gt", "gte", "lt", "lte"].forEach((o) => {
            if (options[o] && this._isBuffer(options[o]) && options[o].length === 0) {
                delete options[o];
            }
        });

        options.reverse = Boolean(options.reverse);
        options.keys = options.keys !== false;
        options.values = options.values !== false;
        options.limit = "limit" in options ? options.limit : -1;
        options.keyAsBuffer = options.keyAsBuffer !== false;
        options.valueAsBuffer = options.valueAsBuffer !== false;

        return options;
    }

    iterator(options = {}) {
        options = this._setupIteratorOptions(options);

        if (is.function(this._iterator)) {
            return this._iterator(options);
        }

        return new AbstractIterator(this);
    }

    _isBuffer(obj) {
        return Buffer.isBuffer(obj);
    }

    _serializeKey(key) {
        return this._isBuffer(key) ? key : String(key);
    }

    _serializeValue(value) {
        return this._isBuffer(value) || process.browser || value == null ? value : String(value);
    }

    _checkKey(obj, type) {
        if (obj === null || obj === undefined) {
            throw new Error(`${type} cannot be \`null\` or \`undefined\``);
        }
        if (this._isBuffer(obj) && obj.length === 0) {
            throw new Error(`${type} cannot be an empty Buffer`);
        } else if (String(obj) === "") {
            throw new Error(`${type} cannot be an empty String`);
        }
    }
}
