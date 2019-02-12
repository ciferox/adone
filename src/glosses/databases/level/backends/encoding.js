const {
    is,
    error: { EncodingException },
    database: { level: { Codec, AbstractBackend, AbstractChainedBatch, AbstractIterator } }
} = adone;

class Iterator extends AbstractIterator {
    constructor(db, opts) {
        super(db);
        this.codec = db.codec;
        this.keys = opts.keys;
        this.values = opts.values;
        this.opts = this.codec.encodeLtgt(opts);
        this.it = db.db.iterator(this.opts);
    }

    _next(cb) {
        this.it.next((err, key, value) => {
            if (err) {
                return cb(err);
            }
            try {
                if (this.keys && !is.undefined(key)) {
                    key = this.codec.decodeKey(key, this.opts);
                } else {
                    key = undefined;
                }

                if (this.values && !is.undefined(value)) {
                    value = this.codec.decodeValue(value, this.opts);
                } else {
                    value = undefined;
                }
            } catch (err) {
                return cb(new EncodingException(err));
            }
            cb(null, key, value);
        });
    }

    _end(cb) {
        this.it.end(cb);
    }
}

class Batch extends AbstractChainedBatch {
    constructor(db, codec) {
        super(db);
        this.codec = db.codec;
        this.batch = db.db.batch();
    }

    _put(key, value) {
        key = this.codec.encodeKey(key);
        value = this.codec.encodeValue(value);
        this.batch.put(key, value);
    }

    _del(key) {
        key = this.codec.encodeKey(key);
        this.batch.del(key);
    }

    _clear() {
        this.batch.clear();
    }

    _write(opts, cb) {
        this.batch.write(opts, cb);
    }
}


export default class EncodingBackend extends AbstractBackend {
    constructor(db, opts) {
        super("");

        opts = opts || {};
        if (is.undefined(opts.keyEncoding)) {
            opts.keyEncoding = "utf8";
        }
        if (is.undefined(opts.valueEncoding)) {
            opts.valueEncoding = "utf8";
        }

        if (opts.valueEncoding === "mpak") {
            // Allow `null` and `undefined` values.
            this._checkValue = function (value) {
            };
        }

        this.db = db;
        this.codec = new Codec(opts);
    }

    _serializeKey(datum) {
        return datum;
    }

    _serializeValue(datum) {
        return datum;
    }

    _open(opts, cb) {
        this.db.open(opts, cb);
    }

    _close(cb) {
        this.db.close(cb);
    }

    _put(key, value, opts, cb) {
        key = this.codec.encodeKey(key, opts);
        value = this.codec.encodeValue(value, opts);
        this.db.put(key, value, opts, cb);
    }

    _get(key, opts, cb) {
        key = this.codec.encodeKey(key, opts);
        opts.asBuffer = this.codec.valueAsBuffer(opts);
        this.db.get(key, opts, (err, value) => {
            if (err) {
                return cb(err);
            }
            try {
                value = this.codec.decodeValue(value, opts);
            } catch (err) {
                return cb(new EncodingException(err));
            }
            cb(null, value);
        });
    }

    _del(key, opts, cb) {
        key = this.codec.encodeKey(key, opts);
        this.db.del(key, opts, cb);
    }

    _chainedBatch() {
        return new Batch(this);
    }

    _batch(ops, opts, cb) {
        ops = this.codec.encodeBatch(ops, opts);
        this.db.batch(ops, opts, cb);
    }

    _iterator(opts) {
        opts.keyAsBuffer = this.codec.keyAsBuffer(opts);
        opts.valueAsBuffer = this.codec.valueAsBuffer(opts);
        return new Iterator(this, opts);
    }

    approximateSize(start, end, opts, cb) {
        start = this.codec.encodeKey(start, opts);
        end = this.codec.encodeKey(end, opts);
        return this.db.approximateSize(start, end, opts, cb);
    }
}
