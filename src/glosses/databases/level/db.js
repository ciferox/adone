const { is, x, database: { level: { Codec } } } = adone;

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
            if (is.undefined(result)) {
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

// Possible status values:
//  - 'new'     - newly created, not opened or closed
//  - 'opening' - waiting for the database to be opened, post open()
//  - 'open'    - successfully opened the database, available for use
//  - 'closing' - waiting for the database to be closed, post close()
//  - 'closed'  - database has been successfully closed, should not be
//                 used except for another open() operation

const BINARY_CODECS = ["bson", "mpak"];

export default class DB extends adone.EventEmitter {
    constructor(options = {}) {
        super();

        if (!is.class(options.db) && !is.string(options.location)) {
            throw new x.DatabaseInitialization("Must provide a location for the database");
        }

        this.options = Object.assign({
            createIfMissing: true,
            errorIfExists: false,
            keyEncoding: "utf8",
            valueEncoding: "utf8",
            compression: true
        }, options);

        if (is.plainObject(options.encryption)) {
            // Force binary encoding of key/value for encryption mode 
            this.options.keyEncoding = BINARY_CODECS.includes(this.options.keyEncoding) ? this.options.keyEncoding : "binary";
            this.options.valueEncoding = BINARY_CODECS.includes(this.options.valueEncoding) ? this.options.valueEncoding : "binary";

            if (is.buffer(options.encryption.key)) {
                adone.vendor.lodash.defaults(this.options.encryption, {
                    algorithm: "aes-256-cbc",
                    ivBytes: 16
                });
            } else {
                adone.vendor.lodash.defaults(this.options.encryption, {
                    saltBytes: 32,
                    digest: "sha256",
                    keyBytes: 32,
                    iterations: 64000,
                    algorithm: "aes-256-cbc",
                    ivBytes: 16
                });

                const encOptions = this.options.encryption;

                if (!is.string(encOptions.password) && !is.buffer(encOptions.password)) {
                    throw new adone.x.NotValid("Password is not valid");
                }

                if (!is.undefined(encOptions.salt)) {
                    encOptions.key = adone.std.crypto.pbkdf2Sync(encOptions.password, encOptions.salt, encOptions.iterations, encOptions.keyBytes, encOptions.digest);
                }
            }
        }

        this._codec = new Codec(this.options);
        this._status = "new";

        this.setMaxListeners(Infinity);
    }

    get location() {
        return this.options.location;
    }

    async open() {
        if (!this.isOpen()) {
            this.emit("opening");

            this._status = "opening";
            const Backend = this.options.db || adone.database.level.backend.Default;

            if (is.plainObject(this.options.encryption)) {
                const encOptions = this.options.encryption;

                class XBackend extends Backend {
                    _get(key, options, callback) {
                        return super._get(this._hashKey(key), options, (err, value) => {
                            if (err) {
                                return callback(err, value);
                            }
                            callback(err, this._decryptValue(value));
                        });
                    }

                    _put(key, value, options, callback) {
                        return super._put(this._hashKey(key), this._encryptValue(value), options, callback);
                    }

                    _del(key, options, callback) {
                        return super._del(this._hashKey(key), options, callback);
                    }

                    _batch(operations, options, callback) {
                        for (const op of operations) {
                            op.key = this._hashKey(op.key);
                            if (op.type === "put") {
                                op.value = this._encryptValue(op.value);
                            }
                        }
                        return super._batch(operations, options, callback);
                    }

                    _hashKey(key) {
                        return adone.std.crypto.createHash("sha256").update(key).digest();
                    }

                    _encryptValue(value) {
                        let salt;
                        let encKey;
                        if (is.undefined(encOptions.key)) {
                            salt = adone.std.crypto.randomBytes(encOptions.saltBytes);
                            encKey = adone.std.crypto.pbkdf2Sync(encOptions.password, salt, encOptions.iterations, encOptions.keyBytes, encOptions.digest);
                        } else {
                            salt = encOptions.salt;
                            encKey = encOptions.key;
                        }
                        const iv = encOptions.iv || adone.std.crypto.randomBytes(encOptions.ivBytes);
                        const cipher = adone.std.crypto.createCipheriv(encOptions.algorithm, encKey, iv);
                        const ciphered = Buffer.concat([cipher.update(value), cipher.final()]);
                        const parts = [
                            iv,
                            ciphered
                        ];

                        if (is.undefined(encOptions.salt)) {
                            parts.push(salt);
                        }

                        return adone.data.mpak.encode(parts);
                    }

                    _decryptValue(value) {
                        const parts = adone.data.mpak.decode(value);
                        let key;

                        if (is.undefined(encOptions.key)) {
                            key = adone.std.crypto.pbkdf2Sync(encOptions.password, parts[2], encOptions.iterations, encOptions.keyBytes, encOptions.digest);
                        } else {
                            key = encOptions.key;
                        }

                        const decipher = adone.std.crypto.createDecipheriv(encOptions.algorithm, key, parts[0]);
                        return Buffer.concat([decipher.update(parts[1]), decipher.final()]);
                    }

                    _unserialize(buf) {
                        const parts = [];
                        const l = buf.length;
                        let idx = 0;
                        while (idx < l) {
                            const dlen = buf.readUInt32BE(idx);
                            idx += 4;
                            const start = idx;
                            const end = start + dlen;
                            const part = buf.slice(start, end);
                            parts.push(part);
                            idx += part.length;
                        }
                        return parts;
                    }
                }

                this.db = new XBackend(this.location);
            } else {
                this.db = new Backend(this.location);
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

    async get(key_, options) {
        this.maybeError();

        const key = this._codec.encodeKey(key_, options);

        options = options || {};
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
                err = new x.NotFound(`Key '${key_}' not found in database`, err);
            } else if (!(err instanceof x.Encoding)) {
                err = new x.DatabaseRead(err);
            }
            this.emit("error", err);
            throw err;
        }
    }

    async put(key_, value_, options) {
        this.maybeError();

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

    async del(key_, options) {
        this.maybeError();

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
            if (!op.type && !is.undefined(op.key) && !is.undefined(op.value)) {
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
