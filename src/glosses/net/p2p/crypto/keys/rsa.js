const {
    data: { base58, protobuf },
    multi,
    math: { BigNumber },
    crypto,
    util,
    std,
    x
} = adone;

const pbm = protobuf.create(require("./keys.proto"));

const bnToBase64 = (bn) => bn
    .toBuffer()
    .toString("base64")
    .replace(/(=*)$/, "") // Remove any trailing '='
    .replace(/\+/g, "-") // 62nd char of encoding
    .replace(/\//g, "_"); // 63rd char of encoding

const base64ToBn = (base64data) => BigNumber.fromBuffer(Buffer.from(base64data, "base64"));

// Convert a PKCS#1 in ASN1 DER format to a JWK key
const pkcs1ToJwk = function (bytes) {
    const buf = util.buffer.toArrayBuffer(bytes);
    const { result } = crypto.asn1.fromBER(buf);

    if (result.error) {
        throw new x.IllegalState(result.error);
    }

    const key = crypto.pki.privateKeyFromAsn1(result);

    return {
        kty: "RSA",
        n: bnToBase64(key.n),
        e: bnToBase64(key.e),
        d: bnToBase64(key.d),
        p: bnToBase64(key.p),
        q: bnToBase64(key.q),
        dp: bnToBase64(key.dP),
        dq: bnToBase64(key.dQ),
        qi: bnToBase64(key.qInv),
        alg: "RS256",
        kid: "2011-04-29"
    };
};

// Convert a JWK key into PKCS#1 in ASN1 DER format
const jwkToPkcs1 = function (jwk) {
    const asn1 = crypto.pki.privateKeyToAsn1({
        n: base64ToBn(jwk.n),
        e: base64ToBn(jwk.e),
        d: base64ToBn(jwk.d),
        p: base64ToBn(jwk.p),
        q: base64ToBn(jwk.q),
        dP: base64ToBn(jwk.dp),
        dQ: base64ToBn(jwk.dq),
        qInv: base64ToBn(jwk.qi)
    });

    return Buffer.from(asn1.toBER());
};

// Convert a PKCIX in ASN1 DER format to a JWK key
const pkixToJwk = function (bytes) {
    const buf = util.buffer.toArrayBuffer(bytes);
    const { result } = crypto.asn1.fromBER(buf);

    if (result.error) {
        throw new x.IllegalState(result.error);
    }

    const key = crypto.pki.publicKeyFromAsn1(result);

    return {
        kty: "RSA",
        n: bnToBase64(key.n),
        e: bnToBase64(key.e),
        alg: "RS256",
        kid: "2011-04-29"
    };
};

// Convert a JWK key to PKCIX in ASN1 DER format
const jwkToPkix = function (jwk) {
    const asn1 = crypto.pki.publicKeyToAsn1({
        n: base64ToBn(jwk.n),
        e: base64ToBn(jwk.e)
    });

    return Buffer.from(asn1.toBER());
};


const generateKey = function (bits) {
    const pair = crypto.pki.rsa.generateKeyPair(bits);
    return {
        privateKey: crypto.pki.privateKeyToJwk(pair.privateKey),
        publicKey: crypto.pki.publicKeyToJwk(pair.publicKey)
    };
};

// Takes a jwk key
const unmarshalPrivateKey = function (key) {
    if (!key) {
        throw new x.NotValid("Key is invalid");
    }
    return {
        privateKey: key,
        publicKey: {
            kty: key.kty,
            n: key.n,
            e: key.e
        }
    };
};

const hashAndSign = function (key, msg) {
    try {
        const sign = std.crypto.createSign("RSA-SHA256");
        sign.update(msg);
        const pem = crypto.pki.jwkToPem(key);
        return sign.sign(pem);
    } catch (err) {
        throw new x.NotValid(`Key or message is invalid!: ${err.message}`);
    }
};

const hashAndVerify = function (key, sig, msg) {
    try {
        const verify = std.crypto.createVerify("RSA-SHA256");
        verify.update(msg);
        const pem = crypto.pki.jwkToPem(key);
        return verify.verify(pem, sig);
    } catch (err) {
        throw new x.NotValid(`Key or message is invalid!:${err.message}`);
    }
};


export class RsaPublicKey {
    constructor(key) {
        this._key = key;
    }

    verify(data, sig) {
        return hashAndVerify(this._key, sig, data);
    }

    marshal() {
        return jwkToPkix(this._key);
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

export class RsaPrivateKey {
    /**
     * key       - Object of the jwk format
     * publicKey - Buffer of the spki format
     */
    constructor(key, publicKey) {
        this._key = key;
        this._publicKey = publicKey;
    }

    genSecret() {
        return std.crypto.randomBytes(16);
    }

    sign(message) {
        return hashAndSign(this._key, message);
    }

    get public() {
        if (!this._publicKey) {
            throw new Error("Public key not provided");
        }

        return new RsaPublicKey(this._publicKey);
    }

    // decrypt(msg, callback) {
    //     crypto.decrypt(this._key, msg, callback);
    // }

    marshal() {
        return jwkToPkcs1(this._key);
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

        if (format === "pkcs-8") {
            const key = crypto.pki.privateKeyFromJwk(this._key); // _key is a JWK (JSON Web Key)
            const options = {
                algorithm: "aes256",
                count: 10000,
                saltSize: 128 / 8,
                prfAlgorithm: "sha512"
            };
            return crypto.pki.encryptRsaPrivateKey(key, password, options);
        }

        throw new Error(`Unknown export format '${format}'`);
    }
}

export const unmarshalRsaPrivateKey = (bytes) => {
    const jwk = pkcs1ToJwk(bytes);
    const keys = unmarshalPrivateKey(jwk);
    return new RsaPrivateKey(keys.privateKey, keys.publicKey);
};

export const unmarshalRsaPublicKey = (bytes) => {
    const jwk = pkixToJwk(bytes);
    return new RsaPublicKey(jwk);
};

export const generateKeyPair = (bits) => {
    const keys = generateKey(bits);
    return new RsaPrivateKey(keys.privateKey, keys.publicKey);
};

export const fromJwk = (jwk) => {
    const keys = unmarshalPrivateKey(jwk);
    return new RsaPrivateKey(keys.privateKey, keys.publicKey);
};
