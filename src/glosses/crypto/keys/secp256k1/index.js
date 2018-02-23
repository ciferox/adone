const {
    multi,
    data: { protobuf }
} = adone;

const crypto = require("./crypto");
const keysProtobuf = protobuf.create(require("../keys.proto"));

export class Secp256k1PublicKey {
    constructor(key) {
        crypto.validatePublicKey(key);
        this._key = key;
    }

    verify(data, sig) {
        return crypto.hashAndVerify(this._key, sig, data);
    }

    marshal() {
        return crypto.compressPublicKey(this._key);
    }

    get bytes() {
        return keysProtobuf.PublicKey.encode({
            Type: keysProtobuf.KeyType.Secp256k1,
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

export class Secp256k1PrivateKey {
    constructor(key, publicKey) {
        this._key = key;
        this._publicKey = publicKey || crypto.computePublicKey(key);
        crypto.validatePrivateKey(this._key);
        crypto.validatePublicKey(this._publicKey);
    }

    sign(message) {
        return crypto.hashAndSign(this._key, message);
    }

    get public() {
        return new Secp256k1PublicKey(this._publicKey);
    }

    marshal() {
        return this._key;
    }

    get bytes() {
        return keysProtobuf.PrivateKey.encode({
            Type: keysProtobuf.KeyType.Secp256k1,
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

export const unmarshalSecp256k1PrivateKey = function (bytes) {
    return new Secp256k1PrivateKey(bytes);
};

export const unmarshalSecp256k1PublicKey = function (bytes) {
    return new Secp256k1PublicKey(bytes);
};

export const generateKeyPair = function () {
    const privateKeyBytes = crypto.generateKey();
    return new Secp256k1PrivateKey(privateKeyBytes);
};
