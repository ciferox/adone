const {
    is,
    std: { stream: { Transform } }
} = adone;

const { StreamEncode, StreamDecode } = adone.nativeAddon(adone.std.path.join(__dirname, "native", "brotli.node"));

class TransformStreamEncode extends Transform {
    constructor(params = {}, sync = false) {
        super(params);
        this.sync = sync;
        this.encoding = false;
        this.corked = false;
        this.flushing = false;
        this.encoder = new StreamEncode(params);
    }

    _transform(chunk, encoding, next) {
        this.encoding = true;
        this.encoder.transform(chunk, (err, output) => {
            this.encoding = false;
            if (err) {
                return next(err);
            }
            this._push(output);
            next();
            if (this.flushing) {
                this.flush(true);
            }
        }, !this.sync);
    }

    _flush(done) {
        this.encoder.flush(true, (err, output) => {
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

    flush(force) {
        if (this.flushing && !force) {
            return;
        }

        if (!this.corked) {
            this.cork();
        }
        this.corked = true;
        this.flushing = true;

        if (this.encoding) {
            return;
        }

        this.encoder.flush(false, (err, output) => {
            if (err) {
                this.emit("error", err);
            } else {
                this._push(output);
            }
            this.corked = false;
            this.flushing = false;
            this.uncork();
        }, true);
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

adone.asNamespace(exports);

export const compress = (buf, options = {}) => new Promise((resolve, reject) => {
    if (is.string(buf)) {
        buf = Buffer.from(buf);
    } else if (!is.buffer(buf)) {
        reject(new Error("Brotli input is not a buffer."));
        return;
    }
    options.size_hint = buf.length;
    const stream = new TransformStreamEncode(options);
    const chunks = [];
    let length = 0;
    stream.on("error", reject).on("data", (chunk) => {
        chunks.push(chunk);
        length += chunk.length;
    }).on("end", () => {
        resolve(Buffer.concat(chunks, length));
    }).end(buf);
});

export const compressSync = (buf, options = {}) => {
    if (is.string(buf)) {
        buf = Buffer.from(buf);
    } else if (!is.buffer(buf)) {
        throw new Error("Brotli input is not a buffer.");
    }
    options.size_hint = buf.length;
    const stream = new TransformStreamEncode(options, true);
    const chunks = [];
    let length = 0;
    stream.on("error", (e) => {
        throw e;
    }).on("data", (chunk) => {
        chunks.push(chunk);
        length += chunk.length;
    }).end(buf);
    return Buffer.concat(chunks, length);
};

export const compressStream = (options = {}) => new TransformStreamEncode(options);

export const decompress = (buf, options = {}) => new Promise((resolve, reject) => {
    if (!is.buffer(buf)) {
        reject(new Error("Brotli input is not a buffer."));
        return;
    }
    const stream = new TransformStreamDecode(options);
    const chunks = [];
    let length = 0;
    stream.on("error", reject).on("data", (c) => {
        chunks.push(c);
        length += c.length;
    }).on("end", () => {
        resolve(Buffer.concat(chunks, length));
    }).end(buf);
});

export const decompressSync = (buf, options) => {
    if (!is.buffer(buf)) {
        throw new Error("Brotli input is not a buffer.");
    }
    const stream = new TransformStreamDecode(options, true);
    const chunks = [];
    let length = 0;
    stream.on("error", (e) => {
        throw e;
    }).on("data", (c) => {
        chunks.push(c);
        length += c.length;
    }).end(buf);
    return Buffer.concat(chunks, length);
};

export const decompressStream = (options = {}) => new TransformStreamDecode(options);
