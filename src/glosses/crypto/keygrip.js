const {
    is,
    error,
    crypto: { stringCompare },
    std: { crypto }
} = adone;

const cryptoHashes = new Set(crypto.getHashes());
const cryptoCiphers = new Set(crypto.getCiphers());
const hash = Symbol("hash");
const cipher = Symbol("cipher");

export default class Keygrip {
    constructor(keys, { hash = "sha256", cipher = "aes-256-cbc" } = {}) {
        if (!is.array(keys) || keys.length === 0) {
            throw new error.InvalidArgument("Keys must be provided");
        }
        this.keys = keys;
        this.hash = hash;
        this.cipher = cipher;
    }

    get hash() {
        return this[hash];
    }

    set hash(val) {
        if (!cryptoHashes.has(val)) {
            throw new error.NotSupported(`unsupported hash algorithm: ${val}`);
        }
        this[hash] = val;
    }

    get cipher() {
        return this[cipher];
    }

    set cipher(val) {
        if (!cryptoCiphers.has(val)) {
            throw new error.NotSupported(`unsupported cipher: ${val}`);
        }
        this[cipher] = val;
    }

    encrypt(data, iv = null, key = this.keys[0]) {
        const cipher = is.null(iv) ? crypto.createCipher(this.cipher, key) : crypto.createCipheriv(this.cipher, key, iv);
        const text = cipher.update(data, "utf8");
        const pad = cipher.final();
        return Buffer.concat([text, pad]);
    }

    decrypt(data, iv = null, key = null) {
        if (is.null(key)) {
            // check each key
            const { keys } = this;
            for (let i = 0; i < keys.length; ++i) {
                const message = this.decrypt(data, iv, keys[i]);
                if (message !== false) {
                    return [message, i];
                }
            }
            return false;
        }
        try {
            const decipher = is.null(iv) ? crypto.createDecipher(this.cipher, key) :
                crypto.createDecipheriv(this.cipher, key, iv);
            const text = decipher.update(data, "utf8");
            const pad = decipher.final();
            return Buffer.concat([text, pad]);
        } catch (err) {
            return false;
        }
    }

    sign(data, key = this.keys[0], encoding) {
        return crypto.createHmac(this.hash, key).update(data).digest(encoding);
    }

    verify(data, digest) {
        return this.indexOf(data, digest) > - 1;
    }

    indexOf(data, digest) {
        const { keys } = this;
        for (let i = 0; i < keys.length; ++i) {
            if (stringCompare(digest, this.sign(data, keys[i]))) {
                return i;
            }
        }
        return -1;
    }
}

const b64replaceRegExp = /\/|\+|=/g;

const b64replaceFunc = (x) => {
    switch (x) {
        case "/": {
            return "_";
        }
        case "+": {
            return "-";
        }
        case "=": {
            return "";
        }
        default: {
            return x;
        }
    }
};

class UrlSafeKeygrip extends Keygrip {
    sign(data, key) {
        return super.sign(data, key, "base64").replace(b64replaceRegExp, b64replaceFunc);
    }
}

Keygrip.UrlSafe = UrlSafeKeygrip;
