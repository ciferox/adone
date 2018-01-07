const {
    crypto: {
        pki,
        asn1
    },
    math: { BigNumber }
} = adone;

// validator for a PrivateKeyInfo structure
const privateKeyValidator = new asn1.Sequence({
    name: "info",
    value: [
        new asn1.Integer({
            name: "version"
        }),
        new asn1.Sequence({
            name: "privateKeyAlgorithm",
            value: [
                new asn1.ObjectIdentifier({
                    name: "algorithm"
                })
            ]
        }),
        new asn1.OctetString({
            name: "privateKey"
        })
    ]
});

// validator for an RSA private key
const rsaPrivateKeyValidator = new asn1.Sequence({
    name: "RSAPrivateKey",
    value: [
        new asn1.Integer({
            // Version (INTEGER)
        }),
        new asn1.Integer({
            // modulus (n)
            name: "modulus"
        }),
        new asn1.Integer({
            // publicExponent (e)
            name: "publicExponent"
        }),
        new asn1.Integer({
            // privateExponent (d)
            name: "privateExponent"
        }),
        new asn1.Integer({
            // prime1 (p)
            name: "prime1"
        }),
        new asn1.Integer({
            // prime2 (q)
            name: "prime2"
        }),
        new asn1.Integer({
            // exponent1 (d mod (p-1))
            name: "exponent1"
        }),
        new asn1.Integer({
            // exponent2 (d mod (q-1))
            name: "exponent2"
        }),
        new asn1.Integer({
            // coefficient ((inverse of q) mod p)
            name: "coefficient"
        })
    ]
});

/**
 * Converts a private key from an ASN.1 object.
 *
 * @param obj the ASN.1 representation of a PrivateKeyInfo containing an
 *          RSAPrivateKey or an RSAPrivateKey.
 *
 * @return the private key.
 */
export default function privateKeyFromAsn1(obj) {
    // get PrivateKeyInfo

    const pkValidation = asn1.compareSchema(obj, obj, privateKeyValidator);
    if (pkValidation.verified) {
        obj = asn1.fromBER(pkValidation.result.privateKey.valueBlock.valueHex).result;
    }

    // get RSAPrivateKey
    const rsaPkValidation = asn1.compareSchema(obj, obj, rsaPrivateKeyValidator);

    if (!rsaPkValidation.verified) {
        throw new Error("Cannot read private key. ASN.1 object does not contain an RSAPrivateKey.");
    }

    const { result } = rsaPkValidation;

    // Note: Version is currently ignored.
    // capture.privateKeyVersion
    // FIXME: inefficient, get a BigInteger that uses byte strings
    const n = Buffer.from(result.modulus.valueBlock.valueHex);
    const e = Buffer.from(result.publicExponent.valueBlock.valueHex);
    const d = Buffer.from(result.privateExponent.valueBlock.valueHex);
    const p = Buffer.from(result.prime1.valueBlock.valueHex);
    const q = Buffer.from(result.prime2.valueBlock.valueHex);
    const dP = Buffer.from(result.exponent1.valueBlock.valueHex);
    const dQ = Buffer.from(result.exponent2.valueBlock.valueHex);
    const qInv = Buffer.from(result.coefficient.valueBlock.valueHex);

    // set private key
    return pki.rsa.setPrivateKey(
        BigNumber.fromBuffer(n),
        BigNumber.fromBuffer(e),
        BigNumber.fromBuffer(d),
        BigNumber.fromBuffer(p),
        BigNumber.fromBuffer(q),
        BigNumber.fromBuffer(dP),
        BigNumber.fromBuffer(dQ),
        BigNumber.fromBuffer(qInv)
    );
}
