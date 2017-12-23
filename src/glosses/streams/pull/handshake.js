const {
    is,
    stream: { pull }
} = adone;

const once = (cb) => {
    let called = 0;
    return function (a, b, c) {
        if (called++) {
            return;
        }
        cb(a, b, c);
    };
};

export default function (opts, _cb) {
    if (is.function(opts)) {
        _cb = opts, opts = {};
    }
    _cb = once(_cb || function noop() {});
    const reader = pull.reader(opts && opts.timeout || 5e3);
    const writer = pull.pushable((err) => {
        if (err) {
            _cb(err);
        }
    });

    const p = pull.pair();

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
        source: pull.cat([writer, p.source])
    };
};
