import promisify from "./promisify";

const {
    event,
    error: { DatabaseOpenException, DatabaseReadException, DatabaseWriteException, DatabaseInitializationException, NotFoundException },
    database: { level: { streamFromIterator, Batch, getOptions, getCallback, backend: { Deferred } } },
    is
} = adone;

const maybeError = function (db, callback) {
    if (!db._isOpening() && !db.isOpen()) {
        process.nextTick(callback, new DatabaseReadException("Database is not open"));
        return true;
    }
};

// Possible AbstractLevelDOWN#status values:
//  - 'new'     - newly created, not opened or closed
//  - 'opening' - waiting for the database to be opened, post open()
//  - 'open'    - successfully opened the database, available for use
//  - 'closing' - waiting for the database to be closed, post close()
//  - 'closed'  - database has been successfully closed, should not be
//                 used except for another open() operation

export default class DB extends event.Emitter {
    constructor(db, options, callback) {
        super();

        let error;

        this.setMaxListeners(Infinity);

        if (is.function(options)) {
            callback = options;
            options = {};
        }

        options = options || {};

        if (!db || typeof db !== "object") {
            error = new DatabaseInitializationException("First argument must be an abstract backend compliant store");
            if (is.function(callback)) {
                return process.nextTick(callback, error);
            }
            throw error;
        }

        if (!is.string(db.status)) {
            throw new TypeError(".status required, old abstract backend");
        }

        this.options = getOptions(options);
        this._db = db;
        this.db = new Deferred(db);
        this.open(callback);
    }

    open(opts, callback) {
        let promise;

        if (is.function(opts)) {
            callback = opts;
            opts = null;
        }

        if (!callback) {
            callback = promisify();
            promise = callback.promise;
        }

        if (!opts) {
            opts = this.options;
        }

        if (this.isOpen()) {
            process.nextTick(callback, null, this);
            return promise;
        }

        if (this._isOpening()) {
            this.once("open", () => {
                callback(null, this);
            });
            return promise;
        }

        this.emit("opening");

        this.db.open(opts, (err) => {
            if (err) {
                return callback(new DatabaseOpenException(err));
            }
            this.db = this._db;
            callback(null, this);
            this.emit("open");
            this.emit("ready");
        });

        return promise;
    }

    close(callback) {
        let promise;

        if (!callback) {
            callback = promisify();
            promise = callback.promise;
        }

        if (this.isOpen()) {
            this.db.close((...args) => {
                this.emit("closed");
                callback.apply(null, args);
            });
            this.emit("closing");
            this.db = new Deferred(this._db);
        } else if (this.isClosed()) {
            process.nextTick(callback);
        } else if (this.db.status === "closing") {
            this.once("closed", callback);
        } else if (this._isOpening()) {
            this.once("open", () => {
                this.close(callback);
            });
        }

        return promise;
    }

    isOpen() {
        return this.db.status === "open";
    }

    _isOpening() {
        return this.db.status === "opening";
    }

    isClosed() {
        return (/^clos|new/).test(this.db.status);
    }

    get(key, options, callback) {
        if (is.nil(key)) {
            throw new DatabaseReadException("get() requires a key argument");
        }

        let promise;

        callback = getCallback(options, callback);

        if (!callback) {
            callback = promisify();
            promise = callback.promise;
        }

        if (maybeError(this, callback)) {
            return promise;
        }

        options = getOptions(options);

        this.db.get(key, options, (err, value) => {
            if (err) {
                if ((/notfound/i).test(err) || err.notFound) {
                    err = new NotFoundException(`Key not found in database [${key}]`, err);
                } else {
                    err = new DatabaseReadException(err);
                }
                return callback(err);
            }
            callback(null, value);
        });

        return promise;
    }

    put(key, value, options, callback) {
        if (is.nil(key)) {
            throw new DatabaseWriteException("put() requires a key argument");
        }

        let promise;

        callback = getCallback(options, callback);

        if (!callback) {
            callback = promisify();
            promise = callback.promise;
        }

        if (maybeError(this, callback)) {
            return promise;
        }

        options = getOptions(options);

        this.db.put(key, value, options, (err) => {
            if (err) {
                return callback(new DatabaseWriteException(err));
            }
            this.emit("put", key, value);
            callback();
        });

        return promise;
    }

    del(key, options, callback) {
        if (is.nil(key)) {
            throw new DatabaseWriteException("del() requires a key argument");
        }

        let promise;

        callback = getCallback(options, callback);

        if (!callback) {
            callback = promisify();
            promise = callback.promise;
        }

        if (maybeError(this, callback)) {
            return promise;
        }

        options = getOptions(options);

        this.db.del(key, options, (err) => {
            if (err) {
                return callback(new DatabaseWriteException(err));
            }
            this.emit("del", key);
            callback();
        });

        return promise;
    }

    batch(arr, options, callback) {
        if (!arguments.length) {
            return new Batch(this);
        }

        if (!is.array(arr)) {
            throw new DatabaseWriteException("batch() requires an array argument");
        }

        let promise;

        callback = getCallback(options, callback);

        if (!callback) {
            callback = promisify();
            promise = callback.promise;
        }

        if (maybeError(this, callback)) {
            return promise;
        }

        options = getOptions(options);

        this.db.batch(arr, options, (err) => {
            if (err) {
                return callback(new DatabaseWriteException(err));
            }
            this.emit("batch", arr);
            callback();
        });

        return promise;
    }

    iterator(options) {
        return this.db.iterator(options);
    }

    clear(options, callback) {
        let promise;

        callback = getCallback(options, callback);
        options = getOptions(options);

        if (!callback) {
            callback = promisify();
            promise = callback.promise;
        }

        if (maybeError(this, callback)) {
            return promise;
        }

        this.db.clear(options, (err) => {
            if (err) {
                return callback(new DatabaseWriteException(err));
            }
            this.emit("clear", options);
            callback();
        });

        return promise;
    }

    createReadStream(options) {
        options = Object.assign({ keys: true, values: true }, options);
        if (!is.number(options.limit)) {
            options.limit = -1;
        }
        return streamFromIterator(this.db.iterator(options), options);
    }

    createKeyStream(options) {
        return this.createReadStream(Object.assign({}, options, { keys: true, values: false }));
    }

    createValueStream(options) {
        return this.createReadStream(Object.assign({}, options, { keys: false, values: true }));
    }

    toString() {
        return "Level";
    }
}
