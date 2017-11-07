const {
    is,
    fs,
    std: {
        path,
        constants: c,
        stream: {
            Writable,
            PassThrough
        }
    },
    x,
    event: { EventEmitter },
    stream
} = adone;

export class RandomAccessFile extends adone.event.EventEmitter {
    constructor(filename, options) {
        super();

        if (options.cwd) {
            filename = path.resolve(options.cwd, filename);
        }
        this.filename = filename;
        this.fd = 0;
        this.readable = options.readable === true;
        this.writable = options.writable === true;
        this.appendable = options.appendable === true;
        this.mtime = options.mtime;
        this.atime = options.atime;
        this.length = 0;
    }

    async read(length, offset = null) {
        if (!this.readable) {
            throw new x.IllegalState("File is not readable");
        }

        const buf = Buffer.alloc(length);
        let bytes = 0;
        for ( ; length > 0; ) {
            if (!this.fd) {
                throw new x.IllegalState("File is closed");
            }
            // eslint-disable-next-line
            bytes = await fs.read(this.fd, buf, buf.length - length, length, offset);
            if (bytes === 0) {
                throw new x.IllegalState("Could not satisfy length");
            }
            if (is.number(offset)) {
                offset += bytes;
            }
            length -= bytes;
        }
        return buf;
    }

    async write(buf, offset = null) {
        if (!this.writable) {
            throw new x.IllegalState("File is not writable");
        }

        let length = buf.length;
        let bytes = 0;
        for ( ; length > 0; ) {
            if (!this.fd) {
                throw new x.IllegalState("File is closed");
            }
            // eslint-disable-next-line
            bytes = await fs.write(this.fd, buf, buf.length - length, length, offset);
            length -= bytes;
            if (is.number(offset)) {
                offset += bytes;
            }
        }

        if (!is.number(offset)) {
            offset = await fs.seek(this.fd, 0, 1);
        }
        if (offset > this.length) {
            this.length = offset;
        }
        return bytes;
    }

    async close() {
        if (!this.fd) {
            return;
        }
        await fs.close(this.fd);
        this.fd = 0;
        this.emit("close");
    }

    async end(opts = {}) {
        const atime = opts.atime || this.atime;
        const mtime = opts.mtime || this.mtime;

        if (!atime && !mtime) {
            //
        } else if (atime && mtime) {
            await fs.futimes(this.fd, atime, mtime);
        } else {
            const stats = await fs.fstat(this.fd);
            await fs.futimes(this.fd, atime || stats.atime, mtime || stats.mtime);
        }
    }

    async truncate(size) {
        await fs.ftruncate(this.fd, size);
        this.length = size;
    }

    unlink() {
        return fs.unlink(this.filename);
    }

    _mode() {
        if (this.appendable) {
            if (this.writable && !this.readable) {
                return c.O_APPEND | c.O_CREAT | c.O_WRONLY;
            }
            this.readable = true;
            this.writable = true;
            return c.O_APPEND | c.O_CREAT | c.O_RDWR;
        }
        if (this.readable && this.writable) {
            return c.O_RDWR | c.O_CREAT;
        }
        if (this.writable) {
            return c.O_WRONLY | c.O_CREAT;
        }
        return c.O_RDONLY;
    }

    static async open(filename, options = {}) {
        options.readable = (options.readable !== false);
        options.writable = (options.writable !== false);
        const raf = new RandomAccessFile(filename, options);
        const dir = path.dirname(filename);

        if (dir) {
            await adone.fs.mkdir(dir);
        }

        let fd;
        try {
            fd = await fs.open(filename, raf._mode());
        } catch (err) {
            if (err && err.code === "EACCES" && raf.writable) {
                raf.writable = false;
                fd = await fs.open(filename, raf._mode());
            }
        }

        raf.fd = fd;
        raf.emit("open");

        if (is.number(options.truncate) && options.truncate >= 0) {
            await raf.truncate(options.truncate);
        } else {
            const stats = await fs.fstat(fd);
            raf.length = stats.size;
        }

        return raf;
    }
}

class RefUnrefFilter extends PassThrough {
    constructor(context) {
        super();
        this.context = context;
        this.context.ref();
        this.unreffedYet = false;
    }

    _flush(cb) {
        this.unref();
        cb();
    }

    unref() {
        if (this.unreffedYet) {
            return;
        }
        this.unreffedYet = true;
        this.context.unref();
    }
}

export class AbstractRandomAccessReader extends EventEmitter {
    constructor() {
        super();
        this.refCount = 0;
    }

    ref() {
        this.refCount += 1;
    }

    unref() {
        this.refCount -= 1;

        if (this.refCount > 0) {
            return;
        }
        if (this.refCount < 0) {
            throw new x.IllegalState("invalid unref");
        }

        this.close().then(() => {
            this.emit("close");
        }).catch((err) => {
            this.emit("error", err);
        });

    }

    createReadStream(options) {
        const start = options.start;
        const end = options.end;
        if (start === end) {
            const emptyStream = new PassThrough();
            setImmediate(() => {
                emptyStream.end();
            });
            return emptyStream;
        }
        const s = this._readStreamForRange(start, end);

        let destroyed = false;
        const refUnrefFilter = new RefUnrefFilter(this);
        s.on("error", (err) => {
            setImmediate(() => {
                if (!destroyed) {
                    refUnrefFilter.emit("error", err);
                }
            });
        });
        refUnrefFilter.destroy = function () {
            s.unpipe(refUnrefFilter);
            refUnrefFilter.unref();
            s.destroy();
        };

        const byteCounter = new stream.AssertByteCountStream(end - start);
        refUnrefFilter.on("error", (err) => {
            setImmediate(() => {
                if (!destroyed) {
                    byteCounter.emit("error", err);
                }
            });
        });
        byteCounter.destroy = function () {
            destroyed = true;
            refUnrefFilter.unpipe(byteCounter);
            refUnrefFilter.destroy();
        };

        return s.pipe(refUnrefFilter).pipe(byteCounter);
    }

    _readStreamForRange(/* start, end */) {
        throw new x.NotImplemented();
    }

    async read(buffer, offset, length, position) {
        const readStream = this.createReadStream({ start: position, end: position + length });
        const writeStream = new Writable();
        let written = 0;
        writeStream._write = function (chunk, encoding, cb) {
            chunk.copy(buffer, offset + written, 0, chunk.length);
            written += chunk.length;
            cb();
        };
        await new Promise((resolve, reject) => {
            writeStream.once("finish", resolve);
            readStream.once("error", reject);
            readStream.pipe(writeStream);
        });
    }

    async close() {
        //
    }
}

export class RandomAccessFdReader extends AbstractRandomAccessReader {
    constructor(fd) {
        super();
        this.fd = fd;
    }

    _readStreamForRange(start, end) {
        --end;
        return fs.createReadStream(null, { fd: this.fd, start, end, autoClose: false });
    }
}

export class RandomAccessBufferReader extends AbstractRandomAccessReader {
    constructor(buffer) {
        super();
        this.buffer = buffer;
    }

    _readStreamForRange(start, end) {
        const length = end - start;
        const buffer = Buffer.alloc(length);
        adone.util.memcpy.utou(buffer, 0, this.buffer, start, end);
        return new adone.collection.BufferList(buffer);
    }
}
