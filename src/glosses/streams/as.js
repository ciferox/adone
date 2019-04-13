const {
    std: { stream: { PassThrough } },
    stream: { pump }
} = adone;

const bufferStream = ({ array, encoding } = {}) => {
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

export const string = (inputStream, { array, encoding, maxBuffer = Infinity } = {}) => {
    if (!inputStream) {
        return Promise.reject(new Error("Expected a stream"));
    }

    let stream;

    return new Promise((resolve, reject) => {
        const rejectPromise = (err) => {
            if (err) { // A null check
                err.bufferedData = stream.getBufferedValue();
            }

            reject(err);
        };

        stream = pump(inputStream, bufferStream({ array, encoding }), (err) =>
            err ? rejectPromise(err) : resolve()
        );

        stream.on("data", () => {
            if (stream.getBufferedLength() > maxBuffer) {
                rejectPromise(new adone.error.OutOfRangeException("maxBuffer exceeded"));
            }
        });
    }).then(() => stream.getBufferedValue());
};

export const buffer = (stream, options) => string(stream, Object.assign({}, options, { encoding: "buffer" }));
export const array = (stream, options) => string(stream, Object.assign({}, options, { array: true }));
