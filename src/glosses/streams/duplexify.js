const { is, stream: { shift, eos } } = adone;

const SIGNAL_FLUSH = Buffer.from([0]);

const end = function (ws, fn) {
    if (!ws) {
        return fn();
    }
    if (ws._writableState && ws._writableState.finished) {
        return fn();
    }
    if (ws._writableState) {
        return ws.end(fn);
    }
    ws.end();
    fn();
};

const toStreams2 = (rs) => new (adone.std.stream.Readable)({ objectMode: true, highWaterMark: 16 }).wrap(rs);

export default class Duplexify extends adone.std.stream.Duplex {
    constructor(writable, readable, opts) {
        super(opts);

        this._writable = null;
        this._readable = null;
        this._readable2 = null;

        this._forwardDestroy = !opts || opts.destroy !== false;
        this._forwardEnd = !opts || opts.end !== false;
        this._corked = 1; // start corked
        this._ondrain = null;
        this._drained = false;
        this._forwarding = false;
        this._unwrite = null;
        this._unread = null;
        this._ended = false;

        this.destroyed = false;

        if (writable) {
            this.setWritable(writable);
        }
        if (readable) {
            this.setReadable(readable);
        }
    }

    cork() {
        if (++this._corked === 1) {
            this.emit("cork");
        }
    }

    uncork() {
        if (this._corked && --this._corked === 0) {
            this.emit("uncork");
        }
    }

    setWritable(writable) {
        if (this._unwrite) {
            this._unwrite();
        }

        if (this.destroyed) {
            if (writable && writable.destroy) {
                writable.destroy();
            }
            return;
        }

        if (is.null(writable) || writable === false) {
            this.end();
            return;
        }

        const unend = eos(writable, { writable: true, readable: false }, this._destroyer(this._forwardEnd));

        const ondrain = () => {
            const ondrain = this._ondrain;
            this._ondrain = null;
            if (ondrain) {
                ondrain();
            }
        };

        const clear = () => {
            this._writable.removeListener("drain", ondrain);
            unend();
        };

        if (this._unwrite) {
            process.nextTick(ondrain);
        } // force a drain on stream reset to avoid livelocks

        this._writable = writable;
        this._writable.on("drain", ondrain);
        this._unwrite = clear;

        this.uncork(); // always uncork setWritable
    }

    setReadable(readable) {
        if (this._unread) {
            this._unread();
        }

        if (this.destroyed) {
            if (readable && readable.destroy) {
                readable.destroy();
            }
            return;
        }

        if (is.null(readable) || readable === false) {
            this.push(null);
            this.resume();
            return;
        }

        const self = this;
        const unend = eos(readable, { writable: false, readable: true }, this._destroyer());

        const onreadable = function () {
            self._forward();
        };

        const onend = function () {
            self.push(null);
        };

        const clear = function () {
            self._readable2.removeListener("readable", onreadable);
            self._readable2.removeListener("end", onend);
            unend();
        };

        this._drained = true;
        this._readable = readable;
        this._readable2 = readable._readableState ? readable : toStreams2(readable);
        this._readable2.on("readable", onreadable);
        this._readable2.on("end", onend);
        this._unread = clear;

        this._forward();
    }

    _read() {
        this._drained = true;
        this._forward();
    }

    _forward() {
        if (this._forwarding || !this._readable2 || !this._drained) {
            return;
        }
        this._forwarding = true;

        let data;

        while (this._drained && !is.null(data = shift(this._readable2))) {
            if (this.destroyed) {
                continue;
            }
            this._drained = this.push(data);
        }

        this._forwarding = false;
    }

    destroy(err) {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;

        const self = this;
        process.nextTick(() => {
            self._destroy(err);
        });
    }

    _destroy(err) {
        if (err) {
            const ondrain = this._ondrain;
            this._ondrain = null;
            if (ondrain) {
                ondrain(err);
            } else {
                this.emit("error", err);
            }
        }

        if (this._forwardDestroy) {
            if (this._readable && this._readable.destroy) {
                this._readable.destroy();
            }
            if (this._writable && this._writable.destroy) {
                this._writable.destroy();
            }
        }

        this.emit("close");
    }

    _write(data, enc, cb) {
        if (this.destroyed) {
            return cb();
        }
        if (this._corked) {
            return this._onuncork(this._write.bind(this, data, enc, cb));
        }
        if (data === SIGNAL_FLUSH) {
            return this._finish(cb);
        }
        if (!this._writable) {
            return cb();
        }

        if (this._writable.write(data) === false) {
            this._ondrain = cb;
        } else {
            cb();
        }
    }

    _finish(cb) {
        this.emit("preend");
        this._onuncork(() => {
            end(this._forwardEnd && this._writable, () => {
                // haxx to not emit prefinish twice
                if (this._writableState.prefinished === false) {
                    this._writableState.prefinished = true;
                }
                this.emit("prefinish");
                this._onuncork(cb);
            });
        });
    }

    end(data, enc, cb) {
        if (is.function(data)) {
            return this.end(null, null, data);
        }
        if (is.function(enc)) {
            return this.end(data, null, enc);
        }
        this._ended = true;
        if (data) {
            this.write(data);
        }
        if (!this._writableState.ending) {
            this.write(SIGNAL_FLUSH);
        }
        return adone.std.stream.Writable.prototype.end.call(this, cb);
    }

    _onuncork(fn) {
        if (this._corked) {
            this.once("uncork", fn);
        } else {
            fn();
        }
    }

    _destroyer(end) {
        return (err) => {
            if (err) {
                this.destroy(err.message === "premature close" ? null : err);
            } else if (end && !this._ended) {
                this.end();
            }
        };
    }

    static obj(writable, readable, opts) {
        if (!opts) {
            opts = {};
        }
        opts.objectMode = true;
        opts.highWaterMark = 16;
        return new Duplexify(writable, readable, opts);
    }
}
