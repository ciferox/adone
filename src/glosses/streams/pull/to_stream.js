const {
    is,
    std: {
        stream: { Stream }
    }
} = adone;

export default function duplex(reader, read) {
    if (reader && is.object(reader) && !is.function(reader)) {
        read = reader.source;
        reader = reader.sink;
    }

    const cbs = [];
    const input = [];
    let ended;
    let needDrain;
    const s = new Stream();
    s.writable = s.readable = true;

    s.write = function (data) {
        if (cbs.length) {
            cbs.shift()(null, data);
        } else {
            input.push(data);
        }

        if (!cbs.length) {
            needDrain = true;
        }
        return Boolean(cbs.length);
    };

    s.source = function (end, cb) {
        if (input.length) {
            cb(null, input.shift());
            if (!input.length) {
                s.emit("drain");
            }
        } else {
            if (ended || end) {
                cb(ended);
            } else {
                cbs.push(cb);
            }

            if (needDrain) {
                needDrain = false;
                s.emit("drain");
            }
        }
    };

    let n;
    if (reader) {
        n = reader(s.source);
    }
    if (n && !read) {
        read = n;
    }

    const output = [];
    let _ended = false;
    let busy = false;

    const drain = () => {
        if (!read || busy) {
            return;
        }
        while (output.length && !s.paused) {
            s.emit("data", output.shift());
        }
        if (s.paused) {
            return;
        }
        if (_ended) {
            return s.emit("end");
        }
        busy = true;
        read(null, function next(end, data) {
            busy = false;
            if (s.paused) {
                if (end === true) {
                    _ended = end;
                } else if (end) {
                    s.emit("error", end);
                } else {
                    output.push(data);
                }
            } else {
                if (end && (ended = end) !== true) {
                    s.emit("error", end);
                } else if (ended || end) {
                    s.emit("end");
                } else {
                    s.emit("data", data);
                    busy = true;
                    read(null, next);
                }
            }
        });
    };

    s.end = function () {
        if (read) {
            if (input.length) {
                drain();
            } else {
                read(ended = true, cbs.length ? cbs.shift() : () => {});
            }
        } else if (cbs.length) {
            cbs.shift()(true);
        }
    };

    s.sink = function (_read) {
        read = _read;
        setImmediate(drain);
    };

    if (read) {
        s.sink(read);

        const pipe = s.pipe.bind(s);
        s.pipe = function (dest, opts) {
            const res = pipe(dest, opts);

            if (s.paused) {
                s.resume();
            }

            return res;
        };
    }

    s.pause = function () {
        s.paused = true;
        return s;
    };

    s.resume = function () {
        s.paused = false;
        drain();
        return s;
    };

    s.destroy = function () {
        if (!ended && read) {
            read(ended = true, () => {});
        }
        ended = true;
        if (cbs.length) {
            cbs.shift()(true);
        }

        s.emit("close");
    };
    return s;
}


duplex.source = function (source) {
    return duplex(null, source);
};

duplex.sink = function (sink) {
    return duplex(sink, null);
};
