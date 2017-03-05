import adone from "adone";

export default class {
    constructor(keys = [], algorithm = "sha256", encoding = "base64") {
        if (keys.length === 0) {
            throw new adone.x.IllegalArgument("at least 1 key required");
        }
        this.keys = keys;
        this.algorithm = algorithm;
        this.encoding = encoding;
    }

    sign(data) {
        return adone.std.crypto.createHmac(this.algorithm, this.keys[0])
            .update(data)
            .digest(this.encoding)
            .replace(/\/|\+|=/g, (x) => ({ "/": "_", "+": "-", "=": "" })[x]);
    }

    verify(data, digest) {
        return this.index(data, digest) > -1;
    }

    index(data, digest) {
        for (let i = 0; i < this.keys.length; ++i) {
            if (adone.crypto.stringCompare(digest, this.sign(data, this.keys[i]))) {
                return i;
            }
        }
        return -1;
    }
}