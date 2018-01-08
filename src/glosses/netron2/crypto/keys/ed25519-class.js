const crypto = require("./ed25519");

const {
    is,
    data: { base58, protobuf },
    multi
} = adone;

const pbm = protobuf.create(require("./keys.proto"));

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

    verify(data, sig) {
        return crypto.hashAndVerify(this._key, sig, data);
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

    hash() {
        return multi.hash.create(this.bytes, "sha2-256");
    }
}

class Ed25519PrivateKey {
    // key       - 64 byte Uint8Array or Buffer containing private key
    // publicKey - 32 byte Uint8Array or Buffer containing public key
    constructor(key, publicKey) {
        this._key = ensureKey(key, crypto.privateKeyLength);
        this._publicKey = ensureKey(publicKey, crypto.publicKeyLength);
    }

    sign(message) {
        return crypto.hashAndSign(this._key, message);
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

    hash() {
        return multi.hash.create(this.bytes, "sha2-256");
    }

    /**
     * Gets the ID of the key.
     *
     * The key id is the base58 encoding of the SHA-256 multihash of its public key.
     * The public key is a protobuf encoding containing a type and the DER encoding
     * of the PKCS SubjectPublicKeyInfo.
     *
     * @returns {undefined}
     */
    id() {
        const hash = this.public.hash();
        return base58.encode(hash);
    }
}

const unmarshalEd25519PrivateKey = function (bytes) {
    bytes = ensureKey(bytes, crypto.privateKeyLength + crypto.publicKeyLength);
    const privateKeyBytes = bytes.slice(0, crypto.privateKeyLength);
    const publicKeyBytes = bytes.slice(crypto.privateKeyLength, bytes.length);
    return new Ed25519PrivateKey(privateKeyBytes, publicKeyBytes);
};

const unmarshalEd25519PublicKey = function (bytes) {
    bytes = ensureKey(bytes, crypto.publicKeyLength);
    return new Ed25519PublicKey(bytes);
};

const generateKeyPair = function () {
    const keys = crypto.generateKey();
    return new Ed25519PrivateKey(keys.privateKey, keys.publicKey);
};

const generateKeyPairFromSeed = function (seed) {
    const keys = crypto.generateKeyFromSeed(seed);
    return new Ed25519PrivateKey(keys.privateKey, keys.publicKey);
};

module.exports = {
    Ed25519PublicKey,
    Ed25519PrivateKey,
    unmarshalEd25519PrivateKey,
    unmarshalEd25519PublicKey,
    generateKeyPair,
    generateKeyPairFromSeed
};
