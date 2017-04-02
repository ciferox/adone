const { is, x, database: { level: { Codec, util: { getOptions, defaultOptions } } } } = adone;

class IteratorStream extends adone.std.stream.Readable {
    constructor(iterator, options) {
        super(Object.assign({}, options, {
            objectMode: true
        }));
        this._iterator = iterator;
        this._destroyed = false;
        this._decoder = null;
        if (options && options.decoder) {
            this._decoder = options.decoder;
        }
        this.on("end", this._cleanup.bind(this));
    }

    _read() {
        if (this._destroyed) {
            return;
        }

        this._iterator.next().catch((err) => this.emit("error", err)).then((result) => {
            if (this._destroyed) {
                return;
            }
            if (result === undefined) {
                this.push(null);
            } else {
                let value;
                if (!this._decoder) {
                    return this.push(result);
                }

                try {
                    value = this._decoder(result.key, result.value);
                } catch (err) {
                    this.emit("error", new x.Encoding(err));
                    this.push(null);
                    return;
                }
                this.push(value);
            }
        });
    }

    _cleanup = function () {
        if (this._destroyed) {
            return;
        }
        this._destroyed = true;

        this._iterator.end((err) => {
            if (err) {
                return this.emit("error", err);
            }
            this.emit("close");
        });
    }
}
IteratorStream.prototype.destroy = IteratorStream.prototype._cleanup;


// Possible LevelUP#_status values:
//  - 'new'     - newly created, not opened or closed
//  - 'opening' - waiting for the database to be opened, post open()
//  - 'open'    - successfully opened the database, available for use
//  - 'closing' - waiting for the database to be closed, post close()
//  - 'closed'  - database has been successfully closed, should not be
//                 used except for another open() operation

export default class DB extends adone.EventEmitter {
    constructor(location, options) {
        super();

        this.setMaxListeners(Infinity);

        if (is.function(location)) {
            options = typeof options === "object" ? options : {};
            options.db = location;
            location = null;
        } else if (typeof location === "object" && typeof location.db === "function") {
            options = location;
            location = null;
        }

        if ((!options || typeof options.db !== "function") && typeof location !== "string") {
            throw new x.DatabaseInitialization("Must provide a location for the database");
        }

        options = getOptions(options);
        this.options = Object.assign({}, defaultOptions, options);
        this._codec = new Codec(this.options);
        this._status = "new";
        // set this.location as enumerable but not configurable or writable
        Object.defineProperty(this, "location", {
            enumerable: true,
            value: location
        });
    }

    async open() {
        if (!this.isOpen()) {
            this.emit("opening");

            this._status = "opening";
            const Backend = this.options.db || adone.database.level.backend.Default;
            if (is.class(Backend)) {
                this.db = new Backend(this.location);
            } else {
                this.db = Backend();
            }

            try {
                await this.db.open(this.options);
                this._status = "open";
                this.emit("open");
                this.emit("ready");
            } catch (err) {
                err = new x.DatabaseOpen(err);
                this.emit("error", err);
                throw err;
            }
        }
        return this;
    }

    async close() {
        if (this.isOpen()) {
            this._status = "closing";
            this.emit("closing");
            await this.db.close();
            this._status = "closed";
            this.emit("closed");
        } else if (this._isOpening()) {
            return new Promise((resolve, reject) => {
                this.once("open", () => {
                    this.close().catch(reject).then(resolve);
                });
            });
        }
    }

    isOpen() {
        return this._status === "open";
    }

    _isOpening() {
        return this._status === "opening";
    }

    isClosed() {
        return (/^clos/).test(this._status);
    }

    async get(key_, options = {}) {
        this.maybeError();

        if (key_ === null || key_ === undefined) {
            const err = new x.DatabaseRead("get() requires key argument");
            this.emit("error", err);
            throw err;
        }

        const key = this._codec.encodeKey(key_, options);

        options.asBuffer = this._codec.valueAsBuffer(options);

        try {
            let value = await this.db.get(key, options);

            try {
                value = this._codec.decodeValue(value, options);
            } catch (err) {
                err = new x.Encoding(err);
                this.emit("error", err);
                throw err;
            }
            return value;
        } catch (err) {
            if ((/notfound/i).test(err) || err.notFound) {
                err = new x.NotFound(`Key not found in database [${key_}]`, err);
            } else if (!(err instanceof x.Encoding)) {
                err = new x.DatabaseRead(err);
            }
            this.emit("error", err);
            throw err;
        }
    }

    async put(key_, value_, options = {}) {
        this.maybeError();

        if (key_ === null || key_ === undefined) {
            const err = new x.DatabaseWrite("put() requires a key argument");
            this.emit("error", err);
            throw err;
        }

        const key = this._codec.encodeKey(key_, options);
        const value = this._codec.encodeValue(value_, options);

        try {
            await this.db.put(key, value, options);
            this.emit("put", key_, value_);
        } catch (err) {
            err = new x.DatabaseWrite(err);
            this.emit("error", err);
            throw err;
        }
    }

    async del(key_, options = {}) {
        this.maybeError();

        if (key_ === null || key_ === undefined) {
            const err = new x.DatabaseWrite("del() requires a key argument");
            this.emit("error", err);
            throw err;
        }

        const key = this._codec.encodeKey(key_, options);

        try {
            await this.db.del(key, options);
            this.emit("del", key_);
        } catch (err) {
            err = new x.DatabaseWrite(err);
            this.emit("error", err);
            throw err;
        }
    }

    async batch(arr_, options = {}) {
        let arr;

        this.maybeError();

        if (!is.array(arr_)) {
            const err = new x.DatabaseWrite("batch() requires an array argument");
            this.emit("error", err);
            throw err;
        }

        arr = this._codec.encodeBatch(arr_, options);
        arr = arr.map((op) => {
            if (!op.type && op.key !== undefined && op.value !== undefined) {
                op.type = "put";
            }
            return op;
        });

        try {
            await this.db.batch(arr, options);
            this.emit("batch", arr_);
        } catch (err) {
            err = new x.DatabaseWrite(err);
            this.emit("error", err);
            throw err;
        }
    }

    createReadStream(options) {
        options = Object.assign({ keys: true, values: true }, this.options, options);

        options.keyEncoding = options.keyEncoding;
        options.valueEncoding = options.valueEncoding;

        options = this._codec.encodeLtgt(options);
        options.keyAsBuffer = this._codec.keyAsBuffer(options);
        options.valueAsBuffer = this._codec.valueAsBuffer(options);

        if (!is.number(options.limit)) {
            options.limit = -1;
        }

        return new IteratorStream(this.db.iterator(options), Object.assign({}, options, {
            decoder: this._codec.createStreamDecoder(options)
        }));
    }

    createKeyStream(options = {}) {
        return this.createReadStream(Object.assign({}, options, { keys: true, values: false }));
    }

    createValueStream(options = {}) {
        return this.createReadStream(Object.assign({}, options, { keys: false, values: true }));
    }

    maybeError() {
        if (!this._isOpening() && !this.isOpen()) {
            const err = new x.DatabaseRead("Database is not open");
            this.emit("error", err);
            throw err;
        }
    }
}
