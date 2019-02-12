const encodings = require("./encodings");

const {
    is
} = adone;

const ltgtKeys = ["lt", "gt", "lte", "gte", "start", "end"];

export default class Codec {
    constructor(opts) {
        this.opts = opts || {};
        this.encodings = encodings;
    }

    _encoding(encoding) {
        if (is.string(encoding)) {
            encoding = encodings[encoding];
        }
        if (!encoding) {
            encoding = encodings.id;
        }
        return encoding;
    }

    _keyEncoding(opts, batchOpts) {
        return this._encoding((batchOpts && batchOpts.keyEncoding) ||
            (opts && opts.keyEncoding) ||
            this.opts.keyEncoding);
    }

    _valueEncoding(opts, batchOpts) {
        return this._encoding((batchOpts && (batchOpts.valueEncoding || batchOpts.encoding)) ||
            (opts && (opts.valueEncoding || opts.encoding)) ||
            (this.opts.valueEncoding || this.opts.encoding));
    }

    encodeKey(key, opts, batchOpts) {
        return this._keyEncoding(opts, batchOpts).encode(key);
    }

    encodeValue(value, opts, batchOpts) {
        return this._valueEncoding(opts, batchOpts).encode(value);
    }

    decodeKey(key, opts) {
        return this._keyEncoding(opts).decode(key);
    }

    decodeValue(value, opts) {
        return this._valueEncoding(opts).decode(value);
    }    

    encodeBatch(ops, opts) {
        return ops.map((_op) => {
            const op = {
                type: _op.type,
                key: this.encodeKey(_op.key, opts, _op)
            };
            if (this.keyAsBuffer(opts, _op)) {
                op.keyEncoding = "binary";
            }
            if (_op.prefix) {
                op.prefix = _op.prefix;
            }
            if ("value" in _op) {
                op.value = this.encodeValue(_op.value, opts, _op);
                if (this.valueAsBuffer(opts, _op)) {
                    op.valueEncoding = "binary";
                }
            }
            return op;
        });
    }

    encodeLtgt(ltgt) {
        const ret = {};
        Object.keys(ltgt).forEach((key) => {
            ret[key] = ltgtKeys.indexOf(key) > -1
                ? this.encodeKey(ltgt[key], ltgt)
                : ltgt[key];
        });
        return ret;
    }

    createStreamDecoder(opts) {
        if (opts.keys && opts.values) {
            return (key, value) => {
                return {
                    key: this.decodeKey(key, opts),
                    value: this.decodeValue(value, opts)
                };
            };
        } else if (opts.keys) {
            return (key) => this.decodeKey(key, opts);
        } else if (opts.values) {
            return (_, value) => this.decodeValue(value, opts);
        }
        return () => { };
    }

    keyAsBuffer(opts) {
        return this._keyEncoding(opts).buffer;
    }

    valueAsBuffer(opts) {
        return this._valueEncoding(opts).buffer;
    }
}
