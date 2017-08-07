const { is } = adone;

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
            return new Promise((resolve, reject) => {
                return this._next((err, result) => {
                    this._nexting = false;
                    if (err) {
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        }

        return new Promise((resolve) => {
            process.nextTick(() => {
                this._nexting = false;
                resolve();
            });
        });
    }

    end() {
        if (this._ended) {
            throw new Error("end() already called on iterator");
        }

        this._ended = true;

        if (is.function(this._end)) {
            return new Promise((resolve, reject) => {
                this._end((err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }

        return new Promise((resolve) => process.nextTick(resolve));
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

        const err = this._db._checkKey(key, "key");
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
        if (!arguments.length || is.undefined(location)) {
            throw new Error("constructor requires at least a location argument");
        }

        if (!is.string(location)) {
            throw new Error("constructor requires a location string argument");
        }

        this.location = location;
        this.status = "new";
    }

    open(options) {
        options = Object.assign({ createIfMissing: true, errorIfExists: false }, options);
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
        } 
        this.status = "open";
        
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
        } 
        this.status = "closed";
        
    }

    get(key, options) {
        options = Object.assign({ asBuffer: true }, options);
        this._checkKey(key, "key");

        key = this._serializeKey(key);

        return new Promise((resolve, reject) => {
            this._get(key, options, (err, value) => {
                if (err) {
                    return reject(err);
                }
                resolve(value);
            });
        });
    }

    put(key, value, options = {}) {
        this._checkKey(key, "key");

        key = this._serializeKey(key);
        value = this._serializeValue(value);

        return new Promise((resolve, reject) => {
            this._put(key, value, options, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    del(key, options = {}) {
        this._checkKey(key, "key");

        key = this._serializeKey(key);

        return new Promise((resolve, reject) => {
            return this._del(key, options, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    chainedBatch() {
        return new AbstractChainedBatch(this);
    }

    batch(array, options) {
        options = Object.assign({}, options);
        if (!is.array(array)) {
            throw new Error("batch(array) requires an array argument");
        }

        let i = 0;
        const l = array.length;
        let e;

        for (; i < l; i++) {
            e = array[i];
            if (!is.object(e)) {
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
        if (is.nil(start) || is.nil(end) || is.function(start) || is.function(end)) {
            throw new Error("approximateSize() requires valid `start`, `end` and `callback` arguments");
        }

        if (!is.function(callback)) {
            throw new Error("approximateSize() requires a callback argument");
        }

        start = this._serializeKey(start);
        end = this._serializeKey(end);

        if (is.function(this._approximateSize)) {
            return this._approximateSize(start, end, callback);
        }

        process.nextTick(() => {
            callback(null, 0);
        });
    }

    iterator(options) {
        options = Object.assign({}, options);

        ["start", "end", "gt", "gte", "lt", "lte"].forEach((o) => {
            if (options[o] && is.buffer(options[o]) && options[o].length === 0) {
                delete options[o];
            }
        });

        options.reverse = Boolean(options.reverse);
        options.keys = options.keys !== false;
        options.values = options.values !== false;
        options.limit = "limit" in options ? options.limit : -1;
        options.keyAsBuffer = options.keyAsBuffer !== false;
        options.valueAsBuffer = options.valueAsBuffer !== false;

        if (is.function(this._iterator)) {
            return this._iterator(options);
        }

        return new AbstractIterator(this);
    }

    _serializeKey(key) {
        return is.buffer(key) ? key : String(key);
    }

    _serializeValue(value) {
        return is.buffer(value) || process.browser || is.nil(value) ? value : String(value);
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
