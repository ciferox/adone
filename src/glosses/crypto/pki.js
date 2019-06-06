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

const __ = adone.lazify({
    oids: "./oids",
    ed25519: "./ed25519",
    pbe: "./pbe",
    rsa: "./rsa"
}, exports, require);

// // force load
// __.pbe;

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



/**
 * Encrypts a ASN.1 PrivateKeyInfo object, producing an EncryptedPrivateKeyInfo.
 *
 * PBES2Algorithms ALGORITHM-IDENTIFIER ::=
 *   { {PBES2-params IDENTIFIED BY id-PBES2}, ...}
 *
 * id-PBES2 OBJECT IDENTIFIER ::= {pkcs-5 13}
 *
 * PBES2-params ::= SEQUENCE {
 *   keyDerivationFunc AlgorithmIdentifier {{PBES2-KDFs}},
 *   encryptionScheme AlgorithmIdentifier {{PBES2-Encs}}
 * }
 *
 * PBES2-KDFs ALGORITHM-IDENTIFIER ::=
 *   { {PBKDF2-params IDENTIFIED BY id-PBKDF2}, ... }
 *
 * PBES2-Encs ALGORITHM-IDENTIFIER ::= { ... }
 *
 * PBKDF2-params ::= SEQUENCE {
 *   salt CHOICE {
 *     specified OCTET STRING,
 *     otherSource AlgorithmIdentifier {{PBKDF2-SaltSources}}
 *   },
 *   iterationCount INTEGER (1..MAX),
 *   keyLength INTEGER (1..MAX) OPTIONAL,
 *   prf AlgorithmIdentifier {{PBKDF2-PRFs}} DEFAULT algid-hmacWithSHA1
 * }
 *
 * @param obj the ASN.1 PrivateKeyInfo object.
 * @param password the password to encrypt with.
 * @param options:
 *          algorithm the encryption algorithm to use
 *            ('aes128', 'aes192', 'aes256', '3des'), defaults to 'aes128'.
 *          count the iteration count to use.
 *          saltSize the salt size to use.
 *          prfAlgorithm the PRF message digest algorithm to use
 *            ('sha1', 'sha224', 'sha256', 'sha384', 'sha512')
 *
 * @return the ASN.1 EncryptedPrivateKeyInfo.
 */
export const encryptPrivateKeyInfo = function (obj, password, options) {
    // set default options
    options = options || {};
    options.saltSize = options.saltSize || 8;
    options.count = options.count || 2048;
    options.algorithm = options.algorithm || "aes128";
    options.prfAlgorithm = options.prfAlgorithm || "sha1";

    // generate PBE params
    const salt = crypto.random.getBytesSync(options.saltSize);
    const count = options.count;
    const countBytes = asn1.integerToDer(count);
    let dkLen;
    let encryptionAlgorithm;
    let encryptedData;
    if (options.algorithm.indexOf("aes") === 0 || options.algorithm === "des") {
        // do PBES2
        let ivLen; let encOid; let cipherFn;
        switch (options.algorithm) {
            case "aes128":
                dkLen = 16;
                ivLen = 16;
                encOid = __.oids["aes128-CBC"];
                cipherFn = crypto.aes.createEncryptionCipher;
                break;
            case "aes192":
                dkLen = 24;
                ivLen = 16;
                encOid = __.oids["aes192-CBC"];
                cipherFn = crypto.aes.createEncryptionCipher;
                break;
            case "aes256":
                dkLen = 32;
                ivLen = 16;
                encOid = __.oids["aes256-CBC"];
                cipherFn = crypto.aes.createEncryptionCipher;
                break;
            case "des":
                dkLen = 8;
                ivLen = 8;
                encOid = __.oids.desCBC;
                cipherFn = crypto.des.createEncryptionCipher;
                break;
            default:
                var error = new Error("Cannot encrypt private key. Unknown encryption algorithm.");
                error.algorithm = options.algorithm;
                throw error;
        }

        // get PRF message digest
        const prfAlgorithm = `hmacWith${options.prfAlgorithm.toUpperCase()}`;
        const md = __.pbe.prfAlgorithmToMessageDigest(prfAlgorithm);

        // encrypt private key using pbe SHA-1 and AES/DES
        var dk = crypto.pkcs5.pbkdf2(password, salt, count, dkLen, md);
        var iv = crypto.random.getBytesSync(ivLen);
        var cipher = cipherFn(dk);
        cipher.start(iv);
        cipher.update(asn1.toDer(obj));
        cipher.finish();
        encryptedData = cipher.output.getBytes();

        // get PBKDF2-params
        const params = __.pbe.createPbkdf2Params(salt, countBytes, dkLen, prfAlgorithm);

        encryptionAlgorithm = asn1.create(
            asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    asn1.oidToDer(__.oids.pkcs5PBES2).getBytes()),
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                    // keyDerivationFunc
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                            asn1.oidToDer(__.oids.pkcs5PBKDF2).getBytes()),
                        // PBKDF2-params
                        params
                    ]),
                    // encryptionScheme
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                            asn1.oidToDer(encOid).getBytes()),
                        // iv
                        asn1.create(
                            asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, iv)
                    ])
                ])
            ]);
    } else if (options.algorithm === "3des") {
        // Do PKCS12 PBE
        dkLen = 24;

        const saltBytes = new crypto.util.ByteBuffer(salt);
        var dk = __.pbe.generatePkcs12Key(password, saltBytes, 1, count, dkLen);
        var iv = __.pbe.generatePkcs12Key(password, saltBytes, 2, count, dkLen);
        var cipher = crypto.des.createEncryptionCipher(dk);
        cipher.start(iv);
        cipher.update(asn1.toDer(obj));
        cipher.finish();
        encryptedData = cipher.output.getBytes();

        encryptionAlgorithm = asn1.create(
            asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false,
                    asn1.oidToDer(__.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]).getBytes()),
                // pkcs-12PbeParams
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                    // salt
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, salt),
                    // iteration count
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
                        countBytes.getBytes())
                ])
            ]);
    } else {
        var error = new Error("Cannot encrypt private key. Unknown encryption algorithm.");
        error.algorithm = options.algorithm;
        throw error;
    }

    // EncryptedPrivateKeyInfo
    const rval = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // encryptionAlgorithm
        encryptionAlgorithm,
        // encryptedData
        asn1.create(
            asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, encryptedData)
    ]);
    return rval;
};



// validator for an EncryptedPrivateKeyInfo structure
// Note: Currently only works w/algorithm params
const encryptedPrivateKeyValidator = {
    name: "EncryptedPrivateKeyInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        name: "EncryptedPrivateKeyInfo.encryptionAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [{
            name: "AlgorithmIdentifier.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: false,
            capture: "encryptionOid"
        }, {
            name: "AlgorithmIdentifier.parameters",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            captureAsn1: "encryptionParams"
        }]
    }, {
        // encryptedData
        name: "EncryptedPrivateKeyInfo.encryptedData",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OCTETSTRING,
        constructed: false,
        capture: "encryptedData"
    }]
};

/**
 * Decrypts a ASN.1 PrivateKeyInfo object.
 *
 * @param obj the ASN.1 EncryptedPrivateKeyInfo object.
 * @param password the password to decrypt with.
 *
 * @return the ASN.1 PrivateKeyInfo on success, null on failure.
 */
export const decryptPrivateKeyInfo = function (obj, password) {
    let rval = null;

    // get PBE params
    const capture = {};
    const errors = [];
    if (!asn1.validate(obj, encryptedPrivateKeyValidator, capture, errors)) {
        const error = new Error("Cannot read encrypted private key. " +
            "ASN.1 object is not a supported EncryptedPrivateKeyInfo.");
        error.errors = errors;
        throw error;
    }

    // get cipher
    const oid = asn1.derToOid(capture.encryptionOid);
    const cipher = __.pbe.getCipher(oid, capture.encryptionParams, password);

    // get encrypted data
    const encrypted = crypto.util.createBuffer(capture.encryptedData);

    cipher.update(encrypted);
    if (cipher.finish()) {
        rval = asn1.fromDer(cipher.output);
    }

    return rval;
};

/**
 * Converts a EncryptedPrivateKeyInfo to PEM format.
 *
 * @param epki the EncryptedPrivateKeyInfo.
 * @param maxline the maximum characters per line, defaults to 64.
 *
 * @return the PEM-formatted encrypted private key.
 */
export const encryptedPrivateKeyToPem = function (epki, maxline) {
    // convert to DER, then PEM-encode
    const msg = {
        type: "ENCRYPTED PRIVATE KEY",
        body: asn1.toDer(epki).getBytes()
    };
    return crypto.pem.encode(msg, { maxline });
};

/**
 * Converts a PEM-encoded EncryptedPrivateKeyInfo to ASN.1 format. Decryption
 * is not performed.
 *
 * @param pem the EncryptedPrivateKeyInfo in PEM-format.
 *
 * @return the ASN.1 EncryptedPrivateKeyInfo.
 */
export const encryptedPrivateKeyFromPem = function (pem) {
    const msg = crypto.pem.decode(pem)[0];

    if (msg.type !== "ENCRYPTED PRIVATE KEY") {
        const error = new Error("Could not convert encrypted private key from PEM; " +
            'PEM header type is "ENCRYPTED PRIVATE KEY".');
        error.headerType = msg.type;
        throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        throw new Error("Could not convert encrypted private key from PEM; " +
            "PEM is encrypted.");
    }

    // convert DER to ASN.1 object
    return asn1.fromDer(msg.body);
};

/**
 * Encrypts an RSA private key. By default, the key will be wrapped in
 * a PrivateKeyInfo and encrypted to produce a PKCS#8 EncryptedPrivateKeyInfo.
 * This is the standard, preferred way to encrypt a private key.
 *
 * To produce a non-standard PEM-encrypted private key that uses encapsulated
 * headers to indicate the encryption algorithm (old-style non-PKCS#8 OpenSSL
 * private key encryption), set the 'legacy' option to true. Note: Using this
 * option will cause the iteration count to be forced to 1.
 *
 * Note: The 'des' algorithm is supported, but it is not considered to be
 * secure because it only uses a single 56-bit key. If possible, it is highly
 * recommended that a different algorithm be used.
 *
 * @param rsaKey the RSA key to encrypt.
 * @param password the password to use.
 * @param options:
 *          algorithm: the encryption algorithm to use
 *            ('aes128', 'aes192', 'aes256', '3des', 'des').
 *          count: the iteration count to use.
 *          saltSize: the salt size to use.
 *          legacy: output an old non-PKCS#8 PEM-encrypted+encapsulated
 *            headers (DEK-Info) private key.
 *
 * @return the PEM-encoded ASN.1 EncryptedPrivateKeyInfo.
 */
export const encryptRsaPrivateKey = function (rsaKey, password, options) {
    // standard PKCS#8
    options = options || {};
    if (!options.legacy) {
        // encrypt PrivateKeyInfo
        let rval = crypto.pki.wrapRsaPrivateKey(crypto.pki.privateKeyToAsn1(rsaKey));
        rval = crypto.pki.encryptPrivateKeyInfo(rval, password, options);
        return crypto.pki.encryptedPrivateKeyToPem(rval);
    }

    // legacy non-PKCS#8
    let algorithm;
    let iv;
    let dkLen;
    let cipherFn;
    switch (options.algorithm) {
        case "aes128":
            algorithm = "AES-128-CBC";
            dkLen = 16;
            iv = crypto.random.getBytesSync(16);
            cipherFn = crypto.aes.createEncryptionCipher;
            break;
        case "aes192":
            algorithm = "AES-192-CBC";
            dkLen = 24;
            iv = crypto.random.getBytesSync(16);
            cipherFn = crypto.aes.createEncryptionCipher;
            break;
        case "aes256":
            algorithm = "AES-256-CBC";
            dkLen = 32;
            iv = crypto.random.getBytesSync(16);
            cipherFn = crypto.aes.createEncryptionCipher;
            break;
        case "3des":
            algorithm = "DES-EDE3-CBC";
            dkLen = 24;
            iv = crypto.random.getBytesSync(8);
            cipherFn = crypto.des.createEncryptionCipher;
            break;
        case "des":
            algorithm = "DES-CBC";
            dkLen = 8;
            iv = crypto.random.getBytesSync(8);
            cipherFn = crypto.des.createEncryptionCipher;
            break;
        default:
            var error = new Error(`${"Could not encrypt RSA private key; unsupported " +
                'encryption algorithm "'}${options.algorithm}".`);
            error.algorithm = options.algorithm;
            throw error;
    }

    // encrypt private key using OpenSSL legacy key derivation
    const dk = crypto.pbe.opensslDeriveBytes(password, iv.substr(0, 8), dkLen);
    const cipher = cipherFn(dk);
    cipher.start(iv);
    cipher.update(asn1.toDer(crypto.pki.privateKeyToAsn1(rsaKey)));
    cipher.finish();

    const msg = {
        type: "RSA PRIVATE KEY",
        procType: {
            version: "4",
            type: "ENCRYPTED"
        },
        dekInfo: {
            algorithm,
            parameters: crypto.util.bytesToHex(iv).toUpperCase()
        },
        body: cipher.output.getBytes()
    };
    return crypto.pem.encode(msg);
};

/**
 * Decrypts an RSA private key.
 *
 * @param pem the PEM-formatted EncryptedPrivateKeyInfo to decrypt.
 * @param password the password to use.
 *
 * @return the RSA key on success, null on failure.
 */
export const decryptRsaPrivateKey = function (pem, password) {
    let rval = null;

    const msg = crypto.pem.decode(pem)[0];

    if (msg.type !== "ENCRYPTED PRIVATE KEY" &&
        msg.type !== "PRIVATE KEY" &&
        msg.type !== "RSA PRIVATE KEY") {
        var error = new Error("Could not convert private key from PEM; PEM header type " +
            'is not "ENCRYPTED PRIVATE KEY", "PRIVATE KEY", or "RSA PRIVATE KEY".');
        error.headerType = error;
        throw error;
    }

    if (msg.procType && msg.procType.type === "ENCRYPTED") {
        let dkLen;
        let cipherFn;
        switch (msg.dekInfo.algorithm) {
            case "DES-CBC":
                dkLen = 8;
                cipherFn = crypto.des.createDecryptionCipher;
                break;
            case "DES-EDE3-CBC":
                dkLen = 24;
                cipherFn = crypto.des.createDecryptionCipher;
                break;
            case "AES-128-CBC":
                dkLen = 16;
                cipherFn = crypto.aes.createDecryptionCipher;
                break;
            case "AES-192-CBC":
                dkLen = 24;
                cipherFn = crypto.aes.createDecryptionCipher;
                break;
            case "AES-256-CBC":
                dkLen = 32;
                cipherFn = crypto.aes.createDecryptionCipher;
                break;
            case "RC2-40-CBC":
                dkLen = 5;
                cipherFn = function (key) {
                    return crypto.rc2.createDecryptionCipher(key, 40);
                };
                break;
            case "RC2-64-CBC":
                dkLen = 8;
                cipherFn = function (key) {
                    return crypto.rc2.createDecryptionCipher(key, 64);
                };
                break;
            case "RC2-128-CBC":
                dkLen = 16;
                cipherFn = function (key) {
                    return crypto.rc2.createDecryptionCipher(key, 128);
                };
                break;
            default:
                var error = new Error(`${"Could not decrypt private key; unsupported " +
                    'encryption algorithm "'}${msg.dekInfo.algorithm}".`);
                error.algorithm = msg.dekInfo.algorithm;
                throw error;
        }

        // use OpenSSL legacy key derivation
        const iv = crypto.util.hexToBytes(msg.dekInfo.parameters);
        const dk = crypto.pbe.opensslDeriveBytes(password, iv.substr(0, 8), dkLen);
        const cipher = cipherFn(dk);
        cipher.start(iv);
        cipher.update(crypto.util.createBuffer(msg.body));
        if (cipher.finish()) {
            rval = cipher.output.getBytes();
        } else {
            return rval;
        }
    } else {
        rval = msg.body;
    }

    if (msg.type === "ENCRYPTED PRIVATE KEY") {
        rval = crypto.pki.decryptPrivateKeyInfo(asn1.fromDer(rval), password);
    } else {
        // decryption already performed above
        rval = asn1.fromDer(rval);
    }

    if (!is.null(rval)) {
        rval = crypto.pki.privateKeyFromAsn1(rval);
    }

    return rval;
};



Object.assign(exports, require("./x509"));
