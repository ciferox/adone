import adone from "adone";

const { is, Transform } = adone;

class Core extends adone.EventEmitter {
    constructor(source, options) {
        super();
        this._lastStream = new adone.Transform(options);
        this._chain = [this._lastStream];

        this._dataListener = (x) => this.emit("data", x);
        this._endListener = () => this.emit("end");

        this._chain[0].on("drain", () => this.emit("drain"));
        this._chain[0].on("error", (err) => this.emit("error", err, this._chain[0]));

        this._lastStream.on("data", this._dataListener);
        this._lastStream.once("end", this._endListener);

        Object.defineProperties(this, {
            _readableState: {
                get: () => this._lastStream._readableState
            },
            _writableState: {
                get: () => this._chain[0]._writableState
            },
            _transformState: {
                get: () => this._chain[0]._transformState  // correct?
            }
        });

        this.source(source);
    }

    source(source) {
        if (is.array(source)) {
            for (let i = 0; i < source.length; ++i) {
                this.write(source[i]);
            }
            this.end();
        } else if (is.transformStream(source) || is.netronStream(source)) {
            source.pipe(this, { spreadErrors: false });  // should not emit errors from "this" to source
            source.on("error", (err) => this.emit("error", err, source));
            if (source.paused) {
                source.resume();
            }
        }
    }

    // stream api

    push(chunk) {
        return this._lastStream.push(chunk);
    }

    write(chunk) {
        return this._chain[0].write(chunk);
    }

    pipe(dest, { spreadErrors = true, ...pipeOptions } = {}) {
        if (is.function(dest)) {
            return dest(this);
        }
        dest = this._lastStream.pipe(dest, { spreadErrors, ...pipeOptions });
        if (dest !== this._lastStream) {
            this._chain.push(dest);
            const preLast = this._lastStream;
            this._lastStream = dest;
            preLast.removeListener("data", this._dataListener);
            preLast.removeListener("end", this._endListener);
            this._lastStream.on("data", this._dataListener);
            this._lastStream.once("end", this._endListener);
            if (spreadErrors) {
                this._lastStream.on("error", (err) => this.emit("error", err, this._chain[0]));
            }
        }
        return this;
    }

    pause() {
        this._lastStream.pause();
        return this;
    }

    resume() {
        for (let i = this._chain.length - 1; i >= 0; --i) {
            this._chain[i].resume();
        }
        return this;
    }

    end({ force = false, clearReadable = false, clearWritable = false } = {}) {
        if (!force) {
            this._chain[0].end({ force: false, clearReadable, clearWritable });
        } else {
            for (let i = 0; i < this._chain.length; ++i) {
                this._chain[i].end({ force: true, clearReadable, clearWritable });
            }
        }
        return this;
    }

    get paused() {
        return this._lastStream.paused;
    }

    get ended() {
        return this._lastStream.ended;
    }

    // core api

    each(callback) {
        if (!is.function(callback)) {
            throw new adone.x.InvalidArgument("\"callback\" must be a function");
        }
        this.on("data", (x) => {
            callback(x);
        });
        if (this.paused) {
            process.nextTick(() => this.resume());
        }
        return this;
    }

    toArray(callback) {
        if (!is.function(callback)) {
            throw new adone.x.InvalidArgument("\"callback\" must be a function");
        }
        if (this.ended) {
            process.nextTick(() => callback([]));
        } else {
            const res = [];
            this.each((x) => res.push(x));
            this.once("end", () => callback(res));
        }
        return this;
    }

    through(transform, flush) {
        return this.pipe(new Transform({ transform, flush }));
    }

    map(callback) {
        if (!is.function(callback)) {
            throw new adone.x.InvalidArgument("\"callback\" must be a function");
        }
        return this.through(function (x) {
            const res = callback(x);
            if (is.promise(res)) {
                return res.then((y) => this.push(y));
            } else {
                this.push(res);
            }
        });
    }

    filter(callback) {
        if (!is.function(callback)) {
            throw new adone.x.InvalidArgument("\"callback\" must be a function");
        }
        return this.through(function (x) {
            const res = callback(x);
            if (is.promise(res)) {
                return res.then((y) => y && this.push(x));
            } else if (res) {
                this.push(x);
            }
        });
    }

    static merge(streams, { end = true, ...sourceOptions } = {}) {
        const src = new this(null, sourceOptions);
        const drainWaiters = new Set();
        let m = 0;
        let waitForDrain = false;
        for (let i = 0; i < streams.length; ++i) {
            if (is.function(streams[i])) {
                streams[i] = streams[i]();
            }
            if (!streams[i] || streams[i].ended) {
                streams.splice(i--, 1);
            }
        }
        for (let i = 0; i < streams.length; ++i) {
            const stream = streams[i];
            if (end) {
                stream.once("end", () => {
                    if (!--m) {
                        src.end();
                    }
                });
            }
            stream.on("data", (x) => {
                if (!src.write(x)) {
                    stream.pause();
                    drainWaiters.add(i);
                    if (!waitForDrain) {
                        waitForDrain = true;
                        src.once("drain", () => {
                            waitForDrain = false;
                            const copy = [...drainWaiters];
                            drainWaiters.clear();
                            for (const j of copy) {
                                if (!streams[j].ended) {
                                    streams[j].resume();
                                }
                            }
                        });
                    }
                }
            });
            stream.on("error", (err) => src.emit("error", err, stream));
            ++m;
        }
        process.nextTick(() => {
            for (let i = 0; i < streams.length; ++i) {
                streams[i].resume();
            }
        });
        return src;
    }

    done(callback, { current = false } = {}) {
        if (!is.function(callback)) {
            throw new adone.x.InvalidArgument("\"callback\" must be a function");
        }
        if (current) {
            this._lastStream.once("end", callback);
        } else {
            this.once("end", callback);
        }
        return this;
    }

    unique(prop = null) {
        if (!is.null(prop) && !is.function(prop)) {
            throw new adone.x.InvalidArgument("\"prop\" must be a function or null");
        }
        const cache = new Set();
        return this.filter((x) => {
            const res = prop ? prop(x) : x;
            if (cache.has(res)) {
                return false;
            }
            cache.add(res);
            return true;
        }).done(() => cache.clear(), { current: true });
    }

    // promise api

    then(onResolve, onReject) {
        return new Promise((resolve, reject) => {
            this.toArray(resolve).once("error", (err) => {
                reject(err);
                this.end({ force: true });
            });
        }).then(onResolve, onReject);
    }

    catch(onReject) {
        return this.then(null, onReject);
    }
}

export default function core(val, options) {
    return new Core(val, options);
}

core.Core = Core;
core.merge = Core.merge;
adone.tag.set(Core, adone.tag.CORE_STREAM);
