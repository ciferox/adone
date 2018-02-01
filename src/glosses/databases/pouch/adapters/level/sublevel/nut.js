const {
    is,
    util: {
        ltgt,
        clone
    }
} = adone;

const isFunction = (f) => {
    return is.function(f);
};

const getPrefix = (db) => {
    if (isFunction(db.prefix)) {
        return db.prefix();
    }
    return db;
};

const { promise: { nodeify } } = adone;

export default function nut(db, precodec, codec) {
    const encodePrefix = (prefix, key, opts1, opts2) => {
        return precodec.encode([prefix, codec.encodeKey(key, opts1, opts2)]);
    };

    const addEncodings = (op, prefix) => {
        if (prefix && prefix.options) {
            op.keyEncoding =
                op.keyEncoding || prefix.options.keyEncoding;
            op.valueEncoding =
                op.valueEncoding || prefix.options.valueEncoding;
        }
        return op;
    };

    // db.open().catch(() => { /* no-op */ });

    return {
        apply(ops, opts, cb) {
            if (!this.isOpen()) {
                process.nextTick(() => {
                    cb(new adone.exception.Database("Database is not open"));
                });
                return;
            }
            opts = opts || {};

            const batch = [];
            let i = -1;
            const len = ops.length;

            while (++i < len) {
                const op = ops[i];
                addEncodings(op, op.prefix);
                op.prefix = getPrefix(op.prefix);
                batch.push({
                    key: encodePrefix(op.prefix, op.key, opts, op),
                    value: op.type !== "del" && codec.encodeValue(op.value, opts, op),
                    type: op.type
                });
            }
            nodeify(db.db.batch(batch, opts), cb);
        },
        get(key, prefix, opts, cb) {
            if (!this.isOpen()) {
                process.nextTick(() => {
                    cb(new adone.exception.Database("Database is not open"));
                });
                return;
            }
            opts.asBuffer = codec.valueAsBuffer(opts);
            return nodeify(db.db.get(encodePrefix(prefix, key, opts), opts), (err, value) => {
                if (err) {
                    cb(err);
                } else {
                    cb(null, codec.decodeValue(value, opts));
                }
            });
        },
        createDecoder(opts) {
            return function ({ key, value }) {
                return {
                    key: codec.decodeKey(precodec.decode(key)[1], opts),
                    value: codec.decodeValue(value, opts)
                };
            };
        },
        isOpen() {
            return db.isOpen();
        },
        isClosed: function isClosed() {
            return db.isClosed();
        },
        close: function close(cb) {
            if (!this.isOpen()) {
                process.nextTick(() => {
                    cb(new adone.exception.Database("Database is not open"));
                });
                return;
            }
            return nodeify(db.close(), cb);
        },
        iterator(_opts) {
            const opts = clone(_opts || {});
            const prefix = _opts.prefix || [];

            const encodeKey = (key) => {
                return encodePrefix(prefix, key, opts, {});
            };

            ltgt.toLtgt(_opts, opts, encodeKey, precodec.lowerBound, precodec.upperBound);

            // if these legacy values are in the options, remove them

            opts.prefix = null;

            //************************************************
            //hard coded defaults, for now...
            //TODO: pull defaults and encoding out of levelup.
            opts.keyAsBuffer = opts.valueAsBuffer = false;
            //************************************************


            //this is vital, otherwise limit: undefined will
            //create an empty stream.
            /* istanbul ignore next */
            if (!is.number(opts.limit)) {
                opts.limit = -1;
            }

            opts.keyAsBuffer = precodec.buffer;
            opts.valueAsBuffer = codec.valueAsBuffer(opts);

            const wrapIterator = (iterator) => {
                return {
                    next(cb) {
                        return nodeify(iterator.next(), cb);
                    },
                    end(cb) {
                        nodeify(iterator.end(), cb);
                    }
                };
            };

            return wrapIterator(db.db.iterator(opts));
        }
    };
}
