// TODO: this thing is weird

export default class DelayedStream extends adone.std.stream.Stream {
    constructor() {
        super();
        this.source = null;
        this.dataSize = 0;
        this.maxDataSize = 1024 * 1024;
        this.pauseStream = true;

        this._maxDataSizeExceeded = false;
        this._released = false;
        this._bufferedEvents = [];
    }

    static create(source, options) {
        const delayedStream = new this();

        options = options || {};
        for (const option in options) {
            delayedStream[option] = options[option];
        }

        delayedStream.source = source;

        const realEmit = source.emit;
        source.emit = function (...args) {
            delayedStream._handleEmit(args);
            return realEmit.apply(source, args);
        };

        source.on("error", () => {});
        if (delayedStream.pauseStream) {
            source.pause();
        }

        return delayedStream;
    }

    get readable() {
        return this.source.readable;
    }

    setEncoding(...args) {
        return this.source.setEncoding.apply(this.source, args);
    }

    resume() {
        if (!this._released) {
            this.release();
        }

        this.source.resume();
    }

    pause() {
        this.source.pause();
    }

    release() {
        this._released = true;

        this._bufferedEvents.forEach((args) => {
            this.emit.apply(this, args);
        });
        this._bufferedEvents = [];
    }

    pipe(...args) {
        const r = super.pipe(...args);
        this.resume();
        return r;
    }

    _handleEmit(args) {
        if (this._released) {
            this.emit.apply(this, args);
            return;
        }

        if (args[0] === "data") {
            this.dataSize += args[1].length;
            this._checkIfMaxDataSizeExceeded();
        }

        this._bufferedEvents.push(args);
    }

    _checkIfMaxDataSizeExceeded() {
        if (this._maxDataSizeExceeded) {
            return;
        }

        if (this.dataSize <= this.maxDataSize) {
            return;
        }

        this._maxDataSizeExceeded = true;
        const message = `DelayedStream#maxDataSize of ${this.maxDataSize} bytes exceeded.`;
        this.emit("error", new Error(message));
    }
}
