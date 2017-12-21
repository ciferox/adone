const crypto = require("./ed25519");

const {
    is,
    data: { base58, protobuf },
    multi: { hash: { async: multihashing } }
} = adone;

const pbm = protobuf.create(require("./keys.proto"));


const ensure = function (cb) {
    if (!is.function(cb)) {
        throw new Error("callback is required");
    }
};

const ensureKey = function (key, length) {
    if (is.buffer(key)) {
        key = new Uint8Array(key);
    }
    if (!(key instanceof Uint8Array) || key.length !== length) {
        throw new Error(`Key must be a Uint8Array or Buffer of length ${length}`);
    }
    return key;
};

class Ed25519PublicKey {
    constructor(key) {
        this._key = ensureKey(key, crypto.publicKeyLength);
    }

    verify(data, sig, callback) {
        ensure(callback);
        crypto.hashAndVerify(this._key, sig, data, callback);
    }

    marshal() {
        return Buffer.from(this._key);
    }

    get bytes() {
        return pbm.PublicKey.encode({
            Type: pbm.KeyType.Ed25519,
            Data: this.marshal()
        });
    }

    equals(key) {
        return this.bytes.equals(key.bytes);
    }

    hash(callback) {
        ensure(callback);
        multihashing(this.bytes, "sha2-256", callback);
    }
}

class Ed25519PrivateKey {
    // key       - 64 byte Uint8Array or Buffer containing private key
    // publicKey - 32 byte Uint8Array or Buffer containing public key
    constructor(key, publicKey) {
        this._key = ensureKey(key, crypto.privateKeyLength);
        this._publicKey = ensureKey(publicKey, crypto.publicKeyLength);
    }

    sign(message, callback) {
        ensure(callback);
        crypto.hashAndSign(this._key, message, callback);
    }

    get public() {
        if (!this._publicKey) {
            throw new Error("public key not provided");
        }

        return new Ed25519PublicKey(this._publicKey);
    }

    marshal() {
        return Buffer.concat([Buffer.from(this._key), Buffer.from(this._publicKey)]);
    }

    get bytes() {
        return pbm.PrivateKey.encode({
            Type: pbm.KeyType.Ed25519,
            Data: this.marshal()
        });
    }

    equals(key) {
        return this.bytes.equals(key.bytes);
    }

    hash(callback) {
        ensure(callback);
        multihashing(this.bytes, "sha2-256", callback);
    }

    /**
     * Gets the ID of the key.
     *
     * The key id is the base58 encoding of the SHA-256 multihash of its public key.
     * The public key is a protobuf encoding containing a type and the DER encoding
     * of the PKCS SubjectPublicKeyInfo.
     *
     * @param {function(Error, id)} callback
     * @returns {undefined}
     */
    id(callback) {
        this.public.hash((err, hash) => {
            if (err) {
                return callback(err);
            }
            callback(null, base58.encode(hash));
        });
    }
}

const unmarshalEd25519PrivateKey = function (bytes, callback) {
    try {
        bytes = ensureKey(bytes, crypto.privateKeyLength + crypto.publicKeyLength);
    } catch (err) {
        return callback(err);
    }
    const privateKeyBytes = bytes.slice(0, crypto.privateKeyLength);
    const publicKeyBytes = bytes.slice(crypto.privateKeyLength, bytes.length);
    callback(null, new Ed25519PrivateKey(privateKeyBytes, publicKeyBytes));
};

const unmarshalEd25519PublicKey = function (bytes) {
    bytes = ensureKey(bytes, crypto.publicKeyLength);
    return new Ed25519PublicKey(bytes);
};

const generateKeyPair = function (_bits, cb) {
    if (is.undefined(cb) && is.function(_bits)) {
        cb = _bits;
    }

    crypto.generateKey((err, keys) => {
        if (err) {
            return cb(err);
        }
        let privkey;
        try {
            privkey = new Ed25519PrivateKey(keys.secretKey, keys.publicKey);
        } catch (err) {
            cb(err);
            return;
        }

        cb(null, privkey);
    });
};

const generateKeyPairFromSeed = function (seed, _bits, cb) {
    if (is.undefined(cb) && is.function(_bits)) {
        cb = _bits;
    }

    crypto.generateKeyFromSeed(seed, (err, keys) => {
        if (err) {
            return cb(err);
        }
        let privkey;
        try {
            privkey = new Ed25519PrivateKey(keys.secretKey, keys.publicKey);
        } catch (err) {
            cb(err);
            return;
        }

        cb(null, privkey);
    });
};

module.exports = {
    Ed25519PublicKey,
    Ed25519PrivateKey,
    unmarshalEd25519PrivateKey,
    unmarshalEd25519PublicKey,
    generateKeyPair,
    generateKeyPairFromSeed
};
