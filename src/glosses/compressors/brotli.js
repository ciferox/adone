import adone from "adone";

const { is, std: { stream: { Transform } } } = adone;

const brotli = {};

const encode = adone.bind("brotli_encode");
const decode = adone.bind("brotli_decode");

class TransformStreamEncode extends Transform {
    constructor(params = {}, sync = false) {
        super(params);
        this.encoder = new encode.StreamEncode(params);
        this.sync = sync;
        const blockSize = this.encoder.getBlockSize();
        this.status = { blockSize, remaining: blockSize };
    }

    compressStreamChunk(chunk, callback) {
        const stream = this;
        const { encoder, status, sync } = this;
        const length = chunk.length;

        if (length > status.remaining) {
            const slicedChunk = chunk.slice(0, status.remaining);
            chunk = chunk.slice(status.remaining);
            status.remaining = status.blockSize;

            encoder.copy(slicedChunk);
            encoder.encode(false, (err, output) => {
                if (err) {
                    return callback(err);
                }
                if (output) {
                    for (let i = 0; i < output.length; i++) {
                        stream.push(output[i]);
                    }
                }
                this.compressStreamChunk(chunk, callback);
            }, !sync);
        } else if (length < status.remaining) {
            status.remaining -= length;
            encoder.copy(chunk);
            callback();
        } else { // length === status.remaining
            status.remaining = status.blockSize;
            encoder.copy(chunk);
            encoder.encode(false, function (err, output) {
                if (err) {
                    return callback(err);
                }
                if (output) {
                    for (let i = 0; i < output.length; i++) {
                        stream.push(output[i]);
                    }
                }
                callback();
            }, !sync);
        }
    }

    _transform(chunk, encoding, callback) {
        this.compressStreamChunk(chunk, callback);
    }

    _flush(callback) {
        this.encoder.encode(true, (err, data) => {
            if (err) {
                return callback(err);
            }
            if (data) {
                for (let i = 0, l = data.length; i < l; ++i) {
                    this.push(data[i]);
                }
            }
            callback();
        }, !this.sync);
    }
}

class TransformStreamDecode extends Transform {
    constructor(params, sync = false) {
        super(params);
        this.sync = sync;
        this.decoder = new decode.StreamDecode();
    }

    _transform(chunk, encoding, callback) {
        this.decoder.transform(chunk, (err, data) => {
            if (err) {
                return callback(err);
            }
            if (data) {
                for (let i = 0, l = data.length; i < l; ++i) {
                    this.push(data[i]);
                }
            }
            callback();
        }, !this.sync);
    }

    _flush(callback) {
        this.decoder.flush((err, data) => {
            if (err) {
                return callback(err);
            }
            if (data) {
                for (let i = 0, l = data.length; i < l; ++i) {
                    this.push(data[i]);
                }
            }
            callback();
        });
    }
}

brotli.compress = (buf, options) => new Promise((resolve, reject) => {
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

brotli.compress.sync = (buf, options) => {
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

brotli.compress.stream = (options = {}) => new TransformStreamEncode(options);


brotli.decompress = (buf) => new Promise((resolve, reject) => {
    const isBuffer = is.buffer(buf);
    if (!isBuffer && !is.string(buf)) {
        throw new adone.x.InvalidArgument("The first agrument must be a buffer or a string");
    }
    if (!isBuffer) {
        buf = Buffer.from(buf);
    }
    const stream = new TransformStreamDecode();
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

brotli.decompress.sync = (buf) => {
    const isBuffer = is.buffer(buf);
    if (!isBuffer && !is.string(buf)) {
        throw new adone.x.InvalidArgument("The first agrument must be a buffer or a string");
    }
    if (!isBuffer) {
        buf = Buffer.from(buf);
    }
    const stream = new TransformStreamDecode({}, true);
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

brotli.decompress.stream = (options = {}) => new TransformStreamDecode(options);

export default brotli;
