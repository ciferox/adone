const {
    is,
    std: { stream: { Readable } }
} = adone;


const toStreams2 = (s, opts) => {
    if (!s || is.function(s) || s._readableState) {
        return s;
    }

    const wrap = new Readable(opts).wrap(s);
    if (s.destroy) {
        wrap.destroy = s.destroy.bind(s);
    }
    return wrap;
};

const toStreams2Obj = (s) => toStreams2(s, { objectMode: true, highWaterMark: 16 });

const toStreams2Buf = (s) => toStreams2(s);

export default class MultiStream extends Readable {
    constructor(streams, options) {
        super(options);

        this.destroyed = false;

        this._drained = false;
        this._forwarding = false;
        this._current = null;
        this._toStreams2 = (options && options.objectMode) ? toStreams2Obj : toStreams2Buf;

        if (is.function(streams)) {
            this._queue = streams;
        } else {
            this._queue = streams.map(this._toStreams2);
            this._queue.forEach((stream) => {
                if (!is.function(stream)) {
                    this._attachErrorListener(stream);
                }
            });
        }

        this._next();
    }

    _read() {
        this._drained = true;
        this._forward();
    }

    _forward() {
        if (this._forwarding || !this._drained || !this._current) {
            return;
        }
        this._forwarding = true;

        let chunk;
        while (!is.null(chunk = this._current.read())) {
            this._drained = this.push(chunk);
        }

        this._forwarding = false;
    }

    destroy(err) {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;

        if (this._current && this._current.destroy) {
            this._current.destroy();
        }
        if (!is.function(this._queue)) {
            this._queue.forEach((stream) => {
                if (stream.destroy) {
                    stream.destroy();
                }
            });
        }

        if (err) {
            this.emit("error", err);
        }
        this.emit("close");
    }

    _next() {
        this._current = null;

        if (is.function(this._queue)) {
            this._queue((err, stream) => {
                if (err) {
                    return this.destroy(err);
                }
                stream = this._toStreams2(stream);
                this._attachErrorListener(stream);
                this._gotNextStream(stream);
            });
        } else {
            let stream = this._queue.shift();
            if (is.function(stream)) {
                stream = this._toStreams2(stream());
                this._attachErrorListener(stream);
            }
            this._gotNextStream(stream);
        }
    }

    _gotNextStream(stream) {
        if (!stream) {
            this.push(null);
            this.destroy();
            return;
        }

        this._current = stream;
        this._forward();

        const onReadable = () => {
            this._forward();
        };

        const onClose = () => {
            if (!stream._readableState.ended) {
                this.destroy();
            }
        };

        const onEnd = () => {
            this._current = null;
            stream.removeListener("readable", onReadable);
            stream.removeListener("end", onEnd);
            stream.removeListener("close", onClose);
            this._next();
        };

        stream.on("readable", onReadable);
        stream.once("end", onEnd);
        stream.once("close", onClose);
    }

    _attachErrorListener(stream) {
        if (!stream) {
            return;
        }

        const onError = (err) => {
            stream.removeListener("error", onError);
            this.destroy(err);
        };

        stream.once("error", onError);
    }
}
MultiStream.obj = function (streams) {
    return new MultiStream(streams, { objectMode: true, highWaterMark: 16 });
};
