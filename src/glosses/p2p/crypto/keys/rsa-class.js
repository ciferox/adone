const rsa = require("./rsa");

const {
    async: { nextTick },
    data: { base58, protobuf },
    crypto,
    is,
    multiformat: { multihashingAsync }
} = adone;

const pbm = protobuf.create(require("./keys.proto"));

class RsaPublicKey {
    constructor(key) {
        this._key = key;
    }

    verify(data, sig, callback) {
        ensure(callback);
        rsa.hashAndVerify(this._key, sig, data, callback);
    }

    marshal() {
        return rsa.utils.jwkToPkix(this._key);
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

    async hash(callback) {
        try {
            ensure(callback);
            callback(null, await multihashingAsync(this.bytes, "sha2-256"));
        } catch (err) {
            callback(err);
        }
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
        return rsa.getRandomValues(16);
    }

    sign(message, callback) {
        ensure(callback);
        rsa.hashAndSign(this._key, message, callback);
    }

    get public() {
        if (!this._publicKey) {
            throw new Error("public key not provided");
        }

        return new RsaPublicKey(this._publicKey);
    }

    decrypt(msg, callback) {
        rsa.decrypt(this._key, msg, callback);
    }

    marshal() {
        return rsa.utils.jwkToPkcs1(this._key);
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

    async hash(callback) {
        try {
            ensure(callback);
            callback(null, await multihashingAsync(this.bytes, "sha2-256"));
        } catch (err) {
            callback(err);
        }
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

    /**
     * Exports the key into a password protected PEM format
     *
     * @param {string} [format] - Defaults to 'pkcs-8'.
     * @param {string} password - The password to read the encrypted PEM
     * @param {function(Error, KeyInfo)} callback
     * @returns {undefined}
     */
    export(format, password, callback) {
        if (is.function(password)) {
            callback = password;
            password = format;
            format = "pkcs-8";
        }

        ensure(callback);

        nextTick(() => {
            let err = null;
            let pem = null;
            try {
                const buffer = new crypto.util.ByteBuffer(this.marshal());
                const asn1 = crypto.asn1.fromDer(buffer);
                const privateKey = crypto.pki.privateKeyFromAsn1(asn1);
                if (format === "pkcs-8") {
                    const options = {
                        algorithm: "aes256",
                        count: 10000,
                        saltSize: 128 / 8,
                        prfAlgorithm: "sha512"
                    };
                    pem = crypto.pki.encryptRsaPrivateKey(privateKey, password, options);
                } else {
                    err = new Error(`Unknown export format '${format}'`);
                }
            } catch (_err) {
                err = _err;
            }

            callback(err, pem);
        });
    }
}

function unmarshalRsaPrivateKey(bytes, callback) {
    const jwk = rsa.utils.pkcs1ToJwk(bytes);

    rsa.unmarshalPrivateKey(jwk, (err, keys) => {
        if (err) {
            return callback(err);
        }

        callback(null, new RsaPrivateKey(keys.privateKey, keys.publicKey));
    });
}

function unmarshalRsaPublicKey(bytes) {
    const jwk = rsa.utils.pkixToJwk(bytes);

    return new RsaPublicKey(jwk);
}

function fromJwk(jwk, callback) {
    rsa.unmarshalPrivateKey(jwk, (err, keys) => {
        if (err) {
            return callback(err);
        }

        callback(null, new RsaPrivateKey(keys.privateKey, keys.publicKey));
    });
}

function generateKeyPair(bits, callback) {
    rsa.generateKey(bits, (err, keys) => {
        if (err) {
            return callback(err);
        }

        callback(null, new RsaPrivateKey(keys.privateKey, keys.publicKey));
    });
}

function ensure(callback) {
    if (!is.function(callback)) {
        throw new Error("callback is required");
    }
}

module.exports = {
    RsaPublicKey,
    RsaPrivateKey,
    unmarshalRsaPublicKey,
    unmarshalRsaPrivateKey,
    generateKeyPair,
    fromJwk
};
