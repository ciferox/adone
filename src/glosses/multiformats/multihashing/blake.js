const {
    is
} = adone;

const blake = require("blakejs");
const minB = 0xb201;
const minS = 0xb241;

const blake2b = {
    init: blake.blake2bInit,
    update: blake.blake2bUpdate,
    digest: blake.blake2bFinal
};

const blake2s = {
    init: blake.blake2sInit,
    update: blake.blake2sUpdate,
    digest: blake.blake2sFinal
};

class B2Hash {
    constructor(size, hashFunc) {
        this.hf = hashFunc;
        this.ctx = this.hf.init(size, null);
    }

    update(buf) {
        if (is.null(this.ctx)) {
            throw new Error("blake2 context is null. (already called digest?)");
        }
        this.hf.update(this.ctx, buf);
        return this;
    }

    digest() {
        const ctx = this.ctx;
        this.ctx = null;
        return Buffer.from(this.hf.digest(ctx));
    }
}

const addFuncs = function (table) {
    const mkFunc = (size, hashFunc) => () => new B2Hash(size, hashFunc);

    let i;
    for (i = 0; i < 64; i++) {
        table[minB + i] = mkFunc(i + 1, blake2b);
    }
    for (i = 0; i < 32; i++) {
        table[minS + i] = mkFunc(i + 1, blake2s);
    }
};

module.exports = {
    addFuncs
};
