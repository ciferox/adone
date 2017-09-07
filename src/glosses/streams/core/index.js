const { noop, is, x, event: { EventEmitter }, util, std, collection } = adone;

const __ = adone.lazify({
    Transform: "./transform",
    AsyncTransform: "./async_transform",
    SyncTransform: "./sync_transform",
    PassThrough: "./pass_through"
}, null, require);


const wrapBefore = (cb, func) => {
    switch (util.functionParams(func).length) {
        case 0: {
            return function () {
                cb.call(this);
                return func.call(this);
            };
        }
        case 1: {
            return function (a) {
                cb.call(this);
                return func.call(this, a);
            };
        }
        case 2: {
            return function (a, b) {
                cb.call(this);
                return func.call(this, a, b);
            };
        }
        case 3: {
            return function (a, b, c) {
                cb.call(this);
                return func.call(this, a, b, c);
            };
        }
        default: {
            return function (...args) {
                cb.call(this);
                return func.apply(this, args);
            };
        }
    }
};

const _checkDestroyed = function () {
    if (this._destroyed) {
        throw new x.IllegalState("Stream was destroyed");
    }
};

const checkDestroyed = (target, key, descriptor) => {
    const { value } = descriptor;
    descriptor.value = wrapBefore(_checkDestroyed, value);
};

const STASHES = Symbol("stashes");

/**
 * Represents a chain of transform streams
 */
class CoreStream extends EventEmitter {
    constructor(source, options) {
        super();
        this._chain = [this._createFirstStream(options)];

        this._emitError = (err) => this.emit("error", err);
        this._emitEnd = () => this.emit("end");
        this._emitData = (data) => this.emit("data", data);
        this._first
            .onError(this._emitError)
            .onEnd(this._emitEnd)
            .onNext(this._emitData);
        this._pipable = true;
        this._paused = true;
        this._destroyed = false;

        this.fromSource(source);
    }

    _createFirstStream(options) {
        if (!options || !is.object(options)) {
            return new __.PassThrough();
        }
        if (!options.transform) {
            return new __.PassThrough(options.flush);
        }
        if (options.sync === true || options.async === false) {
            return new __.SyncTransform(options.transform, options.flush);
        }
        if (options.sync === false || options.async === true) {
            return new __.AsyncTransform(options.transform, options.flush);
        }
        if (is.asyncFunction(options.transform)) {
            return new __.AsyncTransform(options.transform, options.flush);
        }
        return new __.SyncTransform(options.transform, options.flush);
    }

    fromSource(source) {
        if (is.array(source)) {
            for (const i of source) {
                this.write(i);
            }
            this.end();
        } else if (is.coreStream(source)) {
            source.pipe(this);
            source.on("error", () => this.emit("error"));
            if (source.isPaused()) {
                source.resume();
            }
            // source.on("data", (x) => {
            //     this.write(x);
            // });
            // source.once("end", () => {
            //     this.end();
            // });
            // source.on("error", (err) => {
            //     this.emit("error", err);
            // });
            // source.resume();
        }
    }

    get _first() {
        return this._chain[0];
    }

    get _last() {
        return this._chain[this._chain.length - 1];
    }

    @checkDestroyed
    write(value) {
        return this._first.write(value);
    }

    @checkDestroyed
    push(value) {
        return this._last.push(value);
    }

    end() {
        this._first.end();
        return this;
    }

    destroy() {
        if (this._destroyed) {
            return this;
        }
        this._destroyed = true;
        for (const s of this._chain) {
            s.destroy();
        }
        this.emit("destroy");
        return this;
    }

    @checkDestroyed
    pause() {
        for (let i = this._chain.length - 1; i >= 0; --i) {
            this._chain[i].pause();
        }
        return this;
    }

    @checkDestroyed
    resume() {
        for (let i = this._chain.length - 1; i >= 0; --i) {
            this._chain[i].resume();
        }
        return this;
    }

    isPaused() {
        return this._last.isPaused();
    }

    isEnded() {
        return this._last.isEnded();
    }

    pipe(stream, { end = true } = {}) {
        this.on("data", (x) => {
            stream.write(x);
        });
        if (end) {
            this.once("end", () => {
                stream.end();
            });
        }
        if (stream.isPaused()) {
            stream.resume();
        }
        return stream;
    }

    _throughTransform(stream) {
        stream
            .onNext(this._emitData)
            .onError(this._emitError)
            .onEnd(this._emitEnd);
        this._last.pipe(stream);
        this._chain.push(stream);
        return this;
    }

    @checkDestroyed
    throughSync(transform, flush) {
        const stream = new __.SyncTransform(transform, flush);
        return this._throughTransform(stream);
    }

    @checkDestroyed
    throughAsync(transform, flush) {
        const stream = new __.AsyncTransform(transform, flush);
        return this._throughTransform(stream);
    }

    @checkDestroyed
    through(transform, flush) {
        if (is.asyncFunction(transform)) {
            return this.throughAsync(transform, flush);
        }
        return this.throughSync(transform, flush);
    }

    @checkDestroyed
    map(callback) {
        if (!is.function(callback)) {
            throw new x.InvalidArgument("'callback' must be a function");
        }
        if (is.asyncFunction(callback)) {
            return this.throughAsync(async function (value) {
                this.push(await callback(value));
            });
        }
        return this.throughSync(function (value) {
            this.push(callback(value));
        });
    }

    @checkDestroyed
    mapIf(condition, callback) {
        if (!is.function(condition)) {
            throw new x.InvalidArgument("'condition' must be a function");
        }

        if (!is.function(callback)) {
            throw new x.InvalidArgument("'callback' must be a function");
        }

        if (is.asyncFunction(condition) || is.asyncFunction(callback)) {
            return this.throughAsync(async function (x) {
                if (await condition(x)) {
                    this.push(await callback(x));
                } else {
                    this.push(x);
                }
            });
        }
        return this.throughSync(function (x) {
            if (condition(x)) {
                this.push(callback(x));
            } else {
                this.push(x);
            }
        });
    }

    @checkDestroyed
    filter(callback) {
        if (!is.function(callback)) {
            throw new x.InvalidArgument("'callback' must be a function");
        }
        if (is.asyncFunction(callback)) {
            return this.throughAsync(async function (value) {
                if (await callback(value)) {
                    this.push(value);
                }
            });
        }
        return this.throughSync(function (value) {
            if (callback(value)) {
                this.push(value);
            }
        });
    }

    @checkDestroyed
    forEach(callback, { wait = true, passthrough = false } = {}) {
        if (!is.function(callback)) {
            throw new x.InvalidArgument("'callback' must be a function");
        }
        if (is.asyncFunction(callback)) {
            if (wait) {
                return this.throughAsync(async function (value) {
                    await callback(value);
                    if (passthrough) {
                        this.push(value);
                    }
                }).resume();
            }
            return this.throughAsync(function (value) {
                callback(value);
                if (passthrough) {
                    this.push(value);
                }
            }).resume();

        }
        return this.throughSync(function (value) {
            callback(value);
            if (passthrough) {
                this.push(value);
            }
        }).resume();
    }

    @checkDestroyed
    done(callback, { passthrough = false } = {}) {
        if (!is.function(callback)) {
            throw new x.InvalidArgument("'callback' must be a function");
        }
        if (passthrough) {
            return this.throughSync(function (value) {
                this.push(value);
            }, () => {
                callback();
            }).resume();
        }
        return this.throughSync(noop, () => {
            callback();
        }).resume();
    }

    @checkDestroyed
    toArray(callback, { passthrough = false } = {}) {
        if (!is.function(callback)) {
            throw new x.InvalidArgument("'callback' must be a function");
        }
        if (this._last.isEnded()) {
            process.nextTick(callback, []);
            return this;
        }
        const arr = [];
        return this.throughSync(function (value) {
            arr.push(value);
            if (passthrough) {
                this.push(value);
            }
        }, () => {
            callback(arr);
        }).resume();
    }

    @checkDestroyed
    unique(prop = null) {
        if (!is.null(prop) && !is.function(prop)) {
            throw new x.InvalidArgument("'prop' must be a function or null");
        }
        const cache = new Set();
        return this.throughSync(function (x) {
            const res = prop ? prop(x) : x;
            if (cache.has(res)) {
                return;
            }
            cache.add(res);
            this.push(x);
        }, () => {
            cache.clear();
        });
    }

    stash(name, filter) {
        if (is.function(name)) {
            [name, filter] = [undefined, name];
        } else if (!is.function(filter)) {
            throw new x.InvalidArgument("'filter' must be a function");
        }

        let stashes;
        if (!this[STASHES]) {
            stashes = this[STASHES] = {
                named: new Map(),
                unnamed: new collection.LinkedList()
            };
        } else {
            stashes = this[STASHES];
        }
        const stashStream = new __.PassThrough();
        if (name) {
            stashes.named.set(name, stashStream);
        } else {
            stashes.unnamed.push(stashStream);
        }
        return this.throughSync(function (x) {
            if (filter(x)) {
                stashStream.push(x);
            } else {
                this.push(x);
            }
        });
    }

    unstash(name) {
        if (!this[STASHES]) {
            return this;
        }
        const stashes = this[STASHES];
        let stream;
        if (!name) {
            if (stashes.unnamed.empty) {
                return this;
            }
            stream = stashes.unnamed.pop();
        } else {
            if (!stashes.named.has(name)) {
                throw new x.Unknown(`unknown stash stream '${name}'`);
            }
            stream = stashes.named.get(name);
            stashes.named.delete(name);
        }
        return this._throughTransform(stream);
    }

    flatten() {
        const flatten = (stream, arr) => {
            for (const i of arr) {
                if (!is.array(i)) {
                    stream.push(i);
                } else {
                    flatten(stream, i);
                }
            }
        };
        return this.throughSync(function (data) {
            if (!is.array(data)) {
                this.push(data);
                return;
            }
            flatten(this, data);
        });
    }

    /**
     * Creates a promise that will be fulfilled with an array of all the emitted values or the first occurred error.
     *
     */
    then(onResolve, onReject) {
        return new Promise((resolve, reject) => {
            let err;
            let arr;

            this.once("end", () => {
                err ? reject(err) : resolve(arr);
            });

            // we can have more than one error from streams (flushes, transforms)
            this.on("error", (_err) => {
                if (err) {
                    // we have had an error, save the next one
                    if (!err.consequent) {
                        err.consequent = [_err];
                    } else {
                        err.consequent.push(_err);
                    }
                    return;
                }
                // the first error
                err = _err;

                // it does not matter whether we call it while transforming or flushing
                this.destroy();
            });

            // gather all the emitted values
            this.toArray((_arr) => {
                arr = _arr;
            });
        }).then(onResolve, onReject);
    }

    catch(onReject) {
        return this.then(undefined, onReject);
    }

    static merge(streams, { end = true, sourceOptions } = {}) {
        const src = new this(null, sourceOptions);
        streams = streams.filter((x) => {
            return x && !x.isEnded();
        });
        let m = streams.length;
        const onEnd = () => {
            --m;
            if (!end) {
                return;
            }
            if (m === 0) {
                if (end) {
                    src.end();
                }
                src.removeListener("end", onSrcEnd); // eslint-disable-line no-use-before-define
            }
        };
        const onData = (x) => {
            src.write(x);
        };
        const onError = (err) => {
            src.emit("error", err);
        };
        const onSrcEnd = () => {
            if (m !== 0) {
                for (const stream of streams) {
                    stream.removeListener("data", onData);
                    stream.removeListener("error", onError);
                    stream.removeListener("end", onEnd);
                }
            }
        };
        src.once("end", onSrcEnd);
        for (const stream of streams) {
            stream.once("end", onEnd);
            stream.on("error", onError);
            stream.on("data", onData);
            stream.resume();
        }
        return src;
    }
}

adone.tag.set(CoreStream, adone.tag.CORE_STREAM);

/**
 * Creates a CoreStream instance
 */
export default function core(source, options) {
    return new CoreStream(source, options);
}

core.CoreStream = CoreStream;

core.merge = CoreStream.merge;

adone.definePrivate(__, core);
