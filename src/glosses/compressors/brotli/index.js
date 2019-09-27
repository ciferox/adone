const {
    is
} = adone;

exports.compress = compress;
exports.decompress = decompress;
exports.compressSync = compressSync;
exports.decompressSync = decompressSync;
exports.compressStream = compressStream;
exports.decompressStream = decompressStream;

const { StreamEncode, StreamDecode } = adone.requireAddon(adone.path.join(__dirname, "native", "iltorb.node"));
const { Transform } = require("stream");

class TransformStreamEncode extends Transform {
    constructor(params = {}, async = true) {
        super();
        this.encoding = false;
        this.corked = false;
        this.flushing = false;
        this.encoder = new StreamEncode(async, params);
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
        });
    }

    _flush(done) {
        this.encoder.flush(true, (err, output) => {
            if (err) {
                return done(err);
            }
            this._push(output);
            done();
        });
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
        });
    }
}

class TransformStreamDecode extends Transform {
    constructor(async = true) {
        super();
        this.decoder = new StreamDecode(async);
    }

    _transform(chunk, encoding, next) {
        this.decoder.transform(chunk, (err, output) => {
            if (err) {
                return next(err);
            }
            this._push(output);
            next();
        });
    }

    _flush(done) {
        this.decoder.flush((err, output) => {
            if (err) {
                return done(err);
            }
            this._push(output);
            done();
        });
    }

    _push(output) {
        if (output) {
            for (let i = 0; i < output.length; i++) {
                this.push(output[i]);
            }
        }
    }
}

function compress(input, params, cb) {
    if (is.function(params)) {
        cb = params;
        params = {};
    }

    const gotCallback = is.function(cb);

    if (!is.buffer(input)) {
        const err = new Error("Brotli input is not a buffer.");
        if (gotCallback) {
            return process.nextTick(cb, err);
        }
        return Promise.reject(err);
    }

    params = { ...params, size_hint: input.length };

    if (gotCallback) {
        return compressBuffer(input, params, cb);
    }

    return new Promise(((resolve, reject) => {
        compressBuffer(input, params, (err, output) => {
            if (err) {
                reject(err);
            } else {
                resolve(output);
            }
        });
    }));
}

function compressBuffer(input, params, cb) {
    const stream = new TransformStreamEncode(params);
    const chunks = [];
    let length = 0;
    stream.on("error", cb);
    stream.on("data", (c) => {
        chunks.push(c);
        length += c.length;
    });
    stream.on("end", () => {
        cb(null, Buffer.concat(chunks, length));
    });
    stream.end(input);
}

function decompress(input, cb) {
    const gotCallback = is.function(cb);

    if (!is.buffer(input)) {
        const err = new Error("Brotli input is not a buffer.");
        if (gotCallback) {
            return process.nextTick(cb, err);
        }
        return Promise.reject(err);
    }

    if (gotCallback) {
        return decompressBuffer(input, cb);
    }

    return new Promise(((resolve, reject) => {
        decompressBuffer(input, (err, output) => {
            if (err) {
                reject(err);
            } else {
                resolve(output);
            }
        });
    }));
}

function decompressBuffer(input, cb) {
    const stream = new TransformStreamDecode();
    const chunks = [];
    let length = 0;
    stream.on("error", cb);
    stream.on("data", (c) => {
        chunks.push(c);
        length += c.length;
    });
    stream.on("end", () => {
        cb(null, Buffer.concat(chunks, length));
    });
    stream.end(input);
}

function compressSync(input, params) {
    if (!is.buffer(input)) {
        throw new Error("Brotli input is not a buffer.");
    }
    if (typeof params !== "object") {
        params = {};
    }
    params = { ...params, size_hint: input.length };
    const stream = new TransformStreamEncode(params, false);
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
}

function decompressSync(input) {
    if (!is.buffer(input)) {
        throw new Error("Brotli input is not a buffer.");
    }
    const stream = new TransformStreamDecode(false);
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
}

function compressStream(params) {
    return new TransformStreamEncode(params);
}

function decompressStream() {
    return new TransformStreamDecode();
}
