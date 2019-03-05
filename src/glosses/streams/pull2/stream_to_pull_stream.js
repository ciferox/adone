import looper from "./looper3";

const {
    is,
    stream: { pull2: pull }
} = adone;

// const destroy = function (stream, cb) {
//     function onClose() {
//         cleanup(); cb();
//     }
//     function onError(err) {
//         cleanup(); cb(err);
//     }
//     function cleanup() {
//         stream.removeListener("close", onClose);
//         stream.removeListener("error", onError);
//     }
//     stream.on("close", onClose);
//     stream.on("error", onError);
// };

const destroy = function (stream) {
    if (!stream.destroy) {
        console.error(
            "warning, stream-to-pull-stream: \n"
            + "the wrapped node-stream does not implement `destroy`, \n"
            + "this may cause resource leaks."
        );
    } else {
        stream.destroy();
    }
};

const write = function (read, stream, cb) {
    let ended; let closed = false; let did;
    const done = function () {
        if (did) {
            return;
        }
        did = true;
        cb && cb(ended === true ? null : ended);
    };

    const onClose = function () {
        if (closed) {
            return;
        }
        closed = true;
        cleanup();
        if (!ended) {
            read(ended = true, done);
        } else {
            done();
        }
    };
    const onError = function (err) {
        cleanup();
        if (!ended) {
            read(ended = err, done);
        }
    };
    const cleanup = function () {
        stream.on("finish", onClose);
        stream.removeListener("close", onClose);
        stream.removeListener("error", onError);
    };

    stream.on("close", onClose);
    stream.on("finish", onClose);
    stream.on("error", onError);
    process.nextTick(() => {
        looper((next) => {
            read(null, (end, data) => {
                ended = ended || end;
                //you can't "end" a stdout stream, so this needs to be handled specially.
                if (end === true) {
                    return stream._isStdio ? done() : stream.end();
                }

                if (ended = ended || end) {
                    destroy(stream);
                    return done(ended);
                }

                //I noticed a problem streaming to the terminal:
                //sometimes the end got cut off, creating invalid output.
                //it seems that stdout always emits "drain" when it ends.
                //so this seems to work, but i have been unable to reproduce this test
                //automatically, so you need to run ./test/stdout.js a few times and the end is valid json.
                if (stream._isStdio) {
                    stream.write(data, () => {
                        next();
                    });
                } else {
                    const pause = stream.write(data);
                    if (pause === false) {
                        stream.once("drain", next);
                    } else {
                        next();
                    }
                }
            });
        });
    });
};

const read2 = function (stream) {
    let ended = false; let waiting = false;
    let _cb;

    const read = function () {
        const data = stream.read();
        if (!is.null(data) && _cb) {
            const cb = _cb; _cb = null;
            cb(null, data);
        }
    };

    stream.on("readable", () => {
        waiting = true;
        _cb && read();
    })
        .on("end", () => {
            ended = true;
            _cb && _cb(ended);
        })
        .on("error", (err) => {
            ended = err;
            _cb && _cb(ended);
        });

    return function (end, cb) {
        _cb = cb;
        if (ended) {
            cb(ended);
        } else if (waiting) {
            read();
        }
    };
};

const read1 = function (stream) {
    const buffer = []; const cbs = []; let ended; let paused = false;

    const drain = function () {
        while ((buffer.length || ended) && cbs.length) {
            cbs.shift()(buffer.length ? null : ended, buffer.shift());
        }
        if (!buffer.length && (paused)) {
            paused = false;
            stream.resume();
        }
    };

    stream.on("data", (data) => {
        buffer.push(data);
        drain();
        if (buffer.length && stream.pause) {
            paused = true;
            stream.pause();
        }
    });
    stream.on("end", () => {
        ended = true;
        drain();
    });
    stream.on("close", () => {
        ended = true;
        drain();
    });
    stream.on("error", (err) => {
        ended = err;
        drain();
    });
    return function (abort, cb) {
        if (!cb) {
            throw new Error("*must* provide cb");
        }
        if (abort) {
            const onAbort = function () {
                while (cbs.length) {
                    cbs.shift()(abort);
                }
                cb(abort);
            };
            //if the stream happens to have already ended, then we don't need to abort.
            if (ended) {
                return onAbort();
            }
            stream.once("close", onAbort);
            destroy(stream);
        } else {
            cbs.push(cb);
            drain();
        }
    };
};

const read = read1;

const sink = function (stream, cb) {
    return function (read) {
        return write(read, stream, cb);
    };
};

const source = function (stream) {
    return read1(stream);
};

exports = module.exports = function (stream, cb) {
    return (
        (stream.writable && stream.write)
            ? stream.readable
                ? function (_read) {
                    write(_read, stream, cb);
                    return read1(stream);
                }
                : sink(stream, cb)
            : source(stream)
    );
};

exports.sink = sink;
exports.source = source;
exports.read = read;
exports.read1 = read1;
exports.read2 = read2;
exports.duplex = function (stream, cb) {
    return {
        source: source(stream),
        sink: sink(stream, cb)
    };
};
exports.transform = function (stream) {
    return function (read) {
        const _source = source(stream);
        sink(stream)(read); return _source;
    };
};
