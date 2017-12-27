const crypto = require("./rsa");
const KEYUTIL = require("jsrsasign").KEYUTIL;

const {
    data: { base58, protobuf },
    multi
} = adone;

const pbm = protobuf.create(require("./keys.proto"));

class RsaPublicKey {
    constructor(key) {
        this._key = key;
    }

    verify(data, sig) {
        return crypto.hashAndVerify(this._key, sig, data);
    }

    marshal() {
        return crypto.utils.jwkToPkix(this._key);
    }

    get bytes() {
        return pbm.PublicKey.encode({
            Type: pbm.KeyType.RSA,
            Data: this.marshal()
        });
    }

    encrypt(bytes) {
        return this._key.encrypt(bytes, "RSAES-PKCS1-V1_5");
    }

    equals(key) {
        return this.bytes.equals(key.bytes);
    }

    hash() {
        return multi.hash.create(this.bytes, "sha2-256");
    }
}

class RsaPrivateKey {
    // key       - Object of the jwk format
    // publicKey - Buffer of the spki format
    constructor(key, publicKey) {
        this._key = key;
        this._publicKey = publicKey;
    }

    genSecret() {
        return crypto.getRandomValues(new Uint8Array(16));
    }

    sign(message) {
        return crypto.hashAndSign(this._key, message);
    }

    get public() {
        if (!this._publicKey) {
            throw new Error("public key not provided");
        }

        return new RsaPublicKey(this._publicKey);
    }

    decrypt(msg, callback) {
        crypto.decrypt(this._key, msg, callback);
    }

    marshal() {
        return crypto.utils.jwkToPkcs1(this._key);
    }

    get bytes() {
        return pbm.PrivateKey.encode({
            Type: pbm.KeyType.RSA,
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
   * @param {function(Error, id)} callback
   * @returns {undefined}
   */
    id() {
        const hash = this.public.hash();
        return base58.encode(hash);
    }

    /**
     * Exports the key into a password protected PEM format
     *
     * @param {string} [format] - Defaults to 'pkcs-8'.
     * @param {string} password - The password to read the encrypted PEM
     * @param {function(Error, KeyInfo)} callback
     * @returns {undefined}
     */
    export(format, password) {
        if (!password) {
            password = format;
            format = "pkcs-8";
        }

        const key = KEYUTIL.getKey(this._key); // _key is a JWK (JSON Web Key)
        if (format === "pkcs-8") {
            return KEYUTIL.getPEM(key, "PKCS8PRV", password);
        }
        throw new Error(`Unknown export format '${format}'`);
    }
}

const unmarshalRsaPrivateKey = function (bytes) {
    const jwk = crypto.utils.pkcs1ToJwk(bytes);
    const keys = crypto.unmarshalPrivateKey(jwk);
    return new RsaPrivateKey(keys.privateKey, keys.publicKey);
};

const unmarshalRsaPublicKey = function (bytes) {
    const jwk = crypto.utils.pkixToJwk(bytes);

    return new RsaPublicKey(jwk);
};

const generateKeyPair = function (bits) {
    const keys = crypto.generateKey(bits);
    return new RsaPrivateKey(keys.privateKey, keys.publicKey);
};

const fromJwk = function (jwk) {
    const keys = crypto.unmarshalPrivateKey(jwk);
    return new RsaPrivateKey(keys.privateKey, keys.publicKey);
};

module.exports = {
    RsaPublicKey,
    RsaPrivateKey,
    unmarshalRsaPublicKey,
    unmarshalRsaPrivateKey,
    generateKeyPair,
    fromJwk
};
