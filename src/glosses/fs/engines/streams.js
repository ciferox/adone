// just port of https://github.com/nodejs/node/blob/master/lib/fs.js

const {
    error,
    is,
    std: { stream }
} = adone;

const assertEncoding = (encoding) => {
    if (encoding && !Buffer.isEncoding(encoding)) {
        throw new error.InvalidArgument(`Invalid encoding: ${encoding}`);
    }
};


const getOptions = (options, defaultOptions) => {
    if (is.nil(options) || is.function(options)) {
        return defaultOptions;
    }

    if (is.string(options)) {
        defaultOptions = { ...defaultOptions };
        defaultOptions.encoding = options;
        options = defaultOptions;
    } else if (!is.object(options)) {
        throw new error.InvalidArgument("Invalid options object, must be string or object");
    }

    if (options.encoding !== "buffer") {
        assertEncoding(options.encoding);
    }
    return options;
};

let pool;

const allocNewPool = (poolSize) => {
    pool = Buffer.allocUnsafe(poolSize);
    pool.used = 0;
};

const kMinPoolSpace = 128;


const closeFsStream = (stream, cb, err) => {
    stream.engine.close(stream.fd, (er) => {
        er = er || err;
        cb(er);
        if (!er) {
            stream.emit("close");
        }
    });
};

export class ReadStream extends stream.Readable {
    constructor(engine, path, options) {
        options = { ...getOptions(options, {}) };
        super(options);
        this.engine = engine;
        // a little bit bigger buffer and water marks by default
        if (is.undefined(options.highWaterMark)) {
            options.highWaterMark = 64 * 1024;
        }

        this.path = path;
        this.fd = is.undefined(options.fd) ? null : options.fd;
        this.flags = is.undefined(options.flags) ? "r" : options.flags;
        this.mode = is.undefined(options.mode) ? 0o666 : options.mode;

        this.start = options.start;
        this.end = options.end;
        this.autoClose = is.undefined(options.autoClose) ? true : options.autoClose;
        this.pos = undefined;
        this.bytesRead = 0;

        if (!is.undefined(this.start)) {
            if (!is.number(this.start)) {
                throw new TypeError("ERR_INVALID_ARG_TYPE",
                    "start",
                    "number",
                    this.start);
            }
            if (is.undefined(this.end)) {
                this.end = Infinity;
            } else if (!is.number(this.end)) {
                throw new TypeError("ERR_INVALID_ARG_TYPE",
                    "end",
                    "number",
                    this.end);
            }

            if (this.start > this.end) {
                const errVal = `{start: ${this.start}, end: ${this.end}}`;
                throw new RangeError("ERR_VALUE_OUT_OF_RANGE",
                    "start",
                    '<= "end"',
                    errVal);
            }

            this.pos = this.start;
        }

        if (!is.number(this.fd)) {
            this.open();
        }

        this.on("end", function () {
            if (this.autoClose) {
                this.destroy();
            }
        });
    }

    open() {
        const self = this;
        this.engine.open(this.path, this.flags, this.mode, (er, fd) => {
            if (er) {
                if (self.autoClose) {
                    self.destroy();
                }
                self.emit("error", er);
                return;
            }

            self.fd = fd;
            self.emit("open", fd);
            // start the flow of data.
            self.read();
        });
    }

    _read(n) {
        if (!is.number(this.fd)) {
            return this.once("open", function () {
                this._read(n);
            });
        }

        if (this.destroyed) {
            return;
        }

        if (!pool || pool.length - pool.used < kMinPoolSpace) {
            // discard the old pool.
            allocNewPool(this._readableState.highWaterMark);
        }

        // Grab another reference to the pool in the case that while we're
        // in the thread pool another read() finishes up the pool, and
        // allocates a new one.
        const thisPool = pool;
        let toRead = Math.min(pool.length - pool.used, n);
        const start = pool.used;

        if (!is.undefined(this.pos)) {
            toRead = Math.min(this.end - this.pos + 1, toRead);
        }

        // already read everything we were supposed to read!
        // treat as EOF.
        if (toRead <= 0) {
            return this.push(null);
        }

        // the actual read.
        const self = this;
        this.engine.read(this.fd, pool, pool.used, toRead, this.pos, (er, bytesRead) => {
            if (er) {
                if (self.autoClose) {
                    self.destroy();
                }
                self.emit("error", er);
            } else {
                let b = null;
                if (bytesRead > 0) {
                    self.bytesRead += bytesRead;
                    b = thisPool.slice(start, start + bytesRead);
                }

                self.push(b);
            }
        });

        // move the pool positions, and internal position for reading.
        if (!is.undefined(this.pos)) {
            this.pos += toRead;
        }
        pool.used += toRead;
    }

    _destroy(err, cb) {
        if (this.closed || !is.number(this.fd)) {
            if (!is.number(this.fd)) {
                this.once("open", closeFsStream.bind(null, this, cb, err));
                return;
            }

            return process.nextTick(() => {
                cb(err);
                this.emit("close");
            });
        }

        this.closed = true;

        closeFsStream(this, cb);
        this.fd = null;
    }

    close(cb) {
        this.destroy(null, cb);
    }
}

export class WriteStream extends stream.Writable {
    constructor(engine, path, options) {
        options = { ...getOptions(options, {}) };
        super(options);
        this.engine = engine;
        this.path = path;

        this.fd = is.undefined(options.fd) ? null : options.fd;
        this.flags = is.undefined(options.flags) ? "w" : options.flags;
        this.mode = is.undefined(options.mode) ? 0o666 : options.mode;

        this.start = options.start;
        this.autoClose = is.undefined(options.autoClose) ? true : Boolean(options.autoClose);
        this.pos = undefined;
        this.bytesWritten = 0;

        if (!is.undefined(this.start)) {
            if (!is.number(this.start)) {
                throw new TypeError("ERR_INVALID_ARG_TYPE",
                    "start",
                    "number",
                    this.start);
            }
            if (this.start < 0) {
                const errVal = `{start: ${this.start}}`;
                throw new RangeError("ERR_VALUE_OUT_OF_RANGE",
                    "start",
                    ">= 0",
                    errVal);
            }

            this.pos = this.start;
        }

        if (options.encoding) {
            this.setDefaultEncoding(options.encoding);
        }

        if (!is.number(this.fd)) {
            this.open();
        }

        // dispose on finish.
        this.once("finish", function () {
            if (this.autoClose) {
                this.destroy();
            }
        });
    }

    open() {
        this.engine.open(this.path, this.flags, this.mode, (er, fd) => {
            if (er) {
                if (this.autoClose) {
                    this.destroy();
                }
                this.emit("error", er);
                return;
            }

            this.fd = fd;
            this.emit("open", fd);
        });
    }

    _write(data, encoding, cb) {
        if (!(data instanceof Buffer)) {
            return this.emit("error", new Error("Invalid data"));
        }

        if (!is.number(this.fd)) {
            return this.once("open", function () {
                this._write(data, encoding, cb);
            });
        }

        const self = this;
        this.engine.write(this.fd, data, 0, data.length, this.pos, (er, bytes) => {
            if (er) {
                if (self.autoClose) {
                    self.destroy();
                }
                return cb(er);
            }
            self.bytesWritten += bytes;
            cb();
        });

        if (!is.undefined(this.pos)) {
            this.pos += data.length;
        }
    }

    close(cb) {
        if (this._writableState.ending) {
            this.on("close", cb);
            return;
        }

        if (this._writableState.ended) {
            process.nextTick(cb);
            return;
        }

        // we use end() instead of destroy() because of
        // https://github.com/nodejs/node/issues/2006
        this.end(cb);
    }
}

WriteStream.prototype._destroy = ReadStream.prototype._destroy;

// There is no shutdown() for files.
WriteStream.prototype.destroySoon = WriteStream.prototype.end;

