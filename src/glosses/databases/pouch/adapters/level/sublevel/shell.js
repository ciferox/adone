import NotFoundError from "./NotFoundError";

const {
    is,
    event
} = adone;

const NOT_FOUND_ERROR = new NotFoundError();

export default function sublevel(nut, prefix, createStream, options) {
    const emitter = new event.Emitter();
    emitter.sublevels = {};
    emitter.options = options;

    emitter.methods = {};
    prefix = prefix || [];

    const mergeOpts = (opts) => {
        const o = {};
        let k;
        if (options) {
            for (k in options) {
                if (!is.undefined(options[k])) {
                    o[k] = options[k];
                }
            }
        }
        if (opts) {
            for (k in opts) {
                if (!is.undefined(opts[k])) {
                    o[k] = opts[k];
                }
            }
        }
        return o;
    };

    emitter.put = function (key, value, opts, cb) {
        if (is.function(opts)) {
            cb = opts;
            opts = {};
        }

        nut.apply([{
            key, value,
            prefix: prefix.slice(),
            type: "put"
        }], mergeOpts(opts), (err) => {
            /* istanbul ignore next */
            if (err) {
                return cb(err);
            }
            emitter.emit("put", key, value);
            cb(null);
        });
    };

    emitter.prefix = function () {
        return prefix.slice();
    };

    emitter.batch = function (ops, opts, cb) {
        if (is.function(opts)) {
            cb = opts;
            opts = {};
        }

        ops = ops.map((op) => {
            return {
                key: op.key,
                value: op.value,
                prefix: op.prefix || prefix,
                keyEncoding: op.keyEncoding, // *
                valueEncoding: op.valueEncoding, // * (TODO: encodings on sublevel)
                type: op.type
            };
        });

        nut.apply(ops, mergeOpts(opts), (err) => {
            /* istanbul ignore next */
            if (err) {
                return cb(err);
            }
            emitter.emit("batch", ops);
            cb(null);
        });
    };

    emitter.get = function (key, opts, cb) {
        /* istanbul ignore else */
        if (is.function(opts)) {
            cb = opts;
            opts = {};
        }
        nut.get(key, prefix, mergeOpts(opts), (err, value) => {
            if (err) {
                cb(NOT_FOUND_ERROR);
            } else {
                cb(null, value);
            }
        });
    };

    emitter.sublevel = function (name, opts) {
        return emitter.sublevels[name] =
            emitter.sublevels[name] || sublevel(nut, prefix.concat(name), createStream, mergeOpts(opts));
    };

    emitter.readStream = emitter.createReadStream = function (opts) {
        opts = mergeOpts(opts);
        opts.prefix = prefix;
        const it = nut.iterator(opts);

        const stream = createStream(opts, nut.createDecoder(opts));
        stream.setIterator(it);

        return stream;
    };

    emitter.close = function (cb) {
        nut.close(cb);
    };

    emitter.isOpen = nut.isOpen;
    emitter.isClosed = nut.isClosed;

    return emitter;
}
