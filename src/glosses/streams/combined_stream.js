const {
    is,
    stream: {
        DelayedStream
    },
    std: {
        stream: {
            Stream
        }
    }
} = adone;

export default class CombinedStream extends Stream {
    constructor() {
        super();

        this.writable = false;
        this.readable = true;
        this.dataSize = 0;
        this.maxDataSize = 2 * 1024 * 1024;
        this.pauseStreams = true;

        this._released = false;
        this._streams = [];
        this._currentStream = null;
    }

    static create(options) {
        const combinedStream = new this();

        options = options || {};
        for (const option in options) {
            combinedStream[option] = options[option];
        }

        return combinedStream;
    }

    static isStreamLike(stream) {
        return !is.function(stream)
            && !is.string(stream)
            && !is.boolean(stream)
            && !is.number(stream)
            && !is.buffer(stream);
    }

    append(stream) {
        const isStreamLike = CombinedStream.isStreamLike(stream);

        if (isStreamLike) {
            if (!(stream instanceof DelayedStream)) {
                const newStream = DelayedStream.create(stream, {
                    maxDataSize: Infinity,
                    pauseStream: this.pauseStreams
                });
                stream.on("data", this._checkDataSize.bind(this));
                stream = newStream;
            }

            this._handleErrors(stream);

            if (this.pauseStreams) {
                stream.pause();
            }
        }

        this._streams.push(stream);
        return this;
    }

    pipe(dest, options) {
        super.pipe(dest, options);
        this.resume();
        return dest;
    }

    _getNext() {
        this._currentStream = null;
        const stream = this._streams.shift();


        if (is.undefined(stream)) {
            this.end();
            return;
        }

        if (!is.function(stream)) {
            this._pipeNext(stream);
            return;
        }

        const getStream = stream;
        getStream((stream) => {
            const isStreamLike = CombinedStream.isStreamLike(stream);
            if (isStreamLike) {
                stream.on("data", this._checkDataSize.bind(this));
                this._handleErrors(stream);
            }

            this._pipeNext(stream);
        });
    }

    _pipeNext(stream) {
        this._currentStream = stream;

        const isStreamLike = CombinedStream.isStreamLike(stream);
        if (isStreamLike) {
            stream.on("end", this._getNext.bind(this));
            stream.pipe(this, { end: false });
            return;
        }

        const value = stream;
        this.write(value);
        this._getNext();
    }

    _handleErrors(stream) {
        const self = this;
        stream.on("error", (err) => {
            self._emitError(err);
        });
    }

    write(data) {
        // TODO: what if paused?
        this.emit("data", data);
    }

    pause() {
        if (!this.pauseStreams) {
            return;
        }

        if (this.pauseStreams && this._currentStream && is.function(this._currentStream.pause)) {
            this._currentStream.pause();
        }
        this.emit("pause");
    }

    resume() {
        if (!this._released) {
            this._released = true;
            this.writable = true;
            this._getNext();
        }

        if (this.pauseStreams && this._currentStream && is.function(this._currentStream.resume)) {
            this._currentStream.resume();
        }
        this.emit("resume");
    }

    end() {
        this._reset();
        this.emit("end");
    }

    destroy() {
        this._reset();
        this.emit("close");
    }

    _reset() {
        this.writable = false;
        this._streams = [];
        this._currentStream = null;
    }

    _checkDataSize() {
        this._updateDataSize();
        if (this.dataSize <= this.maxDataSize) {
            return;
        }
        const message = `DelayedStream#maxDataSize of ${this.maxDataSize} bytes exceeded.`;
        this._emitError(new Error(message));
    }

    _updateDataSize() {
        this.dataSize = 0;

        const self = this;
        this._streams.forEach((stream) => {
            if (!stream.dataSize) {
                return;
            }

            self.dataSize += stream.dataSize;
        });

        if (this._currentStream && this._currentStream.dataSize) {
            this.dataSize += this._currentStream.dataSize;
        }
    }

    _emitError(err) {
        this._reset();
        this.emit("error", err);
    }
}
