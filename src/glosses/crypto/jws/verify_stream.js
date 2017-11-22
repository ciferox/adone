import DataStream from "./data_stream";

const {
    crypto: { jwa },
    data: { base64url },
    is
} = adone;

const JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;

const toString = (obj) => {
    if (is.string(obj)) {
        return obj;
    }
    if (is.number(obj) || is.buffer(obj)) {
        return obj.toString();
    }
    return JSON.stringify(obj);
};

const safeJsonParse = (thing) => {
    if (is.object(thing)) {
        return thing;
    }
    try {
        return JSON.parse(thing);
    } catch (e) {
        return undefined;
    }
};

const headerFromJWS = (jwsSig) => {
    const encodedHeader = jwsSig.split(".", 1)[0];
    return safeJsonParse(base64url.decode(encodedHeader, {
        encoding: "binary"
    }));
};

const securedInputFromJWS = (jwsSig) => jwsSig.split(".", 2).join(".");

const signatureFromJWS = (jwsSig) => jwsSig.split(".")[2];

const payloadFromJWS = (jwsSig, encoding) => {
    encoding = encoding || "utf8";
    const payload = jwsSig.split(".")[1];
    return base64url.decode(payload, { encoding });
};

export default class VerifyStream extends adone.std.stream.Stream {
    constructor(opts) {
        super();
        opts = opts || {};
        const secretOrKey = opts.secret || opts.publicKey || opts.key;
        const secretStream = new DataStream(secretOrKey);
        this.readable = true;
        this.algorithm = opts.algorithm;
        this.encoding = opts.encoding;
        this.secret = this.publicKey = this.key = secretStream;
        this.signature = new DataStream(opts.signature);
        this.secret.once("close", () => {
            if (!this.signature.writable && this.readable) {
                this.verify();
            }
        });

        this.signature.once("close", () => {
            if (!this.secret.writable && this.readable) {
                this.verify();
            }
        });
    }

    verify() {
        try {
            const valid = VerifyStream.verify(this.signature.buffer, this.algorithm, this.key.buffer);
            const obj = VerifyStream.decode(this.signature.buffer, this.encoding);
            this.emit("done", valid, obj);
            this.emit("data", valid);
            this.emit("end");
            this.readable = false;
            return valid;
        } catch (e) {
            this.readable = false;
            this.emit("error", e);
            this.emit("close");
        }
    }

    static decode(jwsSig, opts) {
        opts = opts || {};
        jwsSig = toString(jwsSig);

        if (!VerifyStream.isValid(jwsSig)) {
            return null;
        }

        const header = headerFromJWS(jwsSig);

        if (!header) {
            return null;
        }

        let payload = payloadFromJWS(jwsSig);
        if (header.typ === "JWT" || opts.json) {
            payload = JSON.parse(payload, opts.encoding);
        }

        return {
            header,
            payload,
            signature: signatureFromJWS(jwsSig)
        };
    }

    static isValid(string) {
        return JWS_REGEX.test(string) && Boolean(headerFromJWS(string));
    }

    static verify(jwsSig, algorithm, secretOrKey) {
        if (!algorithm) {
            const err = new Error("Missing algorithm parameter for jws.verify");
            err.code = "MISSING_ALGORITHM";
            throw err;
        }
        jwsSig = toString(jwsSig);
        const signature = signatureFromJWS(jwsSig);
        const securedInput = securedInputFromJWS(jwsSig);
        const algo = jwa(algorithm);
        return algo.verify(securedInput, signature, secretOrKey);
    }
}
