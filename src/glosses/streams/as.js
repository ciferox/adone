const PassThrough = adone.std.stream.PassThrough;

const bufferStream = (opts) => {
    opts = Object.assign({}, opts);

    const array = opts.array;
    let encoding = opts.encoding;
    const buffer = encoding === "buffer";
    let objectMode = false;

    if (array) {
        objectMode = !(encoding || buffer);
    } else {
        encoding = encoding || "utf8";
    }

    if (buffer) {
        encoding = null;
    }

    let len = 0;
    const ret = [];
    const stream = new PassThrough({ objectMode });

    if (encoding) {
        stream.setEncoding(encoding);
    }

    stream.on("data", (chunk) => {
        ret.push(chunk);

        if (objectMode) {
            len = ret.length;
        } else {
            len += chunk.length;
        }
    });

    stream.getBufferedValue = () => {
        if (array) {
            return ret;
        }

        return buffer ? Buffer.concat(ret, len) : ret.join("");
    };

    stream.getBufferedLength = () => len;

    return stream;
};

export const string = (inputStream, opts) => {
    if (!inputStream) {
        return Promise.reject(new Error("Expected a stream"));
    }

    opts = Object.assign({ maxBuffer: Infinity }, opts);

    const maxBuffer = opts.maxBuffer;
    let stream;
    let clean;

    const p = new Promise((resolve, reject) => {
        const error = (err) => {
            if (err) { // null check
                err.bufferedData = stream.getBufferedValue();
            }

            reject(err);
        };

        stream = bufferStream(opts);
        inputStream.once("error", error);
        inputStream.pipe(stream);

        stream.on("data", () => {
            if (stream.getBufferedLength() > maxBuffer) {
                reject(new Error("maxBuffer exceeded"));
            }
        });
        stream.once("error", error);
        stream.on("end", resolve);

        clean = () => {
            // some streams doesn't implement the `stream.Readable` interface correctly
            if (inputStream.unpipe) {
                inputStream.unpipe(stream);
            }
        };
    });

    p.then(clean, clean);

    return p.then(() => stream.getBufferedValue());
};

export const buffer = (stream, opts) => string(stream, Object.assign({}, opts, { encoding: "buffer" }));
export const array = (stream, opts) => string(stream, Object.assign({}, opts, { array: true }));
