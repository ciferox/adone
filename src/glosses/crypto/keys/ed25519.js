const {
    is,
    crypto: { ed25519 },
    data: { base58, protobuf },
    multi
} = adone;

const publicKeyLength = ed25519.publicKeyLength;
const privateKeyLength = ed25519.privateKeyLength;

const generateKey = () => ed25519.generateKeyPair(adone.std.crypto.randomBytes(32));

// seed should be a 32 byte uint8array
const generateKeyFromSeed = (seed) => ed25519.generateKeyPair(seed);

const hashAndSign = (key, msg) => Buffer.from(ed25519.sign(msg, key));

const hashAndVerify = (key, sig, msg) => ed25519.verify(msg, sig, key);

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

export class Ed25519PublicKey {
    constructor(key) {
        this._key = ensureKey(key, publicKeyLength);
    }

    verify(data, sig) {
        return hashAndVerify(this._key, sig, data);
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

export class Ed25519PrivateKey {
    // key       - 64 byte Uint8Array or Buffer containing private key
    // publicKey - 32 byte Uint8Array or Buffer containing public key
    constructor(key, publicKey) {
        this._key = ensureKey(key, privateKeyLength);
        this._publicKey = ensureKey(publicKey, publicKeyLength);
    }

    sign(message) {
        return hashAndSign(this._key, message);
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

export const unmarshalEd25519PrivateKey = function (bytes) {
    bytes = ensureKey(bytes, privateKeyLength + publicKeyLength);
    const privateKeyBytes = bytes.slice(0, privateKeyLength);
    const publicKeyBytes = bytes.slice(privateKeyLength, bytes.length);
    return new Ed25519PrivateKey(privateKeyBytes, publicKeyBytes);
};

export const unmarshalEd25519PublicKey = function (bytes) {
    bytes = ensureKey(bytes, publicKeyLength);
    return new Ed25519PublicKey(bytes);
};

export const generateKeyPair = function () {
    const keys = generateKey();
    return new Ed25519PrivateKey(keys.privateKey, keys.publicKey);
};

export const generateKeyPairFromSeed = function (seed) {
    const keys = generateKeyFromSeed(seed);
    return new Ed25519PrivateKey(keys.privateKey, keys.publicKey);
};
