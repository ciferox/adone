const {
    crypto: { pki },
    math: { BigNumber }
} = adone;

const forge = require("node-forge");
const asn1 = forge.asn1;

// validator for an SubjectPublicKeyInfo structure
// Note: Currently only works with an RSA public key
const publicKeyValidator = forge.pki.rsa.publicKeyValidator = {
    name: "SubjectPublicKeyInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    captureAsn1: "subjectPublicKeyInfo",
    value: [{
        name: "SubjectPublicKeyInfo.AlgorithmIdentifier",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [{
            name: "AlgorithmIdentifier.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: false,
            capture: "publicKeyOid"
        }]
    }, {
        // subjectPublicKey
        name: "SubjectPublicKeyInfo.subjectPublicKey",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.BITSTRING,
        constructed: false,
        value: [{
        // RSAPublicKey
            name: "SubjectPublicKeyInfo.subjectPublicKey.RSAPublicKey",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            optional: true,
            captureAsn1: "rsaPublicKey"
        }]
    }]
};

// validator for an RSA public key
const rsaPublicKeyValidator = {
    // RSAPublicKey
    name: "RSAPublicKey",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        // modulus (n)
        name: "RSAPublicKey.modulus",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "publicKeyModulus"
    }, {
        // publicExponent (e)
        name: "RSAPublicKey.exponent",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "publicKeyExponent"
    }]
};

/**
 * Converts a public key from an ASN.1 SubjectPublicKeyInfo or RSAPublicKey.
 *
 * @param obj the asn1 representation of a SubjectPublicKeyInfo or RSAPublicKey.
 *
 * @return the public key.
 */
export default function publicKeyFromAsn1(obj) {
    // get SubjectPublicKeyInfo
    const capture = {};
    let errors = [];
    if (asn1.validate(obj, publicKeyValidator, capture, errors)) {
        // get oid
        const oid = asn1.derToOid(capture.publicKeyOid);
        if (oid !== pki.oids.rsaEncryption) {
            const error = new Error("Cannot read public key. Unknown OID.");
            error.oid = oid;
            throw error;
        }
        obj = capture.rsaPublicKey;
    }

    // get RSA params
    errors = [];
    if (!asn1.validate(obj, rsaPublicKeyValidator, capture, errors)) {
        const error = new Error("Cannot read public key. ASN.1 object does not contain an RSAPublicKey.");
        error.errors = errors;
        throw error;
    }

    // FIXME: inefficient, get a BigInteger that uses byte strings
    const n = Buffer.from(forge.util.createBuffer(capture.publicKeyModulus).toHex(), "hex");
    const e = Buffer.from(forge.util.createBuffer(capture.publicKeyExponent).toHex(), "hex");

    // set public key
    return pki.rsa.setPublicKey(BigNumber.fromBuffer(n), BigNumber.fromBuffer(e));
}

