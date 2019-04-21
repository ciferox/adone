const {
    is,
    std: { stream: { Transform } }
} = adone;

const { StreamEncode, StreamDecode } = adone.requireAddon(adone.std.path.join(__dirname, "native", "brotli.node"));

class TransformStreamEncode extends Transform {
    constructor(params, sync = false) {
        super();
        this.sync = sync;
        this.encoding = false;
        this.corked = false;
        this.flushing = false;
        this.encoder = new StreamEncode(params || {});
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
    constructor(sync) {
        super();
        this.sync = sync || false;
        this.decoder = new StreamDecode();
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

export const compress = (input, params = {}) => {
    if (!is.buffer(input)) {
        throw new Error("Brotli input is not a buffer.");
    }
    return new Promise((resolve, reject) => {
        params.size_hint = input.length;
        const stream = new TransformStreamEncode(params);
        const chunks = [];
        let length = 0;
        stream.on("error", reject);
        stream.on("data", (c) => {
            chunks.push(c);
            length += c.length;
        });
        stream.on("end", () => {
            resolve(Buffer.concat(chunks, length));
        });
        stream.end(input);
    });
};

export const decompress = (input) => {
    if (!is.buffer(input)) {
        throw new Error("Brotli input is not a buffer.");
    }

    return new Promise((resolve, reject) => {
        const stream = new TransformStreamDecode();
        const chunks = [];
        let length = 0;
        stream.on("error", reject);
        stream.on("data", (c) => {
            chunks.push(c);
            length += c.length;
        });
        stream.on("end", () => {
            resolve(Buffer.concat(chunks, length));
        });
        stream.end(input);
    });
};

export const compressSync = (input, params) => {
    if (!is.buffer(input)) {
        throw new Error("Brotli input is not a buffer.");
    }
    if (typeof params !== "object") {
        params = {};
    }
    params.size_hint = input.length;
    const stream = new TransformStreamEncode(params, true);
    const chunks = [];
    let length = 0;
    stream.on("error", (e) => {
        throw e;
    });
    stream.on("data", (c) => {
        chunks.push(c);
        length += c.length;
    });
    stream.end(input);
    return Buffer.concat(chunks, length);
};

export const decompressSync = (input) => {
    if (!is.buffer(input)) {
        throw new Error("Brotli input is not a buffer.");
    }
    const stream = new TransformStreamDecode(true);
    const chunks = [];
    let length = 0;
    stream.on("error", (e) => {
        throw e;
    });
    stream.on("data", (c) => {
        chunks.push(c);
        length += c.length;
    });
    stream.end(input);
    return Buffer.concat(chunks, length);
};

export const compressStream = (params) => new TransformStreamEncode(params);
export const decompressStream = () => new TransformStreamDecode();
