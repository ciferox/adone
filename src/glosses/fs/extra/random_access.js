const {
    std: {
        stream: {
            Writable,
            PassThrough
        }
    },
    error,
    event,
    stream
} = adone;

export default (fs) => {
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
    
    class AbstractRandomAccessReader extends event.Emitter {
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
                throw new error.IllegalStateException("invalid unref");
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
            throw new error.NotImplementedException();
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
    
    class RandomAccessFdReader extends AbstractRandomAccessReader {
        constructor(fd) {
            super();
            this.fd = fd;
            this.streams = new Set();
        }
    
        _readStreamForRange(start, end) {
            --end;
            const stream = fs.createReadStream(null, { fd: this.fd, start, end, autoClose: false });
            this.streams.add(stream);
            stream.once("end", () => {
                this.streams.delete(stream);
            });
            return stream;
        }
    
        async close() {
            await Promise.all([...this.streams].map((stream) => new Promise((resolve) => {
                stream.once("end", resolve);
            })));
            try {
                await fs.close(this.fd);
            } catch (err) {
                // ?
            }
        }
    }
    
    class RandomAccessBufferReader extends AbstractRandomAccessReader {
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

    return {
        AbstractRandomAccessReader,
        RandomAccessFdReader,
        RandomAccessBufferReader
    };
};
