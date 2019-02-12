const {
    util: { iconv },
    std: { stream: { Transform } },
    error,
    is
} = adone;

export class EncodeStream extends Transform {
    constructor(conv, options = {}) {
        options.decodeStrings = false; // We accept only strings, so we don't need to decode them.
        super(options);
        this.conv = conv;
    }

    _transform(chunk, encoding, done) {
        if (!is.string(chunk)) {
            return done(new error.IllegalStateException("Iconv encoding stream needs strings as its input."));
        }
        try {
            const res = this.conv.write(chunk);
            if (res && res.length) {
                this.push(res);
            }
            done();
        } catch (e) {
            done(e);
        }
    }

    _flush(done) {
        try {
            const res = this.conv.end();
            if (res && res.length) {
                this.push(res);
            }
            done();
        } catch (e) {
            done(e);
        }
    }
}

export class DecodeStream extends Transform {
    constructor(conv, options = {}) {
        options.encoding = "utf8";
        super(options);
        this.conv = conv;
        this.encoding = "utf8";
    }

    _transform(chunk, encoding, done) {
        if (!is.buffer(chunk)) {
            return done(new error.IllegalStateException("Iconv decoding stream needs buffers as its input."));
        }
        try {
            const res = this.conv.write(chunk);
            if (res && res.length) {
                this.push(res, this.encoding);
            }
            done();
        } catch (e) {
            done(e);
        }
    }

    _flush(done) {
        try {
            const res = this.conv.end();
            if (res && res.length) {
                this.push(res, this.encoding);
            }
            done();
        } catch (e) {
            done(e);
        }
    }
}

export const encode = (encoding, options) => new EncodeStream(iconv.getEncoder(encoding, options), options);

export const decode = (encoding, options) => new DecodeStream(iconv.getDecoder(encoding, options), options);
