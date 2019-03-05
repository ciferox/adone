const {
    is,
    stream: { pull2: { cat, pair, reader: Reader, pushable: Writer } }
} = adone;

const once = function (cb) {
    let called = 0;
    return function (a, b, c) {
        if (called++) {
            return;
        }
        cb(a, b, c);
    };
};

const isFunction = (f) => is.function(f);

module.exports = function (opts, _cb) {
    if (isFunction(opts)) {
        _cb = opts, opts = {};
    }
    _cb = once(_cb || function noop() { });
    const reader = Reader(opts && opts.timeout || 5e3);
    const writer = Writer((err) => {
        if (err) {
            _cb(err);
        }
    });

    const p = pair();

    return {
        handshake: {
            read: reader.read,
            abort(err) {
                writer.end(err);
                reader.abort(err, (err) => {
                });
                _cb(err);
            },
            write: writer.push,
            rest() {
                writer.end();
                return {
                    source: reader.read(),
                    sink: p.sink
                };
            }
        },
        sink: reader,
        source: cat([writer, p.source])
    };
};
