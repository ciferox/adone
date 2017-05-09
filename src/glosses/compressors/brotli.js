const { is, std: { stream: { Transform } } } = adone;

const { StreamEncode, StreamDecode } = adone.bind("brotli.node");

class TransformStreamEncode extends Transform {
    constructor(params = {}, sync = false) {
        super(params);
        this.sync = sync;
        this.flushing = false;
        this.encoder = new StreamEncode(params);
        const blockSize = this.encoder.getBlockSize();
        this.status = {
            blockSize,
            remaining: blockSize
        };
    }

    // We need to fill the blockSize for better compression results
    _transform(chunk, encoding, next) {
        const status = this.status;
        const length = chunk.length;

        if (length > status.remaining) {
            const slicedChunk = chunk.slice(0, status.remaining);
            chunk = chunk.slice(status.remaining);
            status.remaining = status.blockSize;

            this.encoder.copy(slicedChunk);
            this.encoder.encode(false, (err, output) => {
                if (err) {
                    return next(err);
                }
                this._push(output);
                this._transform(chunk, encoding, next);
            }, !this.sync);
        } else if (length < status.remaining) {
            status.remaining -= length;
            this.encoder.copy(chunk);
            next();
        } else { // length === status.remaining
            status.remaining = status.blockSize;
            this.encoder.copy(chunk);
            this.encoder.encode(false, (err, output) => {
                if (err) {
                    return next(err);
                }
                this._push(output);
                next();
            }, !this.sync);
        }
    }

    _flush(done) {
        this.encoder.encode(true, (err, output) => {
            if (err) {
                return done(err);
            }
            this._push(output);
            done();
        }, !this.sync);
    }

    _push(output) {
        if (output) {
            for (let i = 0; i < output.length; i++) {
                this.push(output[i]);
            }
        }
    }

    flush() {
        if (this.flushing) {
            return;
        }

        this.cork();
        this.flushing = true;

        this.encoder.flush((err, output) => {
            if (err) {
                this.emit("error", err);
            } else {
                this.status.remaining = this.status.blockSize;
                this._push(output);
            }
            this.uncork();
            this.flushing = false;
        });
    }
}

class TransformStreamDecode extends Transform {
    constructor(params, sync) {
        super(params);
        this.sync = sync || false;
        this.decoder = new StreamDecode(params || {});
    }

    _transform(chunk, encoding, next) {
        this.decoder.transform(chunk, (err, output) => {
            if (err) {
                return next(err);
            }
            this._push(output);
            next();
        }, !this.sync);
    }

    _flush(done) {
        this.decoder.flush((err, output) => {
            if (err) {
                return done(err);
            }
            this._push(output);
            done();
        }, !this.sync);
    }

    _push(output) {
        if (output) {
            for (let i = 0; i < output.length; i++) {
                this.push(output[i]);
            }
        }
    }
}

export const compress = (buf, options) => new Promise((resolve, reject) => {
    const isBuffer = is.buffer(buf);
    if (!isBuffer && !is.string(buf)) {
        throw new adone.x.InvalidArgument("The first agrument must be a buffer or a string");
    }
    if (!isBuffer) {
        buf = Buffer.from(buf);
    }
    const stream = new TransformStreamEncode(options);
    const chunks = [];
    let length = 0;
    stream
        .on("error", reject)
        .on("data", (chunk) => {
            chunks.push(chunk);
            length += chunk.length;
        })
        .on("end", () => {
            resolve(Buffer.concat(chunks, length));
        })
        .end(buf);
});

export const compressSync = (buf, options) => {
    const isBuffer = is.buffer(buf);
    if (!isBuffer && !is.string(buf)) {
        throw new adone.x.InvalidArgument("The first agrument must be a buffer or a string");
    }
    if (!isBuffer) {
        buf = Buffer.from(buf);
    }
    const stream = new TransformStreamEncode(options, true);
    const chunks = [];
    let length = 0;
    stream
        .on("error", (e) => {
            throw e;
        })
        .on("data", (chunk) => {
            chunks.push(chunk);
            length += chunk.length;
        })
        .end(buf);
    return Buffer.concat(chunks, length);
};

export const compressStream = (options = {}) => new TransformStreamEncode(options);

export const decompress = (buf, options) => new Promise((resolve, reject) => {
    const isBuffer = is.buffer(buf);
    if (!isBuffer && !is.string(buf)) {
        throw new adone.x.InvalidArgument("The first agrument must be a buffer or a string");
    }
    if (!isBuffer) {
        buf = Buffer.from(buf);
    }
    const stream = new TransformStreamDecode(options);
    const chunks = [];
    let length = 0;
    stream
        .on("error", reject)
        .on("data", (chunk) => {
            chunks.push(chunk);
            length += chunk.length;
        })
        .on("finish", () => {
            resolve(Buffer.concat(chunks, length));
        })
        .end(buf);
});

export const decompressSync = (buf, options) => {
    const isBuffer = is.buffer(buf);
    if (!isBuffer && !is.string(buf)) {
        throw new adone.x.InvalidArgument("The first agrument must be a buffer or a string");
    }
    if (!isBuffer) {
        buf = Buffer.from(buf);
    }
    const stream = new TransformStreamDecode(options, true);
    const chunks = [];
    let length = 0;
    stream
        .on("error", (e) => {
            throw e;
        })
        .on("data", (chunk) => {
            chunks.push(chunk);
            length += chunk.length;
        })
        .end(buf);
    return Buffer.concat(chunks, length);
};

export const decompressStream = (options = {}) => new TransformStreamDecode(options);
