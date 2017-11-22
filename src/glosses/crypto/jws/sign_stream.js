import DataStream from "./data_stream";

const {
    data: { base64url },
    crypto: { jwa },
    is,
    std: { util, stream: { Stream } }
} = adone;

const toBuffer = (val, encoding) => {
    if (is.buffer(val)) {
        return val;
    }
    if (is.string(val)) {
        return Buffer.from(val, encoding || "utf8");
    }
    if (is.number(val)) {
        // This won't work for very large or very small numbers, but is consistent
        // with previous behaviour at least
        val = val.toString();
        return Buffer.from(val, "utf8");
    }
    return Buffer.from(JSON.stringify(val), "utf8");
};

const jwsSecuredInput = (header, payload, encoding) => {
    encoding = encoding || "utf8";
    const encodedHeader = base64url.encode(toBuffer(header));
    const encodedPayload = base64url.encode(toBuffer(payload, encoding));
    return util.format("%s.%s", encodedHeader, encodedPayload);
};

export default class SignStream extends Stream {
    constructor(opts) {
        super();
        const secret = opts.secret || opts.privateKey || opts.key;
        const secretStream = new DataStream(secret);
        this.readable = true;
        this.header = opts.header;
        this.encoding = opts.encoding;
        this.secret = this.privateKey = this.key = secretStream;
        this.payload = new DataStream(opts.payload);
        this.secret.once("close", () => {
            if (!this.payload.writable && this.readable) {
                this.sign();
            }
        });

        this.payload.once("close", () => {
            if (!this.secret.writable && this.readable) {
                this.sign();
            }
        });
    }

    sign() {
        try {
            const signature = SignStream.sign({
                header: this.header,
                payload: this.payload.buffer,
                secret: this.secret.buffer,
                encoding: this.encoding
            });
            this.emit("done", signature);
            this.emit("data", signature);
            this.emit("end");
            this.readable = false;
            return signature;
        } catch (e) {
            this.readable = false;
            this.emit("error", e);
            this.emit("close");
        }
    }

    static sign(opts) {
        const header = opts.header;
        const payload = opts.payload;
        const secretOrKey = opts.secret || opts.privateKey;
        const encoding = opts.encoding;
        const algo = jwa(header.alg);
        const securedInput = jwsSecuredInput(header, payload, encoding);
        const signature = algo.sign(securedInput, secretOrKey);
        return util.format("%s.%s", securedInput, signature);
    }
}
