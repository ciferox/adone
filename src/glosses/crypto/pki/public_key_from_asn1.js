const {
    crypto: {
        pki,
        asn1
    },
    math: { BigNumber }
} = adone;

const __ = adone.getPrivate(pki);

/**
 * Converts a public key from an ASN.1 SubjectPublicKeyInfo or RSAPublicKey.
 *
 * @param obj the asn1 representation of a SubjectPublicKeyInfo or RSAPublicKey.
 *
 * @return the public key.
 */
export default function publicKeyFromAsn1(obj) {
    const pkValidation = asn1.compareSchema(obj, obj, __.publicKeyValidator);
    // get SubjectPublicKeyInfo
    if (pkValidation.verified) {
        const { result } = pkValidation;
        // get oid
        const oid = result.publicKeyOid.valueBlock.toString();

        if (oid !== pki.oids.rsaEncryption) {
            const error = new Error("Cannot read public key. Unknown OID.");
            error.oid = oid;
            throw error;
        }
        obj = asn1.fromBER(result.subjectPublicKey.valueBlock.valueHex).result;
    }

    // get RSA params
    const rsaPkValidation = asn1.compareSchema(obj, obj, __.rsaPublicKeyValidator);

    if (!rsaPkValidation.verified) {
        throw new Error("Cannot read public key. ASN.1 object does not contain an RSAPublicKey.");
    }

    const { result } = rsaPkValidation;

    // FIXME: inefficient, get a BigInteger that uses byte strings
    const n = Buffer.from(result.publicKeyModulus.valueBlock.valueHex);
    const e = Buffer.from(result.publicKeyExponent.valueBlock.valueHex);

    // set public key
    return pki.rsa.setPublicKey(BigNumber.fromBuffer(n), BigNumber.fromBuffer(e));
}

