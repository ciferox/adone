const {
    error,
    std: {
        stream: { Transform }
    }
} = adone;

export default class AssertByteCountStream extends Transform {
    constructor(byteCount) {
        super();
        this.actualByteCount = 0;
        this.expectedByteCount = byteCount;
    }

    _transform(chunk, encoding, cb) {
        this.actualByteCount += chunk.length;
        if (this.actualByteCount > this.expectedByteCount) {
            const msg = `too many bytes in the stream. expected ${this.expectedByteCount}. got at least ${this.actualByteCount}`;
            return cb(new error.IllegalStateException(msg));
        }
        cb(null, chunk);
    }

    _flush(cb) {
        if (this.actualByteCount < this.expectedByteCount) {
            const msg = `not enough bytes in the stream. expected ${this.expectedByteCount}. got only ${this.actualByteCount}`;
            return cb(new error.IllegalStateException(msg));
        }
        cb();
    }
}
