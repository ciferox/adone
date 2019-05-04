/**
 * Javascript implementation of a basic Public Key Infrastructure, including
 * support for RSA public and private keys.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2010-2013 Digital Bazaar, Inc.
 */

const {
    is,
    crypto
} = adone;

adone.lazify({
    oids: "./oids",
    ed25519: "./ed25519",
    pbe: "./pbe",
    rsa: "./rsa"
}, exports, require);


const { asn1 } = crypto;

/**
 * Public Key Infrastructure (PKI) implementation.
 */
// const pki = module.exports = forge.pki = forge.pki || {};

/**
 * NOTE: THIS METHOD IS DEPRECATED. Use pem.decode() instead.
 *
 * Converts PEM-formatted data to DER.
 *
 * @param pem the PEM-formatted data.
 *
 * @return the DER-formatted data.
 */
export const pemToDer = function (pem) {
    const msg = crypto.pem.decode(pem)[0];
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert PEM to DER; PEM is encrypted.");
    }
    return crypto.util.createBuffer(msg.body);
};

/**
 * Converts an RSA private key from PEM format.
 *
 * @param pem the PEM-formatted private key.
 *
 * @return the private key.
 */
export const privateKeyFromPem = function (pem) {
    const msg = crypto.pem.decode(pem)[0];

    if (msg.type !== "PRIVATE KEY" && msg.type !== "RSA PRIVATE KEY") {
        const error = new Error("Could not convert private key from PEM; PEM " +
            'header type is not "PRIVATE KEY" or "RSA PRIVATE KEY".');
        error.headerType = msg.type;
        throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert private key from PEM; PEM is encrypted.");
    }

    // convert DER to ASN.1 object
    const obj = crypto.asn1.fromDer(msg.body);

    return privateKeyFromAsn1(obj);
};



/**
 * Converts a positive BigInteger into 2's-complement big-endian bytes.
 *
 * @param b the big integer to convert.
 *
 * @return the bytes.
 */
function _bnToBytes(b) {
    // prepend 0x00 if first byte >= 0x80
    let hex = b.toString(16);
    if (hex[0] >= "8") {
        hex = `00${hex}`;
    }
    const bytes = crypto.util.hexToBytes(hex);

    // ensure integer is minimally-encoded
    if (bytes.length > 1 &&
        // leading 0x00 for positive integer
        ((bytes.charCodeAt(0) === 0 &&
            (bytes.charCodeAt(1) & 0x80) === 0) ||
            // leading 0xFF for negative integer
            (bytes.charCodeAt(0) === 0xFF &&
                (bytes.charCodeAt(1) & 0x80) === 0x80))) {
        return bytes.substr(1);
    }
    return bytes;
}

/**
 * Converts a public key to an ASN.1 RSAPublicKey.
 *
 * @param key the public key.
 *
 * @return the asn1 representation of a RSAPublicKey.
 */
export const publicKeyToRSAPublicKey = function (key) {
    // RSAPublicKey
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // modulus (n)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.n)),
        // publicExponent (e)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.e))
    ]);
};

/**
 * Converts a private key to an ASN.1 RSAPrivateKey.
 *
 * @param key the private key.
 *
 * @return the ASN.1 representation of an RSAPrivateKey.
 */
export const privateKeyToAsn1 = function (key) {
    // RSAPrivateKey
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // version (0 = only 2 primes, 1 multiple primes)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            asn1.integerToDer(0).getBytes()),
        // modulus (n)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.n)),
        // publicExponent (e)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.e)),
        // privateExponent (d)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.d)),
        // privateKeyPrime1 (p)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.p)),
        // privateKeyPrime2 (q)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.q)),
        // privateKeyExponent1 (dP)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.dP)),
        // privateKeyExponent2 (dQ)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.dQ)),
        // coefficient (qInv)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
            _bnToBytes(key.qInv))
    ]);
};

export const privateKeyToRSAPrivateKey = privateKeyToAsn1;

/**
 * Converts an RSA private key to PEM format.
 *
 * @param key the private key.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted private key.
 */
export const privateKeyToPem = function (key, maxline) {
    // convert to ASN.1, then DER, then PEM-encode
    const msg = {
        type: "RSA PRIVATE KEY",
        body: crypto.asn1.toDer(privateKeyToAsn1(key)).getBytes()
    };
    return crypto.pem.encode(msg, { maxline });
};

/**
 * Converts a PrivateKeyInfo to PEM format.
 *
 * @param pki the PrivateKeyInfo.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted private key.
 */
export const privateKeyInfoToPem = function (pki, maxline) {
    // convert to DER, then PEM-encode
    const msg = {
        type: "PRIVATE KEY",
        body: crypto.asn1.toDer(pki).getBytes()
    };
    return crypto.pem.encode(msg, { maxline });
};


// from rsa.js

if (is.undefined(BigInteger)) {
    var { BigInteger } = crypto.jsbn;
}


// validator for a PrivateKeyInfo structure
const privateKeyValidator = {
    // PrivateKeyInfo
    name: "PrivateKeyInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        // Version (INTEGER)
        name: "PrivateKeyInfo.version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyVersion"
    }, {
        // privateKeyAlgorithm
        name: "PrivateKeyInfo.privateKeyAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [{
            name: "AlgorithmIdentifier.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: false,
            capture: "privateKeyOid"
        }]
    }, {
        // PrivateKey
        name: "PrivateKeyInfo",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OCTETSTRING,
        constructed: false,
        capture: "privateKey"
    }]
};

// validator for an RSA private key
const rsaPrivateKeyValidator = {
    // RSAPrivateKey
    name: "RSAPrivateKey",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        // Version (INTEGER)
        name: "RSAPrivateKey.version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyVersion"
    }, {
        // modulus (n)
        name: "RSAPrivateKey.modulus",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyModulus"
    }, {
        // publicExponent (e)
        name: "RSAPrivateKey.publicExponent",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyPublicExponent"
    }, {
        // privateExponent (d)
        name: "RSAPrivateKey.privateExponent",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyPrivateExponent"
    }, {
        // prime1 (p)
        name: "RSAPrivateKey.prime1",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyPrime1"
    }, {
        // prime2 (q)
        name: "RSAPrivateKey.prime2",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyPrime2"
    }, {
        // exponent1 (d mod (p-1))
        name: "RSAPrivateKey.exponent1",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyExponent1"
    }, {
        // exponent2 (d mod (q-1))
        name: "RSAPrivateKey.exponent2",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyExponent2"
    }, {
        // coefficient ((inverse of q) mod p)
        name: "RSAPrivateKey.coefficient",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyCoefficient"
    }]
};

export const setRsaPrivateKey = crypto.rsa.setPrivateKey;

/**
 * Converts a private key from an ASN.1 object.
 *
 * @param obj the ASN.1 representation of a PrivateKeyInfo containing an
 *          RSAPrivateKey or an RSAPrivateKey.
 *
 * @return the private key.
 */
export const privateKeyFromAsn1 = function (obj) {
    // get PrivateKeyInfo
    let capture = {};
    let errors = [];
    if (asn1.validate(obj, privateKeyValidator, capture, errors)) {
        obj = asn1.fromDer(crypto.util.createBuffer(capture.privateKey));
    }

    // get RSAPrivateKey
    capture = {};
    errors = [];
    if (!asn1.validate(obj, rsaPrivateKeyValidator, capture, errors)) {
        const error = new Error("Cannot read private key. " +
            "ASN.1 object does not contain an RSAPrivateKey.");
        error.errors = errors;
        throw error;
    }

    // Note: Version is currently ignored.
    // capture.privateKeyVersion
    // FIXME: inefficient, get a BigInteger that uses byte strings
    let n; let e; let d; let p; let q; let dP; let dQ; let qInv;
    n = crypto.util.createBuffer(capture.privateKeyModulus).toHex();
    e = crypto.util.createBuffer(capture.privateKeyPublicExponent).toHex();
    d = crypto.util.createBuffer(capture.privateKeyPrivateExponent).toHex();
    p = crypto.util.createBuffer(capture.privateKeyPrime1).toHex();
    q = crypto.util.createBuffer(capture.privateKeyPrime2).toHex();
    dP = crypto.util.createBuffer(capture.privateKeyExponent1).toHex();
    dQ = crypto.util.createBuffer(capture.privateKeyExponent2).toHex();
    qInv = crypto.util.createBuffer(capture.privateKeyCoefficient).toHex();

    // set private key
    return setRsaPrivateKey(
        new BigInteger(n, 16),
        new BigInteger(e, 16),
        new BigInteger(d, 16),
        new BigInteger(p, 16),
        new BigInteger(q, 16),
        new BigInteger(dP, 16),
        new BigInteger(dQ, 16),
        new BigInteger(qInv, 16));
};


Object.assign(exports, require("./x509"));
