const {
    is,
    event: { EventEmitter },
    x,
    collection
} = adone;

export default class Transform extends EventEmitter {
    constructor({ transform, flush, highWaterMark = 16 } = {}) {
        super();
        this._readableState = {
            highWaterMark,
            nullPushed: false,
            flowing: false,
            buffer: new collection.LinkedList()
        };

        this._writableState = {
            highWaterMark,
            needDrain: false,
            buffer: new collection.LinkedList()
        };

        this._transformState = {
            working: false
        };

        this.waitForDrain = false;
        this.flushing = false;
        this.flushed = false;
        this.ending = false;
        this.ended = false;
        this.stopPushing = false;

        if (transform) {
            this._transform = transform;
        }
        if (flush) {
            this._flush = flush;
        }
    }

    _transform(chunk) {
        this.push(chunk);
    }

    _flush() {

    }

    _afterTransform() {
        if (
            !this._writableState.buffer.empty &&
            this._readableState.buffer.length < this._readableState.highWaterMark
        ) {
            this._process(this._writableState.buffer.shift());
        } else {
            this._transformState.working = false;
            if (this.ending && this._readableState.buffer.empty) {
                // if the readable buffer is empty then the writable buffer is empty too (the prev check)
                this._end();
            } else if (this._writableState.needDrain && this._writableState.buffer.empty) {
                this._writableState.needDrain = false;
                this.emit("drain");
            }
        }
    }

    _process(chunk) {
        this._transformState.working = true;
        try {
            const ret = this._transform(chunk);
            if (is.promise(ret)) {
                ret
                    .catch((err) => this.emit("error", err))
                    .then(() => this._afterTransform());
                return;
            }
        } catch (err) {
            if (is.undefined(err._level)) {
                err._level = 0;
            } else {
                ++err._level;
                throw err;
            }
            this.emit("error", err);
        }
        this._afterTransform();
    }

    _end() {
        if (!this.flushed) {
            if (this.flushing) {
                return;
            }
            this.flushing = true;
            const ret = this._flush();
            if (is.promise(ret)) {
                ret.then(() => {
                    this.flushed = true;
                    if (this._readableState.buffer.empty) {
                        this._end();
                    }
                });
                return;
            }
            if (!this._readableState.buffer.empty) {
                return;
            }

        }
        this.ending = false;
        this.ended = true;
        this.emit("end");
    }

    write(chunk) {
        if (this.ending || this.ended) {
            throw new x.IllegalState("end() was called");
        }
        if (this._transformState.working || this._readableState.buffer.length >= this._readableState.highWaterMark) {
            this._writableState.buffer.push(chunk);
        } else {
            this._process(chunk);
        }
        const t = this._writableState.buffer.length < this._writableState.highWaterMark;
        if (!t) {
            this._writableState.needDrain = true;
        }
        return t;
    }

    push(chunk) {
        if (this._readableState.nullPushed || this.stopPushing) {
            return false;
        }
        if (chunk === adone.null) {
            this._readableState.nullPushed = true;
            this.end();
            return false;
        }
        if (this._readableState.flowing && this._readableState.buffer.empty) {
            this.emit("data", chunk);
        } else {
            this._readableState.buffer.push(chunk);
        }
        return this._readableState.buffer.length < this._readableState.highWaterMark;
    }

    end({ force = false, clearReadable = false, clearWritable = false } = {}) {
        if (clearReadable) {
            this._readableState.buffer.clear();
        }
        if (clearWritable) {
            this._writableState.buffer.clear();
        }
        if (this.ending) {
            return this;
        }
        this.ending = true;
        this.stopPushing = force;
        if (!this._transformState.working && this._writableState.buffer.empty && this._readableState.buffer.empty) {
            this._end();
        }
        return this;
    }

    pipe(dst, { end = true, resume = false } = {}) {
        const src = this;

        if (src.ended) {
            if (end) {
                process.nextTick(() => dst.end());
            }
            return dst;
        }

        let dstEnd = false;  // think it over
        const onData = (x) => {
            if (!dstEnd && !dst.write(x)) {
                this.waitForDrain = true;
                src.pause();
            }
        };

        const onDrain = () => {
            this.waitForDrain = false;
            src.resume();
        };

        const onDstEnd = () => {
            dstEnd = true;
        };

        src.on("data", onData);
        dst.on("drain", onDrain);
        if (dst === process.stdout || dst === process.stderr) {
            end = false;
        }
        if (end) {
            src.once("end", () => {
                this.removeListener("data", onData);
                dst.removeListener("drain", onDrain);
                dst.removeListener("end", onDstEnd);
                dst.end();
            });
        }
        dst.once("end", onDstEnd);
        if (resume && !src._readableState.flowing) {
            process.nextTick(() => src.resume());
        }
        return dst;
    }

    pause() {
        this._readableState.flowing = false;
        return this;
    }

    resume() {
        if (this.ended || this._readableState.flowing || this.waitForDrain) {
            return this;
        }
        this._readableState.flowing = true;
        while (this._readableState.flowing) {
            if (this._readableState.buffer.empty) {
                break;
            }
            this.emit("data", this._readableState.buffer.shift());
            if (
                !this._writableState.buffer.empty &&
                !this._transformState.working &&
                this._readableState.buffer.length < this._readableState.highWaterMark
            ) {
                this._process(this._writableState.buffer.shift());
            }
        }
        if (
            this.ending &&
            !this._transformState.working &&
            this._readableState.buffer.empty &&
            this._writableState.buffer.empty
        ) {
            this._end();
        }
        return this;
    }

    get paused() {
        return this._readableState.flowing === false;
    }
}
adone.tag.set(Transform, adone.tag.TRANSFORM);
