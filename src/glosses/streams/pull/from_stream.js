const {
    is
} = adone;

const looper = (fun) => {
    (function next() {
        let loop = true;
        let sync = false;
        const cb = () => {
            if (sync) {
                loop = true;
            } else {
                next();
            }
        };
        do {
            sync = true; loop = false;
            fun.call(this, cb);
            sync = false;
        } while (loop);
    })();
};


const destroy = (stream) => {
    if (!stream.destroy) {
        adone.warn("warning, stream-to-pull-stream: the wrapped node-stream does not implement `destroy`, this may cause resource leaks.");
    } else {
        stream.destroy();
    }
};

const write = (read, stream, cb) => {
    let ended;
    let closed = false;
    let did;
    const done = () => {
        if (did) {
            return;
        }
        did = true;
        cb && cb(ended === true ? null : ended);
    };

    const onClose = () => {
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
    const onError = (err) => {
        cleanup();
        if (!ended) {
            read(ended = err, done);
        }
    };
    const cleanup = () => {
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

                if (ended) {
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

const read2 = (stream) => {
    let ended = false;
    let waiting = false;
    let _cb;

    const read = () => {
        const data = stream.read();
        if (!is.null(data) && _cb) {
            const cb = _cb; _cb = null;
            cb(null, data);
        }
    };

    stream.on("readable", () => {
        waiting = true;
        _cb && read();
    }).on("end", () => {
        ended = true;
        _cb && _cb(ended);
    }).on("error", (err) => {
        ended = err;
        _cb && _cb(ended);
    });

    return (end, cb) => {
        _cb = cb;
        if (ended) {
            cb(ended);
        } else if (waiting) {
            read();
        }
    };
};

const read1 = (stream) => {
    const buffer = [];
    const cbs = [];
    let ended;
    let paused = false;

    const drain = () => {
        while ((buffer.length || ended) && cbs.length) {
            cbs.shift()(buffer.length ? null : ended, buffer.shift());
        }
        if (!buffer.length && paused) {
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
    return (abort, cb) => {
        if (!cb) {
            throw new Error("*must* provide cb");
        }
        if (abort) {
            const onAbort = () => {
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

const sink = (stream, cb) => (read) => write(read, stream, cb);

const source = (stream) => read1(stream);

export default function fromStream(stream, cb) {
    if (stream.writable && stream.write) {
        if (stream.readable) {
            return (_read) => {
                write(_read, stream, cb);
                return read1(stream);
            };
        }
        return sink(stream, cb);
    }
    return source(stream);
}

fromStream.sink = sink;
fromStream.source = source;
fromStream.read = read;
fromStream.read1 = read1;
fromStream.read2 = read2;
fromStream.duplex = (stream, cb) => ({
    source: source(stream),
    sink: sink(stream, cb)
});
fromStream.transform = (stream) => (read) => {
    const _source = source(stream);
    sink(stream)(read); return _source;
};
