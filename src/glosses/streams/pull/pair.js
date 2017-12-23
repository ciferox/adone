const {
    is
} = adone;

//a pair of pull streams where one drains from the other
export default function pair() {
    let _read;
    let waiting;
    const sink = (read) => {
        if (!is.function(read)) {
            throw new Error("read must be function");
        }

        if (_read) {
            throw new Error("already piped");
        }
        _read = read;
        if (waiting) {
            const _waiting = waiting;
            waiting = null;
            _read.apply(null, _waiting);
        }
    };
    const source = (abort, cb) => {
        if (_read) {
            _read(abort, cb);
        } else {
            waiting = [abort, cb];

        }
    };

    return {
        source, sink
    };
}

pair.duplex = function () {
    const a = pair();
    const b = pair();
    return [
        {
            source: a.source,
            sink: b.sink
        },
        {
            source: b.source,
            sink: a.sink
        }
    ];
};

