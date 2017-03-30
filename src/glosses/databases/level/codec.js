const isBinary = (data) => (data === undefined || data === null || Buffer.isBuffer(data));

const encodings = {
    utf8: {
        encode(data) {
            return isBinary(data) ? data : String(data);
        },
        decode(data) {
            return typeof data === "string" ? data : String(data);
        },
        buffer: false,
        type: "utf8"
    },
    json: {
        encode: JSON.stringify,
        decode: JSON.parse,
        buffer: false,
        type: "json"
    },
    binary: {
        encode(data) {
            return isBinary(data) ? data : new Buffer(data);
        },
        decode: adone.identity,
        buffer: true,
        type: "binary"
    },
    none: {
        encode: adone.identity,
        decode: adone.identity,
        buffer: false,
        type: "id"
    }
};

encodings.id = encodings.none;

const bufferEncodings = [
    "hex",
    "ascii",
    "base64",
    "ucs2",
    "ucs-2",
    "utf16le",
    "utf-16le"
];

bufferEncodings.forEach((type) => {
    encodings[type] = {
        encode(data) {
            return isBinary(data) ? data : new Buffer(data, type);
        },
        decode(buffer) {
            return buffer.toString(type);
        },
        buffer: true,
        type
    };
});


const ltgtKeys = ["lt", "gt", "lte", "gte", "start", "end"];

export default class Codec {
    constructor(opts) {
        this.opts = opts || {};
        this.encodings = encodings;
    }

    _encoding(encoding) {
        if (typeof encoding === "string") {
            encoding = encodings[encoding];
        }
        if (!encoding) {
            encoding = encodings.id;
        }
        return encoding;
    }

    _keyEncoding(opts, batchOpts) {
        return this._encoding(batchOpts && batchOpts.keyEncoding || opts && opts.keyEncoding || this.opts.keyEncoding);
    }

    _valueEncoding(opts, batchOpts) {
        return this._encoding(batchOpts && (batchOpts.valueEncoding || batchOpts.encoding) || opts && (opts.valueEncoding || opts.encoding) || (this.opts.valueEncoding || this.opts.encoding));
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
        const self = this;

        return ops.map((_op) => {
            const op = {
                type: _op.type,
                key: self.encodeKey(_op.key, opts, _op)
            };
            if (self.keyAsBuffer(opts, _op)) {
                op.keyEncoding = "binary";
            }
            if (_op.prefix) {
                op.prefix = _op.prefix;
            }
            if ("value" in _op) {
                op.value = self.encodeValue(_op.value, opts, _op);
                if (self.valueAsBuffer(opts, _op)) {
                    op.valueEncoding = "binary";
                }
            }
            return op;
        });
    }

    encodeLtgt(ltgt) {
        const self = this;
        const ret = {};
        Object.keys(ltgt).forEach((key) => {
            ret[key] = ltgtKeys.indexOf(key) > -1
                ? self.encodeKey(ltgt[key], ltgt)
                : ltgt[key];
        });
        return ret;
    }

    createStreamDecoder(opts) {
        const self = this;

        if (opts.keys && opts.values) {
            return function (key, value) {
                return {
                    key: self.decodeKey(key, opts),
                    value: self.decodeValue(value, opts)
                };
            };
        } else if (opts.keys) {
            return function (key) {
                return self.decodeKey(key, opts);
            };
        } else if (opts.values) {
            return function (_, value) {
                return self.decodeValue(value, opts);
            };
        } else {
            return function () { };
        }
    }

    keyAsBuffer(opts) {
        return this._keyEncoding(opts).buffer;
    }

    valueAsBuffer(opts) {
        return this._valueEncoding(opts).buffer;
    }
}